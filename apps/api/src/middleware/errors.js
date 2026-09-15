/**
 * Error handling per docs/api-contract.md §1: every non-2xx uses the
 * envelope { error: { code, message, details? } }. Stack traces never
 * reach the client.
 */

export function httpError(status, code, message, details) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  if (details !== undefined) err.details = details;
  return err;
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: { code: "resource/not-found", message: "Not found" },
  });
}

export function errorHandler(err, req, res, _next) {
  const status = err.status ?? err.statusCode ?? 500;
  const isInternal = status >= 500;

  if (isInternal) {
    // Structured log; replaced by the shared logger in B6.
    console.error(JSON.stringify({
      level: "error",
      requestId: req.id,
      code: err.code ?? "server/internal",
      message: err.message,
      stack: err.stack,
      elapsedMs: Number((process.hrtime.bigint() - req.startedAt) / 1_000_000n),
    }));
  }

  res.status(status).json({
    error: {
      code: err.code ?? "server/internal",
      message: isInternal ? "Something went wrong" : err.message,
      ...(err.details !== undefined && !isInternal ? { details: err.details } : {}),
      ...(req.id ? { requestId: req.id } : {}),
    },
  });
}
