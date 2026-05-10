import { useEffect, useRef, useState } from 'react'
import { HubConnectionState } from '@microsoft/signalr'
import { createHubConnection } from '../api/hub'
import type { ChangeNotification, ChangeOperation } from '../api/types'

export type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'

export interface TodoSyncCallbacks {
  onListChanged: (entityId: number, op: ChangeOperation) => void | Promise<void>
  onItemChanged: (entityId: number, op: ChangeOperation) => void | Promise<void>
  onResync: () => void | Promise<void>
}

const DEDUPE_WINDOW_MS = 60_000
const DEDUPE_MAX = 500

export function useTodoSyncHub(cb: TodoSyncCallbacks): ConnectionState {
  const cbRef = useRef(cb)
  cbRef.current = cb

  const [state, setState] = useState<ConnectionState>('connecting')

  useEffect(() => {
    const connection = createHubConnection()
    const seen = new Map<number, number>()
    let disposed = false

    const isDuplicate = (n: ChangeNotification): boolean => {
      const now = Date.now()
      for (const [id, ts] of seen) {
        if (now - ts > DEDUPE_WINDOW_MS) seen.delete(id)
      }
      if (seen.has(n.eventId)) return true
      seen.set(n.eventId, now)
      if (seen.size > DEDUPE_MAX) {
        const oldest = seen.keys().next().value
        if (oldest !== undefined) seen.delete(oldest)
      }
      return false
    }

    connection.on('TodoListChanged', (n: ChangeNotification) => {
      if (isDuplicate(n)) return
      void cbRef.current.onListChanged(n.entityId, n.operation)
    })
    connection.on('TodoListItemChanged', (n: ChangeNotification) => {
      if (isDuplicate(n)) return
      void cbRef.current.onItemChanged(n.entityId, n.operation)
    })

    connection.onreconnecting(() => {
      if (!disposed) setState('reconnecting')
    })
    connection.onreconnected(() => {
      if (disposed) return
      setState('connected')
      void cbRef.current.onResync()
    })
    connection.onclose(() => {
      if (!disposed) setState('disconnected')
    })

    connection
      .start()
      .then(() => {
        if (disposed) return
        setState('connected')
        void cbRef.current.onResync()
      })
      .catch((err) => {
        if (disposed) return
        console.error('[useTodoSyncHub] start failed', err)
        setState('disconnected')
      })

    return () => {
      disposed = true
      if (connection.state !== HubConnectionState.Disconnected) {
        connection.stop().catch(() => {})
      }
    }
  }, [])

  return state
}
