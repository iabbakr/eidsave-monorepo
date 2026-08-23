# Backend wiring — email OTP + social auth + gated onboarding

## 1. Install deps
```bash
pnpm --filter api add jose
```

## 2. Mount new routers
In `apps/api/src/routes/index.ts`, alongside your existing `authRouter`:

```ts
import { otpRouter } from "./otp.routes.js";
import { socialAuthRouter } from "./socialAuth.routes.js";

router.use("/otp", otpRouter);
router.use("/auth", socialAuthRouter); // adds POST /api/v1/auth/social
```

## 3. Env vars (add to .env)
```
GOOGLE_CLIENT_IDS=your-web-client-id.apps.googleusercontent.com,your-ios-client-id.apps.googleusercontent.com
APPLE_BUNDLE_ID=com.yourorg.eidsave
```

## 4. Migrate the users table
The updated `packages/db/src/schema/users.ts` renames `town`→`area`,
`street`→`address`, makes `passwordHash` nullable, and adds
`emailVerified`, `authProvider`, `providerUid`, `profileSetupCompleted`.

```bash
pnpm --filter db drizzle-kit generate
pnpm --filter db drizzle-kit migrate
```
If you have existing rows, backfill `email_verified = true` and
`profile_setup_completed = true` for all pre-existing password users so
they aren't retroactively gated:
```sql
update users set email_verified = true, profile_setup_completed = true
where auth_provider = 'password';
```

## 5. Patch `AuthService.register()`
Your existing `register()` (in `apps/api/src/services/auth.service.ts`)
needs two additions — a pre-check that the email was OTP-verified, and
mapping the new address shape. Example shape (merge into your existing
implementation, keep your own password hashing / referral / token logic):

```ts
import { OtpService } from "./otp.service.js";
import { createError } from "../middlewares/error.js";
import bcrypt from "bcryptjs";

async function register(body: RegisterBody) {
  const email = body.email.trim().toLowerCase();

  const verified = await OtpService.isVerified(email);
  if (!verified) {
    throw createError("Please verify your email before registering", 400);
  }

  const existing = await UserRepository.findByEmail(email);
  if (existing) {
    throw createError("An account with this email already exists", 409);
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const referralCode = `EID${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const user = await UserRepository.create({
    name: body.name.trim(),
    email,
    phone: body.phone.trim(),
    passwordHash,
    state: body.address.state,
    city: body.address.city,
    area: body.address.area,
    address: body.address.address,
    nextOfKinName: body.nextOfKin?.name,
    nextOfKinPhone: body.nextOfKin?.phone,
    nextOfKinRelationship: body.nextOfKin?.relationship,
    role: "user",
    isActive: true,
    hasPin: false,
    savingsStreak: 0,
    referralCode,
    emailVerified: true,
    authProvider: "password",
    profileSetupCompleted: true,
  });

  await OtpService.consumeVerified(email);

  const customToken = signToken(user.id, user.role);
  return { customToken, user, requiresPin: true };
}
```

## 6. Patch `AuthService.login()`
Reject social-only accounts with a clear message instead of a generic
"wrong password", since `passwordHash` is now nullable:

```ts
if (!user.passwordHash) {
  throw createError(
    `This account uses ${user.authProvider === "google" ? "Google" : "Apple"} sign-in. Use the "${user.authProvider === "google" ? "Continue with Google" : "Continue with Apple"}" button instead.`,
    400,
  );
}
```

## 7. `/user/profile` route already covers CompleteProfileScreen
`PUT /api/v1/user/profile` (existing route) now accepts
`{ profileSetupCompleted, address, phone, ... }` via the updated
`user.schema.ts` — no new route needed for the gated onboarding submit.
