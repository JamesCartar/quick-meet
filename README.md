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
| `pnpm --filter web build` | Builds static frontend files into `apps/web/dist` |

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

## Deploying both apps to Lightsail

1. Give the Lightsail instance a **static IP**. Open inbound ports **80/443** in its firewall, but **not 8787**. Install Node.js 24.x, pnpm 11.15.1, PM2 and Caddy. Pull the repository onto the instance.
2. From the repository root, build both apps:

   ```bash
   pnpm install --frozen-lockfile
   pnpm --filter server build
   pnpm --filter web build
   ```

   `apps/web/.env.production` supplies the public API URL (`https://meet-api.heinhtet.com`) at build time. Do not set a conflicting `VITE_SERVER_URL` in the shell. `apps/web/.env.local` can continue pointing to localhost for local development.
3. Start **one** API process (not a PM2 cluster):

   ```bash
   pm2 start ecosystem.config.json --env production
   pm2 logs meet-api
   pm2 save
   pm2 startup
   ```

   Run the command that `pm2 startup` prints. The API listens only on `127.0.0.1:8787`. For updates, rebuild, then `pm2 restart ecosystem.config.json --env production --update-env`.
4. In Cloudflare, remove **both** `meet.heinhtet.com` and `meet-api.heinhtet.com` from the old Workers' Custom Domains/Routes. Create **DNS-only** (grey-cloud) **A records** named `meet` and `meet-api` pointing to the Lightsail static IP. This lets Caddy obtain public Let's Encrypt certificates. Keep Cloudflare SSL/TLS mode at **Full (strict)** before optionally enabling the orange cloud after Caddy certificates are active.
5. Publish the static frontend and append the Caddy site blocks:

   ```bash
   sudo mkdir -p /www/wwwroot/meet-web
   sudo cp -a apps/web/dist/. /www/wwwroot/meet-web/
   sudo tee -a /etc/caddy/Caddyfile < deploy/Caddyfile
   sudo caddy validate --config /etc/caddy/Caddyfile
   sudo systemctl reload caddy
   ```

   `deploy/Caddyfile` follows the existing server pattern: it serves the React SPA with deep-link fallback at `meet.heinhtet.com` and reverse-proxies HTTP/tRPC plus WebSockets at `meet-api.heinhtet.com` to the PM2 API. Check `https://meet-api.heinhtet.com/trpc/welcome.get`, then test a call at `https://meet.heinhtet.com` from two browsers. On later frontend builds, recopy `apps/web/dist/.` to `/www/wwwroot/meet-web/`.

The old Cloudflare Workers and Durable Object are no longer used; room state does not migrate. The Node room is intentionally ephemeral: restarting the API ends active meetings. Run **one** instance; horizontal scaling needs a shared room backend.

## Limitations and security

- **No authentication or access control.** Anyone who can reach the API can invoke meeting operations. CORS does not make the meeting private.
- **No TURN relay.** STUN is configured, but some restrictive networks cannot establish direct media connections.
- **Five participants maximum.** Each participant connects to every other participant, so bandwidth and device load increase with the group size.
- **Presence cleanup is not instant after a crash.** Heartbeats run every 30 seconds, with a 90-second expiry. Leave/page-close cleanup is best-effort.
- Browser permission grants are managed by the browser. After denying access, you may need to update site permissions before retrying.

The meeting room is public and has no authentication or access control. Keep local environment files out of Git. Enable GitHub secret scanning and push protection where available. The local secret checker is a basic safeguard, not a guarantee or a history scan.

See [SECURITY.md](SECURITY.md) for credential handling and the protections needed before using this app for private meetings.
