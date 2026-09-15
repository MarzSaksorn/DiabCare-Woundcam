# WoundCam API — `apps/api`

Express service implementing the v0.1 contract (`docs/api-contract.md`).

## Layout

```
src/
  app.js               Express app assembly (route wiring lands B3–B8)
  server.js            Entrypoint; graceful SIGTERM/SIGINT
  middleware/          request-context (request ids), errors (contract envelope)
  routes/health.js     GET /healthz
  scripts/migrate.js   SQL migration runner (filename order, transactional)
migrations/            Plain SQL, applied by `npm run migrate`
```

## Local development

```bash
npm install
DATABASE_URL=postgres://woundcam:woundcam@localhost:5432/woundcam npm run migrate
npm run dev            # PORT defaults to 3000
```

Or via the repo-root compose file: `docker compose up --build`.

## Environment

| Variable | Default | Notes |
|---|---|---|
| `PORT` | `3000` | |
| `DATABASE_URL` | — | Required for migrate + all data routes |
| `NODE_ENV` | `development` | |

Secrets are injected at deploy time (env/secret store, NFR-SEC-3) — never committed. Values in `docker-compose.yml` are local-dev placeholders only.
