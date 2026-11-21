# GHCR Image Publishing for Coolify Implementation Plan

> **For agentic workers:** Implement the approved plan natively and review the full diff before completion.

**Goal:** Build the root Dockerfile on GitHub Actions, publish commit-SHA and `latest` tags to GHCR on pushes to `main`, and deploy the prebuilt image through Coolify.

**Architecture:** Pull requests run a no-publish Dockerfile validation build. Pushes to `main` publish `ghcr.io/marzsaksorn/diabcare-woundcam:latest` and `:sha-<short-sha>`. Coolify uses a Docker Image application to pull the published image; it does not build this image or auto-deploy it. Preserve `docker-compose.yml` for local development.

**Tech Stack:** GitHub Actions, Docker Buildx, GHCR, Coolify Docker Image application, Docker Compose for local development.

**Spec:** User selected GitHub Actions as the image publisher: PR builds stay validation-only, `main` builds publish `latest` and a commit-SHA tag, Coolify documentation uses a prebuilt image, and this change is prepared on a feature branch without deploying.

## References

- [Coolify Docker Image deployment](https://coolify.io/docs/applications/deployments/docker-image): a Docker Image application pulls a registry image on the deployment server and does not clone or build source.
- [Coolify Docker registries](https://coolify.io/docs/applications/builds/docker-registries): private-registry login is stored for the Coolify server user; authenticate every server that must pull.
- [Coolify GitHub Actions](https://coolify.io/docs/applications/sources/github/actions): build and publish with Actions, then configure Coolify to deploy the published image.
- [GitHub Actions container publishing](https://docs.github.com/en/actions/publishing-packages/publishing-docker-images): use `GITHUB_TOKEN` with package-write permission and the Docker login/build-push actions.

## Constraints and review focus

- Keep `docker-compose.yml` unchanged for local development; do not recreate the removed registry Compose file.
- Only publish from pushes to `main` or a manual dispatch on `main`; PR builds must never log in or publish.
- Grant `packages: write` only to the publishing job; keep all other workflow permissions read-only.
- Build `linux/amd64` from the repository root `Dockerfile`; use the exact lowercase image path and publish `latest` plus `sha-<short-sha>` tags.
- Keep all application/database/R2 secrets in Coolify runtime variables; never use them as build arguments or include them in layers.
- Coolify deployment remains manual; the GitHub workflow must not call Coolify or trigger its webhook.

## Implementation

- [x] Preserve `.github/workflows/dockerfile-build.yml` as the workflow entry point and retain pull-request Dockerfile validation.
- [x] Preserve removal of `docker-compose.registry.yml`; keep local `docker-compose.yml` unchanged.
- [x] Add a main-only GHCR publish job with scoped `packages: write`, registry login, metadata tags, and `linux/amd64` build/push.
- [x] Replace the Coolify build-server README section with Docker Image setup, private GHCR pull credentials, port `3000`, runtime variables, tag/redeploy behavior, and no automatic deployment.
- [x] Validate workflow YAML and publishing conditions, inspect the full diff, and confirm local Compose is unchanged. Docker image building will be exercised by the GitHub Actions PR check because Docker is unavailable in the sandbox.
- [ ] Commit and push the feature branch, then open a PR. Do not merge or deploy.
