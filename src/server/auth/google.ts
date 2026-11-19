import "server-only";

import * as oauth from "oauth4webapi";

import type { Identity, SignInFlow } from "./identity";

// Google's OpenID Connect endpoints, from its discovery document:
// https://developers.google.com/identity/openid-connect/openid-connect
const google: oauth.AuthorizationServer = {
  issuer: "https://accounts.google.com",
  authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  token_endpoint: "https://oauth2.googleapis.com/token",
  jwks_uri: "https://www.googleapis.com/oauth2/v3/certs",
  id_token_signing_alg_values_supported: ["RS256"],
};
export const HOSTED_DOMAIN = "usc.edu";
export const CALLBACK_PATH = "/api/auth/google/callback";

export class SignInError extends Error {}

export const randomState = oauth.generateRandomState;
export const randomNonce = oauth.generateRandomNonce;
export const randomVerifier = oauth.generateRandomCodeVerifier;
export const codeChallenge = oauth.calculatePKCECodeChallenge;

export function buildAuthorizationUrl(options: {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  challenge: string;
}) {
  const url = new URL(google.authorization_endpoint!);
  url.search = new URLSearchParams({
    client_id: options.clientId,
    response_type: "code",
    scope: "openid email profile",
    redirect_uri: options.redirectUri,
    state: options.state,
    nonce: options.nonce,
    code_challenge: options.challenge,
    code_challenge_method: "S256",
    // A hint only: the server re-checks the hd claim on the verified ID token.
    hd: HOSTED_DOMAIN,
    prompt: "select_account",
  }).toString();
  return url.toString();
}

// Finishes sign-in from Google's redirect back to the callback URL. The
// library checks the state (login CSRF), exchanges the code with the PKCE
// verifier, and validates the ID token's issuer, audience, expiry, and nonce
// (replay). We then verify its signature against Google's published keys and
// apply the USC access rule on the verified claims.
export async function completeSignIn(options: {
  callbackUrl: URL;
  flow: Pick<SignInFlow, "state" | "nonce" | "verifier">;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<Identity> {
  const client: oauth.Client = { client_id: options.clientId };
  try {
    const params = oauth.validateAuthResponse(
      google,
      client,
      options.callbackUrl,
      options.flow.state,
    );
    const response = await oauth.authorizationCodeGrantRequest(
      google,
      client,
      oauth.ClientSecretPost(options.clientSecret),
      params,
      options.redirectUri,
      options.flow.verifier,
      { signal: AbortSignal.timeout(10_000) },
    );
    const tokens = await oauth.processAuthorizationCodeResponse(
      google,
      client,
      response,
      { expectedNonce: options.flow.nonce, requireIdToken: true },
    );
    await oauth.validateApplicationLevelSignature(google, response, {
      signal: AbortSignal.timeout(10_000),
    });
    const claims = oauth.getValidatedIdTokenClaims(tokens);
    if (!claims) throw new SignInError("Missing ID token.");
    return identityFromClaims(claims);
  } catch (error) {
    if (error instanceof SignInError) throw error;
    // Library errors describe the failed check; they never include secrets.
    throw new SignInError(
      error instanceof Error ? error.message : "Sign-in failed.",
    );
  }
}

function identityFromClaims(claims: oauth.IDToken): Identity {
  const { sub, email, name } = claims;
  if (typeof sub !== "string" || !sub || sub.length > 255)
    throw new SignInError("Missing Google account ID.");
  if (typeof email !== "string") throw new SignInError("Missing email.");
  if (claims.email_verified !== true && claims.email_verified !== "true")
    throw new SignInError("Email is not verified.");
  const normalized = email.trim().toLowerCase();
  const parts = normalized.split("@");
  if (parts.length !== 2 || !parts[0] || parts[1] !== HOSTED_DOMAIN)
    throw new SignInError("Not a USC account.");
  if (claims.hd !== HOSTED_DOMAIN)
    throw new SignInError("Not a USC Google Workspace account.");

  const displayName = typeof name === "string" ? name.trim() : "";
  return {
    sub,
    email: normalized,
    name: (displayName || normalized).slice(0, 200),
  };
}
