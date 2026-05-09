import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { motion } from 'motion/react'
import type { TodoList, TodoListItem } from '../api/types'
import { getPastelForList, pastelStyleVars } from '../design/palette'

interface Props {
  list: TodoList
  items: TodoListItem[]
  active: boolean
  onSelect: (id: number) => void
  onRename: (name: string) => Promise<void> | void
}

function ListCard({ list, items, active, onSelect, onRename }: Props) {
  const pastel = getPastelForList(list.id)
  const total = items.length
  const done = items.filter((i) => i.isCompleted).length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(list.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(list.name)
  }, [list.name, editing])

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation()
    setDraft(list.name)
    setEditing(true)
  }

  async function commitEdit() {
    const trimmed = draft.trim()
    setEditing(false)
    if (!trimmed || trimmed === list.name) return
    try {
      await onRename(trimmed)
    } catch {
      setDraft(list.name)
    }
  }

  function cancelEdit() {
    setEditing(false)
    setDraft(list.name)
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      void commitEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      cancelEdit()
    }
  }

  return (
    <motion.button
      type="button"
      layout
      layoutId={`list-card-${list.id}`}
      className={`list-card${active ? ' is-active' : ''}`}
      style={pastelStyleVars(pastel)}
      data-pastel={pastel.name}
      onClick={() => onSelect(list.id)}
      onDoubleClick={startEdit}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      aria-pressed={active}
      aria-label={`Open list ${list.name}`}
    >
      <span className="list-card-meta">
        <span className="list-card-dot" aria-hidden />
        <span className="list-card-count">
          {done}<span className="list-card-count-sep">/</span>{total}
        </span>
      </span>

      {editing ? (
        <input
          ref={inputRef}
          className="list-card-name list-card-name-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={onKey}
          aria-label="Rename list"
        />
      ) : (
        <span className="list-card-name" title="Double-click to rename">
          {list.name}
        </span>
      )}

      <span className="list-card-progress" aria-hidden>
        <span className="list-card-progress-track">
          <motion.span
            className="list-card-progress-fill"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: 'spring', stiffness: 220, damping: 28 }}
          />
        </span>
        <span className="list-card-progress-pct">{pct}%</span>
      </span>
    </motion.button>
  )
}

export default ListCard
