---
name: EidSave seed workflow
description: Correct order for DB setup and seeding in this project
---

**Rule:** DB schema push → build → seed. Never seed against an empty schema.

**Why:** `drizzle-kit push` must run first to create tables. The seed script imports from `@workspace/db` and will fail if tables don't exist.

**How to apply:**
1. `pnpm --filter @workspace/db run push`
2. `pnpm --filter @workspace/api-server run build` (builds both index.ts and seed.ts)
3. `pnpm --filter @workspace/api-server run seed`

The seed is idempotent — it checks for existing rows before inserting, so re-running is safe.

The `build.mjs` includes `src/seed.ts` as a second esbuild entry point alongside `src/index.ts`. Output is `dist/seed.mjs`.
