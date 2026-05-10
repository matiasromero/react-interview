import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
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
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [canScroll, setCanScroll] = useState({ left: false, right: false })

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const update = () => {
      const max = el.scrollWidth - el.clientWidth
      setCanScroll({
        left: el.scrollLeft > 1,
        right: el.scrollLeft < max - 1,
      })
    }

    update()
    el.addEventListener('scroll', update, { passive: true })

    const ro = new ResizeObserver(update)
    ro.observe(el)
    const track = el.firstElementChild
    if (track) ro.observe(track)

    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [lists.length])

  return (
    <section className="lists-board" aria-label={t('lists.aria')}>
      <div className="lists-board-header">
        <h2 className="section-eyebrow">{t('lists.heading')}</h2>
        <span className="section-hint">{t('lists.hint')}</span>
      </div>

      <div className="lists-board-grid">
        <div
          ref={scrollerRef}
          className="lists-board-scroller"
          data-can-scroll-left={canScroll.left || undefined}
          data-can-scroll-right={canScroll.right || undefined}
        >
          <motion.div
            className="lists-board-track"
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
                className="list-card-slot"
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
          </motion.div>
        </div>
        <motion.div
          className="add-list-slot"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.15 }}
        >
          <AddListForm onAdd={onAddList} />
        </motion.div>
      </div>
    </section>
  )
}

export default ListsBoard
