import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'

interface Props {
  onAdd: (description: string) => Promise<void> | void
  disabled?: boolean
  autoFocus?: boolean
  onAutoFocused?: () => void
}

const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform)

function AddTodoForm({ onAdd, disabled, autoFocus, onAutoFocused }: Props) {
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus()
      onAutoFocused?.()
    }
  }, [autoFocus, onAutoFocused])

  async function commit(keepFocus: boolean) {
    const trimmed = value.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    try {
      await onAdd(trimmed)
      setValue('')
      if (keepFocus) inputRef.current?.focus()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await commit(false)
  }

  async function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      await commit(true)
    }
  }

  return (
    <form className="add-todo-form" onSubmit={handleSubmit}>
      <span className="add-todo-form-plus" aria-hidden>
        +
      </span>
      <input
        ref={inputRef}
        type="text"
        placeholder="add a task..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        disabled={disabled || submitting}
        aria-label="New task"
      />
      <span className="add-todo-form-hint" aria-hidden>
        <kbd>{isMac ? '⌘' : 'Ctrl'}</kbd>
        <kbd>↵</kbd>
      </span>
      <button
        type="submit"
        className="add-todo-form-submit"
        disabled={disabled || submitting || !value.trim()}
      >
        Add
      </button>
    </form>
  )
}

export default AddTodoForm
