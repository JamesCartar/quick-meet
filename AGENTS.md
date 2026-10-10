<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

# Project conventions

- Keep route wiring, domain business logic, and external providers separate.
- Server domains use `.router.ts`, `.service.ts`, and `.validator.ts`; routers delegate business operations to services. External integrations belong in `src/providers`.
- Web routes are thin wrappers over `src/domain/<feature>/pages`. Domain services own TanStack Query/tRPC operations; shared form adapters use TanStack Form and shadcn primitives.
- Let TypeScript infer function return types first. Add explicit function return annotations only when inference cannot express the required type. Explicit parameter and shared contract types are still appropriate.
- Install dependencies/scaffold with pnpm commands. Generate shadcn UI primitives through its CLI; do not hand-copy vendor components. Use Tailwind v4's Vite plugin, not a hand-written legacy config.
- Keep Firebase service-account credentials in ignored `.dev.vars` and Cloudflare Worker secrets. Never import credential JSON into source, print its contents, or bundle it into React.
- Do not start development servers unless requested; the user runs `pnpm dev` themselves.

