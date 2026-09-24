# DiabCare Woundcam

DiabCare Woundcam is a bilingual clinical companion web application for hospital teams and local village nurses monitoring diabetic wounds. It provides a de-identified patient workspace, guided camera capture, local wound-image inference, and longitudinal clinical-record review.

> **Clinical safety:** Model output is **Decision Support only**. It is not a diagnosis and must be reviewed by a qualified clinician before any care decision. Patient data and wound images must remain within the approved local deployment boundary.

## Current capabilities

- Authenticated care-team dashboard with responsive sidebar navigation.
- English and Thai interface translations with locale-aware dates, numbers, and measurements.
- Imported, de-identified diabetes patient cohort with patient search, filters, observations, and record drill-down.
- Clinical record workspace for source-preserved demographics, vitals, laboratory observations, medication context, review flags, timelines, and wound-progress placeholders.
- Real browser camera capture using `MediaDevices.getUserMedia`, with image-upload fallback and local preview.
- Server-side wound-image inference using the locally packaged ONNX model and `onnxruntime-node`.
- Five model classes: `callus_corn`, `dfu_ulcer`, `infected_wound`, `necrotic_wound`, and `normal_foot`.
- Detection bounding boxes mapped onto the captured preview, with confidence scores and a clinician-review disclaimer.
- Type-safe tRPC procedures, Drizzle ORM schema, Supabase PostgreSQL persistence, and S3-compatible storage helpers.

## Architecture

| Layer | Implementation |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, Wouter, Radix UI, Lucide Icons |
| API | Express, tRPC 11, Zod validation |
| Persistence | Supabase PostgreSQL accessed through Drizzle ORM |
| Inference | Ultralytics YOLO export, ONNX Runtime Node, Sharp preprocessing |
| Authentication | Manus OAuth/session integration |
| Storage | S3-compatible object storage helpers; store references, not image bytes, in database rows |
| Localization | Shared English/Thai `LanguageProvider` |

The application uses local/server-side inference. Patient images are not sent to an external AI API by the wound-detection flow.

## Repository layout

```text
client/
  src/pages/                 React page components
  src/components/            Shared layout and UI components
  src/contexts/              Language and theme providers
  src/lib/trpc.ts            Typed tRPC client
server/
  db.ts                      Database helpers
  routers.ts                 tRPC router contracts
  woundInference.ts          ONNX preprocessing and output decoding
  models/                    Versioned ONNX model and label manifest
drizzle/                     Database schema and migrations
shared/                      Shared constants and types
```

## Requirements

- Node.js 22 or a compatible current Node.js runtime.
- pnpm 10.
- Supabase PostgreSQL connection available through the server-only `SUPABASE_DATABASE_URL`.
- Required application/authentication environment variables supplied by the deployment environment. Do not commit `.env` files or credentials.
- A CPU-capable runtime for `onnxruntime-node` and native Sharp dependencies.

## Local development

```bash
pnpm install
pnpm dev
```

The development server starts the Express/tRPC backend and Vite frontend together. The application requires authentication before protected patient and assessment workflows can be opened.

When `NODE_ENV=development`, the app uses a clearly labeled synthetic **Local Clinician** identity by default, so a local checkout does not redirect to Manus OAuth. This bypass is development-only; set `LOCAL_AUTH_BYPASS=false` to test the unauthenticated flow. Production keeps Manus authentication enabled unless `LOCAL_AUTH_BYPASS=true` is explicitly set.

## Docker Compose

`Dockerfile` builds the Vite frontend and Express/tRPC backend together. The runtime image includes the checked-in ONNX wound detector under `dist/models`, so the browser UI, API, and local YOLO inference run as one service. The database is intentionally not bundled: configure the server-only `SUPABASE_DATABASE_URL` for the approved Supabase PostgreSQL connection rather than creating a second copy of clinical data in a local container.

Copy `env.example` to the ignored local `.env` file, then replace the Supabase and secret placeholders before starting the stack:

```bash
cp env.example .env
# Edit .env and set SUPABASE_DATABASE_URL to the Supabase Session pooler URL.
docker compose up --build -d
docker compose ps
docker compose logs -f diabcare-woundcam
```

The service is bound to `127.0.0.1:3000` by default rather than exposed to the LAN. For phone camera access, run it behind [Tailscale Serve](https://tailscale.com/docs/features/tailscale-serve), which terminates HTTPS using your tailnet DNS name:

```bash
docker compose up --build -d
tailscale serve 3000
tailscale serve status
```

Open the HTTPS `*.ts.net` URL printed by Tailscale on the phone. Tailscale Serve requires HTTPS to be enabled for the tailnet and keeps the service available only to authorized tailnet devices. The HTTPS origin is required because mobile browsers generally do not allow `getUserMedia()` from an ordinary LAN HTTP address. For an isolated local Docker demo without Manus OAuth, start it with `LOCAL_AUTH_BYPASS=true docker compose up --build -d`; leave this unset or set it to `false` for shared or production environments. Never commit `.env`, database credentials, OAuth secrets, or patient data.

## Database

The application database is the connected Supabase project. The schema migration is versioned at `supabase/migrations/20260924000000_create_diabcare_application_schema.sql`; the server accesses it through Drizzle's PostgreSQL adapter using the server-only `SUPABASE_DATABASE_URL`. Copy the connection string from the Supabase Dashboard's **Connect** dialog. For this runtime, use the IPv4-compatible shared **Session pooler** URL on port 5432; the direct `db.<project-ref>.supabase.co` URL resolves to IPv6 and is not reachable here. Do not use the browser Data API from the server. Manus OAuth remains the authentication provider, while the `users` table stores the application-side OAuth identity and role record.

The approved migration copied the existing source database into Supabase without deleting the source: one application user, one import batch, 100 de-identified patients, and 42,859 observations. All four public tables have RLS enabled, and anonymous/authenticated Data API access is revoked; patient data is read and written by the protected application server connection only.

For future schema changes, review the SQL migration first and apply it through the Supabase migration workflow. Do not run schema or data changes against a production database without an explicit review and backup plan. Imported patient data must remain de-identified and must follow the deployment's local data-residency policy.

## Validation commands

```bash
pnpm check       # TypeScript validation
pnpm test        # Vitest suite
pnpm build       # Production frontend and server bundle
pnpm format      # Prettier formatting
```

The inference smoke test generates an image buffer and verifies that the packaged model loads, returns a valid structured response, uses the expected class contract, and produces bounded boxes. Model quality must additionally be evaluated against a held-out labeled wound dataset before clinical use.

## Model and inference notes

The checked-in model is `server/models/diabetes-wound-detector.onnx`, accompanied by `diabetes-wound-detector.labels.json`. The server supports the post-NMS `[1, 300, 6]` output emitted by the current Ultralytics export as well as common raw YOLO layouts `[1, 9, 8400]` and `[1, 8400, 9]`.

The inference pipeline:

1. Accepts a base64 image payload through the protected `wound.infer` tRPC mutation.
2. Validates payload size and decodes the image server-side.
3. Applies EXIF rotation and 640×640 letterbox preprocessing with Sharp.
4. Runs CPU ONNX inference locally.
5. Decodes model output, filters by confidence, and applies class-aware overlap suppression.
6. Returns detections and a required clinician-review disclaimer to the frontend.

Model confidence is not clinical certainty. Thresholds, calibration, per-class performance, and failure modes must be reviewed with representative validation data.

## Privacy and clinical boundaries

- Use de-identified records for development and test fixtures.
- Do not place patient names, identifiers, or wound photographs in source control, logs, screenshots, or issue reports.
- Keep inference and storage within the approved local residency boundary.
- Treat model results as suggestions for clinician review, never as autonomous diagnoses or treatment instructions.
- Record provenance and review actions when production persistence is enabled.

## Project status

The current implementation is an authenticated MVP with patient records, bilingual UI, guided camera capture, local ONNX inference, and visual detection overlays. The next production-readiness gates are held-out model evaluation, image persistence linked to wound assessments, clinician confirmation/audit workflow, and deployment security review.

## License

MIT
