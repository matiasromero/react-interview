import { motion } from 'motion/react'
import type { TodoListItem } from '../api/types'

interface Props {
  item: TodoListItem
  onToggle: (item: TodoListItem) => void
  onDelete: (item: TodoListItem) => void
}

function TodoItemRow({ item, onToggle, onDelete }: Props) {
  const checked = item.isCompleted

  return (
    <motion.li
      layout
      className={`todo-row${checked ? ' is-done' : ''}`}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16, height: 0, marginTop: 0, marginBottom: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={`${checked ? 'Mark as not done' : 'Mark as done'}: ${item.description}`}
        className={`todo-check${checked ? ' is-checked' : ''}`}
        onClick={() => onToggle(item)}
      >
        <motion.svg
          viewBox="0 0 22 22"
          width="22"
          height="22"
          aria-hidden
        >
          <motion.circle
            cx="11"
            cy="11"
            r="9.25"
            fill="none"
            strokeWidth="1.6"
            className="todo-check-ring"
          />
          <motion.path
            d="M6.5 11.6 L9.6 14.5 L15.5 7.8"
            fill="none"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="todo-check-mark"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          />
        </motion.svg>
      </button>

      <span className="todo-row-text">
        <span className="todo-row-text-inner">{item.description}</span>
        <motion.span
          className="todo-row-strike"
          aria-hidden
          initial={false}
          animate={{ scaleX: checked ? 1 : 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 28 }}
        />
      </span>

      <button
        type="button"
        className="todo-row-delete"
        aria-label={`Delete ${item.description}`}
        onClick={() => onDelete(item)}
      >
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
          <path
            d="M4 4 L12 12 M12 4 L4 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </motion.li>
  )
}

export default TodoItemRow
