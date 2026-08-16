---
name: Express params typing
description: Express req.params values need explicit narrowing casts in TypeScript
---

In this project, Express route params accessed via bracket notation (`req.params["key"]`) can be inferred as `string | string[]` by TypeScript, causing TS2345 errors.

**Rule:** Always use `String(req.params["key"])` and cast to the known union type.

**Why:** `req.params` is `ParamsDictionary` but bracket access sometimes widens the type inference. Destructuring `const { key } = req.params` can also fail when the value is used in Drizzle's `eq()` against an enum column.

**How to apply:**
```ts
// For wallet type routes
const type = String(req.params["type"]) as "adha" | "fitr";
// For ID params
const animalId = String(req.params["id"]);
```
