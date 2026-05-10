import { useEffect, useMemo, useRef, useState } from 'react'
import { LayoutGroup } from 'motion/react'
import * as api from './api/client'
import type { TodoList, TodoListItem } from './api/types'
import {
  findParentListId,
  mergeItemsByList,
  mergeItemsForList,
  mergeLists,
} from './api/sync-merge'
import Header from './components/Header'
import ListsBoard from './components/ListsBoard'
import ActiveListPanel from './components/ActiveListPanel'
import UndoToast from './components/UndoToast'
import { useUndoToast } from './hooks/useUndoToast'
import { useTodoSyncHub } from './hooks/useTodoSyncHub'
import { useSyncStatus } from './hooks/useSyncStatus'
import { useT } from './i18n/I18nContext'
import './App.css'

const OP_UPDATE = 2
const OP_DELETE = 3

function App() {
  const { t } = useT()
  const [lists, setLists] = useState<TodoList[]>([])
  const [itemsByList, setItemsByList] = useState<Record<number, TodoListItem[]>>({})
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [autoFocusListId, setAutoFocusListId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [bootError, setBootError] = useState<string | null>(null)
  const undo = useUndoToast()

  const pendingDeletedItemIds = useRef<Set<number>>(new Set())
  const pendingDeletedListIds = useRef<Set<number>>(new Set())
  const inFlightItemUpdateIds = useRef<Set<number>>(new Set())
  const inFlightListUpdateIds = useRef<Set<number>>(new Set())

  const itemsByListRef = useRef(itemsByList)
  const bootstrappedRef = useRef(false)
  itemsByListRef.current = itemsByList

  useEffect(() => {
    document.title = t('app.title')
  }, [t])

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
        bootstrappedRef.current = true
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
    setAutoFocusListId(created.id)
  }

  async function handleRenameList(id: number, name: string) {
    const previousName = lists.find((l) => l.id === id)?.name
    inFlightListUpdateIds.current.add(id)
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
    } finally {
      inFlightListUpdateIds.current.delete(id)
    }
  }

  function requestDeleteList(id: number) {
    const target = lists.find((l) => l.id === id)
    if (!target) return
    const targetItems = itemsByList[id] ?? []
    const remaining = lists.filter((l) => l.id !== id)
    const nextSelected =
      id === selectedId ? remaining[0]?.id ?? null : selectedId

    pendingDeletedListIds.current.add(id)
    setLists(remaining)
    setItemsByList((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    if (id === selectedId) setSelectedId(nextSelected)

    undo.schedule({
      label: t('undo.deletedList', { name: target.name }),
      commit: async () => {
        try {
          await api.deleteList(id)
        } catch {
          setLists((prev) => [...prev, target].sort((a, b) => a.id - b.id))
          setItemsByList((prev) => ({ ...prev, [id]: targetItems }))
        } finally {
          pendingDeletedListIds.current.delete(id)
        }
      },
      undo: () => {
        setLists((prev) => [...prev, target].sort((a, b) => a.id - b.id))
        setItemsByList((prev) => ({ ...prev, [id]: targetItems }))
        setSelectedId(target.id)
        pendingDeletedListIds.current.delete(id)
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
    inFlightItemUpdateIds.current.add(item.id)
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
    } finally {
      inFlightItemUpdateIds.current.delete(item.id)
    }
  }

  function requestDeleteItem(listId: number, item: TodoListItem) {
    pendingDeletedItemIds.current.add(item.id)
    setItemsByList((prev) => ({
      ...prev,
      [listId]: (prev[listId] ?? []).filter((i) => i.id !== item.id),
    }))

    undo.schedule({
      label: t('undo.deletedItem', { description: item.description }),
      commit: async () => {
        try {
          await api.deleteItem(listId, item.id)
        } catch {
          setItemsByList((prev) => ({
            ...prev,
            [listId]: [...(prev[listId] ?? []), item].sort((a, b) => a.id - b.id),
          }))
        } finally {
          pendingDeletedItemIds.current.delete(item.id)
        }
      },
      undo: () => {
        setItemsByList((prev) => ({
          ...prev,
          [listId]: [...(prev[listId] ?? []), item].sort((a, b) => a.id - b.id),
        }))
        pendingDeletedItemIds.current.delete(item.id)
      },
    })
  }

  const sync = useSyncStatus()

  const connectionState = useTodoSyncHub({
    onListChanged: async (entityId, op) => {
      if (!bootstrappedRef.current) return
      if (op === OP_DELETE) {
        setLists((prev) => prev.filter((l) => l.id !== entityId))
        setItemsByList((prev) => {
          if (!(entityId in prev)) return prev
          const next = { ...prev }
          delete next[entityId]
          return next
        })
        setSelectedId((prev) => (prev === entityId ? null : prev))
        return
      }
      try {
        const fresh = await api.getLists()
        setLists((prev) =>
          mergeLists(
            prev,
            fresh,
            pendingDeletedListIds.current,
            inFlightListUpdateIds.current,
          ),
        )
        setItemsByList((prev) => {
          const next = { ...prev }
          for (const l of fresh) if (!(l.id in next)) next[l.id] = []
          return next
        })
      } catch (e) {
        console.error('[onListChanged] refetch failed', e)
      }
      void sync.refresh()
    },

    onItemChanged: async (entityId, op) => {
      if (!bootstrappedRef.current) return

      if (op === OP_DELETE) {
        setItemsByList((prev) => {
          if (pendingDeletedItemIds.current.has(entityId)) return prev
          const next: Record<number, TodoListItem[]> = {}
          let mutated = false
          for (const k of Object.keys(prev)) {
            const id = Number(k)
            const before = prev[id]
            const after = before.filter((i) => i.id !== entityId)
            if (after.length !== before.length) mutated = true
            next[id] = after
          }
          return mutated ? next : prev
        })
        void sync.refresh()
        return
      }

      if (op === OP_UPDATE) {
        const parentListId = findParentListId(itemsByListRef.current, entityId)
        if (parentListId !== null) {
          try {
            const fresh = await api.getItems(parentListId)
            setItemsByList((prev) => ({
              ...prev,
              [parentListId]: mergeItemsForList(
                prev[parentListId] ?? [],
                fresh,
                pendingDeletedItemIds.current,
                inFlightItemUpdateIds.current,
              ),
            }))
          } catch (e) {
            console.error('[onItemChanged] update refetch failed', e)
          }
          void sync.refresh()
          return
        }
      }

      // CREATE, or UPDATE for an unknown-parent item → full refetch.
      try {
        const freshLists = await api.getLists()
        const entries = await Promise.all(
          freshLists.map(async (l) => [l.id, await api.getItems(l.id)] as const),
        )
        const fromServer: Record<number, TodoListItem[]> = {}
        for (const [id, items] of entries) fromServer[id] = items
        setLists((prev) =>
          mergeLists(
            prev,
            freshLists,
            pendingDeletedListIds.current,
            inFlightListUpdateIds.current,
          ),
        )
        setItemsByList((prev) =>
          mergeItemsByList(
            prev,
            fromServer,
            pendingDeletedItemIds.current,
            inFlightItemUpdateIds.current,
            pendingDeletedListIds.current,
          ),
        )
      } catch (e) {
        console.error('[onItemChanged] full refetch failed', e)
      }
      void sync.refresh()
    },

    onResync: async () => {
      if (!bootstrappedRef.current) return
      try {
        const freshLists = await api.getLists()
        const entries = await Promise.all(
          freshLists.map(async (l) => [l.id, await api.getItems(l.id)] as const),
        )
        const fromServer: Record<number, TodoListItem[]> = {}
        for (const [id, items] of entries) fromServer[id] = items
        setLists((prev) =>
          mergeLists(
            prev,
            freshLists,
            pendingDeletedListIds.current,
            inFlightListUpdateIds.current,
          ),
        )
        setItemsByList((prev) =>
          mergeItemsByList(
            prev,
            fromServer,
            pendingDeletedItemIds.current,
            inFlightItemUpdateIds.current,
            pendingDeletedListIds.current,
          ),
        )
      } catch (e) {
        console.error('[onResync] failed', e)
      }
      void sync.refresh()
    },
  })

  const selectedList = useMemo(
    () => lists.find((l) => l.id === selectedId) ?? null,
    [lists, selectedId],
  )
  const selectedItems = selectedId !== null ? itemsByList[selectedId] ?? [] : []

  return (
    <div className="app-shell">
      <div className="app-grain" aria-hidden />
      <main className="app">
        <Header connectionState={connectionState} sync={sync} />

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
                autoFocusInput={autoFocusListId === selectedList.id}
                onAutoFocusConsumed={() => setAutoFocusListId(null)}
              />
            ) : (
              <section className="empty-shell">
                <span className="empty-shell-glyph" aria-hidden>
                  ✿
                </span>
                <p className="empty-shell-title">{t('empty.noLists')}</p>
                <p className="empty-shell-sub">{t('empty.startWithOne')}</p>
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
