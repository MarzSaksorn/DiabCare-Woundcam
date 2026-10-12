import { OAUTH_STATE_COOKIE, encodeOAuthState } from "@shared/const";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

type PublicOAuthConfig = {
  appId: string;
  oauthPortalUrl: string;
  configured: boolean;
};

export async function getOAuthConfig(): Promise<PublicOAuthConfig> {
  let response: Response;
  try {
    response = await fetch("/api/auth/config", {
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Can't reach the sign-in service. Check your connection and try again."
    );
  }

  if (!response.ok) {
    throw new Error(
      `Sign-in settings couldn't be loaded (${response.status}). Contact your administrator.`
    );
  }

  const config = (await response.json()) as PublicOAuthConfig;
  if (!config.configured || !config.appId || !config.oauthPortalUrl) {
    throw new Error(
      "Organization sign-in isn't configured yet. Ask your administrator to verify the Manus app ID, HTTPS OAuth portal URL, OAuth server URL, and session secret."
    );
  }

  return config;
}

// Start Manus OAuth only after loading the public settings from the server.
// The backend serves these settings at runtime so Docker builds don't need
// public auth values baked into the static frontend bundle.
export const startLogin = async (): Promise<void> => {
  const { appId, oauthPortalUrl } = await getOAuthConfig();
  const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(
    window.location.hostname
  );
  if (window.location.protocol !== "https:" && !isLocalhost) {
    throw new Error(
      "Sign-in requires HTTPS. Open the secure site URL and try again."
    );
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;

  const nonce = crypto.randomUUID();
  document.cookie = `${OAUTH_STATE_COOKIE}=${nonce}; Path=/; Max-Age=600; SameSite=None; Secure`;
  const state = encodeOAuthState({ redirectUri, nonce });

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  window.location.assign(url.toString());
};
