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
