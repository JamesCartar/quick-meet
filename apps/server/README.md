# Server

Hono on Node.js with tRPC mutations for joining, heartbeats, renaming, leaving, and signaling. `src/routers/meeting/meeting.service.ts` owns the single in-memory room, enforces its five-person cap, and publishes participant/signal events. `src/index.ts` wires the HTTP routes and native WebSocket endpoint; `src/server.ts` starts the Node server. The browser's existing WebSocket protocol is unchanged.

From the repository root:

```bash
pnpm dev:server
pnpm --filter server check-types
pnpm --filter server test
pnpm --filter server build
pnpm --filter server start
```

`PORT` defaults to `8787`, `HOST` defaults to `127.0.0.1`, and `ALLOWED_ORIGINS` defaults to `http://localhost:5173`. Production requires an HTTPS reverse proxy with WebSocket support, and a single Node process; state is lost on restart. See the root README for Lightsail deployment.
