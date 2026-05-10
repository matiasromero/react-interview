import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useT } from '../i18n/I18nContext'
import type {
  SyncDirection,
  SyncEntityType,
  SyncRunStatus,
  SyncRunSummary,
  SyncStatusResponse,
} from '../api/types'
import type { UseSyncStatusReturn } from '../hooks/useSyncStatus'

type Tone = 'ok' | 'warn' | 'error' | 'busy' | 'muted'

interface Props {
  sync: UseSyncStatusReturn
}

const FAILED: SyncRunStatus = 4
const PARTIAL: SyncRunStatus = 3
const SUCCEEDED: SyncRunStatus = 2
const RUNNING: SyncRunStatus = 1

const STALE_PENDING_MS = 5 * 60 * 1000

function parseTimeSpan(ts: string): number {
  // "hh:mm:ss" or "d.hh:mm:ss[.fffffff]"
  const [head, ...rest] = ts.split('.')
  const main = rest.length > 0 && /^\d/.test(head) && head.includes(':') === false ? rest[0] : head
  const days = head !== main ? parseInt(head, 10) : 0
  const [h, m, s] = main.split(':').map((v) => parseInt(v, 10) || 0)
  return ((days * 24 + h) * 60 + m) * 60_000 + s * 1000
}

function formatInterval(ts: string, t: ReturnType<typeof useT>['t']): string {
  const ms = parseTimeSpan(ts)
  const s = Math.round(ms / 1000)
  if (s >= 3600) return t('sync.intervalHours', { n: Math.round(s / 3600) })
  if (s >= 60) return t('sync.intervalMinutes', { n: Math.round(s / 60) })
  return t('sync.intervalSeconds', { n: s })
}

function formatRelative(iso: string, t: ReturnType<typeof useT>['t']): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diffMs)) return ''
  if (diffMs < 60_000) return t('sync.relativeJustNow')
  const min = Math.round(diffMs / 60_000)
  if (min < 60) return t('sync.relativeMinutes', { n: min })
  const hr = Math.round(min / 60)
  if (hr < 48) return t('sync.relativeHours', { n: hr })
  return t('sync.relativeDays', { n: Math.round(hr / 24) })
}

function findRun(
  runs: SyncRunSummary[] | null | undefined,
  entityType: SyncEntityType,
  direction: SyncDirection,
): SyncRunSummary | undefined {
  if (!runs) return undefined
  return runs.find((r) => r.entityType === entityType && r.direction === direction)
}

function statusGlyph(status: SyncRunStatus | undefined): string {
  if (status === SUCCEEDED) return '✓'
  if (status === PARTIAL) return '⚠'
  if (status === FAILED) return '✕'
  if (status === RUNNING) return '⏳'
  return '—'
}

function statusKey(status: SyncRunStatus | undefined) {
  if (status === SUCCEEDED) return 'sync.statusSucceeded' as const
  if (status === PARTIAL) return 'sync.statusPartial' as const
  if (status === FAILED) return 'sync.statusFailed' as const
  if (status === RUNNING) return 'sync.statusRunning' as const
  return 'sync.statusUnknown' as const
}

function statusToTone(status: SyncRunStatus | undefined): Tone {
  if (status === SUCCEEDED) return 'ok'
  if (status === PARTIAL) return 'warn'
  if (status === FAILED) return 'error'
  if (status === RUNNING) return 'busy'
  return 'muted'
}

function derivePillTone(
  status: SyncStatusResponse | null,
  runState: 'idle' | 'running',
): Tone {
  if (runState === 'running') return 'busy'
  if (!status) return 'muted'
  if (status.config.enabled === false) return 'muted'
  const runs = status.lastRuns ?? []
  const hasFailed = runs.some((r) => r.status === FAILED)
  const stale =
    status.oldestPendingOutboxOccurredAt !== null &&
    Date.now() - new Date(status.oldestPendingOutboxOccurredAt).getTime() > STALE_PENDING_MS
  if (hasFailed || stale) return 'error'
  const hasPartial = runs.some((r) => r.status === PARTIAL)
  if (hasPartial || status.pendingOutboxCount > 0) return 'warn'
  if (runs.length === 0) return 'muted'
  return 'ok'
}

function SyncGlyph({ spinning }: { spinning: boolean }) {
  return (
    <svg
      className="sync-glyph"
      data-spin={spinning}
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
      <path d="M13.5 2.5v3h-3" />
    </svg>
  )
}

interface CellProps {
  rowKey: 'sync.rowLists' | 'sync.rowItems'
  colKey: 'sync.colPush' | 'sync.colPull'
  run: SyncRunSummary | undefined
}

function Cell({ rowKey, colKey, run }: CellProps) {
  const { t } = useT()
  const tone = statusToTone(run?.status)
  const status = t(statusKey(run?.status))
  const ariaLabel = t('sync.cellAria', {
    row: t(rowKey),
    col: t(colKey),
    status,
    processed: run?.itemsProcessed ?? 0,
    failed: run?.itemsFailed ?? 0,
  })
  const title = run?.error ? `${status} — ${run.error}` : status
  return (
    <div className="sync-cell" data-tone={tone} title={title} aria-label={ariaLabel}>
      <span className="sync-cell-glyph" aria-hidden>
        {statusGlyph(run?.status)}
      </span>
      <span className="sync-cell-counts" aria-hidden>
        {run ? `${run.itemsProcessed}/${run.itemsFailed}` : '—'}
      </span>
    </div>
  )
}

function SyncIndicator({ sync }: Props) {
  const { t } = useT()
  const { status, runState, fetchError, runError, refresh, runNow } = sync

  const [open, setOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const tone = derivePillTone(status, runState)
  const pendingCount = status?.pendingOutboxCount ?? 0

  // Refresh now() every 30s while popover is open so relative timestamps update
  useEffect(() => {
    if (!open) return
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [open])

  // Initial fetch on mount, plus refresh on open
  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!open) {
      setHelpOpen(false)
      return
    }
    void refresh()
    setNow(Date.now())
  }, [open, refresh])

  // Click-outside + Escape close
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current) return
      if (containerRef.current.contains(e.target as Node)) return
      setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // Move focus into popover on open
  useEffect(() => {
    if (!open) return
    const id = window.requestAnimationFrame(() => {
      const focusable = popoverRef.current?.querySelector<HTMLElement>(
        'button:not([disabled])',
      )
      focusable?.focus()
    })
    return () => window.cancelAnimationFrame(id)
  }, [open])

  const lastSyncLabel = useMemo(() => {
    // `now` is intentionally a dep so the relative timestamp re-renders periodically
    void now
    if (!status) return null
    const runs = status.lastRuns ?? []
    if (runs.length === 0) return t('sync.lastSyncNever')
    let latest: number | null = null
    for (const r of runs) {
      const ts = r.finishedAt ?? r.startedAt
      const v = new Date(ts).getTime()
      if (!Number.isNaN(v) && (latest === null || v > latest)) latest = v
    }
    if (latest === null) return t('sync.lastSyncNever')
    return t('sync.lastSync', { relative: formatRelative(new Date(latest).toISOString(), t) })
  }, [status, t, now])

  const pendingLabel = useMemo(() => {
    if (!status) return null
    if (status.pendingOutboxCount === 0) return t('sync.pendingNone')
    if (status.pendingOutboxCount === 1) return t('sync.pendingOne')
    return t('sync.pendingMany', { count: status.pendingOutboxCount })
  }, [status, t])

  const intervalLabel = useMemo(() => {
    if (!status) return null
    if (!status.config.enabled) return t('sync.disabled')
    return t('sync.intervalHint', { interval: formatInterval(status.config.interval, t) })
  }, [status, t])

  const tooltip = t('sync.tooltip')

  return (
    <div className="sync-indicator" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="sync-pill"
        data-tone={tone}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={tooltip}
        title={tooltip}
        onClick={() => setOpen((v) => !v)}
      >
        <SyncGlyph spinning={runState === 'running'} />
        {pendingCount > 0 && (
          <span className="sync-pill-badge" aria-hidden>
            {pendingCount > 99 ? '99+' : pendingCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={popoverRef}
            className="sync-popover"
            role="dialog"
            aria-label={t('sync.title')}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="sync-popover-head">
              <span className="sync-popover-title">{t('sync.title')}</span>
              <div className="sync-popover-actions">
                <button
                  type="button"
                  className="sync-popover-help"
                  aria-pressed={helpOpen}
                  aria-label={t(helpOpen ? 'sync.help.toggleAriaClose' : 'sync.help.toggleAria')}
                  title={t(helpOpen ? 'sync.help.toggleAriaClose' : 'sync.help.toggleAria')}
                  onClick={() => setHelpOpen((v) => !v)}
                >
                  ?
                </button>
                <button
                  type="button"
                  className="sync-popover-close"
                  onClick={() => {
                    setOpen(false)
                    triggerRef.current?.focus()
                  }}
                  aria-label={t('sync.close')}
                >
                  ×
                </button>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {helpOpen && (
                <motion.div
                  key="help"
                  className="sync-help"
                  role="region"
                  aria-label={t('sync.help.title')}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                >
                  <div className="sync-help-inner">
                    <section className="sync-help-section">
                      <h3 className="sync-help-h">{t('sync.help.whatHead')}</h3>
                      <p className="sync-help-body">
                        {t('sync.help.whatBody', {
                          interval: status
                            ? formatInterval(status.config.interval, t)
                            : '—',
                        })}
                      </p>
                    </section>

                    <section className="sync-help-section">
                      <h3 className="sync-help-h">{t('sync.help.legendHead')}</h3>
                      <ul className="sync-help-list">
                        <li>
                          <span className="sync-help-key" aria-hidden>Push</span>
                          <span>{t('sync.help.legendPush')}</span>
                        </li>
                        <li>
                          <span className="sync-help-key" aria-hidden>Pull</span>
                          <span>{t('sync.help.legendPull')}</span>
                        </li>
                        <li>
                          <span className="sync-help-key" aria-hidden>Lists</span>
                          <span>{t('sync.help.legendLists')}</span>
                        </li>
                        <li>
                          <span className="sync-help-key" aria-hidden>Tasks</span>
                          <span>{t('sync.help.legendTasks')}</span>
                        </li>
                        <li>
                          <span className="sync-help-key" aria-hidden>X/Y</span>
                          <span>{t('sync.help.legendCounts')}</span>
                        </li>
                        <li>
                          <span className="sync-help-key" aria-hidden>✓</span>
                          <span>{t('sync.help.legendOk')}</span>
                        </li>
                        <li>
                          <span className="sync-help-key" aria-hidden>⚠</span>
                          <span>{t('sync.help.legendPartial')}</span>
                        </li>
                        <li>
                          <span className="sync-help-key" aria-hidden>✕</span>
                          <span>{t('sync.help.legendFailed')}</span>
                        </li>
                        <li>
                          <span className="sync-help-key" aria-hidden>⏳</span>
                          <span>{t('sync.help.legendRunning')}</span>
                        </li>
                        <li>
                          <span className="sync-help-key" aria-hidden>—</span>
                          <span>{t('sync.help.legendNone')}</span>
                        </li>
                      </ul>
                    </section>

                    <section className="sync-help-section">
                      <h3 className="sync-help-h">{t('sync.help.tonesHead')}</h3>
                      <ul className="sync-help-list sync-help-list-tones">
                        <li>
                          <span className="sync-help-swatch" data-tone="ok" aria-hidden />
                          <span>{t('sync.help.toneOk')}</span>
                        </li>
                        <li>
                          <span className="sync-help-swatch" data-tone="warn" aria-hidden />
                          <span>{t('sync.help.toneWarn')}</span>
                        </li>
                        <li>
                          <span className="sync-help-swatch" data-tone="error" aria-hidden />
                          <span>{t('sync.help.toneError')}</span>
                        </li>
                        <li>
                          <span className="sync-help-swatch" data-tone="busy" aria-hidden />
                          <span>{t('sync.help.toneBusy')}</span>
                        </li>
                        <li>
                          <span className="sync-help-swatch" data-tone="muted" aria-hidden />
                          <span>{t('sync.help.toneMuted')}</span>
                        </li>
                      </ul>
                    </section>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="sync-popover-summary">
              {fetchError ? (
                <p className="sync-error">{t('sync.fetchError')}</p>
              ) : (
                <>
                  {lastSyncLabel && <p className="sync-last">{lastSyncLabel}</p>}
                  {pendingLabel && (
                    <p
                      className="sync-pending"
                      data-tone={pendingCount > 0 ? 'warn' : 'ok'}
                    >
                      {pendingLabel}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="sync-grid">
              <span className="sync-grid-corner" aria-hidden />
              <span className="sync-grid-h">{t('sync.colPush')}</span>
              <span className="sync-grid-h">{t('sync.colPull')}</span>

              <span className="sync-grid-r">{t('sync.rowLists')}</span>
              <Cell rowKey="sync.rowLists" colKey="sync.colPush" run={findRun(status?.lastRuns, 1, 1)} />
              <Cell rowKey="sync.rowLists" colKey="sync.colPull" run={findRun(status?.lastRuns, 1, 2)} />

              <span className="sync-grid-r">{t('sync.rowItems')}</span>
              <Cell rowKey="sync.rowItems" colKey="sync.colPush" run={findRun(status?.lastRuns, 2, 1)} />
              <Cell rowKey="sync.rowItems" colKey="sync.colPull" run={findRun(status?.lastRuns, 2, 2)} />
            </div>

            <button
              type="button"
              className="sync-runbtn"
              onClick={() => void runNow()}
              disabled={runState === 'running'}
              data-busy={runState === 'running'}
            >
              {runState === 'running' ? t('sync.running') : t('sync.runNow')}
            </button>

            {intervalLabel && <p className="sync-foot">{intervalLabel}</p>}
            {runError && <p className="sync-error">{t('sync.runError')}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SyncIndicator
