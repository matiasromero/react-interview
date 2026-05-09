import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { messages, type Lang, type MessageKey } from './messages'

const STORAGE_KEY = 'lang'

function detectInitialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'es') return stored
  } catch {
    // ignore (private mode, etc.)
  }
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('es')) {
    return 'es'
  }
  return 'en'
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : `{${key}}`,
  )
}

type TFunction = (key: MessageKey, vars?: Record<string, string | number>) => string

interface I18nContextValue {
  lang: Lang
  setLang: (next: Lang) => void
  t: TFunction
  formatDate: (date: Date) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitialLang)

  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // ignore
    }
  }, [lang])

  const setLang = useCallback((next: Lang) => setLangState(next), [])

  const t = useCallback<TFunction>(
    (key, vars) => interpolate(messages[lang][key], vars),
    [lang],
  )

  const formatDate = useCallback(
    (date: Date) => {
      const locale = lang === 'es' ? 'es-ES' : 'en-US'
      const weekday = date.toLocaleDateString(locale, { weekday: 'short' })
      const month = date.toLocaleDateString(locale, { month: 'short' })
      const day = date.getDate()
      const year = date.getFullYear()
      return `${weekday} · ${month} ${day} · ${year}`
    },
    [lang],
  )

  const value = useMemo<I18nContextValue>(
    () => ({ lang, setLang, t, formatDate }),
    [lang, setLang, t, formatDate],
  )

  return <I18nContext value={value}>{children}</I18nContext>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useT(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useT must be used within I18nProvider')
  return ctx
}
