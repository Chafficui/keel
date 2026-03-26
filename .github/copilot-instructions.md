This is a keel full-stack TypeScript monorepo.

Import convention: All .ts imports must use .js extension (ESM requirement). Example: import { db } from "./db/index.js"

Package structure:
- packages/shared (@keel/shared): Shared TypeScript types and Zod validators
- packages/email (@keel/email): React Email templates
- packages/frontend (@keel/frontend): Vite + React 19 SPA with TailwindCSS v4
- packages/backend (@keel/backend): Express 5 API server

Auth: BetterAuth with requireAuth middleware on backend, useAuth() hook on frontend.
Database: PostgreSQL with Drizzle ORM. Schema in packages/backend/src/db/schema/.
Styling: TailwindCSS v4 with custom theme (keel-navy, keel-blue, keel-gray-*).

IMPORTANT: Use keel CLI commands for scaffolding. Run `npx @codai/keel generate route <name>` to create API routes (auto-mounts in index.ts). Run `npx @codai/keel generate page <name>` to create React pages (auto-adds to router.tsx). Run `npx @codai/keel generate email <name>` to create email templates (auto-exports). Never manually create these files — the CLI handles mounting, importing, and exporting automatically.

When adding a DB table: create schema, export from index.ts, run npm run db:generate && npm run db:migrate.
When installing a sail: run `npx @codai/keel sail add <name>`. Do NOT manually copy sail code.

Do NOT remove sail marker comments (// [SAIL_IMPORTS], // [SAIL_ROUTES], etc.)
Always verify with: npm run check
