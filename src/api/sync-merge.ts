import type { TodoList, TodoListItem } from './types'

export function mergeLists(
  current: TodoList[],
  fromServer: TodoList[],
  pendingDeletedListIds: Set<number>,
  inFlightListUpdateIds: Set<number>,
): TodoList[] {
  const currentById = new Map(current.map((l) => [l.id, l]))
  const merged: TodoList[] = []

  for (const l of current) if (l.id < 0) merged.push(l)

  for (const s of fromServer) {
    if (pendingDeletedListIds.has(s.id)) continue
    const local = currentById.get(s.id)
    if (local && inFlightListUpdateIds.has(s.id)) {
      merged.push({ ...s, name: local.name })
    } else {
      merged.push(s)
    }
  }

  return merged.sort((a, b) => a.id - b.id)
}

export function mergeItemsForList(
  current: TodoListItem[],
  fromServer: TodoListItem[],
  pendingDeletedItemIds: Set<number>,
  inFlightItemUpdateIds: Set<number>,
): TodoListItem[] {
  const currentById = new Map(current.map((i) => [i.id, i]))
  const merged: TodoListItem[] = []

  for (const i of current) if (i.id < 0) merged.push(i)

  for (const s of fromServer) {
    if (pendingDeletedItemIds.has(s.id)) continue
    const local = currentById.get(s.id)
    if (local && inFlightItemUpdateIds.has(s.id)) {
      merged.push({
        ...s,
        isCompleted: local.isCompleted,
        description: local.description,
      })
    } else {
      merged.push(s)
    }
  }

  return merged.sort((a, b) => a.id - b.id)
}

export function mergeItemsByList(
  current: Record<number, TodoListItem[]>,
  fromServer: Record<number, TodoListItem[]>,
  pendingDeletedItemIds: Set<number>,
  inFlightItemUpdateIds: Set<number>,
  pendingDeletedListIds: Set<number>,
): Record<number, TodoListItem[]> {
  const next: Record<number, TodoListItem[]> = {}
  const listIds = new Set<number>([
    ...Object.keys(current).map(Number),
    ...Object.keys(fromServer).map(Number),
  ])
  for (const listId of listIds) {
    if (pendingDeletedListIds.has(listId)) continue
    next[listId] = mergeItemsForList(
      current[listId] ?? [],
      fromServer[listId] ?? [],
      pendingDeletedItemIds,
      inFlightItemUpdateIds,
    )
  }
  return next
}

export function findParentListId(
  itemsByList: Record<number, TodoListItem[]>,
  itemId: number,
): number | null {
  for (const [listId, items] of Object.entries(itemsByList)) {
    const found = items.find((i) => i.id === itemId)
    if (found) return found.todoListId ?? Number(listId)
  }
  return null
}
