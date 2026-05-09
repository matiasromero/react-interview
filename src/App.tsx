import { useEffect, useState } from 'react'
import * as api from './api/client'
import type { TodoList, TodoListItem } from './api/types'
import Sidebar from './components/Sidebar'
import TodoListView from './components/TodoListView'
import './App.css'

function App() {
  const [lists, setLists] = useState<TodoList[]>([])
  const [itemsByList, setItemsByList] = useState<Record<number, TodoListItem[]>>({})
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [bootError, setBootError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      try {
        const fetched = await api.getLists()
        if (cancelled) return
        const itemEntries = await Promise.all(
          fetched.map(async (list) => [list.id, await api.getItems(list.id)] as const),
        )
        if (cancelled) return
        const map: Record<number, TodoListItem[]> = {}
        for (const [id, items] of itemEntries) map[id] = items
        setLists(fetched)
        setItemsByList(map)
        setSelectedId(fetched[0]?.id ?? null)
      } catch (e) {
        if (!cancelled) setBootError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleAddList(name: string) {
    const created = await api.createList(name)
    setLists((prev) => [...prev, created])
    setItemsByList((prev) => ({ ...prev, [created.id]: [] }))
    setSelectedId(created.id)
  }

  async function handleRenameList(id: number, name: string) {
    const updated = await api.updateList(id, name)
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, name: updated.name } : l)))
  }

  async function handleDeleteList(id: number) {
    await api.deleteList(id)
    setLists((prev) => {
      const next = prev.filter((l) => l.id !== id)
      if (id === selectedId) setSelectedId(next[0]?.id ?? null)
      return next
    })
    setItemsByList((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  async function handleAddItem(listId: number, description: string) {
    const created = await api.createItem(listId, description)
    setItemsByList((prev) => ({
      ...prev,
      [listId]: [...(prev[listId] ?? []), created],
    }))
  }

  async function handleToggleItem(listId: number, item: TodoListItem) {
    const updated = await api.updateItem(listId, item.id, {
      description: item.description,
      isCompleted: !item.isCompleted,
    })
    setItemsByList((prev) => ({
      ...prev,
      [listId]: (prev[listId] ?? []).map((i) => (i.id === updated.id ? updated : i)),
    }))
  }

  async function handleDeleteItem(listId: number, item: TodoListItem) {
    await api.deleteItem(listId, item.id)
    setItemsByList((prev) => ({
      ...prev,
      [listId]: (prev[listId] ?? []).filter((i) => i.id !== item.id),
    }))
  }

  const selectedList = lists.find((l) => l.id === selectedId) ?? null
  const selectedItems = selectedId !== null ? itemsByList[selectedId] ?? [] : []

  return (
    <main className="app">
      <h1>Todos</h1>
      {bootError && <div className="banner banner-error">{bootError}</div>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="app-layout">
          <Sidebar
            lists={lists}
            itemsByList={itemsByList}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAddList={handleAddList}
          />
          <div className="app-main">
            {selectedList ? (
              <TodoListView
                list={selectedList}
                items={selectedItems}
                onAddItem={(d) => handleAddItem(selectedList.id, d)}
                onToggleItem={(item) => handleToggleItem(selectedList.id, item)}
                onDeleteItem={(item) => handleDeleteItem(selectedList.id, item)}
                onRenameList={(name) => handleRenameList(selectedList.id, name)}
                onDeleteList={() => handleDeleteList(selectedList.id)}
              />
            ) : (
              <p className="muted empty-state">
                {lists.length === 0
                  ? 'No lists yet. Create your first list in the sidebar.'
                  : 'Select a list from the sidebar.'}
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

export default App
