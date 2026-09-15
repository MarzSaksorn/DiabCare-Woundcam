import pg from "pg";

/** Shared Postgres pool. DATABASE_URL is required for all data routes. */
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on("error", (err) => {
  console.error(JSON.stringify({ level: "error", msg: "pg pool error", error: err.message }));
});
