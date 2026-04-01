import { env } from "../env.js";
import * as schema from "./schema/index.js";

const isPGlite = env.DATABASE_URL.startsWith("pglite://");

// Dynamically initialize the correct driver based on DATABASE_URL.
// PGlite (pglite://./data) runs PostgreSQL in-process via WASM — no Docker needed.
// Regular postgres:// URLs use the standard postgres.js driver.

let db:
  | ReturnType<typeof import("drizzle-orm/postgres-js").drizzle>
  | ReturnType<typeof import("drizzle-orm/pglite").drizzle>;
let closeDb: () => Promise<void>;

if (isPGlite) {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const dataDir = env.DATABASE_URL.replace("pglite://", "") || "./data/pglite";
  const client = new PGlite(dataDir);
  db = drizzle(client, { schema });
  closeDb = async () => {
    await client.close();
  };
} else {
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const client = postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  db = drizzle(client, { schema });
  closeDb = async () => {
    await client.end();
  };
}

export { db, closeDb };
