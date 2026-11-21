import { readFileSync } from "node:fs";

export function loadDatabaseSslCa(
  env: NodeJS.ProcessEnv = process.env
): string {
  const caFile = env.DATABASE_SSL_CA_FILE?.trim();

  if (caFile) {
    let certificate: string;
    try {
      certificate = readFileSync(caFile, "utf8");
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "unknown file error";
      throw new Error(
        `Could not read DATABASE_SSL_CA_FILE at "${caFile}": ${reason}`
      );
    }

    if (!certificate.trim()) {
      throw new Error(`DATABASE_SSL_CA_FILE at "${caFile}" is empty`);
    }

    return certificate;
  }

  return env.DATABASE_SSL_CA?.replace(/\\n/g, "\n") ?? "";
}
