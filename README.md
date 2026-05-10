
# react-interview

A React + Vite Todo SPA built against the `dotnet-interview` backend. It does the obvious things — multi-list CRUD, optimistic UI, undo on delete — and a few less obvious ones: realtime fan-out via SignalR, visibility into the backend's external-sync worker, light/dark/system theming, and `en`/`es` i18n.

The app calls the API at `/api/*` and subscribes to its SignalR hub at `/hubs/todosync` (both proxied by Vite, see [vite.config.ts](vite.config.ts)).

## Features

- **Multi-list todo management** — create, rename (double-click on the title), delete, and mark items complete. Lists get a deterministic pastel colour from [src/design/palette.ts](src/design/palette.ts).
- **Optimistic UI everywhere** — items appear before the server confirms; in-flight edits and freshly-created (temp-id) items are protected from being clobbered by background refreshes.
- **5-second undo on every delete** — both lists and items. The toast counts down and either commits or undoes on click.
- **Realtime sync (SignalR)** — changes from other tabs, other users, or direct API calls propagate without a refresh. A header dot exposes the connection state.
- **External-sync visibility** — a pill + popover surface the status of the backend's background worker (push/pull for lists and items, outbox depth, last-run errors) and let you trigger a run on demand.
- **Theming** — light / dark / system, with OS-level changes followed live.
- **Internationalization** — English and Spanish, auto-detected from the browser then persisted.
- **Smooth motion** — staggered card entry/exit, animated progress bars and checkmarks via [`motion`](https://motion.dev).

## Tech stack

- **React 19** + **TypeScript 5.7** (strict mode) — see [tsconfig.app.json](tsconfig.app.json).
- **Vite 6** with **`@vitejs/plugin-react-swc`** for fast refresh.
- **`@microsoft/signalr` 10** for the realtime channel.
- **`motion` 12** for animation.
- **ESLint 9** (`typescript-eslint`, `react-hooks`, `react-refresh`).
- **Node 22** at runtime (devcontainer image: `mcr.microsoft.com/devcontainers/typescript-node:1-22-bookworm`).

No test framework is wired in.

## Running with dev containers (recommended)

This project ships a `.devcontainer/` so the whole environment (Node 22 + tooling) is reproducible. Under the hood the devcontainer runs in **Docker Desktop** — that is the "Docker" path. There is no separate `Dockerfile` or `docker-compose.yml` to maintain.

1. Open the repo in VS Code with the **Dev Containers** extension installed.
2. Run **"Dev Containers: Reopen in Container"**. The first build runs `npm install` automatically via [.devcontainer/postCreate.sh](.devcontainer/postCreate.sh) (wired as `postCreateCommand` in [.devcontainer/devcontainer.json](.devcontainer/devcontainer.json)).
3. Inside the container, start the dev server with `npm run dev`. Vite binds to `0.0.0.0:5173` (`server.host: true` in [vite.config.ts](vite.config.ts)) and the port is forwarded to the host. Open `http://localhost:5173` in your host browser.

## Running without dev containers

If you prefer running on the host directly:

```bash
npm install
echo 'VITE_API_PROXY_TARGET=https://localhost:7027' > .env.local
npm run dev
```

The same scripts apply: `npm run lint`, `npm run build`, `npm run preview`.

## Connecting to the backend (`dotnet-interview`)

The frontend calls the backend at `/api/*` and `/hubs/*`, both proxied by Vite to the same target. The default target is `https://host.docker.internal:7027`, which assumes:

- The `dotnet-interview` API runs in its own devcontainer and port-forwards `7027` to the host.
- This frontend reaches the host (and therefore the API) via `host.docker.internal` (Docker Desktop on macOS/Windows).

If the backend is reachable somewhere else, override the proxy target by creating a `.env.local` (see [.env.example](.env.example)):

```bash
VITE_API_PROXY_TARGET=https://localhost:7027
```

Use `https://localhost:7027` when running `npm run dev` directly on the host (no devcontainer). The proxy ignores TLS errors (`secure: false`), which matters because the .NET dev server uses a self-signed cert. The `/hubs` entry is the same target with `ws: true` so SignalR's WebSocket transport upgrades cleanly.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start Vite dev server on `:5173`. |
| `npm run build` | Type-check (`tsc -b`) then produce a production bundle in `dist/`. |
| `npm run lint` | Run ESLint over the repo. |
| `npm run preview` | Serve the built bundle locally. |

## Project layout

```text
src/
├── App.tsx              # shell: wires hooks, renders Header / Board / Panel / Undo
├── App.css              # all styling (pastels, theme tokens, animations)
├── main.tsx             # mounts <ThemeProvider><I18nProvider><App/></>
├── api/
│   ├── client.ts        # REST calls (lists, items, sync)
│   ├── types.ts         # shared DTOs incl. ChangeNotification / SyncStatusResponse
│   ├── hub.ts           # SignalR HubConnection factory
│   └── sync-merge.ts    # pure merge fns that protect optimistic state
├── hooks/
│   ├── useTodoSyncHub.ts  # SignalR lifecycle + event dedupe
│   ├── useSyncStatus.ts   # external-sync status + manual run
│   └── useUndoToast.ts    # 5 s undo queue with auto-commit
├── components/
│   ├── Header.tsx, ListsBoard.tsx, ActiveListPanel.tsx,
│   ├── ListCard.tsx, TodoItemRow.tsx,
│   ├── AddListForm.tsx, AddTodoForm.tsx,
│   ├── ConnectionIndicator.tsx, SyncIndicator.tsx,
│   ├── ThemeToggle.tsx, LangToggle.tsx, UndoToast.tsx
├── i18n/
│   ├── I18nContext.tsx  # useT(), t(key, vars), formatDate()
│   └── messages.ts      # en + es message bundles
├── theme/
│   └── ThemeContext.tsx # light / dark / system, persists to localStorage
└── design/
    └── palette.ts       # pastel palettes per list id
```

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

A naive "refetch and replace" would stomp on optimistic UI. The merge layer ([src/api/sync-merge.ts](src/api/sync-merge.ts)) preserves:

- Items with negative `tempId` (in-flight creates).
- Items / lists currently being updated locally — fields the user just touched (`isCompleted`, `description`, `name`) are kept from local state until the PUT resolves.
- Items / lists in the 5 s undo window after a delete — they are dropped from the server response so the broadcast doesn't resurrect them mid-undo.

### Files involved (realtime)

- [src/api/hub.ts](src/api/hub.ts) — `HubConnection` factory with auto-reconnect schedule.
- [src/hooks/useTodoSyncHub.ts](src/hooks/useTodoSyncHub.ts) — connection lifecycle, dedupe, exposes `ConnectionState`.
- [src/api/sync-merge.ts](src/api/sync-merge.ts) — pure merge functions.
- [src/components/ConnectionIndicator.tsx](src/components/ConnectionIndicator.tsx) — header dot.
- [src/App.tsx](src/App.tsx) — wires the hook with refs that track in-flight / pending-delete IDs.
- [vite.config.ts](vite.config.ts) — `/hubs` proxy with `ws: true`.

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

- [src/api/client.ts](src/api/client.ts) — `getSyncStatus()`, `runSync()`.
- [src/api/types.ts](src/api/types.ts) — `SyncStatusResponse`, `SyncRunResponse` and friends.
- [src/hooks/useSyncStatus.ts](src/hooks/useSyncStatus.ts) — fetch + manual run, no background polling.
- [src/components/SyncIndicator.tsx](src/components/SyncIndicator.tsx) — pill, popover, inline help panel.
- [src/components/Header.tsx](src/components/Header.tsx) — mounts the indicator next to `ConnectionIndicator`.
- [src/App.tsx](src/App.tsx) — instantiates the hook and re-fetches status after every realtime event.
- [src/App.css](src/App.css) — `.sync-*` classes (pill tones, popover, help).
- [src/i18n/messages.ts](src/i18n/messages.ts) — `sync.*` and `sync.help.*` keys (en + es).

## Theming

Three modes — `light`, `dark`, `system` — exposed by [`useTheme()`](src/theme/ThemeContext.tsx) and cycled via the header button in [src/components/ThemeToggle.tsx](src/components/ThemeToggle.tsx).

- **light** / **dark** are written as `data-theme="light"` / `data-theme="dark"` on `<html>` and persisted under the `theme` key in `localStorage`.
- **system** removes both the attribute and the storage key; the resolved value follows `prefers-color-scheme: dark` and updates live via a `matchMedia('change')` listener, so swapping the OS theme re-paints without a reload.
- All colour tokens live in [src/App.css](src/App.css) under `:root` and `[data-theme="dark"]`.

## Internationalization

Two locales (`en`, `es`) live in [src/i18n/messages.ts](src/i18n/messages.ts). The provider in [src/i18n/I18nContext.tsx](src/i18n/I18nContext.tsx) exposes:

- `t(key, vars?)` — pulls the message and interpolates `{varName}` placeholders.
- `formatDate(date)` — locale-aware short date (`Sun · Jan 14 · 2026` / `dom. · ene 14 · 2026`) used by `Header`.
- `lang` / `setLang` — switching writes back to `localStorage` and updates `<html lang>`.

Initial language is picked by this fallback chain: `localStorage('lang')` → `navigator.language` starts with `es` → default `en`. The header toggle ([src/components/LangToggle.tsx](src/components/LangToggle.tsx)) flips between the two.

## Undo on delete

Every list and item delete is queued through `useUndoToast` ([src/hooks/useUndoToast.ts](src/hooks/useUndoToast.ts)) for **5 s**. During that window:

- The toast ([src/components/UndoToast.tsx](src/components/UndoToast.tsx)) shows a label and an animated progress bar; clicking **Undo** runs the `undo` callback and aborts the commit.
- The optimistic UI hides the deleted entity locally, while the merge layer in [src/api/sync-merge.ts](src/api/sync-merge.ts) drops it from any SignalR-driven refetch so a server broadcast can't resurrect it before the user decides.
- If a second delete happens while one is pending, the previous commit fires immediately (you only ever see one undo toast at a time).
- On unmount any outstanding commit fires so the server doesn't end up out of sync with the UI.

## Visual design

- **Pastel palette per list** — [src/design/palette.ts](src/design/palette.ts) maps list ids to a rotating palette (`lavender`, `peach`, `mint`, `sky`, `lemon`, `rose`). Each palette exposes `bg` / `ink` / `tint` CSS variables, so cards stay readable in both themes.
- **Motion** — [`motion`](https://motion.dev) drives staggered list entry/exit, the checkmark animation in [TodoItemRow](src/components/TodoItemRow.tsx), and the progress bar fill in [ListCard](src/components/ListCard.tsx).
- **Inline editing** — double-click a list title to rename, `Enter` to commit, `Esc` to cancel. `AddTodoForm` also accepts `Ctrl/Cmd+Enter`.

## Contact

- Martín Fernández (mfernandez@crunchloop.io)

## About Crunchloop

![crunchloop](https://s3.amazonaws.com/crunchloop.io/logo-blue.png)

We strongly believe in giving back :rocket:. Let's work together [`Get in touch`](https://crunchloop.io/#contact).
