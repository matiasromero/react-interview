import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Theme = 'light' | 'dark' | 'system'
export type Resolved = 'light' | 'dark'

const STORAGE_KEY = 'theme'
const MQ = '(prefers-color-scheme: dark)'

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // ignore
  }
  return 'system'
}

function getSystemResolved(): Resolved {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia(MQ).matches ? 'dark' : 'light'
}

interface ThemeContextValue {
  theme: Theme
  resolved: Resolved
  setTheme: (next: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)
  const [systemResolved, setSystemResolved] = useState<Resolved>(getSystemResolved)

  // Subscribe to OS-level changes; only relevant when theme === 'system',
  // but keeping the listener alive is cheap and avoids re-subscribing churn.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(MQ)
    const handler = (e: MediaQueryListEvent) => setSystemResolved(e.matches ? 'dark' : 'light')
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const resolved: Resolved = theme === 'system' ? systemResolved : theme

  // Apply to <html> and persist.
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') {
      delete root.dataset.theme
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // ignore
      }
    } else {
      root.dataset.theme = theme
      try {
        localStorage.setItem(STORAGE_KEY, theme)
      } catch {
        // ignore
      }
    }
  }, [theme])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolved, setTheme }),
    [theme, resolved, setTheme],
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
