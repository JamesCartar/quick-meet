# Meet

A small video meeting app for teams. Open the app, check your camera and microphone, and join the shared call. There are no accounts, room codes, or separate rooms.

Each meeting supports up to five people. Audio and video use direct WebRTC mesh connections; a Node.js Hono server handles participant updates and signaling over WebSockets.

## Features

- Live camera preview before joining, with microphone and camera controls.
- Names and device preferences remembered on the current browser.
- In-call name editing and microphone activity indicators.
- Responsive participant tiles for desktop and mobile.
- Leave confirmation and the option to rejoin.
- Permission error handling, including joining with both devices off.

## Stack

- **Frontend:** React, Vite, TanStack Router/Query/Form, Tailwind CSS, and shadcn/ui.
- **Backend:** Hono and tRPC on Node.js (AWS Lightsail).
- **Realtime data:** Native WebSockets and a single in-memory meeting room.
- **Media:** WebRTC mesh connections.
- **Workspace:** pnpm and Turborepo, with TypeScript, Biome, and Vitest.

## Local setup

### 1. Install dependencies

Use Node.js **24.15 or newer on the 24.x line** and **pnpm 11.15.1**. Run commands from the repository root:

```bash
pnpm install --frozen-lockfile
```

The backend runs on Node.js and needs no Firebase or Durable Object. If `apps/web/.env.local` points at a deployed API, change `VITE_SERVER_URL` to `http://localhost:8787` for local development.

### 2. Start the app

```bash
pnpm dev
```

- **Web app:** http://localhost:5173
- **API:** http://localhost:8787
- **API health-check example:** http://localhost:8787/trpc/welcome.get

Open the web app and allow camera/microphone access when prompted. You can also join with both devices off. Open another browser or device using your deployed HTTPS URL to try a call with someone else.

The frontend uses `http://localhost:8787` by default. To point it at a different API, copy `apps/web/.env.example` to `apps/web/.env.local` and change `VITE_SERVER_URL`. Restart the frontend after changing its environment variables.

Camera and microphone access require **HTTPS or localhost**. Opening the app through a plain HTTP LAN address will generally block device access.

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Runs the frontend and backend locally |
| `pnpm dev:web` | Runs only the frontend |
| `pnpm dev:server` | Runs only the backend |
| `pnpm check-types` | Checks TypeScript types |
| `pnpm test` | Runs the automated tests |
| `pnpm lint` | Checks formatting, imports, and lint rules |
| `pnpm lint:fix` | Applies safe formatting and lint fixes |
| `pnpm check-secrets` | Checks staged/working files for sensitive paths and common credential patterns |
| `pnpm build` | Builds the frontend and Node API bundle; does not deploy |
| `pnpm --filter server start` | Starts the built API on Node.js |
| `pnpm deploy:web` | Builds and deploys the frontend |

Tests use in-memory room services and do not require external services. GitHub Actions runs the secret check, lint, type checks, tests, and build.

## Project structure

```text
apps/
  web/
    src/
      app/                  # App initialization and providers
      common/               # tRPC and realtime clients
      domain/meeting/       # Meeting UI, media hooks, and WebRTC mesh logic
      routes/               # File-based routes
      shared/components/    # Form adapters and UI primitives
  server/
    src/
      config/               # Request context and tRPC setup
      routers/meeting/      # In-memory meeting service and validators
packages/contracts/         # Shared schemas, types, and meeting constants
docs/frontend-patterns.md
```

See [frontend patterns](docs/frontend-patterns.md) for the route, service, and form conventions.

## Deploying the API to Lightsail

1. On the Lightsail instance install Node.js 24.x and pnpm 11.15.1. Pull the repository and run `pnpm install --frozen-lockfile && pnpm --filter server build`.
2. Run **one** API process with a process manager (for example systemd) using `pnpm --filter server start`. Set `PORT=8787`, `HOST=127.0.0.1`, and `ALLOWED_ORIGINS=https://meet.heinhtet.com` (comma-separate additional web origins). Restart it automatically on failure.
3. Point `meet-api.heinhtet.com` to Lightsail. Configure HTTPS with a reverse proxy (Nginx/Caddy) forwarding `/trpc/*` and `/ws` to `127.0.0.1:8787`; enable WebSocket upgrades and a long read timeout. Example Nginx location inside the HTTPS `server` block:

   ```nginx
   location / {
       proxy_pass http://127.0.0.1:8787;
       proxy_http_version 1.1;
       proxy_set_header Host $host;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_read_timeout 3600s;
   }
   ```

   Install a valid origin TLS certificate. Do not expose port 8787 publicly. If using Cloudflare DNS proxy, use Full (strict) TLS to the origin.
4. In `apps/web/.env.local` set `VITE_SERVER_URL=https://meet-api.heinhtet.com`, then deploy the existing Cloudflare web app with `pnpm deploy:web`. Test two browsers after both API and web are updated.

The old Cloudflare Worker API and its Durable Object are no longer used. Existing room state does not migrate. The Node room is intentionally ephemeral: restarting the API ends active meetings. Run **one** instance; horizontal scaling needs a shared room backend.

## Limitations and security

- **No authentication or access control.** Anyone who can reach the API can invoke meeting operations. CORS does not make the meeting private.
- **No TURN relay.** STUN is configured, but some restrictive networks cannot establish direct media connections.
- **Five participants maximum.** Each participant connects to every other participant, so bandwidth and device load increase with the group size.
- **Presence cleanup is not instant after a crash.** Heartbeats run every 30 seconds, with a 90-second expiry. Leave/page-close cleanup is best-effort.
- Browser permission grants are managed by the browser. After denying access, you may need to update site permissions before retrying.

The meeting room is public and has no authentication or access control. Keep local environment files out of Git. Enable GitHub secret scanning and push protection where available. The local secret checker is a basic safeguard, not a guarantee or a history scan.

See [SECURITY.md](SECURITY.md) for credential handling and the protections needed before using this app for private meetings.
