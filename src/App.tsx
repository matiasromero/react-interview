import { useEffect, useState } from 'react'
import * as api from './api/client'
import TodoListView from './components/TodoListView'
import './App.css'

const DEFAULT_LIST_NAME = 'My Todos'

function App() {
  const [listId, setListId] = useState<number | null>(null)
  const [listName, setListName] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function bootstrap() {
      try {
        const lists = await api.getLists()
        if (cancelled) return
        const list = lists[0] ?? (await api.createList(DEFAULT_LIST_NAME))
        if (cancelled) return
        setListId(list.id)
        setListName(list.name)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      }
    }
    bootstrap()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="app">
      <h1>{listName || 'Todos'}</h1>
      {error && <div className="banner banner-error">{error}</div>}
      {listId === null && !error ? (
        <p className="muted">Loading…</p>
      ) : listId !== null ? (
        <TodoListView listId={listId} />
      ) : null}
    </main>
  )
}

export default App
