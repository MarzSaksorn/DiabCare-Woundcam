# Coolify Build Server for the Standard Dockerfile Application

> **For agentic workers:** Implement the approved plan natively and review the full diff before completion.

**Goal:** Configure this repository for Coolify's standard Dockerfile Application flow so a dedicated Coolify build server builds and publishes the application image to GHCR for the deployment server to pull.

**Architecture:** Keep the existing root `Dockerfile` and local-development `docker-compose.yml`. Remove the registry-only Compose deployment file. Replace the GitHub Actions image-publish workflow with a read-only Dockerfile build validation workflow; Coolify, not GitHub Actions, owns production image build/push/deploy.

**Tech Stack:** Coolify standard Application, Dockerfile, GitHub Actions, Docker Buildx, GHCR, Docker Compose for local development.

**Spec:** User approved using Coolify's dedicated build server and preserving `docker-compose.yml` only for local development.

**Coolify reference:** [Build servers](https://coolify.io/docs/core/infrastructure/servers/build-servers). It states the build-server toggle is unavailable for Docker Compose applications, requires a saved Docker Image repository for a standard Application, and pushes the completed image to a registry for the deployment server to pull.

## Constraints and review focus

- Build server must be dedicated and match deployment-server architecture; document that it must not host production services.
- Coolify build-server configuration applies to a standard Application, not Compose applications; make the supported flow explicit.
- Coolify requires a Docker Image registry path; document GHCR auth for build-server push and deployment-server pull.
- GitHub Actions must never publish the production image or need package write permission.
- Preserve runtime-only secrets and production authentication settings; don't alter app code or local Compose.

## Implementation

- [x] Replace `.github/workflows/publish-container.yml` with `.github/workflows/dockerfile-build.yml`, which validates the root Dockerfile on pull requests and `main` pushes without registry login/publishing.
- [x] Remove `docker-compose.registry.yml`; preserve `docker-compose.yml` for local development.
- [x] Update `README.md` with Coolify build-server steps, Docker Image and GHCR requirements, app port, and runtime environment variables.
- [x] Validate workflow YAML and publishing constraints; run `pnpm check`, `pnpm test`, `pnpm build`, and `git diff --check`. Docker image build could not be run because Docker is unavailable in the sandbox.
- [ ] Review the staged diff, commit, and push this feature branch only. Do not merge or deploy.
