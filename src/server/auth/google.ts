import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

import { env } from "@/env";

export const GOOGLE_STATE_COOKIE = "ctc-internal-google";
const jwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

export function getGoogleConfig() {
  const allowed = (env.GOOGLE_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (
    !env.GOOGLE_CLIENT_ID ||
    !env.GOOGLE_CLIENT_SECRET ||
    !env.GOOGLE_REDIRECT_URI ||
    !allowed.length
  )
    return null;
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: env.GOOGLE_REDIRECT_URI,
    allowed,
  };
}

export type GoogleConfig = NonNullable<ReturnType<typeof getGoogleConfig>>;

const random = () => randomBytes(32).toString("base64url");

export function createAuthRequest(config: GoogleConfig) {
  const state = random();
  const nonce = random();
  const verifier = random();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return { url: url.toString(), state, nonce, verifier };
}

// Returns the Google-verified email (lowercased), or null.
export async function exchangeCode(
  config: GoogleConfig,
  code: string,
  verifier: string,
  nonce: string,
) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  });
  if (!response.ok) return null;
  const { id_token } = (await response.json()) as { id_token?: string };
  if (typeof id_token !== "string") return null;

  const { payload } = await jwtVerify(id_token, jwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: config.clientId,
  });
  if (
    payload.nonce !== nonce ||
    payload.email_verified !== true ||
    typeof payload.email !== "string"
  )
    return null;
  return payload.email.toLowerCase();
}
