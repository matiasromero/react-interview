import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../api/client'
import type { SyncStatusResponse } from '../api/types'

export type SyncFetchState = 'idle' | 'loading' | 'error'
export type SyncRunState = 'idle' | 'running'

export interface UseSyncStatusReturn {
  status: SyncStatusResponse | null
  fetchState: SyncFetchState
  runState: SyncRunState
  fetchError: string | null
  runError: string | null
  refresh: () => Promise<void>
  runNow: () => Promise<void>
}

export function useSyncStatus(): UseSyncStatusReturn {
  const [status, setStatus] = useState<SyncStatusResponse | null>(null)
  const [fetchState, setFetchState] = useState<SyncFetchState>('idle')
  const [runState, setRunState] = useState<SyncRunState>('idle')
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [runError, setRunError] = useState<string | null>(null)

  const mountedRef = useRef(true)
  const runInFlightRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const refresh = useCallback(async () => {
    setFetchState('loading')
    try {
      const next = await api.getSyncStatus()
      if (!mountedRef.current) return
      setStatus(next)
      setFetchError(null)
      setFetchState('idle')
    } catch (e) {
      if (!mountedRef.current) return
      setFetchError((e as Error).message)
      setFetchState('error')
    }
  }, [])

  const runNow = useCallback(async () => {
    if (runInFlightRef.current) return
    runInFlightRef.current = true
    setRunState('running')
    setRunError(null)
    try {
      await api.runSync()
    } catch (e) {
      if (mountedRef.current) setRunError((e as Error).message)
    } finally {
      runInFlightRef.current = false
      if (mountedRef.current) setRunState('idle')
    }
    await refresh()
  }, [refresh])

  return { status, fetchState, runState, fetchError, runError, refresh, runNow }
}
