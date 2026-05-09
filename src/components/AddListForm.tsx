import { useState, type FormEvent } from 'react'

interface Props {
  onAdd: (name: string) => Promise<void> | void
  disabled?: boolean
}

function AddListForm({ onAdd, disabled }: Props) {
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    try {
      await onAdd(trimmed)
      setValue('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="add-list-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="New list..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled || submitting}
      />
      <button type="submit" disabled={disabled || submitting || !value.trim()}>
        +
      </button>
    </form>
  )
}

export default AddListForm
