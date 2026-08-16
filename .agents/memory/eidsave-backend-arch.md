---
name: EidSave backend architecture
description: Layered architecture for the api-server with Redis caching via ioredis
---

**Layers (outermost to innermost):**
1. `routes/` — thin Express routers, attach `validate(Schema)` middleware + controller method
2. `controllers/` — HTTP handlers: call service, return response, forward errors via `next(err)`
3. `services/` — business logic only (no req/res), throw `AppError` for domain errors
4. `repositories/` — data access: DB queries + Redis cache get/set/invalidate
5. `schema/` — Zod v3 schemas for request body validation
6. `middlewares/validate.ts` — generic `validate(schema)` factory used in routes
7. `middlewares/error.ts` — global error handler (`errorHandler`) + 404 handler (`notFound`)
8. `lib/redis.ts` — ioredis client; graceful no-op if REDIS_URL not set (WARN logged)
9. `lib/cache.ts` — `cacheGet`, `cacheSet`, `cacheDel`, `cacheDelPattern`, `cacheKey` helpers
10. `jobs/` — node-cron jobs started in `index.ts`; wallet unlock runs at midnight + on startup

**Error flow:** service throws `createError(msg, statusCode)` → controller calls `next(err)` → `errorHandler` formats JSON response.

**Redis TTLs:** animals=600s, eid dates=3600s, user profile=300s, wallet=30s, orders/groups=60s.

**Why layered:** Business logic is testable in isolation (services), caching is transparent (repositories), HTTP shape is separate from domain logic (controllers vs services).
