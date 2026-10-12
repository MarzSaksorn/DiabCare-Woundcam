# DiabCare Woundcam

DiabCare Woundcam is a bilingual clinical companion web application for hospital teams and local village nurses monitoring diabetic wounds. It provides a de-identified patient workspace, guided camera capture, local wound-image inference, and longitudinal clinical-record review.

> **Clinical safety:** Model output is **Decision Support only**. It is not a diagnosis and must be reviewed by a qualified clinician before any care decision. Patient data and wound images must remain within the approved local deployment boundary.

## Current capabilities

- Authenticated care-team dashboard with responsive sidebar navigation.
- English and Thai interface translations with locale-aware dates, numbers, and measurements.
- Imported, de-identified diabetes patient cohort with patient search, filters, observations, and record drill-down.
- Clinical record workspace for source-preserved demographics, vitals, laboratory observations, medication context, review flags, timelines, and wound-progress placeholders.
- Real browser camera capture using `MediaDevices.getUserMedia`, with image-upload fallback and local preview.
- Server-side wound-image inference using locally packaged ONNX models and `onnxruntime-node`.
- Five model classes: `callus_corn`, `dfu_ulcer`, `infected_wound`, `necrotic_wound`, and `normal_foot`.
- Per-region AZH classification across `BG`, `D`, `N`, `P`, `S`, and `V`, kept separate from detector labels.
- Wound-area segmentation on each qualifying detector crop, with a bounded 128×128 mask overlay and predicted pixel coverage.
- Detection bounding boxes and mask overlays mapped onto the captured preview, with confidence scores, visibility controls, and a clinician-review disclaimer.
- Type-safe tRPC procedures, Drizzle ORM schema, Supabase PostgreSQL persistence, and Cloudflare R2 storage for wound images.

## Architecture

| Layer          | Implementation                                                                    |
| -------------- | --------------------------------------------------------------------------------- |
| Frontend       | React 19, TypeScript, Vite, Tailwind CSS v4, Wouter, Radix UI, Lucide Icons       |
| API            | Express, tRPC 11, Zod validation                                                  |
| Persistence    | Supabase PostgreSQL accessed through Drizzle ORM                                  |
| Inference      | Ultralytics and SmallUNet ONNX exports, ONNX Runtime Node, Sharp preprocessing    |
| Authentication | Supabase Auth email/password sessions                                             |
| Storage        | Private Cloudflare R2 bucket; store references, not image bytes, in database rows |
| Localization   | Shared English/Thai `LanguageProvider`                                            |

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
  woundSegmentation.ts       Optional crop segmentation and mask encoding
  models/                    Versioned ONNX model and label manifest
scripts/
  export_wound_segmentation.py       PyTorch-to-ONNX exporter
  validate_wound_segmentation_onnx.py Deterministic PyTorch/ONNX parity validator
drizzle/                     Database schema and migrations
shared/                      Shared constants and types
```

## Requirements

- Node.js 22 or a compatible current Node.js runtime.
- pnpm 10.
- Supabase PostgreSQL connection available through the server-only `SUPABASE_DATABASE_URL`.
- Required application/authentication environment variables supplied by the deployment environment. Do not commit `.env` files or credentials.
- For sign-in, configure the Supabase project URL and publishable key at runtime. Never expose a `service_role` or secret key to the browser.
- A CPU-capable runtime for `onnxruntime-node` and native Sharp dependencies.
- A bucket-scoped Cloudflare R2 API token with object read/write permissions.

## Local development

```bash
pnpm install
pnpm dev
```

The development server starts the Express/tRPC backend and Vite frontend together. The application requires authentication before protected patient and assessment workflows can be opened. The login page accepts the email and password of a provisioned Supabase Auth user. The email field is the username for this flow.

For a clinical deployment, create users through the Supabase Auth dashboard or an approved administration workflow, then disable public sign-ups under **Authentication → Providers → Email**. The server syncs a successfully authenticated Supabase user into the application `users` table with the default `user` role; set `OWNER_OPEN_ID` to the Supabase Auth user UUID that should be an administrator.

When `NODE_ENV=development`, the app uses a clearly labeled synthetic **Local Clinician** identity by default, so a local checkout can run without Supabase Auth. This bypass is development-only; set `LOCAL_AUTH_BYPASS=false` to test the real unauthenticated flow. Production always requires Supabase Auth and rejects bypass flags.

For the training preview, set `DISABLE_LOGIN_PAGE=true` to keep the development identity active even when `LOCAL_AUTH_BYPASS=false`. The flag is development-only and production startup rejects it. Do not use this mode on a shared or untrusted network with clinical data.

## Docker Compose

`Dockerfile` builds the Vite frontend and Express/tRPC backend together. The runtime image allowlists the checked-in detector, classifier, and segmentation ONNX artifacts under `dist/models`; it does not copy the tracked training kit into the runtime image. The database is intentionally not bundled: configure the server-only `SUPABASE_DATABASE_URL` for the approved Supabase PostgreSQL connection rather than creating a second copy of clinical data in a local container.

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

Open the HTTPS `*.ts.net` URL printed by Tailscale on the phone. Tailscale Serve requires HTTPS to be enabled for the tailnet and keeps the service available only to authorized tailnet devices. The HTTPS origin is required because mobile browsers generally do not allow `getUserMedia()` from an ordinary LAN HTTP address. For a shared or production deployment, set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `.env`; recreate the container after changing them. For an isolated local demo without Supabase Auth, `LOCAL_AUTH_BYPASS=true` is development-only and must never be used in production. Never commit `.env`, database credentials, Supabase secret keys, or patient data.

### Cloudflare R2 image storage

Captured wound images use the private `diabcare-woundcam` R2 bucket in the APAC location. The server uploads bytes with the AWS S3-compatible R2 API. The browser never receives R2 credentials and never reads a public bucket URL.

Set these server-only variables in the runtime environment:

```bash
R2_ACCOUNT_ID=[CLOUDFLARE-ACCOUNT-ID]
R2_BUCKET_NAME=diabcare-woundcam
R2_ACCESS_KEY_ID=[R2-ACCESS-KEY-ID]
R2_SECRET_ACCESS_KEY=[R2-SECRET-ACCESS-KEY]
```

Create the R2 API token in Cloudflare with the smallest scope that supports object read/write for this bucket. The application stores an object key and same-origin `/r2-storage/...` URL in `patient_wound_media`. That route requires the normal application session and a visible media row, then redirects to a five-minute signed R2 GET URL. Deleting a wound photo also deletes its R2 object.

The old Forge storage helper remains as a compatibility fallback when no `R2_*` variables are present. A partially configured R2 setup fails fast instead of silently sending new photos to a different storage backend.

## Database

The application database and authentication provider are the connected Supabase project. The schema migration is versioned at `supabase/migrations/20260924000000_create_diabcare_application_schema.sql`; the server accesses PostgreSQL through Drizzle using the server-only `SUPABASE_DATABASE_URL`. Copy the connection string from the Supabase Dashboard's **Connect** dialog. For this runtime, use the IPv4-compatible shared **Session pooler** URL on port 5432; the direct `db.<project-ref>.supabase.co` URL resolves to IPv6 and is not reachable here. Supabase Auth access tokens arrive in the protected tRPC `Authorization` header, and the server validates them with Supabase before syncing the Auth user into the application `users` table.

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
6. Crops only the qualifying detector regions and runs the independent AZH classifier and optional wound-area segmenter on each crop.
7. Returns separate detector, AZH, and segmentation results or explicit failure states per region, model hashes, and a required clinician-review disclaimer to the frontend.

The response keeps `task: "detect"` for compatibility and uses `pipeline: "detector+azh-classifier+wound-segmentation"`, `schemaVersion: 2`, and separate detector/classifier/segmentation metadata. Detector labels, AZH labels, and predicted mask coverage are different model outputs; the application never rewrites them into one diagnosis. If no detector region qualifies, neither downstream model runs on the full image and the UI reports an inconclusive result.

The runtime loads only the versioned ONNX artifacts under `server/models/`. Adjacent metadata records the tensor contract, class order, export/training provenance, clinical-use boundary, and SHA-256 artifact hash. The segmentation artifact was exported from the tracked research `best.pt` checkpoint with opset 17 and passed 12 deterministic PyTorch/ONNX fixtures; the recorded max absolute logit difference is `2.77e-5` against a `1e-4` tolerance. The runtime never loads the PyTorch checkpoint or raw training data. `WOUND_SEGMENTATION_ENABLED=false` remains the default, so detector and AZH results continue to work when segmentation is disabled or unavailable.

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
