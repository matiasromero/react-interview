import { useTheme, type Theme } from '../theme/ThemeContext'
import { useT } from '../i18n/I18nContext'

const NEXT: Record<Theme, Theme> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
}

const GLYPH: Record<Theme, string> = {
  system: '✦',
  light: '☀',
  dark: '☾',
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { t } = useT()

  const currentLabel = t(`theme.${theme}` as const)
  const aria = t('theme.toggleAria', { current: currentLabel })

  return (
    <button
      type="button"
      className="masthead-btn"
      onClick={() => setTheme(NEXT[theme])}
      aria-label={aria}
      title={aria}
      data-theme-state={theme}
    >
      <span aria-hidden>{GLYPH[theme]}</span>
    </button>
  )
}

export default ThemeToggle
