import type { TodoListItem } from '../api/types'

interface Props {
  item: TodoListItem
  onToggle: (item: TodoListItem) => void
  onDelete: (item: TodoListItem) => void
}

function TodoItemRow({ item, onToggle, onDelete }: Props) {
  return (
    <li className={`todo-row${item.isCompleted ? ' completed' : ''}`}>
      <label className="todo-row-label">
        <input
          type="checkbox"
          checked={item.isCompleted}
          onChange={() => onToggle(item)}
        />
        <span>{item.description}</span>
      </label>
      <button
        type="button"
        className="todo-row-delete"
        aria-label={`Delete ${item.description}`}
        onClick={() => onDelete(item)}
      >
        ×
      </button>
    </li>
  )
}

export default TodoItemRow
