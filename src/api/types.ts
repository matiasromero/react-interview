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
