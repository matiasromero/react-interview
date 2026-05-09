import { useT } from '../i18n/I18nContext'
import ThemeToggle from './ThemeToggle'
import LangToggle from './LangToggle'

function Header() {
  const { formatDate, t } = useT()
  const today = formatDate(new Date())
  return (
    <header className="masthead">
      <div className="masthead-brand">
        <span className="masthead-mark" aria-hidden>
          ✿
        </span>
        <span className="masthead-wordmark">
          <span className="masthead-wordmark-italic">to</span>dos
        </span>
      </div>
      <div className="masthead-end">
        <div className="masthead-date" aria-label={t('header.todayIs', { date: today })}>
          {today}
        </div>
        <div className="masthead-controls">
          <ThemeToggle />
          <LangToggle />
        </div>
      </div>
    </header>
  )
}

export default Header
