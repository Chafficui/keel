# Authentication Flow

This document covers the complete authentication system built on BetterAuth, including signup, login, password reset, session management, and hybrid auth for native apps.

## Overview

The auth system uses **BetterAuth** with a PostgreSQL database (via Drizzle ORM). BetterAuth handles:

- Email/password registration and login
- Email verification
- Password reset
- Session management (cookies for web, Bearer tokens for native)
- Social providers (via sails like Google OAuth)

## Signup Flow

```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│ User    │                    │ Frontend│                    │ Backend │
└────┬────┘                    └────┬────┘                    └────┬────┘
     │ Fill signup form             │                              │
     │ ──────────────────────────>  │                              │
     │                              │ POST /api/auth/sign-up       │
     │                              │ {name, email, password}      │
     │                              │ ────────────────────────────>│
     │                              │                              │ Validate input
     │                              │                              │ Hash password
     │                              │                              │ Create user record
     │                              │                              │ Create session
     │                              │                              │ Send verification email
     │                              │   Set-Cookie: session_token  │
     │                              │ <────────────────────────────│
     │  Redirect to dashboard       │                              │
     │ <──────────────────────────  │                              │
     │                              │                              │
     │ Click email verification link│                              │
     │ ───────────────────────────────────────────────────────────>│
     │                              │                              │ Mark email as verified
     │  Redirect to app             │                              │
     │ <───────────────────────────────────────────────────────────│
```

### Implementation Details

1. **Frontend** calls `authClient.signUp.email({ name, email, password })`
2. **BetterAuth** validates the input, hashes the password with bcrypt, and creates:
   - A `user` record in the database
   - A `session` record tied to the user
   - An `account` record (credential type)
3. A **verification email** is sent via the transactional email package
4. The session cookie is set in the response
5. User is redirected to the dashboard (email unverified but logged in)
6. When the user clicks the verification link, BetterAuth marks the email as verified

### Email Verification

The verification email contains a signed token link:
```
https://yourdomain.com/api/auth/verify-email?token=<signed-token>
```

The token expires after 24 hours. Users can request a new verification email from their settings.

Unverified users can still access the app but may be restricted from certain features. Check `user.emailVerified` in the frontend to conditionally show prompts.

## Login Flow

```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│ User    │                    │ Frontend│                    │ Backend │
└────┬────┘                    └────┬────┘                    └────┬────┘
     │ Enter credentials            │                              │
     │ ──────────────────────────>  │                              │
     │                              │ POST /api/auth/sign-in       │
     │                              │ {email, password}            │
     │                              │ ────────────────────────────>│
     │                              │                              │ Find user by email
     │                              │                              │ Verify password hash
     │                              │                              │ Create new session
     │                              │   Set-Cookie: session_token  │
     │                              │ <────────────────────────────│
     │  Redirect to dashboard       │                              │
     │ <──────────────────────────  │                              │
```

### Implementation Details

1. **Frontend** calls `authClient.signIn.email({ email, password })`
2. **BetterAuth** looks up the user, verifies the password, and creates a new session
3. The session cookie is set and the user data is returned
4. Failed login attempts do not reveal whether the email exists (generic error)

## Password Reset Flow

```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│ User    │                    │ Frontend│                    │ Backend │
└────┬────┘                    └────┬────┘                    └────┬────┘
     │ Request password reset       │                              │
     │ ──────────────────────────>  │                              │
     │                              │ POST /api/auth/forget-password│
     │                              │ {email}                      │
     │                              │ ────────────────────────────>│
     │                              │                              │ Find user
     │                              │                              │ Generate reset token
     │                              │                              │ Send reset email
     │                              │   200 OK (always, even if    │
     │                              │   email doesn't exist)       │
     │                              │ <────────────────────────────│
     │                              │                              │
     │ Click reset link in email    │                              │
     │ ──────────────────────────>  │                              │
     │                              │ Show new password form       │
     │                              │                              │
     │ Submit new password          │                              │
     │ ──────────────────────────>  │                              │
     │                              │ POST /api/auth/reset-password│
     │                              │ {token, newPassword}         │
     │                              │ ────────────────────────────>│
     │                              │                              │ Verify token
     │                              │                              │ Hash new password
     │                              │                              │ Update user
     │                              │                              │ Invalidate all sessions
     │                              │   200 OK                     │
     │                              │ <────────────────────────────│
     │  Redirect to login           │                              │
     │ <──────────────────────────  │                              │
```

### Security Considerations

- The reset endpoint always returns 200, even if the email doesn't exist (prevents user enumeration)
- Reset tokens expire after 1 hour
- After a successful reset, all existing sessions are invalidated
- The reset link is single-use

## Session Management

### Session Storage

Sessions are stored in the PostgreSQL database via Drizzle:

```typescript
// sessions table (managed by BetterAuth)
{
  id: string;           // Session ID
  userId: string;       // FK to users
  token: string;        // Session token (hashed)
  expiresAt: Date;      // Expiration timestamp
  ipAddress: string;    // Client IP (optional)
  userAgent: string;    // Client user agent (optional)
  createdAt: Date;
  updatedAt: Date;
}
```

### Session Lifecycle

1. **Created** on successful login/signup
2. **Validated** on every authenticated request
3. **Refreshed** automatically when nearing expiration
4. **Invalidated** on logout, password reset, or account deletion
5. **Expired** sessions are cleaned up periodically

### Cookie Configuration

For web clients, sessions use HTTP-only cookies:

```typescript
{
  httpOnly: true,         // Not accessible via JavaScript
  secure: true,           // HTTPS only in production
  sameSite: "lax",        // CSRF protection
  path: "/",
  maxAge: 7 * 24 * 3600,  // 7 days
}
```

## Hybrid Auth (Web + Native)

The app supports both web browsers and native Capacitor apps. The auth strategy differs:

### Web (Browser)

- Uses HTTP-only session cookies
- Cookies are sent automatically with every request
- Standard CSRF protection via `sameSite: "lax"`

### Native (Capacitor WebView)

Capacitor apps load the web app inside a native WebView. The auth approach depends on your server configuration:

**Option A: Cookie-based (default)**

The WebView supports cookies natively. If your API and frontend share the same origin (or are proxied to appear as the same origin), cookies work automatically.

**Option B: Bearer token**

For cross-origin setups or when cookies are unreliable in the WebView:

1. On login, extract the session token from the response
2. Store it securely using `@capacitor/preferences`
3. Attach it as a `Bearer` token in the `Authorization` header
4. BetterAuth accepts both cookies and Bearer tokens

```typescript
// Platform detection
import { Capacitor } from "@capacitor/core";

const isNative = Capacitor.isNativePlatform();

// If native, use Bearer token instead of cookies
if (isNative) {
  const token = await Preferences.get({ key: "session_token" });
  headers["Authorization"] = `Bearer ${token.value}`;
}
```

### BetterAuth Configuration

```typescript
// packages/backend/src/auth/index.ts
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, url);
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url);
    },
  },
  socialProviders: {
    // [SAIL_SOCIAL_PROVIDERS]
  },
  session: {
    expiresIn: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60,      // Refresh after 1 day
  },
  trustedOrigins: [
    process.env.FRONTEND_URL!,
    "capacitor://localhost",       // iOS
    "http://localhost",            // Android
  ],
});
```

### Trusted Origins

For Capacitor apps to authenticate, their origins must be listed in `trustedOrigins`:

- `capacitor://localhost` -- iOS WebView origin
- `http://localhost` -- Android WebView origin

## Logout

```typescript
// Frontend
await authClient.signOut();
// Clears the session cookie and redirects to login
```

On the backend, BetterAuth deletes the session record from the database, ensuring it cannot be reused.

## Account Deletion

See `docs/gdpr-compliance.md` for the full account deletion flow, including the 30-day grace period.

## Security Best Practices

1. **Passwords** are hashed with bcrypt (cost factor 10)
2. **Sessions** use cryptographically random tokens, stored hashed
3. **Cookies** are HTTP-only, secure, and SameSite
4. **Rate limiting** should be applied to auth endpoints (see rate-limiting sail)
5. **Email enumeration** is prevented by returning generic responses
6. **CSRF** is mitigated by SameSite cookies and origin checking
7. **Session fixation** is prevented by creating new sessions on login
