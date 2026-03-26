import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/keel";
const isPGlite = dbUrl.startsWith("pglite://");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  ...(isPGlite
    ? { driver: "pglite", dbCredentials: { url: dbUrl.replace("pglite://", "") || "./data/pglite" } }
    : { dbCredentials: { url: dbUrl } }
  ),
});
