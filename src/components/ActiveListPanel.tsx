import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { TodoList, TodoListItem } from '../api/types'
import TodoItemRow from './TodoItemRow'
import AddTodoForm from './AddTodoForm'
import { getPastelForList, pastelStyleVars } from '../design/palette'

interface Props {
  list: TodoList
  items: TodoListItem[]
  onAddItem: (description: string) => Promise<void> | void
  onToggleItem: (item: TodoListItem) => Promise<void> | void
  onDeleteItem: (item: TodoListItem) => void
  onRenameList: (name: string) => Promise<void> | void
  onDeleteList: () => void
  autoFocusInput?: boolean
  onAutoFocusConsumed?: () => void
}

function ActiveListPanel({
  list,
  items,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onRenameList,
  onDeleteList,
  autoFocusInput,
  onAutoFocusConsumed,
}: Props) {
  const pastel = getPastelForList(list.id)
  const total = items.length
  const done = items.filter((i) => i.isCompleted).length

  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(list.name)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraftName(list.name)
    setError(null)
  }, [list.id, list.name])

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

  return (
    <motion.section
      layout
      className="active-panel"
      style={pastelStyleVars(pastel)}
      data-pastel={pastel.name}
      transition={{ type: 'spring', stiffness: 280, damping: 32 }}
    >
      <motion.div layout="position" className="active-panel-inner">
        <header className="active-panel-header">
          <div className="active-panel-titlewrap">
            {editing ? (
              <input
                ref={inputRef}
                className="active-panel-title-input"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={handleKey}
                aria-label="Rename list"
              />
            ) : (
              <h2
                className="active-panel-title"
                onDoubleClick={startEdit}
                title="Double-click to rename"
              >
                {list.name}
              </h2>
            )}
            <p className="active-panel-subtitle">
              {total === 0 ? (
                'no tasks yet'
              ) : (
                <>
                  <span className="active-panel-num">{done}</span> of{' '}
                  <span className="active-panel-num">{total}</span> done
                </>
              )}
            </p>
          </div>

          <div className="active-panel-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={startEdit}
              aria-label={`Rename list ${list.name}`}
              title="Rename (or double-click title)"
            >
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden>
                <path
                  d="M4 14.5V16h1.5l8.1-8.1-1.5-1.5L4 14.5zM15.7 6.3a1 1 0 0 0 0-1.4l-.6-.6a1 1 0 0 0-1.4 0l-1.1 1.1 1.5 1.5 1.6-.6z"
                  fill="currentColor"
                />
              </svg>
            </button>
            <button
              type="button"
              className="icon-btn icon-btn-danger"
              onClick={onDeleteList}
              aria-label={`Delete list ${list.name}`}
              title="Delete list"
            >
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden>
                <path
                  d="M6 4V3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1h3v2H3V4h3zm1 4h2v8H7V8zm4 0h2v8h-2V8zM5 7h10l-.7 10a2 2 0 0 1-2 1.9H7.7a2 2 0 0 1-2-1.9L5 7z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </header>

        <AddTodoForm
          onAdd={handleAdd}
          autoFocus={autoFocusInput}
          onAutoFocused={onAutoFocusConsumed}
        />

        {error && (
          <div className="banner banner-error" role="alert">
            {error}
          </div>
        )}

        {items.length === 0 ? (
          <div className="active-panel-empty">
            <span className="active-panel-empty-glyph" aria-hidden>
              ✸
            </span>
            <p>all clear</p>
            <p className="active-panel-empty-sub">add your first task above</p>
          </div>
        ) : (
          <ul className="todo-rows">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <TodoItemRow
                  key={item.id}
                  item={item}
                  onToggle={handleToggle}
                  onDelete={onDeleteItem}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </motion.div>
    </motion.section>
  )
}

export default ActiveListPanel
