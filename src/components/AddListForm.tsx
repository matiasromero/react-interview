import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { motion } from 'motion/react'
import { useT } from '../i18n/I18nContext'

interface Props {
  onAdd: (name: string) => Promise<void> | void
  disabled?: boolean
}

function AddListForm({ onAdd, disabled }: Props) {
  const { t } = useT()
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
      aria-label={t('addList.aria')}
    >
      <span className="add-list-card-plus" aria-hidden>
        +
      </span>
      <input
        type="text"
        placeholder={t('addList.placeholder')}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setActive(true)}
        onBlur={() => {
          if (!value.trim()) setActive(false)
        }}
        onKeyDown={handleKey}
        disabled={disabled || submitting}
        aria-label={t('addList.nameAria')}
      />
      <button
        type="submit"
        className="add-list-card-submit"
        disabled={disabled || submitting || !value.trim()}
        aria-label={t('addList.submit')}
      >
        ↵
      </button>
    </motion.form>
  )
}

export default AddListForm
