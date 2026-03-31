# Project Documentation (AI-Ready)

## Tech Stack
- Frontend: Vite + React 19 + TypeScript + TailwindCSS v4
- Backend: Express 5 + TypeScript (ESM)
- Database: PostgreSQL + Drizzle ORM
- Auth: BetterAuth (email/password, sessions)
- Email: Resend + React Email
- Mobile: Capacitor (iOS + Android)

## Project Structure
```
packages/
  shared/     @keel/shared   — Shared types + Zod validators
  email/      @keel/email    — React Email templates
  frontend/   @keel/frontend — Vite + React SPA
  backend/    @keel/backend  — Express API server
sails/        — Installed sail extensions (see installed.json)
```

## Critical Conventions

### Import Rules (ESM)
- ALL `.ts` imports MUST use `.js` extension: `import { db } from "./db/index.js"`
- Shared package: `import { User } from "@keel/shared"`
- Email package: `import { WelcomeEmail } from "@keel/email"`

## Adding Features — ALWAYS use keel CLI

### Adding an API Route
```bash
npx @codaijs/keel generate route myroute
```
This creates the route file AND auto-mounts it in index.ts. Ready at `/api/myroute`.
Add request/response types to `packages/shared/src/types/` and Zod validators to `packages/shared/src/validators/` as needed.

### Adding a Frontend Page
```bash
npx @codaijs/keel generate page my-page
```
This creates the page component AND adds the route to router.tsx. Ready at `/my-page`.
If the page should be protected, manually wrap with `<ProtectedRoute>` in router.tsx.

### Adding an Email Template
```bash
npx @codaijs/keel generate email my-email
```
This creates the React Email template AND exports it from index.ts.

### Adding a Database Table
1. Create schema in `packages/backend/src/db/schema/mytable.ts`
2. Export from `packages/backend/src/db/schema/index.ts`
3. Run `npm run db:generate` then `npm run db:migrate`

### Installing a Sail (add-on)
```bash
npx @codaijs/keel sail add stripe
npx @codaijs/keel sail add google-oauth
npx @codaijs/keel list                    # see all available sails
```
Do NOT manually copy sail code. Always use the CLI.

## Auth
- Protected routes use `requireAuth` middleware: `router.get("/", requireAuth, handler)`
- `req.user` has: id, name, email, emailVerified, image, createdAt, updatedAt
- `req.session` has: id, userId, token, expiresAt, ipAddress, userAgent
- Frontend uses `useAuth()` hook: `const { user, isAuthenticated, login, signup, logout } = useAuth()`
- BetterAuth server config: `packages/backend/src/auth/index.ts`
- BetterAuth client config: `packages/frontend/src/lib/auth-client.ts`
- Auth middleware: `packages/backend/src/middleware/auth.ts`

## Database
- Schema files: `packages/backend/src/db/schema/`
- Core tables: user, session, account, verification
- Drizzle config: `packages/backend/drizzle.config.ts`
- Migrations: `packages/backend/src/db/migrations/`

## Available Types (@keel/shared)
- User, UserProfile, UpdateProfileInput
- SignupInput, LoginInput, AuthResponse, SessionInfo
- ConsentRecord (if GDPR sail installed)
- ApiResponse, ApiErrorResponse, PaginatedResponse
- See `packages/shared/src/types/` for all exports

## Available Validators (@keel/shared)
- updateProfileSchema, signupSchema, loginSchema
- consentSchema (if GDPR sail installed)
- See `packages/shared/src/validators/` for all exports

## Environment Variables
- Backend: see `packages/backend/src/env.ts` for all vars and defaults
- Frontend: `VITE_API_URL` (backend URL), `VITE_APP_NAME` (display name)
- Backend .env is at project root (`.env`)
- Frontend .env is at `packages/frontend/.env`

## Sail Markers
These comments are insertion points for sails. Do NOT remove them:
- `// [SAIL_IMPORTS]` — backend/frontend imports
- `// [SAIL_ROUTES]` — backend routes, frontend routes
- `// [SAIL_SCHEMA]` — database schema exports
- `// [SAIL_ENV_VARS]` — environment variable validation
- `// [SAIL_SOCIAL_PROVIDERS]` — BetterAuth social providers
- `{/* [SAIL_SOCIAL_BUTTONS] */}` — login/signup social buttons
- `{/* [SAIL_FOOTER_LINKS] */}` — footer links

## Installed Sails
Check `sails/installed.json` for currently installed sails and their metadata.

## Commands
```bash
npm run dev              # Build shared+email, then start frontend + backend concurrently
npm run dev:frontend     # Vite dev server only (port 5173)
npm run dev:backend      # Express dev server only (port 3005)
npm run dev:email        # React Email preview (port 3010)
npm run build            # Build all packages in order
npm run typecheck        # Type check all packages
npm run lint             # Run ESLint across all packages
npm run format           # Format code with Prettier
npm run db:generate      # Generate migration from schema changes
npm run db:migrate       # Apply pending migrations
npm run db:push          # Push schema directly (dev only)
npm run db:studio        # Open Drizzle Studio GUI
```

## Verification After Changes
Run this single command to verify everything:
```bash
npm run check              # typecheck + lint + test
```

Or individually:
```bash
npm run typecheck          # Type check all packages
npm run lint               # ESLint
npm run test               # Run tests
npm run format             # Auto-format with Prettier
```
