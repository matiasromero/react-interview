import { useState, type FormEvent, type KeyboardEvent } from 'react'
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
    <form
      className={`add-list-card${active ? ' is-active' : ''}`}
      onSubmit={handleSubmit}
      aria-label={t('addList.aria')}
    >
      <span className="add-list-card-meta">
        <span className="add-list-card-plus" aria-hidden>
          +
        </span>
      </span>
      <span className="add-list-card-body">
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
      </span>
      <span className="add-list-card-foot">
        <button
          type="submit"
          className="add-list-card-submit"
          disabled={disabled || submitting || !value.trim()}
          aria-label={t('addList.submit')}
        >
          ↵
        </button>
      </span>
    </form>
  )
}

export default AddListForm
