
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

### Files involved

- `src/api/hub.ts` — `HubConnection` factory with auto-reconnect schedule.
- `src/hooks/useTodoSyncHub.ts` — connection lifecycle, dedupe, exposes `ConnectionState`.
- `src/api/sync-merge.ts` — pure merge functions.
- `src/components/ConnectionIndicator.tsx` — header dot.
- `src/App.tsx` — wires the hook with refs that track in-flight / pending-delete IDs.
- `vite.config.ts` — `/hubs` proxy with `ws: true`.

For the full backend contract see `docs/realtime-frontend-integration.md` in the `dotnet-interview` repo.

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
