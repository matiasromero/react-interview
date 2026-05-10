
# react-interview

This is a simple React application using Vite as the build tool. Candidates are expected to build a Todo List UI by consuming the provided API. The scaffold includes basic setup and configurations to get started quickly.

The app is also wired to the backend's SignalR hub for realtime sync — see [Realtime sync](#realtime-sync-signalr) below.

## Running with dev containers

This project ships a `.devcontainer/` so the whole environment (Node 22 + tooling) is reproducible.

1. Open the repo in VS Code with the **Dev Containers** extension installed.
2. Run **"Dev Containers: Reopen in Container"**. The first build runs `npm install` automatically (`postCreateCommand`).
3. Inside the container, start the dev server with `npm run dev`. Vite binds to `0.0.0.0:5173` and the port is forwarded to the host. Open `http://localhost:5173` in your host browser.

### Connecting to the backend (`dotnet-interview`)

The frontend calls the backend at `/api/*`, which Vite proxies to the API. The default target is `https://host.docker.internal:7027`, which assumes:

- The `dotnet-interview` API runs in its own devcontainer and port-forwards `7027` to the host.
- This frontend reaches the host (and therefore the API) via `host.docker.internal` (Docker Desktop on macOS/Windows).

If the backend is reachable somewhere else, override the proxy target by creating a `.env.local` (see `.env.example`):

```bash
VITE_API_PROXY_TARGET=https://localhost:7027
```

Use `https://localhost:7027` when running `npm run dev` directly on the host (no devcontainer).

## Realtime sync (SignalR)

Beyond REST, the app subscribes to the backend's `TodoSyncHub` so changes from any client (other tabs, other users, direct API calls) propagate without a page reload.

### How it works

- A WebSocket connection is opened against `/hubs/todosync` (Vite proxies it to the same backend target as `/api`, with `ws: true`).
- The hub broadcasts a small `ChangeNotification` payload (`{ eventId, entityType, entityId, operation, occurredAt }`) on every list/item create, update, or delete.
- On each event the client refetches the affected REST endpoint — the REST API stays the source of truth, the hub just nudges.
- A `Map<eventId, timestamp>` deduplicates events within a 60 s window to absorb reconnect-time replay.
- On reconnect, a full bootstrap (`onResync`) catches up everything that happened during the outage (the hub does not replay events).

### Connection state

A small dot in the header shows the current state, with an `aria-label` / `title` translated via the i18n layer:

- Green — `connected`.
- Amber, pulsing — `connecting` / `reconnecting`.
- Red — `disconnected` (retry budget exhausted; reload the page to retry manually).

### Optimistic-state preservation

A naive "refetch and replace" would stomp on optimistic UI. The merge layer (`src/api/sync-merge.ts`) preserves:

- Items with negative `tempId` (in-flight creates).
- Items / lists currently being updated locally — fields the user just touched (`isCompleted`, `description`, `name`) are kept from local state until the PUT resolves.
- Items / lists in the 5 s undo window after a delete — they are dropped from the server response so the broadcast doesn't resurrect them mid-undo.

### Files involved (realtime)

- `src/api/hub.ts` — `HubConnection` factory with auto-reconnect schedule.
- `src/hooks/useTodoSyncHub.ts` — connection lifecycle, dedupe, exposes `ConnectionState`.
- `src/api/sync-merge.ts` — pure merge functions.
- `src/components/ConnectionIndicator.tsx` — header dot.
- `src/App.tsx` — wires the hook with refs that track in-flight / pending-delete IDs.
- `vite.config.ts` — `/hubs` proxy with `ws: true`.

For the full backend contract see `docs/realtime-frontend-integration.md` in the `dotnet-interview` repo.

## External sync (background worker)

In addition to local persistence + SignalR fan-out, the backend mirrors every list and item to a third-party service. A worker on the API side reads from an **outbox** table and pushes/pulls changes on a fixed interval. When the third-party service is unreachable, changes pile up in the outbox — the frontend gives that pipeline visibility and lets you trigger a run on demand.

### Endpoints

- `GET /api/sync/status` → `SyncStatusResponse`
  - `lastRuns: SyncRunSummary[]` — one entry per (`entityType` × `direction`): four combinations (`List`/`Item` × `Push`/`Pull`) with `startedAt`, `finishedAt`, `status`, `itemsProcessed`, `itemsFailed`, `error`.
  - `pendingOutboxCount` — local changes queued for the next push.
  - `oldestPendingOutboxOccurredAt` — timestamp of the oldest pending entry (used to detect a stale outbox).
  - `config` — `interval`, `enabled`, `outboxBatchSize`, etc.
- `POST /api/sync/run` → `SyncRunResponse` with `listPush`, `itemPush`, `listPull`, `itemPull` (each: `total`, `pushed`, `failed`, `status`).

The numeric enums returned by the API:

- `SyncEntityType`: `1` = List, `2` = Item.
- `SyncDirection`: `1` = Push, `2` = Pull.
- `SyncRunStatus`: `1` = Running, `2` = Succeeded, `3` = PartialFailure, `4` = Failed.

### How the frontend consumes it

- The hook `useSyncStatus` exposes `status`, `runState`, `refresh()` and `runNow()` without any background polling.
- The `SyncIndicator` component renders a pill in the header and a popover.
- Refresh policy: on mount, on popover open, after a manual run, and after every SignalR notification (`onListChanged`, `onItemChanged`, `onResync`). No polling — the pill stays current by leveraging the realtime channel that already runs.

### Header indicator (pill)

A small refresh glyph (↻) next to `ConnectionIndicator`. It rotates while a manual run is in flight, and shows a numeric badge when `pendingOutboxCount > 0`. The pill background changes tone:

- **mint** (`ok`) — all runs OK, outbox empty.
- **peach** (`warn`) — `pendingOutboxCount > 0` or some run finished in `PartialFailure`.
- **rose** (`error`) — at least one `Failed` run, or the oldest pending entry is older than 5 minutes.
- **sky** (`busy`) — manual run in flight.
- **grey** (`muted`) — no data yet, fetch failed, or `config.enabled === false`.

### Popover

- Summary: `Last synced …` + outbox state (`All changes synced` / `N changes waiting to sync`).
- 2×2 grid (rows `Lists` / `Tasks`, columns `Push` / `Pull`). Each cell shows:
  - Status glyph: `✓` Succeeded, `⚠` PartialFailure, `✕` Failed, `⏳` Running, `—` no data.
  - Counts `processed / failed` mapped from `itemsProcessed / itemsFailed`.
  - Native `title` with the backend `error` message when present.
- **Sync now** button → `POST /api/sync/run`, disabled while a run is in flight.
- Footer with the auto-sync cadence (`auto every 1 min`) or `Background sync is off` when `config.enabled === false`.
- **`?` help toggle** in the header → expands an inline guide that documents push/pull, the status glyphs, the counts format, and the pill colors. Translated via the i18n layer (`sync.help.*`).

### Files involved (external sync)

- `src/api/client.ts` — `getSyncStatus()`, `runSync()`.
- `src/api/types.ts` — `SyncStatusResponse`, `SyncRunResponse` and friends.
- `src/hooks/useSyncStatus.ts` — fetch + manual run, no background polling.
- `src/components/SyncIndicator.tsx` — pill, popover, inline help panel.
- `src/components/Header.tsx` — mounts the indicator next to `ConnectionIndicator`.
- `src/App.tsx` — instantiates the hook and re-fetches status after every realtime event.
- `src/App.css` — `.sync-*` classes (pill tones, popover, help).
- `src/i18n/messages.ts` — `sync.*` and `sync.help.*` keys (en + es).

## Running without dev containers

If you prefer running on the host directly:

```bash
npm install
echo 'VITE_API_PROXY_TARGET=https://localhost:7027' > .env.local
npm run dev
```

The same scripts apply: `npm run lint`, `npm run build`, `npm run preview`.

## Contact

- Martín Fernández (mfernandez@crunchloop.io)

## About Crunchloop

![crunchloop](https://s3.amazonaws.com/crunchloop.io/logo-blue.png)

We strongly believe in giving back :rocket:. Let's work together [`Get in touch`](https://crunchloop.io/#contact).
