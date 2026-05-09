import { useEffect, useState } from 'react'
import * as api from '../api/client'
import type { TodoListItem } from '../api/types'
import TodoItemRow from './TodoItemRow'
import AddTodoForm from './AddTodoForm'

interface Props {
  listId: number
}

function TodoListView({ listId }: Props) {
  const [items, setItems] = useState<TodoListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .getItems(listId)
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [listId])

  async function handleAdd(description: string) {
    try {
      const created = await api.createItem(listId, description)
      setItems((prev) => [...prev, created])
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function handleToggle(item: TodoListItem) {
    try {
      const updated = await api.updateItem(listId, item.id, {
        description: item.description,
        isCompleted: !item.isCompleted,
      })
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function handleDelete(item: TodoListItem) {
    try {
      await api.deleteItem(listId, item.id)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <section className="todo-list">
      <AddTodoForm onAdd={handleAdd} disabled={loading} />
      {error && <div className="banner banner-error">{error}</div>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="muted">No todos yet. Add your first one above.</p>
      ) : (
        <ul className="todo-rows">
          {items.map((item) => (
            <TodoItemRow
              key={item.id}
              item={item}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

export default TodoListView
