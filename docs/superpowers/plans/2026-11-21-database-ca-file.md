# Database CA File Support Implementation Plan

> **For agentic workers:** Implement this plan natively in the current session. Steps use checkbox syntax for tracking.

**Goal:** Let the app load the PostgreSQL CA certificate from a runtime-mounted file while retaining the inline variable as a compatibility fallback.

**Architecture:** Add a small environment-to-CA helper that reads `DATABASE_SSL_CA_FILE` when set and otherwise decodes `DATABASE_SSL_CA`. Missing/unreadable/empty configured files fail clearly. Keep TLS verification enabled in `server/db.ts`; document Coolify host file mounting to a path readable by the runtime `node` user.

**Tech Stack:** TypeScript, Node.js `fs`, Vitest, Docker/Coolify.

**Spec:** User request in task history: read Supabase CA from a mounted file instead of requiring PEM content in `.env`.

## Global Constraints

- Do not disable TLS verification; keep `rejectUnauthorized: true` when a CA is configured.
- Do not put certificate content in Git, `.env`, Docker build args, or image layers.
- Do not deploy, merge, or change production runtime configuration.
- Retain `DATABASE_SSL_CA` as a backward-compatible fallback.

## Review Focus

- File variable unset: existing inline PEM parsing remains compatible.
- File path takes precedence if both variables are present.
- Configured file missing, unreadable, or empty: startup/configuration fails with a clear error, never falls back silently.
- TLS CA configuration remains verified and does not weaken `rejectUnauthorized`.
- File content is not logged or included in error messages.

---

### Task 1: Load CA material from a runtime file

**Files:**

- Create: `server/_core/database-ssl.ts`
- Modify: `server/_core/env.ts`
- Test: `server/_core/database-ssl.test.ts`

- [ ] Test inline `\\n` decoding, mounted-file loading, file precedence, and missing/empty file errors.
- [ ] Implement `loadDatabaseSslCa(env: NodeJS.ProcessEnv): string` with file-first resolution and a clear error that does not expose file contents.
- [ ] Run the focused Vitest test and TypeScript check.

### Task 2: Document deployment and validate

**Files:**

- Modify: `env.example`
- Modify: `README.md`

- [ ] Document `DATABASE_SSL_CA_FILE` and omit inline certificate contents as the preferred setup.
- [ ] Add Coolify Host File Mount steps for an existing deployment-server file, container destination `/run/secrets/supabase-ca.pem`, and read access for the `node` runtime user.
- [ ] Run focused tests, full tests, check, build, and `git diff --check`; inspect final diff. Commit and push only the feature branch if verification passes; do not merge or deploy.

**Documentation checked:** Supabase changelog (`https://supabase.com/changelog.md`) shows no relevant PostgreSQL TLS/client CA breaking change in the returned recent entries. Supabase PostgreSQL connection docs (`https://supabase.com/docs/guides/database/connecting-to-postgres`) state that `require` encrypts without verifying and recommend the downloaded root certificate with full verification. Coolify file mount docs (`https://coolify.io/docs/core/persistent-storage/storage-mounts/file-mounts`) describe Host File Mounts for files maintained on the deployment server and require container read permissions. Coolify storage overview (`https://coolify.io/docs/core/persistent-storage/storage-mounts/overview`) confirms mounts live on the deployment server and permissions apply to the container process.
