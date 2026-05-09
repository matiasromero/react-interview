
# react-interview

This is a simple React application using Vite as the build tool. Candidates are expected to build a Todo List UI by consuming the provided API. The scaffold includes basic setup and configurations to get started quickly.

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
