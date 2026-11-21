import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadDatabaseSslCa } from "./database-ssl";

const temporaryDirectories: string[] = [];

function createTemporaryFile(contents: string) {
  const directory = mkdtempSync(join(tmpdir(), "database-ca-test-"));
  temporaryDirectories.push(directory);
  const filePath = join(directory, "supabase-ca.pem");
  writeFileSync(filePath, contents, "utf8");
  return filePath;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("loadDatabaseSslCa", () => {
  it("loads the certificate from the configured file", () => {
    const certificate =
      "-----BEGIN CERTIFICATE-----\nfixture\n-----END CERTIFICATE-----\n";
    const filePath = createTemporaryFile(certificate);

    expect(loadDatabaseSslCa({ DATABASE_SSL_CA_FILE: filePath })).toBe(
      certificate
    );
  });

  it("prefers the file over the inline certificate", () => {
    const filePath = createTemporaryFile("file certificate\n");

    expect(
      loadDatabaseSslCa({
        DATABASE_SSL_CA_FILE: filePath,
        DATABASE_SSL_CA: "inline certificate",
      })
    ).toBe("file certificate\n");
  });

  it("keeps decoding literal newlines from the inline compatibility variable", () => {
    expect(loadDatabaseSslCa({ DATABASE_SSL_CA: "line one\\nline two" })).toBe(
      "line one\nline two"
    );
  });

  it("fails clearly when the configured file does not exist", () => {
    const missingPath = join(tmpdir(), "missing-supabase-ca.pem");

    expect(() =>
      loadDatabaseSslCa({
        DATABASE_SSL_CA_FILE: missingPath,
        DATABASE_SSL_CA: "must not be used as a fallback",
      })
    ).toThrow(`Could not read DATABASE_SSL_CA_FILE at "${missingPath}"`);
  });

  it("rejects an empty configured file", () => {
    const filePath = createTemporaryFile("  \n");

    expect(() => loadDatabaseSslCa({ DATABASE_SSL_CA_FILE: filePath })).toThrow(
      `DATABASE_SSL_CA_FILE at "${filePath}" is empty`
    );
  });
});
