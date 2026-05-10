import { useT } from '../i18n/I18nContext'
import type { ConnectionState } from '../hooks/useTodoSyncHub'
import type { MessageKey } from '../i18n/messages'

interface Props {
  state: ConnectionState
}

function labelKey(state: ConnectionState): MessageKey {
  if (state === 'connected') return 'connection.connected'
  if (state === 'disconnected') return 'connection.disconnected'
  return 'connection.reconnecting'
}

function ConnectionIndicator({ state }: Props) {
  const { t } = useT()
  const label = t(labelKey(state))
  return (
    <span
      className="connection-dot"
      data-state={state}
      role="status"
      aria-label={label}
      title={label}
    />
  )
}

export default ConnectionIndicator
