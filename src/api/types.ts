export interface TodoList {
  id: number
  name: string
  items: TodoListItem[]
}

export interface TodoListItem {
  id: number
  description: string
  isCompleted: boolean
  todoListId: number
}

export type ChangeEntityType = 1 | 2
export type ChangeOperation = 1 | 2 | 3

export interface ChangeNotification {
  eventId: number
  entityType: ChangeEntityType
  entityId: number
  operation: ChangeOperation
  occurredAt: string
}

export type SyncEntityType = 1 | 2
export type SyncDirection = 1 | 2
export type SyncRunStatus = 1 | 2 | 3 | 4

export interface SyncRunSummary {
  entityType: SyncEntityType
  direction: SyncDirection
  startedAt: string
  finishedAt: string | null
  status: SyncRunStatus
  itemsProcessed: number
  itemsFailed: number
  error: string | null
}

export interface SyncConfigSnapshot {
  interval: string
  startupDelay: string
  enabled: boolean
  outboxBatchSize: number
  outboxRetention: string
}

export interface SyncStatusResponse {
  lastRuns: SyncRunSummary[] | null
  pendingOutboxCount: number
  oldestPendingOutboxOccurredAt: string | null
  config: SyncConfigSnapshot
}

export interface SyncRunResult {
  total: number
  pushed: number
  failed: number
  status: SyncRunStatus
}

export interface SyncRunResponse {
  listPush: SyncRunResult
  itemPush: SyncRunResult
  listPull: SyncRunResult
  itemPull: SyncRunResult
}
