# Meet

A small video meeting app for teams. Open the app, check your camera and microphone, and join the shared call. There are no accounts, room codes, or separate rooms.

Each meeting supports up to five people. Audio and video use direct WebRTC mesh connections; a Cloudflare Durable Object handles participant updates and signaling.

## Features

- Live camera preview before joining, with microphone and camera controls.
- Names and device preferences remembered on the current browser.
- In-call name editing and microphone activity indicators.
- Responsive participant tiles for desktop and mobile.
- Leave confirmation and the option to rejoin.
- Permission error handling, including joining with both devices off.

## Stack

- **Frontend:** React, Vite, TanStack Router/Query/Form, Tailwind CSS, and shadcn/ui.
- **Backend:** Hono and tRPC on Cloudflare Workers.
- **Realtime data:** Cloudflare Durable Objects with WebSockets.
- **Media:** WebRTC mesh connections.
- **Workspace:** pnpm and Turborepo, with TypeScript, Biome, and Vitest.

## Local setup

### 1. Install dependencies

Use Node.js **24.15 or newer on the 24.x line** and **pnpm 11.15.1**. Run commands from the repository root:

```bash
pnpm install --frozen-lockfile
```

Cloudflare login is not required for local development. Wrangler runs the Durable Object locally.

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
| `pnpm build` | Builds the frontend and dry-runs the API bundle; does not deploy |
| `pnpm typegen` | Regenerates Cloudflare Worker binding types |
| `pnpm deploy:server` | Deploys the API Worker |
| `pnpm deploy:web` | Builds and deploys the frontend |

Tests use local Durable Object adapters and do not require external services. GitHub Actions runs the secret check, lint, type checks, tests, and build.

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
      durable-objects/      # Durable Object room and WebSocket handling
      providers/            # Durable Object service adapter
      routers/meeting/      # Meeting router, service, and validators
packages/contracts/         # Shared schemas, types, and meeting constants
docs/frontend-patterns.md
```

See [frontend patterns](docs/frontend-patterns.md) for the route, service, and form conventions.

## Deploying to Cloudflare

The API runs on a Worker, and the frontend uses Workers Static Assets. Both can use Cloudflare-provided domains.

1. Log in:

   ```bash
   pnpm --filter server exec wrangler login
   ```

   If the browser callback fails, use `pnpm --filter server exec wrangler login --device`.

2. Deploy the API. This creates the `meet-api` Worker and its `MeetingRoom` Durable Object:

   ```bash
   pnpm --filter server run deploy
   ```

3. Set `VITE_SERVER_URL` to the API URL in `apps/web/.env.local` or your frontend build environment:

   ```env
   VITE_SERVER_URL=https://meet-api.example.workers.dev
   ```

   Use the base API URL, without `/trpc`. This is a build-time setting.

4. Deploy the web app:

   ```bash
   pnpm --filter web run deploy
   ```

5. Add every frontend origin to `ALLOWED_ORIGINS` in `apps/server/wrangler.jsonc`. Origins are comma-separated. Then regenerate types and redeploy the API:

   ```bash
   pnpm typegen
   pnpm --filter server run deploy
   ```

Open the frontend's HTTPS URL and test a call. Durable Object usage is subject to Cloudflare plan quotas.

## Limitations and security

- **No authentication or access control.** Anyone who can reach the API can invoke meeting operations. CORS does not make the meeting private.
- **No TURN relay.** STUN is configured, but some restrictive networks cannot establish direct media connections.
- **Five participants maximum.** Each participant connects to every other participant, so bandwidth and device load increase with the group size.
- **Presence cleanup is not instant after a crash.** Heartbeats run every 30 seconds, with a 90-second expiry. Leave/page-close cleanup is best-effort.
- Browser permission grants are managed by the browser. After denying access, you may need to update site permissions before retrying.

The meeting room is public and has no authentication or access control. Keep local environment files out of Git. Enable GitHub secret scanning and push protection where available. The local secret checker is a basic safeguard, not a guarantee or a history scan.

See [SECURITY.md](SECURITY.md) for credential handling and the protections needed before using this app for private meetings.
