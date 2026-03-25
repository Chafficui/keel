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

When adding an API route: create in packages/backend/src/routes/, mount in index.ts before // [SAIL_ROUTES], add types to @keel/shared.
When adding a page: create in packages/frontend/src/pages/, add to router.tsx.
When adding a DB table: create schema, export from index.ts, run npm run db:generate && npm run db:migrate.

Do NOT remove sail marker comments (// [SAIL_IMPORTS], // [SAIL_ROUTES], etc.)
Always verify with: npm run check
