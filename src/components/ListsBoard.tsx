import { motion } from 'motion/react'
import type { TodoList, TodoListItem } from '../api/types'
import ListCard from './ListCard'
import AddListForm from './AddListForm'
import { useT } from '../i18n/I18nContext'

interface Props {
  lists: TodoList[]
  itemsByList: Record<number, TodoListItem[]>
  selectedId: number | null
  onSelect: (id: number) => void
  onAddList: (name: string) => Promise<void> | void
  onRenameList: (id: number, name: string) => Promise<void> | void
}

function ListsBoard({
  lists,
  itemsByList,
  selectedId,
  onSelect,
  onAddList,
  onRenameList,
}: Props) {
  const { t } = useT()
  return (
    <section className="lists-board" aria-label={t('lists.aria')}>
      <div className="lists-board-header">
        <h2 className="section-eyebrow">{t('lists.heading')}</h2>
        <span className="section-hint">{t('lists.hint')}</span>
      </div>

      <motion.div
        className="lists-board-grid"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
        }}
      >
        {lists.map((list) => (
          <motion.div
            key={list.id}
            variants={{
              hidden: { opacity: 0, y: 12 },
              show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 26 } },
            }}
          >
            <ListCard
              list={list}
              items={itemsByList[list.id] ?? []}
              active={list.id === selectedId}
              onSelect={onSelect}
              onRename={(name) => onRenameList(list.id, name)}
            />
          </motion.div>
        ))}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 26 } },
          }}
        >
          <AddListForm onAdd={onAddList} />
        </motion.div>
      </motion.div>
    </section>
  )
}

export default ListsBoard
