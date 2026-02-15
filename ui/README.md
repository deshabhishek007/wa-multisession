# WhatsApp Multi-Instance Manager — UI

Svelte (Vite) front end for the WhatsApp multi-instance backend. It provides login, instance management, QR code display, message log, send message, API key management, and (for admins) user management.

## Tech stack

- **Svelte 4** – Components and reactivity
- **Vite 5** – Dev server and production build
- **Session auth** – Cookie-based; all API and WebSocket requests use `credentials: 'include'`

No UI framework or component library; styles are in `app.css` and component `<style>` blocks.

## Project structure

```
ui/
├── index.html              # Entry HTML; mounts #app
├── package.json            # Scripts and deps (svelte, vite, @sveltejs/vite-plugin-svelte)
├── vite.config.js          # Vite + Svelte config
├── src/
│   ├── main.js             # Boot: mounts App.svelte
│   ├── app.css             # Global styles
│   ├── App.svelte           # Root: auth check, Login | Dashboard | Docs
│   ├── lib/
│   │   └── api.js          # API base URL, fetch helpers, all REST + WebSocket URL
│   └── components/
│       ├── Login.svelte    # Login form; dispatches login event
│       ├── Dashboard.svelte # Instance list, create/delete, WS subscribe, admin panel
│       ├── InstanceCard.svelte # Per instance: status, QR, API key, send message, message log
│       ├── MessageLog.svelte  # Message list (history + live) for one instance
│       └── Docs.svelte     # In-app docs (getting started, instance features, API summary)
└── dist/                   # Production build (vite build)
```

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (default port 5173). Proxies/API: use backend on port 3000 and set `API_BASE` / `getWsUrl()` accordingly (see `api.js`). |
| `npm run build` | Build for production into `dist/`. |
| `npm run preview` | Serve `dist/` locally (e.g. to test production build). |

The backend serves the built UI from `ui/dist` when present, so in production you typically run `npm run build` inside `ui/` and then start the Node server.

## Components

- **App.svelte** – On load calls `checkAuth()`. If authenticated, shows Dashboard (or Docs when `#docs`). Otherwise shows Login. Handles `login` / `logout` and hash-based Docs toggle.
- **Login.svelte** – Username/password form; calls `login()`, dispatches `login` with user on success.
- **Dashboard.svelte** – Fetches instances, opens WebSocket, subscribes to each instance. Renders instance list (InstanceCard), create/delete instance, and (admin) user list, assignments, password change. Opens MessageLog for a chosen instance; passes through WS `message` events to MessageLog.
- **InstanceCard.svelte** – Shows instance id, status, QR (when `qr_ready`), API key (view/copy/regenerate), send-message form, and “Message log” button. Uses session-authenticated API only.
- **MessageLog.svelte** – Loads message history via `getInstanceMessages()`, subscribes to live messages via parent’s WebSocket. Displays list with sender, body, timestamp.
- **Docs.svelte** – Static “Usage & docs” page (getting started, creating instance, instance features, API summary). “Back to Dashboard” clears `#docs`.

## API layer (`src/lib/api.js`)

- **API_BASE** – `http://localhost:3000` in dev, `''` in production (same origin).
- **getWsUrl()** – `ws://localhost:3000` in dev; in production `wss:` or `ws:` based on `location.protocol` and `location.host`.
- **apiFetch()** – Wrapper around `fetch` with `credentials: 'include'`, optional logging, and error handling.
- Exported functions cover: auth (`checkAuth`, `login`, `logout`, `getMe`), instances (`getInstances`, `createInstance`, `deleteInstance`), instance API key (`getInstanceApiKey`, `regenerateInstanceApiKey`), send message (`sendInstanceMessage`), message log (`getInstanceMessages`), and (admin) users and assignments (`getUsers`, `createUser`, assign/remove instance, change password, delete user).

See **[API.md](../API.md)** in the repo root for full HTTP and WebSocket API details.

## Auth and WebSocket

- The UI always uses **session auth** (cookies). There is no API-key login in the UI; API keys are shown per instance for use by scripts or external tools.
- After login, Dashboard opens a WebSocket to `getWsUrl()`, sends `{ type: 'auth' }`, then for each instance `{ type: 'subscribe', instanceId }`. Incoming `message`, `qr`, `ready`, `authenticated`, `disconnected`, and `status` events update local state and (for messages) the open MessageLog when it matches the instance.

## Dev vs production

- **Dev:** Run backend on port 3000 and UI with `npm run dev` (e.g. 5173). CORS and `credentials: 'include'` are set so the cookie is sent to the API; `api.js` points to `http://localhost:3000` and `ws://localhost:3000` in dev.
- **Production:** Build with `npm run build`; the server serves `ui/dist` and the app uses relative URLs for API and WebSocket, so no extra config is needed when UI and server are same origin.

## Related docs

- **[../readme.md](../readme.md)** – Project overview, setup, database, troubleshooting.
- **[../API.md](../API.md)** – REST and WebSocket API (auth, instances, messages, users, webhook).
- **[../wahub_webhook.md](../wahub_webhook.md)** – Webhook endpoint for receiving message events (API key auth).
