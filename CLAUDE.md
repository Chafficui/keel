# keel — AI Documentation (a codai project)

## What is this?

A full-stack template repository for creating web + mobile applications. Projects are created via `npx keel create my-project`. The template includes authentication, email templates, database, and native mobile support out of the box. Additional features (GDPR, Stripe, Google OAuth, file storage) are added via the sail system.

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Vite + React 19 + TypeScript | SPA with TailwindCSS v4 |
| Mobile | Capacitor 8 | iOS + Android via WebView |
| Backend | Express 5 + TypeScript | ESM, tsx runner for dev |
| Auth | BetterAuth | Drizzle adapter, hybrid cookie/Bearer |
| Email | Resend + React Email | Templated transactional emails |
| Database | PostgreSQL + Drizzle ORM | Declarative schema, migration-based |
| Hosting | Vercel (frontend) + Railway (backend) | Config files included |

## Monorepo Structure

```
packages/
  shared/     → @keel/shared   — Types (User, Auth, Consent, API) + Zod validators
  email/      → @keel/email    — React Email templates (verification, welcome, password-reset)
  frontend/   → @keel/frontend — Vite + React SPA + Capacitor
  backend/    → @keel/backend  — Express 5 API server
sails/        → Minimal tracker only (installed.json) — sail code is NOT bundled here
cli/          → "keel" npm package — project creation + sail management
  sails/      → Sail definitions bundled with the CLI
    registry.json — Master list of all sails and their status
    google-oauth/ — addon.json, install.ts, files/, README.md
    stripe/       — addon.json, install.ts, files/, README.md
  src/
    create.ts         — "create-keel" entry point (project scaffolding)
    create-runner.ts  — Shared create logic (banner, prompts, scaffold, sails)
    manage.ts         — "keel" entry point (all CLI commands)
    scaffold.ts       — Cloning, branding, env, deps, git init
    prompts.ts        — Interactive wizard + --yes flag support
    sail-installer.ts — Core sail install logic (file copy, marker insertion)
brand/        → Keel brand guidelines and assets (for CLI and keel.codai.app)
docs/         → Detailed guides
```

## CLI Commands

### Project Creation
```bash
npx keel create my-app                              # Interactive wizard
npx keel create my-app --yes                         # All defaults, no prompts
npx keel create my-app --yes --db=docker             # Specify database
npx keel create my-app --yes --db=url --db-url=...   # Custom DB URL
npx keel create my-app --yes --sails=stripe,google-oauth
npx keel create my-app --yes --resend-key=re_xxx --email-from=noreply@x.com
```

### Development
```bash
keel dev                          # Docker up + migrate + dev servers
keel start                        # Docker up + migrate + build + production
```

### Project Management
```bash
keel doctor                       # Health check (Node, Docker, DB, .env, deps)
keel env                          # Show env var status (set/missing)
keel upgrade                      # Check for CLI updates
```

### Code Generators
```bash
keel generate route <name>        # Scaffold Express route
keel generate page <name>         # Scaffold React page
keel generate email <name>        # Scaffold React Email template
keel g route <name>               # Shorthand
```

### Sail Management
```bash
keel sail add <name>              # Install a sail
keel sail remove <name>           # Remove a sail
keel list                         # List all sails with status
keel info <name>                  # Show sail details
```

### Database
```bash
keel db:reset                     # Drop schema + re-migrate (confirms first)
keel db:studio                    # Open Drizzle Studio
keel db:seed                      # Run seed.ts if it exists
```

### npm Scripts (inside a project)
```bash
npm run dev                       # Build shared+email, then concurrently run frontend+backend
npm run dev:frontend              # Vite dev server at :5173
npm run dev:backend               # Express with tsx watch at :3005
npm run dev:email                 # React Email preview at :3010
npm run build                     # Build all packages
npm run db:generate               # Generate Drizzle migration from schema changes
npm run db:migrate                # Apply pending migrations
npm run db:push                   # Push schema directly (dev only)
npm run db:studio                 # Open Drizzle Studio GUI
npm run typecheck                 # Type check all packages
```

## Architecture Decisions

### Auth: Hybrid Cookie + Bearer Token
- **Web**: HTTP-only cookies (standard BetterAuth behavior)
- **Native (Capacitor)**: Bearer token stored in `@capacitor/preferences`
- Detection: frontend sends `X-Platform: capacitor` header on native
- Backend middleware checks Bearer first, falls back to cookie
- Files: `backend/src/middleware/auth.ts`, `frontend/src/lib/api.ts`

### Express 5 + BetterAuth
- BetterAuth handler mounted BEFORE `express.json()` (it reads its own body)
- Uses Express 5 named wildcard: `app.all("/api/auth/{*splat}", ...)`
- File: `backend/src/index.ts`

### Frontend API Calls
- Web dev: relative paths via Vite proxy (`/api/...`)
- Production + Native: absolute URL from `VITE_API_URL`
- Vite proxy silently returns 502 if backend isn't ready (no error spam)
- File: `frontend/src/lib/api.ts`

### Dev Mode
- Emails auto-verify in development (no email sending required)
- Backend logs emails to console when RESEND_API_KEY is not set
- `npm run dev` builds shared+email first, then runs frontend+backend concurrently

## Database Schema

### Core Tables (BetterAuth)
- `user` — id, name, email, emailVerified, image, timestamps
- `session` — id, userId(FK), token, expiresAt, ipAddress, userAgent
- `account` — id, userId(FK), providerId, accountId, password(hashed), tokens
- `verification` — id, identifier, value(token), expiresAt

Schema files: `backend/src/db/schema/`

## Sail System

Sails are **not** bundled into each project. They are fetched on-demand from the `keel` CLI package.

### How it works

1. **Project creation**: `npx keel create my-project` scaffolds a clean project with NO sail code, just marker comments and `sails/installed.json`.

2. **Installing a sail**: From inside a project:
   ```bash
   npx keel sail add google-oauth
   ```
   Copies files, inserts code at markers, installs deps, updates `sails/installed.json`.
   If a marker is missing (user modified the file), prints manual instructions instead of failing.

3. **Removing a sail**: `npx keel sail remove <name>` deletes added files, updates installed.json, prints manual cleanup instructions for modified files.

4. **Listing sails**: `npx keel list` shows all available sails and their install status.

### Marker comments

Sails inject code at marker comments in base files:
```
// [SAIL_IMPORTS]              — backend/src/index.ts, frontend/src/router.tsx, LoginForm, SignupForm
// [SAIL_ROUTES]               — backend/src/index.ts
{/* [SAIL_ROUTES] */}          — frontend/src/router.tsx (JSX comment format)
// [SAIL_SCHEMA]               — backend/src/db/schema/index.ts
// [SAIL_SOCIAL_PROVIDERS]     — backend/src/auth/index.ts
// [SAIL_ENV_VARS]             — backend/src/env.ts
{/* [SAIL_SOCIAL_BUTTONS] */}  — frontend LoginForm.tsx, SignupForm.tsx
{/* [SAIL_FOOTER_LINKS] */}    — frontend Footer.tsx
```

### Available sails

| Sail | Category | Status |
|------|----------|--------|
| google-oauth | Auth | Available |
| stripe | Payments | Available |
| gdpr | Compliance | Available |
| r2-storage | Storage | Available |
| push-notifications | Mobile | Available |
| analytics | Tracking | Available |
| admin-dashboard | Admin | Available |
| i18n | i18n | Available |
| rate-limiting | Security | Planned |
| file-uploads | Storage | Planned |

## Common Tasks

### Add a new API route
1. Create route file in `backend/src/routes/myroute.ts`
2. Import and mount in `backend/src/index.ts` (before the SAIL markers)
3. Add types to `shared/src/types/` if needed
4. Or use: `keel generate route myroute`

### Add a new database table
1. Create schema in `backend/src/db/schema/mytable.ts`
2. Export from `backend/src/db/schema/index.ts`
3. Run `npm run db:generate` then `npm run db:migrate`

### Add a new page
1. Create page component in `frontend/src/pages/MyPage.tsx`
2. Add route in `frontend/src/router.tsx`
3. If protected, wrap with `<ProtectedRoute>`
4. Or use: `keel generate page mypage`

### Add a new email template
1. Create template in `packages/email/src/my-email.tsx`
2. Export from `packages/email/src/index.ts`
3. Import and render in `backend/src/auth/email.ts` using `@react-email/render`
4. Or use: `keel generate email my-email`

### Modify auth configuration
- BetterAuth server config: `backend/src/auth/index.ts`
- BetterAuth client config: `frontend/src/lib/auth-client.ts`
- Auth middleware: `backend/src/middleware/auth.ts`

## Environment Variables

### Backend (.env) — Core (always required)
| Variable | Description |
|----------|-------------|
| DATABASE_URL | PostgreSQL connection string |
| BETTER_AUTH_SECRET | Secret for signing sessions |
| PORT | Server port (default: 3005) |
| NODE_ENV | development / production |
| BACKEND_URL | Public backend URL |
| FRONTEND_URL | Public frontend URL |
| RESEND_API_KEY | Resend API key for emails (optional in dev) |
| EMAIL_FROM | Sender email address |

### Frontend (.env)
| Variable | Description |
|----------|-------------|
| VITE_API_URL | Backend API URL (empty for dev proxy) |
| VITE_APP_NAME | Application display name |

### Sail-specific env vars (only needed when sail is installed)
| Sail | Variables |
|------|-----------|
| google-oauth | GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET |
| stripe | STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET |
| r2-storage | R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL |
| gdpr | DELETION_CRON_SECRET |

## Brand

The `brand/` folder contains Keel's own brand guidelines and assets (for the CLI and keel.codai.app). Consumer apps should replace all branding with their own.

## File Import Convention
- All `.ts` imports use `.js` extension (ESM + NodeNext requirement)
- Example: `import { db } from "./db/index.js"`
- Shared package imported as `@keel/shared`
- Email package imported as `@keel/email`
