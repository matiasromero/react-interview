import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { motion } from 'motion/react'

interface Props {
  onAdd: (name: string) => Promise<void> | void
  disabled?: boolean
}

function AddListForm({ onAdd, disabled }: Props) {
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [active, setActive] = useState(false)

  async function commit() {
    const trimmed = value.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    try {
      await onAdd(trimmed)
      setValue('')
      setActive(false)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await commit()
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setValue('')
      setActive(false)
      ;(e.currentTarget as HTMLInputElement).blur()
    }
  }

  return (
    <motion.form
      className={`add-list-card${active ? ' is-active' : ''}`}
      onSubmit={handleSubmit}
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      aria-label="Create a new list"
    >
      <span className="add-list-card-plus" aria-hidden>
        +
      </span>
      <input
        type="text"
        placeholder="new list"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setActive(true)}
        onBlur={() => {
          if (!value.trim()) setActive(false)
        }}
        onKeyDown={handleKey}
        disabled={disabled || submitting}
        aria-label="New list name"
      />
      <button
        type="submit"
        className="add-list-card-submit"
        disabled={disabled || submitting || !value.trim()}
        aria-label="Create list"
      >
        ↵
      </button>
    </motion.form>
  )
}

export default AddListForm
