import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

type R2Config = {
  accountId: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
};

function getR2Config(): R2Config | null {
  const values = [
    ENV.r2AccountId,
    ENV.r2BucketName,
    ENV.r2AccessKeyId,
    ENV.r2SecretAccessKey,
  ];
  const hasAnyR2Config = values.some(Boolean);

  if (!hasAnyR2Config) return null;
  if (values.some(value => !value)) {
    throw new Error(
      "R2 storage config is incomplete: set R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY"
    );
  }

  return {
    accountId: ENV.r2AccountId,
    bucketName: ENV.r2BucketName,
    accessKeyId: ENV.r2AccessKeyId,
    secretAccessKey: ENV.r2SecretAccessKey,
  };
}

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;

  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set R2_* credentials or BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }

  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

function normalizeKey(relKey: string): string {
  const key = relKey.replace(/^\/+/, "");
  if (
    !key ||
    key.includes("\0") ||
    key.split("/").some(segment => segment === "..")
  ) {
    throw new Error("Invalid storage key");
  }
  return key;
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function getR2Client(config: R2Config): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

function getAppStorageUrl(key: string): string {
  const encodedKey = key
    .split("/")
    .map(segment => encodeURIComponent(segment))
    .join("/");
  return `/r2-storage/${encodedKey}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const r2 = getR2Config();

  if (r2) {
    await getR2Client(r2).send(
      new PutObjectCommand({
        Bucket: r2.bucketName,
        Key: key,
        Body: data,
        ContentType: contentType,
      })
    );

    return { key, url: getAppStorageUrl(key) };
  }

  const { forgeUrl, forgeKey } = getForgeConfig();

  // Legacy Forge storage remains available for existing deployments that have
  // not added the R2 credentials yet. New deployments should use R2.
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);

  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }

  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");

  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });

  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });

  if (!uploadResp.ok) {
    throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  }

  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const r2 = getR2Config();
  return { key, url: r2 ? getAppStorageUrl(key) : `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  const r2 = getR2Config();

  if (r2) {
    return getSignedUrl(
      getR2Client(r2),
      new GetObjectCommand({ Bucket: r2.bucketName, Key: key }),
      { expiresIn: 300 }
    );
  }

  const { forgeUrl, forgeKey } = getForgeConfig();
  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);

  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }

  const { url } = (await resp.json()) as { url: string };
  if (!url) throw new Error("Storage backend returned an empty signed URL");
  return url;
}

export async function storageDelete(relKey: string): Promise<void> {
  const key = normalizeKey(relKey);
  const r2 = getR2Config();

  if (!r2) {
    // The legacy Forge helper does not expose a delete endpoint. Keep the
    // existing behavior for old objects while R2-backed objects delete fully.
    return;
  }

  await getR2Client(r2).send(
    new DeleteObjectCommand({
      Bucket: r2.bucketName,
      Key: key,
    })
  );
}
