# Meet

A small video meeting app for teams. Open the app, check your camera and microphone, and join the shared call. There are no accounts, room codes, or separate rooms.

Each meeting supports up to five people. Audio and video use direct WebRTC mesh connections; Firebase handles participant updates and signaling.

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
- **Realtime data:** Firebase Realtime Database.
- **Media:** WebRTC mesh connections.
- **Workspace:** pnpm and Turborepo, with TypeScript, Biome, and Vitest.

## Local setup

### 1. Install dependencies

Use Node.js **24.15 or newer on the 24.x line** and **pnpm 11.15.1**. Run commands from the repository root:

```bash
pnpm install --frozen-lockfile
```

Cloudflare login is not required for local development. You do need a Firebase project and an internet connection for signaling.

### 2. Configure Firebase

Use your own Firebase project. The checked-in public configuration currently points to the development project.

1. Create a project in the Firebase console and register a web app.
2. Create a **Realtime Database**.
3. Replace the public Firebase configuration in `apps/web/src/common/lib/firebase.ts` with your web app's configuration. Include the Realtime Database URL.
4. Set `FIREBASE_DATABASE_URL` in `apps/server/wrangler.jsonc` to the same database URL.
5. In the database's **Rules** tab, publish the contents of [`firebase/database.rules.json`](firebase/database.rules.json).
6. Under **Project settings → Service accounts**, generate a private key for that same project. Keep the downloaded JSON outside this repository.

The database rules allow the browser to read participant/signaling data but deny browser writes. The backend makes privileged writes using the service account. Committing the rules file alone does not publish the rules.

### 3. Configure backend credentials

Copy `apps/server/.dev.vars.example` to `apps/server/.dev.vars`, then import your downloaded service-account file:

```bash
pnpm --filter server firebase:credentials "/absolute/path/to/firebase-service-account.json"
```

On Windows, the path can look like `"C:/private/firebase-service-account.json"`.

The import command writes `FIREBASE_SERVICE_ACCOUNT` to the ignored `.dev.vars` file without printing the credential. Never put a real value in `.dev.vars.example` or commit the downloaded JSON.

### 4. Start the app

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

Tests use mocks and do not require live Firebase credentials. GitHub Actions runs the secret check, lint, type checks, tests, and build.

## Project structure

```text
apps/
  web/
    src/
      app/                  # App initialization and providers
      common/               # tRPC and Firebase clients
      domain/meeting/       # Meeting UI, media hooks, and WebRTC mesh logic
      routes/               # File-based routes
      shared/components/    # Form adapters and UI primitives
  server/
    src/
      config/               # Request context and tRPC setup
      providers/firebase/   # Firebase REST client and service-account OAuth
      routers/meeting/      # Meeting router, service, and validators
packages/contracts/         # Shared schemas, types, and meeting constants
firebase/database.rules.json
docs/frontend-patterns.md
```

See [frontend patterns](docs/frontend-patterns.md) for the route, service, and form conventions.

## Deploying to Cloudflare

The API runs on a Worker, and the frontend uses Workers Static Assets. Both can use Cloudflare-provided domains.

1. Log in:

   ```bash
   pnpm --filter server exec wrangler login
   ```

2. Check the Worker names in `apps/server/wrangler.jsonc` and `apps/web/wrangler.jsonc`. Confirm the backend database URL points to your Firebase project.

3. Store the service-account JSON as a backend Worker secret:

   ```bash
   pnpm --filter server exec wrangler secret put FIREBASE_SERVICE_ACCOUNT
   ```

   Paste the JSON into Wrangler's secret prompt. Do not add it to Wrangler configuration or frontend environment variables. Local `.dev.vars` files are not deployed.

4. Deploy the API and note its URL:

   ```bash
   pnpm deploy:server
   ```

5. Set `VITE_SERVER_URL` to that API URL in `apps/web/.env.local` or your frontend build environment, then deploy the web app:

   ```bash
   pnpm deploy:web
   ```

   Use the base API URL, without `/trpc`. `VITE_SERVER_URL` is a build-time setting, so changing it requires rebuilding the frontend.

6. Add the deployed frontend origin to `ALLOWED_ORIGINS` in `apps/server/wrangler.jsonc`. Multiple origins are comma-separated. Regenerate types and redeploy the API:

   ```bash
   pnpm typegen
   pnpm deploy:server
   ```

Open the frontend's HTTPS URL and test a call. Cloudflare and Firebase quotas still apply; free-tier hosting does not mean unlimited usage.

## Limitations and security

- **No authentication or access control.** Anyone who can reach the API can invoke meeting operations. CORS does not make the meeting private.
- **No TURN relay.** STUN is configured, but some restrictive networks cannot establish direct media connections.
- **Five participants maximum.** Each participant connects to every other participant, so bandwidth and device load increase with the group size.
- **Presence cleanup is not instant after a crash.** Heartbeats run every 15 seconds, with a 60-second expiry. Leave/page-close cleanup is best-effort.
- Browser permission grants are managed by the browser. After denying access, you may need to update site permissions before retrying.

Firebase web configuration is public; service-account credentials are not. Keep credentials, private keys, and local environment files out of Git. Enable GitHub secret scanning and push protection where available. The local secret checker is a basic safeguard, not a guarantee or a history scan.

See [SECURITY.md](SECURITY.md) for credential handling and the protections needed before using this app for private meetings.
