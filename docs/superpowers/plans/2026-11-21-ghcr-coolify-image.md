# GHCR Image Publishing for Coolify Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use the native execution approach task-by-task and review the full diff after implementation.

**Goal:** Build the existing DiabCare production container on GitHub Actions, publish versioned images to GHCR, and let Coolify deploy by pulling an image rather than building a Compose stack.

**Architecture:** Keep the existing multi-stage Dockerfile and local source-build Compose workflow. Add a GitHub Actions workflow that builds `linux/amd64` on pushes to `main` and publishes immutable SHA plus `latest` tags to `ghcr.io/marzsaksorn/diabcare-woundcam`. Add a separate image-only Compose file for Coolify and document GHCR package visibility, pull credentials, image tags, and runtime secrets.

**Tech Stack:** Docker Buildx, GitHub Actions, GitHub Container Registry (GHCR), Docker Compose, Node.js 22, pnpm.

**Spec:** User request in task conversation: publish the application Docker image to a registry so Coolify can pull it, with the image built externally because Compose builds are unsupported on the target build server.

## Global Constraints

- Never put runtime secrets, `.env` files, database credentials, certificates, or patient data in build args, image layers, or workflow output.
- Preserve the existing local `docker-compose.yml` behavior and app port/health check.
- Production deployment remains an explicit user action; do not push or deploy as part of implementation.
- Coolify's Compose definition must use `image:` only and must not contain `build:`.
- Set production auth bypass flags to false in the registry Compose definition.

## Review Focus

- Wrong image namespace or tag casing prevents Coolify from pulling: pin image to lowercase GHCR path and document exact tags.
- External builder/runtime architecture mismatch prevents ONNX/native modules from starting: publish the intended `linux/amd64` platform and document the assumption.
- Private GHCR package lacks pull credentials in Coolify: document package-read authentication or making the package public deliberately.
- Runtime secrets leak into image: ensure Compose reads them at runtime and workflow has no secrets beyond the scoped `GITHUB_TOKEN` package permission.
- Image-only Compose inadvertently disables health checking or local workflows: preserve healthcheck, local compose, and smoke-test instructions.

---

### Task 1: Publish application images from GitHub Actions

**Files:**
- Create: `.github/workflows/publish-container.yml`
- Reuse: `Dockerfile`, `.dockerignore`, `pnpm-lock.yaml`

**Interfaces:**
- Consumes: pushes to `main`, manual workflow dispatch, GitHub-provided `GITHUB_TOKEN`.
- Produces: `ghcr.io/marzsaksorn/diabcare-woundcam:latest` and `:sha-<short-sha>` images for `linux/amd64`.

- [ ] Configure read-only repository contents and package-write permissions; build with Buildx and GHA cache; login to GHCR with `GITHUB_TOKEN`.
- [ ] Configure deterministic lowercase image name and `latest` plus immutable commit-SHA tags.
- [ ] Validate workflow YAML and confirm no secrets enter Docker build args or logs.

### Task 2: Add an image-only Coolify Compose definition and deployment instructions

**Files:**
- Create: `docker-compose.registry.yml`
- Modify: `README.md` Docker deployment section

**Interfaces:**
- Consumes: `DIABCARE_IMAGE_TAG` (default `latest`) and runtime secrets/variables entered in Coolify.
- Produces: single service pulling the GHCR image, exposing container port 3000 to Coolify's proxy, with production auth flags and health check.

- [ ] Add a Compose service with `image:` and no `build:`; include runtime-only environment variables and no direct public host port binding.
- [ ] Document the GHCR image path, immutable tag workflow, Coolify image/Compose configuration, private-package pull credentials, and runtime secret setup.
- [ ] Validate Compose syntax and statically confirm the file has no `build:` key; run repository `pnpm check`, `pnpm test`, and `pnpm build` if practical.

### Task 3: Review and report

**Files:**
- Review: all changed files

- [ ] Inspect the complete diff, check for secret leakage, verify local Compose remains unchanged, and report validation limits (Docker daemon availability).
- [ ] Commit changes on a dedicated feature branch and push that branch; do not merge to `main` or deploy without explicit approval.
