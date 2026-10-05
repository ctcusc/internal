import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

import type { AuthConfig } from "./config";

export const SESSION_COOKIE = "ctc-internal-session";
export const SESSION_SECONDS = 8 * 60 * 60;
const audience = "ctc-internal";

function signingKey(config: AuthConfig) {
  // Rotating either secret invalidates existing sessions. Knowing the club
  // password alone never allows a visitor to sign their own session.
  return createHmac("sha256", config.sessionSecret)
    .update("ctc-internal-session-v1\0")
    .update(config.sitePassword)
    .digest();
}

export function passwordMatches(input: string, expected: string) {
  if (!input || input.length > 1024) return false;
  return timingSafeEqual(
    createHash("sha256").update(input).digest(),
    createHash("sha256").update(expected).digest(),
  );
}

export async function createSession(config: AuthConfig) {
  return new SignJWT({ version: 1 })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("club")
    .setAudience(audience)
    .setIssuer(audience)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(signingKey(config));
}

export async function readSession(
  token: string | undefined,
  config: AuthConfig,
) {
  if (!token || token.length > 2048) return null;
  try {
    const { payload } = await jwtVerify(token, signingKey(config), {
      algorithms: ["HS256"],
      audience,
      issuer: audience,
      subject: "club",
      maxTokenAge: SESSION_SECONDS,
      requiredClaims: ["iat", "exp"],
    });
    if (
      payload.version !== 1 ||
      !Number.isSafeInteger(payload.exp) ||
      !Number.isSafeInteger(payload.iat) ||
      !payload.exp ||
      !payload.iat ||
      payload.exp - payload.iat > SESSION_SECONDS
    )
      return null;
    return { access: "club" as const, expiresAt: payload.exp };
  } catch {
    return null;
  }
}
