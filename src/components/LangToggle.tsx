import { useT } from '../i18n/I18nContext'

function LangToggle() {
  const { lang, setLang, t } = useT()
  const target = lang === 'en' ? 'es' : 'en'
  const aria = t('lang.toggleAria', { target: t(`lang.${target}` as const) })

  return (
    <button
      type="button"
      className="masthead-btn masthead-btn-text"
      onClick={() => setLang(target)}
      aria-label={aria}
      title={aria}
    >
      {target.toUpperCase()}
    </button>
  )
}

export default LangToggle
