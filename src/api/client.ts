import type { SyncRunResponse, SyncStatusResponse, TodoList, TodoListItem } from './types'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    throw new Error(`${init?.method ?? 'GET'} ${url} failed: ${res.status} ${res.statusText}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export function getLists(): Promise<TodoList[]> {
  return request('/api/todolists')
}

export function createList(name: string): Promise<TodoList> {
  return request('/api/todolists', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function getList(id: number): Promise<TodoList> {
  return request(`/api/todolists/${id}`)
}

export function updateList(id: number, name: string): Promise<TodoList> {
  return request(`/api/todolists/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  })
}

export function deleteList(id: number): Promise<void> {
  return request(`/api/todolists/${id}`, { method: 'DELETE' })
}

export function getItems(listId: number): Promise<TodoListItem[]> {
  return request(`/api/todolists/${listId}/items`)
}

export function createItem(listId: number, description: string): Promise<TodoListItem> {
  return request(`/api/todolists/${listId}/items`, {
    method: 'POST',
    body: JSON.stringify({ description }),
  })
}

export function updateItem(
  listId: number,
  id: number,
  patch: { description: string; isCompleted: boolean },
): Promise<TodoListItem> {
  return request(`/api/todolists/${listId}/items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  })
}

export function deleteItem(listId: number, id: number): Promise<void> {
  return request(`/api/todolists/${listId}/items/${id}`, { method: 'DELETE' })
}

export function getSyncStatus(): Promise<SyncStatusResponse> {
  return request('/api/sync/status')
}

export function runSync(): Promise<SyncRunResponse> {
  return request('/api/sync/run', { method: 'POST' })
}
