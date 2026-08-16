---
name: Drizzle double-where
description: Drizzle ORM forbids chaining .where() twice on a select — use and() instead
---

After the first `.where()` call, Drizzle's TypeScript types use `Omit<PgSelectBase, 'where'>` which removes the `where` method.

**Rule:** Never chain `.where().where()`. Import `and` from `drizzle-orm` and combine predicates in one call.

**Why:** TypeScript surfaces this as TS2339 "Property 'where' does not exist on type Omit<...>". This is intentional in Drizzle v0.30+ to enforce query correctness.

**How to apply:**
```ts
// Wrong
db.select().from(t).where(eq(t.a, x)).where(eq(t.b, y))
// Right
import { and } from "drizzle-orm";
db.select().from(t).where(and(eq(t.a, x), eq(t.b, y)))
```
