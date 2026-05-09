import type { TodoList, TodoListItem } from '../api/types'

interface Props {
  list: TodoList
  items: TodoListItem[]
  active: boolean
  onSelect: (id: number) => void
}

function TodoListRow({ list, items, active, onSelect }: Props) {
  const total = items.length
  const done = items.filter((i) => i.isCompleted).length

  return (
    <li>
      <button
        type="button"
        className={`todo-list-row${active ? ' active' : ''}`}
        onClick={() => onSelect(list.id)}
      >
        <span className="todo-list-row-name">{list.name}</span>
        {total > 0 && (
          <span className="todo-list-row-count">
            {done}/{total}
          </span>
        )}
      </button>
    </li>
  )
}

export default TodoListRow
