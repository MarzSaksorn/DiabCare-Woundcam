import type { Express, Request, Response } from "express";
import { getVisibleWoundMediaByStorageKey } from "../db";
import { storageGetSignedUrl } from "../storage";
import { createContext } from "./context";
import { ENV } from "./env";

function getWildcardKey(req: Request): string | null {
  const key = (req.params as Record<string, string>)[0];
  try {
    return key ? decodeURIComponent(key) : null;
  } catch {
    return null;
  }
}

async function getVisibleAuthenticatedMedia(req: Request, res: Response, key: string) {
  const context = await createContext({ req, res } as any);
  if (!context.user) {
    res.status(401).send("Authentication required");
    return null;
  }

  const media = await getVisibleWoundMediaByStorageKey(key);
  if (!media) {
    res.status(404).send("Media not found");
    return null;
  }

  return media;
}

function registerR2StorageProxy(app: Express) {
  app.get("/r2-storage/*", async (req: Request, res: Response) => {
    const key = getWildcardKey(req);
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    const media = await getVisibleAuthenticatedMedia(req, res, key);
    if (!media) return;

    try {
      const url = await storageGetSignedUrl(key);
      res.set("Cache-Control", "private, no-store");
      res.redirect(307, url);
    } catch (error) {
      console.error("[R2StorageProxy] failed:", error);
      res.status(502).send("Storage backend error");
    }
  });
}

function registerLegacyForgeStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req: Request, res: Response) => {
    const key = getWildcardKey(req);
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    const media = await getVisibleAuthenticatedMedia(req, res, key);
    if (!media) return;

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (error) {
      console.error("[StorageProxy] failed:", error);
      res.status(502).send("Storage proxy error");
    }
  });
}

export function registerStorageProxy(app: Express) {
  registerR2StorageProxy(app);
  registerLegacyForgeStorageProxy(app);
}
