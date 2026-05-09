function formatDate(d: Date): string {
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' })
  const month = d.toLocaleDateString('en-US', { month: 'short' })
  const day = d.getDate()
  const year = d.getFullYear()
  return `${weekday} · ${month} ${day} · ${year}`
}

function Header() {
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
      <div className="masthead-date" aria-label={`Today is ${today}`}>
        {today}
      </div>
    </header>
  )
}

export default Header
