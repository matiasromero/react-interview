import type { TodoList, TodoListItem } from '../api/types'
import TodoListRow from './TodoListRow'
import AddListForm from './AddListForm'

interface Props {
  lists: TodoList[]
  itemsByList: Record<number, TodoListItem[]>
  selectedId: number | null
  onSelect: (id: number) => void
  onAddList: (name: string) => Promise<void> | void
}

function Sidebar({ lists, itemsByList, selectedId, onSelect, onAddList }: Props) {
  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">Lists</h2>
      {lists.length === 0 ? (
        <p className="muted sidebar-empty">No lists yet.</p>
      ) : (
        <ul className="sidebar-rows">
          {lists.map((list) => (
            <TodoListRow
              key={list.id}
              list={list}
              items={itemsByList[list.id] ?? []}
              active={list.id === selectedId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
      <AddListForm onAdd={onAddList} />
    </aside>
  )
}

export default Sidebar
