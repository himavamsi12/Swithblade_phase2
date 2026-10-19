@AGENTS.md

# Project conventions

See README.md for structure and scripts. Key points:

- Package manager is pnpm, Node 24. Run `pnpm check` before finishing work.
- Next.js 16: read `node_modules/next/dist/docs/` before using framework APIs.
- Keep `src/app` thin; domain code goes in `src/features/<domain>`.
- Data access only via `features/*/repository.ts`. Money is integer cents.
- Do not add a root `loading.tsx` (causes soft-404s); use local `<Suspense>`.
