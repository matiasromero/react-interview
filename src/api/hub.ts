import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from '@microsoft/signalr'

const RETRY_SCHEDULE_MS = [0, 2000, 5000, 10_000, 20_000]

export function createHubConnection(): HubConnection {
  return new HubConnectionBuilder()
    .withUrl('/hubs/todosync')
    .withAutomaticReconnect(RETRY_SCHEDULE_MS)
    .configureLogging(LogLevel.Warning)
    .build()
}
