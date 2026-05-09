import { useCallback, useEffect, useRef, useState } from 'react'

export interface UndoToastState {
  id: string
  label: string
  durationMs: number
  startedAt: number
}

interface PendingEntry {
  state: UndoToastState
  commit: () => Promise<void> | void
  undo: () => void
  timer: ReturnType<typeof setTimeout>
}

interface ScheduleOptions {
  label: string
  durationMs?: number
  commit: () => Promise<void> | void
  undo: () => void
}

export function useUndoToast() {
  const [toast, setToast] = useState<UndoToastState | null>(null)
  const pendingRef = useRef<PendingEntry | null>(null)

  const clearPending = useCallback(() => {
    if (pendingRef.current) {
      clearTimeout(pendingRef.current.timer)
      pendingRef.current = null
    }
    setToast(null)
  }, [])

  const flush = useCallback(async () => {
    const entry = pendingRef.current
    if (!entry) return
    clearTimeout(entry.timer)
    pendingRef.current = null
    setToast(null)
    await entry.commit()
  }, [])

  const schedule = useCallback(
    ({ label, durationMs = 5000, commit, undo }: ScheduleOptions) => {
      // If a previous toast is still pending, commit it before stacking a new one.
      const previous = pendingRef.current
      if (previous) {
        clearTimeout(previous.timer)
        pendingRef.current = null
        void previous.commit()
      }

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const startedAt = Date.now()
      const timer = setTimeout(() => {
        const entry = pendingRef.current
        if (!entry || entry.state.id !== id) return
        pendingRef.current = null
        setToast(null)
        void entry.commit()
      }, durationMs)

      const state: UndoToastState = { id, label, durationMs, startedAt }
      pendingRef.current = { state, commit, undo, timer }
      setToast(state)
    },
    [],
  )

  const triggerUndo = useCallback(() => {
    const entry = pendingRef.current
    if (!entry) return
    clearTimeout(entry.timer)
    pendingRef.current = null
    setToast(null)
    entry.undo()
  }, [])

  useEffect(() => {
    return () => {
      // On unmount, fire any outstanding commit so the server stays in sync.
      const entry = pendingRef.current
      if (entry) {
        clearTimeout(entry.timer)
        void entry.commit()
        pendingRef.current = null
      }
    }
  }, [])

  return { toast, schedule, triggerUndo, clearPending, flush }
}
