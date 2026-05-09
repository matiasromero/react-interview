import { useState, type FormEvent } from 'react'

interface Props {
  onAdd: (description: string) => Promise<void> | void
  disabled?: boolean
}

function AddTodoForm({ onAdd, disabled }: Props) {
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
    <form className="add-todo-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Add a todo..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled || submitting}
      />
      <button type="submit" disabled={disabled || submitting || !value.trim()}>
        Add
      </button>
    </form>
  )
}

export default AddTodoForm
