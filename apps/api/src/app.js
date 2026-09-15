import express from "express";
import { requestContext } from "./middleware/request-context.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";
import { healthRouter } from "./routes/health.js";

/**
 * WoundCam API — v0.1 Express skeleton (B1).
 * Route wiring lands per build-plan B3–B8 against the frozen contract
 * (docs/api-contract.md).
 */
export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1); // Cloudflare edge → Nginx → api

  app.use(requestContext);
  app.use(express.json({ limit: "64kb" })); // binaries never touch this server (FR-UPL-1)

  app.use(healthRouter);

  // TODO(B3): auth routes + JWT middleware (FR-AUTH)
  // TODO(B4): patients routes (FR-PAT)
  // TODO(B5): wounds routes (FR-WND)
  // TODO(B6): upload pipeline routes (FR-UPL)

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
