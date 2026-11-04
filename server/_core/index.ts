import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { assertProductionConfiguration } from "./env";
import { ENV } from "./env";
import { getPublicDemoDatabase } from "../publicDemoDb";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  assertProductionConfiguration();
  if (ENV.publicDemoMode) getPublicDemoDatabase().health();
  const app = express();
  const server = createServer(app);
  app.get("/healthz", (_req, res) => {
    try {
      const database = !ENV.publicDemoMode || getPublicDemoDatabase().health();
      res.status(database ? 200 : 503).json({ ok: database });
    } catch {
      res.status(503).json({ ok: false });
    }
  });
  app.use((req, res, next) => {
    const legacyStoragePath = ["/r2-storage", "/manus-storage"].some(
      root => req.path === root || req.path.startsWith(`${root}/`),
    );
    if (ENV.publicDemoMode && legacyStoragePath) {
      res.sendStatus(404);
      return;
    }
    next();
  });
  const requestBodyLimit = ENV.publicDemoMode ? "2mb" : "50mb";
  app.use(express.json({ limit: requestBodyLimit }));
  app.use(express.urlencoded({ limit: requestBodyLimit, extended: true }));
  if (!ENV.publicDemoMode) {
    const [{ registerStorageProxy }, { registerSupabaseAuthRoutes }] = await Promise.all([
      import("./storageProxy"),
      import("./supabaseAuth"),
    ]);
    registerStorageProxy(app);
    registerSupabaseAuthRoutes(app);
  }
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
