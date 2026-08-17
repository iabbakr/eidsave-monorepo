# EidSave

A halal Eid savings & animal delivery mobile app for Muslim Nigerians. Users save toward Eid al-Adha (animal sacrifice) and Eid al-Fitr (group cow/meat purchase), deposit via Paystack, and get home delivery.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5001/8080)
- `pnpm --filter @workspace/eidsave run dev` — run Expo app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run seed` — seed animals and Eid cycles (run after DB push)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `REDIS_URL` — Redis connection string (app runs without it, just no cache)
- Optional env: `PAYSTACK_SECRET_KEY` — Paystack webhook secret key

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + helmet + express-rate-limit
- DB: PostgreSQL + Drizzle ORM
- Cache: Redis via ioredis (graceful no-op fallback if REDIS_URL not set)
- Validation: Zod v3, custom `validate()` middleware
- Jobs: node-cron (wallet unlock daily, savings streak daily)
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle, both index.ts and seed.ts as entry points)
- Mobile: Expo (React Native) with expo-router

## Backend Architecture

```
artifacts/api-server/src/
├── schema/          # Zod validation schemas per domain
├── repositories/    # Data access layer (DB + Redis cache)
├── services/        # Business logic
├── controllers/     # Thin HTTP handlers (call service → return response)
├── routes/          # Express routers (attach validate middleware + controller)
├── middlewares/     # auth.ts, validate.ts, error.ts
├── jobs/            # Background cron jobs (walletUnlock, savingsStreak)
└── lib/             # redis.ts, cache.ts, logger.ts
```

**Caching TTLs:**
- Animals catalog: 10 minutes
- Eid dates: 1 hour
- User profile: 5 minutes
- Wallet balance: 30 seconds
- Orders / groups: 60 seconds

## Where things live

- `lib/db/src/schema/` — all DB tables (users, wallets, transactions, animals, orders, groups, eid_cycles, etc.)
- `artifacts/api-server/src/routes/` — all Express routes mounted at `/api/v1/`
- `artifacts/api-server/src/seed.ts` — database seeder for animals + Eid cycles
- `artifacts/eidsave/app/` — all Expo screens (tabs, auth, deposits, orders, groups, etc.)
- `artifacts/eidsave/constants/colors.ts` — EidSave palette (#1A6B3A green, #C9942A gold)
- `artifacts/eidsave/hooks/useColors.ts` — theme hook
- `artifacts/eidsave/hooks/useAuth.tsx` — JWT auth state + AsyncStorage

## Architecture decisions

- **Two wallets per user**: `adha` (animal sacrifice) and `fitr` (group cow / meat share)
- **Contract-first API**: OpenAPI spec → Orval generates React Query hooks + Zod schemas used by both frontend and backend
- **Deposit flow is mocked** (setTimeout) until Paystack webhook integration is done — see `deposit.tsx` and `routes/webhook.ts`
- **PIN is collected during registration UI** but not sent to the backend (PIN auth endpoint not yet in OpenAPI spec)
- **Local images override backend imageUrl** in the catalog — `LOCAL_IMAGES` map in catalog.tsx and animal/[id].tsx ensures images always render on mobile

## Product

- Home dashboard: total savings + two Eid wallet cards + recent transactions
- Eid al-Adha tab: sacrifice savings with progress bar, affordability tiers, catalog link
- Eid al-Fitr tab: group cow savings, mode selector (group/individual/withdraw), group cards
- Animal catalog: filterable grid by category (Ram/Goat/Cow) with size + price info
- Animal detail: size selector, quantity, summary card, order button
- Deposit screen: wallet toggle, quick shortcuts (₦1k–₦50k), Paystack integration point
- Groups: browse/join/create groups, contribute from Fitr wallet
- Profile: savings streak, referral code, navigation to all sections

## User preferences

- Halal-first language and imagery (Islamic greeting on home screen, crescent icons)
- Nigerian Naira (₦) throughout, localized to en-NG
- Target audience: Muslim Nigerians saving for Eid al-Adha and Eid al-Fitr

## Gotchas

- Always `pnpm --filter @workspace/db run push` before `pnpm --filter @workspace/api-server run seed`
- Build includes both `src/index.ts` and `src/seed.ts` as esbuild entry points
- `req.params["key"]` must use `String(req.params["key"])` cast in controllers — brackets widen the type
- Double `.where()` calls on Drizzle selects are forbidden — use `and()` from `drizzle-orm`
- Zod version is v3 (not v4) — use `z.string().email()` not `z.email()`, and `invalid_type_error` not `error`
- Expo router warns about extraneous `Stack.Screen` names that don't have corresponding files — keep auth layout's screens in sync with actual files
