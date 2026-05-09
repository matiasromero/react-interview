import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { TodoList, TodoListItem } from '../api/types'
import TodoItemRow from './TodoItemRow'
import AddTodoForm from './AddTodoForm'

interface Props {
  list: TodoList
  items: TodoListItem[]
  onAddItem: (description: string) => Promise<void> | void
  onToggleItem: (item: TodoListItem) => Promise<void> | void
  onDeleteItem: (item: TodoListItem) => Promise<void> | void
  onRenameList: (name: string) => Promise<void> | void
  onDeleteList: () => Promise<void> | void
}

function TodoListView({
  list,
  items,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onRenameList,
  onDeleteList,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(list.name)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function startEdit() {
    setDraftName(list.name)
    setEditing(true)
  }

  async function commitEdit() {
    if (!editing) return
    const trimmed = draftName.trim()
    setEditing(false)
    if (!trimmed || trimmed === list.name) return
    try {
      await onRenameList(trimmed)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  function cancelEdit() {
    setEditing(false)
    setDraftName(list.name)
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      void commitEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    }
  }

  async function handleDelete() {
    const ok = window.confirm(`Delete "${list.name}" and all its items?`)
    if (!ok) return
    try {
      await onDeleteList()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function handleAdd(description: string) {
    try {
      await onAddItem(description)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function handleToggle(item: TodoListItem) {
    try {
      await onToggleItem(item)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function handleDeleteItem(item: TodoListItem) {
    try {
      await onDeleteItem(item)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <section className="todo-list">
      <header className="todo-list-header">
        {editing ? (
          <input
            ref={inputRef}
            className="todo-list-name-input"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKey}
          />
        ) : (
          <h2 className="todo-list-name">{list.name}</h2>
        )}
        <div className="todo-list-actions">
          {!editing && (
            <button type="button" onClick={startEdit}>
              Rename
            </button>
          )}
          <button
            type="button"
            className="todo-list-delete"
            aria-label={`Delete list ${list.name}`}
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      </header>
      <AddTodoForm onAdd={handleAdd} />
      {error && <div className="banner banner-error">{error}</div>}
      {items.length === 0 ? (
        <p className="muted">No todos yet. Add your first one above.</p>
      ) : (
        <ul className="todo-rows">
          {items.map((item) => (
            <TodoItemRow
              key={item.id}
              item={item}
              onToggle={handleToggle}
              onDelete={handleDeleteItem}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

export default TodoListView
