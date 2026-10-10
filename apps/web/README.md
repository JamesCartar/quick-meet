# Web

React + Vite with TanStack Router, Query, and Form; tRPC; a native WebSocket subscription to the Hono API; Tailwind v4; and CLI-generated shadcn components.

- Thin file-based routes: `src/routes`.
- Feature pages/services: `src/domain`.
- Infrastructure: `src/common`.
- Reusable form adapters: `src/shared/components/form`.
- shadcn primitives: `src/shared/components/ui`.

The home page provides a live camera/mic lobby and a five-person WebRTC meeting. `src/domain/meeting` owns device preferences, permissions, mesh connections, participant tiles, speaking indicators, and in-call controls.

From the repository root:

```bash
pnpm dev:web
pnpm --filter web check-types
pnpm --filter web test
pnpm --filter web build
pnpm deploy:web
pnpm dlx shadcn@latest add dialog --cwd apps/web
```

See the root README and `docs/frontend-patterns.md` for configuration and conventions.
