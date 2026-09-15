#!/usr/bin/env node
/**
 * Minimal SQL migration runner (B2).
 * Applies apps/api/migrations/*.sql in filename order, each in its own
 * transaction, tracked in schema_migrations. Safe to re-run.
 *
 * Usage: DATABASE_URL=postgres://… npm run migrate
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "migrations");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`);

const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
let applied = 0;

for (const file of files) {
  const { rowCount } = await client.query("SELECT 1 FROM schema_migrations WHERE filename = $1", [file]);
  if (rowCount > 0) continue;

  const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
    await client.query("COMMIT");
    applied += 1;
    console.log(`applied ${file}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`FAILED ${file}: ${err.message}`);
    process.exitCode = 1;
    break;
  }
}

console.log(`${applied} migration(s) applied, ${files.length - applied} skipped (already present or after failure)`);
await client.end();
