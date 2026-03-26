/**
 * Programmatic database migration runner for production.
 *
 * Uses drizzle-orm's migrate() function directly (no drizzle-kit dependency).
 * This runs in the production Docker image where drizzle-kit is not available.
 *
 * Usage: node packages/backend/dist/db/migrate.js
 */

import { env } from "../env.js";
import * as schema from "./schema/index.js";

const isPGlite = env.DATABASE_URL.startsWith("pglite://");

if (isPGlite) {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dataDir = env.DATABASE_URL.replace("pglite://", "") || "./data/pglite";
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  await client.close();
} else {
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const client = postgres(env.DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  await client.end();
}

console.log("Migrations complete");
