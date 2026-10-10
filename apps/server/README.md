# Server

Hono on Cloudflare Workers with public tRPC meeting procedures for join, rename, heartbeat, leave, and signaling. `welcome.get` remains a health-check example. Meeting admission uses Firebase ETag transactions to enforce five participants.

Endpoints delegate to domain services. Domain validators live alongside their routers/services. External integrations live under `src/providers`; Firebase is available as `ctx.firebase`.

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

Import Firebase credentials without displaying them:

```bash
pnpm --filter server firebase:credentials
```

See the root README for secret handling and deployment. Never import the downloaded service-account JSON into server source or frontend code.
