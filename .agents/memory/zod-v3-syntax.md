---
name: Zod v3 syntax
description: This workspace has Zod v3 installed — certain v4 API calls cause TS errors
---

Installed: `zod@3.25.76`. The api-server and api-spec packages depend on this version.

**Rule:** Use Zod v3 API. Key differences from v4:
- `z.email("msg")` → `z.string().email("msg")`
- `z.number({ error: "..." })` → `z.number({ invalid_type_error: "..." })`
- Import from `"zod"` not `"zod/v4"`

**Why:** The codebase historically imported from `"zod/v4"` (v4 subpath export) but only v3 is installed. TSC errors TS2307 "Cannot find module 'zod/v4'" and TS2339 "Property 'email' does not exist" both point to this mismatch.

**How to apply:** Always check the installed version before using Zod v4 shorthand. If the schema generates `unknown` types, the Zod import is likely wrong.
