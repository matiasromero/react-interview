import { useEffect, useMemo, useState } from 'react'
import { LayoutGroup } from 'motion/react'
import * as api from './api/client'
import type { TodoList, TodoListItem } from './api/types'
import Header from './components/Header'
import ListsBoard from './components/ListsBoard'
import ActiveListPanel from './components/ActiveListPanel'
import UndoToast from './components/UndoToast'
import { useUndoToast } from './hooks/useUndoToast'
import './App.css'

function App() {
  const [lists, setLists] = useState<TodoList[]>([])
  const [itemsByList, setItemsByList] = useState<Record<number, TodoListItem[]>>({})
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [bootError, setBootError] = useState<string | null>(null)
  const undo = useUndoToast()

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
    const previousName = lists.find((l) => l.id === id)?.name
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, name } : l)))
    try {
      const updated = await api.updateList(id, name)
      setLists((prev) => prev.map((l) => (l.id === id ? { ...l, name: updated.name } : l)))
    } catch (e) {
      if (previousName !== undefined) {
        setLists((prev) =>
          prev.map((l) => (l.id === id ? { ...l, name: previousName } : l)),
        )
      }
      throw e
    }
  }

  function requestDeleteList(id: number) {
    const target = lists.find((l) => l.id === id)
    if (!target) return
    const targetItems = itemsByList[id] ?? []
    const remaining = lists.filter((l) => l.id !== id)
    const nextSelected =
      id === selectedId ? remaining[0]?.id ?? null : selectedId

    // optimistic remove
    setLists(remaining)
    setItemsByList((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    if (id === selectedId) setSelectedId(nextSelected)

    undo.schedule({
      label: `Deleted “${target.name}”`,
      commit: async () => {
        try {
          await api.deleteList(id)
        } catch {
          // restore on failure
          setLists((prev) => [...prev, target].sort((a, b) => a.id - b.id))
          setItemsByList((prev) => ({ ...prev, [id]: targetItems }))
        }
      },
      undo: () => {
        setLists((prev) => [...prev, target].sort((a, b) => a.id - b.id))
        setItemsByList((prev) => ({ ...prev, [id]: targetItems }))
        setSelectedId(target.id)
      },
    })
  }

  async function handleAddItem(listId: number, description: string) {
    const tempId = -Date.now()
    const optimistic: TodoListItem = {
      id: tempId,
      description,
      isCompleted: false,
      todoListId: listId,
    }
    setItemsByList((prev) => ({
      ...prev,
      [listId]: [...(prev[listId] ?? []), optimistic],
    }))
    try {
      const created = await api.createItem(listId, description)
      setItemsByList((prev) => ({
        ...prev,
        [listId]: (prev[listId] ?? []).map((i) => (i.id === tempId ? created : i)),
      }))
    } catch (e) {
      setItemsByList((prev) => ({
        ...prev,
        [listId]: (prev[listId] ?? []).filter((i) => i.id !== tempId),
      }))
      throw e
    }
  }

  async function handleToggleItem(listId: number, item: TodoListItem) {
    const nextCompleted = !item.isCompleted
    setItemsByList((prev) => ({
      ...prev,
      [listId]: (prev[listId] ?? []).map((i) =>
        i.id === item.id ? { ...i, isCompleted: nextCompleted } : i,
      ),
    }))
    try {
      const updated = await api.updateItem(listId, item.id, {
        description: item.description,
        isCompleted: nextCompleted,
      })
      setItemsByList((prev) => ({
        ...prev,
        [listId]: (prev[listId] ?? []).map((i) => (i.id === updated.id ? updated : i)),
      }))
    } catch (e) {
      setItemsByList((prev) => ({
        ...prev,
        [listId]: (prev[listId] ?? []).map((i) =>
          i.id === item.id ? { ...i, isCompleted: item.isCompleted } : i,
        ),
      }))
      throw e
    }
  }

  function requestDeleteItem(listId: number, item: TodoListItem) {
    setItemsByList((prev) => ({
      ...prev,
      [listId]: (prev[listId] ?? []).filter((i) => i.id !== item.id),
    }))

    undo.schedule({
      label: `Deleted “${item.description}”`,
      commit: async () => {
        try {
          await api.deleteItem(listId, item.id)
        } catch {
          setItemsByList((prev) => ({
            ...prev,
            [listId]: [...(prev[listId] ?? []), item].sort((a, b) => a.id - b.id),
          }))
        }
      },
      undo: () => {
        setItemsByList((prev) => ({
          ...prev,
          [listId]: [...(prev[listId] ?? []), item].sort((a, b) => a.id - b.id),
        }))
      },
    })
  }

  const selectedList = useMemo(
    () => lists.find((l) => l.id === selectedId) ?? null,
    [lists, selectedId],
  )
  const selectedItems = selectedId !== null ? itemsByList[selectedId] ?? [] : []

  return (
    <div className="app-shell">
      <div className="app-grain" aria-hidden />
      <main className="app">
        <Header />

        {bootError && (
          <div className="banner banner-error" role="alert">
            {bootError}
          </div>
        )}

        {loading ? (
          <div className="boot-loading" aria-live="polite">
            <span className="boot-loading-dot" />
            <span className="boot-loading-dot" />
            <span className="boot-loading-dot" />
          </div>
        ) : (
          <LayoutGroup>
            <ListsBoard
              lists={lists}
              itemsByList={itemsByList}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onAddList={handleAddList}
              onRenameList={handleRenameList}
            />

            {selectedList ? (
              <ActiveListPanel
                key={selectedList.id}
                list={selectedList}
                items={selectedItems}
                onAddItem={(d) => handleAddItem(selectedList.id, d)}
                onToggleItem={(item) => handleToggleItem(selectedList.id, item)}
                onDeleteItem={(item) => requestDeleteItem(selectedList.id, item)}
                onRenameList={(name) => handleRenameList(selectedList.id, name)}
                onDeleteList={() => requestDeleteList(selectedList.id)}
              />
            ) : (
              <section className="empty-shell">
                <span className="empty-shell-glyph" aria-hidden>
                  ✿
                </span>
                <p className="empty-shell-title">no lists yet</p>
                <p className="empty-shell-sub">start with one above</p>
              </section>
            )}
          </LayoutGroup>
        )}
      </main>

      <UndoToast toast={undo.toast} onUndo={undo.triggerUndo} />
    </div>
  )
}

export default App
