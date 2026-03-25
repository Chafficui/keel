# Keel — Production Readiness Document

Status: **~35% production ready**
Last updated: 2026-03-25

This document covers everything needed to make the Keel template framework and all sails production-ready.

---

## Critical Blockers (must fix before any project ships)

### 1. Database Migrations Missing

The template doesn't ship with an initial migration. Running `db:migrate` on a fresh project fails with `Can't find meta/_journal.json`.

**Fix:** Generate and commit the initial migration (`0000_initial.sql`) with all core tables (users, sessions, accounts, verifications). Each sail that adds tables must also ship its own migration.

**Files:** `packages/backend/src/db/migrations/`, `packages/backend/drizzle.config.ts`

---

### 2. Hardcoded URLs in GDPR Service

The GDPR service has `https://keel.com` hardcoded in deletion cancellation URLs and email links.

**Fix:** Use `env.FRONTEND_URL` everywhere. Search for any hardcoded `keel.com`, `localhost`, or `example.com` in backend services and email templates.

**Files:** `packages/backend/src/services/gdpr.ts` (line ~85), `packages/email/src/*.tsx`

---

### 3. `BETTER_AUTH_SECRET` Has Dangerous Default

The env validation defaults to `"dev-secret-change-me-in-production"`. If someone deploys without changing it, all sessions are compromised.

**Fix:** In production (`NODE_ENV=production`), throw an error if `BETTER_AUTH_SECRET` matches the default or is shorter than 32 chars.

**Files:** `packages/backend/src/env.ts`

---

### 4. No Error Boundaries in Frontend

A single runtime error crashes the entire React app. No fallback UI, no error reporting.

**Fix:** Add a root `<ErrorBoundary>` in `App.tsx` with a user-friendly fallback page. Consider per-route error boundaries for isolation.

**Files:** `packages/frontend/src/App.tsx`

---

### 5. `keel dev` Process Management Broken

- Ctrl+C doesn't kill the process tree (concurrently spawns children that survive)
- Vite proxy errors (`ECONNREFUSED`) print to console before backend is ready
- Terminal escape sequences (`^[[99;5u`) appear in some terminals

**Fix:**
- Use `process.kill(-child.pid, 'SIGTERM')` with `detached: true` to kill entire process group
- Suppress Vite proxy errors during startup (configure proxy `on('error')` handler)
- Or replace `concurrently` with a custom process manager that handles signals

**Files:** `cli/src/manage.ts` (dev command), `packages/frontend/vite.config.ts` (proxy config)

---

## Security Issues (high priority)

### 6. No Rate Limiting

No rate limiting on any endpoint. Login, signup, password reset, and API routes are all unprotected against brute force and abuse.

**Fix:** Add `express-rate-limit` middleware. Suggested limits:
- Auth endpoints: 5 requests/minute per IP
- API endpoints: 60 requests/minute per user
- Public endpoints: 30 requests/minute per IP

This could also be the `rate-limiting` sail — currently marked "planned" but partially implemented.

**Files:** `packages/backend/src/index.ts`, `cli/sails/rate-limiting/`

---

### 7. Open Redirect via `returnUrl`

The login form reads `returnUrl` from URL search params and redirects to it after login. No validation — an attacker could redirect to `https://evil.com`.

**Fix:** Validate `returnUrl` is a relative path (starts with `/`) or matches `FRONTEND_URL`. Reject absolute URLs to other domains.

**Files:** `packages/frontend/src/pages/LoginForm.tsx`

---

### 8. No CSRF Protection

Forms submit directly without CSRF tokens. BetterAuth handles its own CSRF, but custom routes (profile, GDPR, admin) have none.

**Fix:** Add CSRF middleware for non-GET routes, or use `SameSite=Strict` cookies (which would break cross-domain auth). Evaluate tradeoffs based on deployment model.

---

### 9. CORS Hardcodes Capacitor Origins

`capacitor://localhost` and `ionic://localhost` are hardcoded in CORS config even for projects that don't use mobile.

**Fix:** Only include Capacitor origins if the project uses Capacitor (check if `capacitor.config.ts` exists, or use an env var).

**Files:** `packages/backend/src/middleware/cors.ts`

---

## Backend Issues

### 10. Missing Error Handling in Routes

Multiple routes have unprotected database calls that will throw unhandled promise rejections:

- `profile.ts`: GET route has no try-catch
- `health.ts`: No error handling
- GDPR routes: Some `db.query` calls unprotected
- Admin routes: Query param typing issues (`req.query.page` is `string | string[]`, not `string`)

**Fix:** Add try-catch blocks or a shared async route wrapper. Fix Express 5 query param types (use bracket notation: `req.query['page']`).

**Files:** `packages/backend/src/routes/*.ts`

---

### 11. No Graceful Shutdown

The server starts but never handles `SIGTERM`/`SIGINT`. Railway/Vercel will force-kill after timeout, potentially corrupting in-flight database transactions.

**Fix:**
```typescript
process.on('SIGTERM', async () => {
  server.close();
  await db.end();
  process.exit(0);
});
```

**Files:** `packages/backend/src/index.ts`

---

### 12. No Database Connection Pooling Config

`postgres()` is called with no pool settings. Will exhaust connections under load.

**Fix:** Configure `max`, `idle_timeout`, and `connect_timeout`:
```typescript
postgres(env.DATABASE_URL, { max: 10, idle_timeout: 20, connect_timeout: 10 })
```

**Files:** `packages/backend/src/db/index.ts`

---

### 13. No Database Indexes

No indexes on foreign keys or frequently-queried columns. Every query on `userId`, `email`, `createdAt` does a full table scan.

**Fix:** Add indexes in schema:
- `users.email` (already unique, so indexed)
- `sessions.userId`
- `sessions.expiresAt`
- `consentRecords.userId`
- `deletionRequests.userId, scheduledDeletionAt`

**Files:** `packages/backend/src/db/schema/*.ts`

---

### 14. Email Templates Don't Have Runtime Access to `FRONTEND_URL`

React Email templates use `process.env["FRONTEND_URL"]` but this isn't available in the render context. Email links may be broken.

**Fix:** Pass `baseUrl` as a prop from the email sending function (which does have access to env vars). Already partially done but inconsistent across templates.

**Files:** `packages/email/src/*.tsx`, `packages/backend/src/auth/email.ts`

---

## Frontend Issues

### 15. No Loading Timeout in ProtectedRoute

`ProtectedRoute` shows a loading spinner while checking auth. If the backend is down, it spins forever.

**Fix:** Add a timeout (e.g., 10 seconds) after which it shows an error or redirects to login.

**Files:** `packages/frontend/src/components/auth/ProtectedRoute.tsx`

---

### 16. Inconsistent Error States

Some components catch API errors and show nothing. Others let errors bubble up and crash.

**Fix:** Standardize: every component that calls an API should have loading, error, and empty states.

---

### 17. No Offline Support for Capacitor

Native apps have no service worker or request queue. If the device goes offline, requests fail silently.

**Fix:** For MVP, show an offline banner. For production, add a request queue that retries when online.

---

## Sail Issues

### 18. Sail Installer Fragility

Marker-based insertion uses simple string matching. If a file is reformatted (prettier, eslint --fix), markers might not be found.

**Fix:** Make marker matching whitespace-tolerant. If marker not found, show clear manual instructions (already partially done).

**Files:** `cli/src/sail-installer.ts`

---

### 19. No Sail Compatibility Validation

Sails can be installed in any combination without checking conflicts. E.g., two sails might both try to add the same route or env var.

**Fix:** Add a compatibility matrix in `registry.json`. Check before installation.

---

### 20. Incomplete Sails

| Sail | Status | What's Missing |
|------|--------|----------------|
| **google-oauth** | 90% complete | Needs testing with real Google credentials, missing error page for OAuth failures |
| **stripe** | 85% complete | Webhook route not auto-mounted in `index.ts`, missing subscription status page |
| **gdpr** | 90% complete | Hardcoded URLs (see #2), missing indexes on tables |
| **r2-storage** | 80% complete | No file size limits, no mime type validation, no cleanup of orphaned files |
| **push-notifications** | 30% complete | `install.ts` missing, Firebase init not included, no actual push sending logic |
| **analytics** | 70% complete | PostHog integration exists but no server-side events, no consent integration |
| **admin-dashboard** | 75% complete | TypeScript errors in admin.ts (query param types), no audit logging |
| **i18n** | 80% complete | Language files scaffolded but no dynamic loading, no RTL support |
| **rate-limiting** | 20% complete | Marked "planned", memory-only store (no Redis), resets on restart |
| **file-uploads** | 10% complete | Marked "planned", mostly stubs |

---

## Testing (currently 0%)

### 21. No Tests Exist

Zero test files in the entire project. No unit tests, integration tests, or e2e tests.

**Priority test areas:**
1. Auth flow: signup → verify email → login → session → logout
2. GDPR: consent recording, data export, deletion request/cancel/execute
3. Sail installer: marker insertion, missing marker fallback, file copy
4. CLI: `keel create --yes`, `keel dev`, `keel generate`
5. API routes: auth middleware, input validation, error responses

**Recommended stack:** Vitest (unit/integration), Playwright (e2e)

---

## Infrastructure

### 22. Railway Config Runs Migrations at Start

`db:migrate` runs on every deploy during the start command. If a migration fails, the app won't start and has no rollback.

**Fix:** Run migrations in the build step with a separate DB connection (external URL, not internal), or add migration rollback logic.

**Files:** `packages/backend/railway.json`

---

### 23. No Structured Logging

All logging is `console.log`. No log levels, no structured format, no correlation IDs.

**Fix:** Add `pino` or `winston` with JSON output. Railway and other platforms parse structured logs automatically.

---

### 24. No Health Check Beyond Basic

`/api/health` returns `{ status: "ok" }` without checking database connectivity.

**Fix:** Add a database ping to the health check. Return `{ status: "ok", db: "connected" }` or appropriate error.

---

## Priority Order for Developer

### Week 1: Critical Fixes
1. Fix initial migration (#1)
2. Remove hardcoded URLs (#2)
3. Enforce strong auth secret in production (#3)
4. Add error boundaries (#4)
5. Fix `keel dev` process management (#5)

### Week 2: Security
6. Add rate limiting (#6)
7. Fix open redirect (#7)
8. Add graceful shutdown (#11)
9. Add database indexes (#13)

### Week 3: Error Handling & Polish
10. Add try-catch to all routes (#10)
11. Fix email template URLs (#14)
12. Add loading timeout (#15)
13. Standardize error states (#16)

### Week 4: Testing
14. Set up Vitest + test infrastructure
15. Auth flow tests
16. GDPR tests
17. Sail installer tests
18. CLI tests

### Ongoing: Sail Completion
19. Complete push-notifications sail
20. Complete rate-limiting sail
21. Complete file-uploads sail
22. Add TypeScript fixes to admin-dashboard sail
