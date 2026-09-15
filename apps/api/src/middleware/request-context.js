import crypto from "node:crypto";

/** Attaches a request id and timing to every request; echoed on errors. */
export function requestContext(req, res, next) {
  req.id = req.headers["x-request-id"] || crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
  req.startedAt = process.hrtime.bigint();
  next();
}
