# Server

Hono on Cloudflare Workers with public tRPC meeting procedures for join, rename, heartbeat, leave, and signaling. `welcome.get` remains a health-check example. Meeting state and signaling are stored in a SQLite-backed Cloudflare Durable Object, which serializes room mutations and broadcasts updates over WebSockets.

Endpoints delegate to domain services. Domain validators live alongside their routers/services. Cloudflare-specific room integration lives under `src/durable-objects` and `src/providers`.

From the repository root:

```bash
pnpm dev:server
pnpm --filter server check-types
pnpm --filter server test
pnpm --filter server build
pnpm typegen
pnpm deploy:server
```

The local welcome endpoint is `http://localhost:8787/trpc/welcome.get`.

The Durable Object binding is declared in `wrangler.jsonc`. Run `pnpm typegen` after changing its bindings or migrations.

See the root README for Cloudflare deployment instructions.
