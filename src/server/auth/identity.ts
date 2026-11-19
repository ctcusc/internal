import "server-only";

import { createHmac } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

// Identity sessions are separate from the legacy club-password session: they
// use their own cookie, key, audience, and claims, so neither token type is
// accepted as the other.
export const IDENTITY_COOKIE = "ctc-internal-identity";
export const IDENTITY_SECONDS = 8 * 60 * 60;
export const FLOW_COOKIE = "ctc-internal-oauth";
export const FLOW_SECONDS = 10 * 60;
const identityAudience = "ctc-internal-identity";
const flowAudience = "ctc-internal-oauth-flow";
const issuer = "ctc-internal";

export type Identity = { sub: string; name: string; email: string };
export type SignInFlow = {
  state: string;
  nonce: string;
  verifier: string;
  returnTo: string;
};

function signingKey(secret: string, label: string) {
  return createHmac("sha256", secret).update(label).digest();
}
const identityKey = (secret: string) =>
  signingKey(secret, "ctc-internal-identity-v1\0");
const flowKey = (secret: string) =>
  signingKey(secret, "ctc-internal-oauth-flow-v1\0");

export function createIdentitySession(secret: string, identity: Identity) {
  return new SignJWT({
    version: 1,
    name: identity.name,
    email: identity.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(identity.sub)
    .setAudience(identityAudience)
    .setIssuer(issuer)
    .setIssuedAt()
    .setExpirationTime(`${IDENTITY_SECONDS}s`)
    .sign(identityKey(secret));
}

export async function readIdentitySession(
  token: string | undefined,
  secret: string,
): Promise<(Identity & { expiresAt: number }) | null> {
  if (!token || token.length > 2048) return null;
  try {
    const { payload } = await jwtVerify(token, identityKey(secret), {
      algorithms: ["HS256"],
      audience: identityAudience,
      issuer,
      maxTokenAge: IDENTITY_SECONDS,
      requiredClaims: ["sub", "iat", "exp"],
    });
    const { sub, name, email, exp, iat } = payload;
    if (
      payload.version !== 1 ||
      !sub ||
      typeof name !== "string" ||
      typeof email !== "string" ||
      !Number.isSafeInteger(exp) ||
      !Number.isSafeInteger(iat) ||
      !exp ||
      !iat ||
      exp - iat > IDENTITY_SECONDS
    )
      return null;
    return { sub, name, email, expiresAt: exp };
  } catch {
    return null;
  }
}

// Short-lived, signed record of one in-progress sign-in, held in a cookie so
// the callback can check state and nonce and supply the PKCE verifier.
export function createFlow(secret: string, flow: SignInFlow) {
  return new SignJWT({ ...flow })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(flowAudience)
    .setIssuer(issuer)
    .setIssuedAt()
    .setExpirationTime(`${FLOW_SECONDS}s`)
    .sign(flowKey(secret));
}

export async function readFlow(
  token: string | undefined,
  secret: string,
): Promise<SignInFlow | null> {
  if (!token || token.length > 2048) return null;
  try {
    const { payload } = await jwtVerify(token, flowKey(secret), {
      algorithms: ["HS256"],
      audience: flowAudience,
      issuer,
      maxTokenAge: FLOW_SECONDS,
      requiredClaims: ["iat", "exp"],
    });
    const { state, nonce, verifier, returnTo } = payload;
    if (
      typeof state !== "string" ||
      typeof nonce !== "string" ||
      typeof verifier !== "string" ||
      typeof returnTo !== "string"
    )
      return null;
    return { state, nonce, verifier, returnTo };
  } catch {
    return null;
  }
}
