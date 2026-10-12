export const ENV = {
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabasePublishableKey:
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.SUPABASE_KEY ??
    "",
  // DATABASE_URL is platform-managed in WebDev. Prefer the custom Supabase
  // secret so the application does not accidentally connect to the legacy DB.
  databaseUrl:
    process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
  supabaseDatabaseUrl: process.env.SUPABASE_DATABASE_URL ?? "",
  databaseSslCa: process.env.DATABASE_SSL_CA?.replace(/\\n/g, "\n") ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  r2AccountId: process.env.R2_ACCOUNT_ID ?? "",
  r2BucketName: process.env.R2_BUCKET_NAME ?? "",
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
};

export function assertProductionConfiguration(
  env: NodeJS.ProcessEnv = process.env
) {
  if (
    env.NODE_ENV === "production" &&
    (env.LOCAL_AUTH_BYPASS === "true" || env.DISABLE_LOGIN_PAGE === "true")
  ) {
    throw new Error(
      "LOCAL_AUTH_BYPASS=true and DISABLE_LOGIN_PAGE=true are forbidden in production"
    );
  }
}
