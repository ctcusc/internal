import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAuthConfig, getGoogleConfig } from "./config";
import { IDENTITY_COOKIE, readIdentitySession } from "./identity";
import { safeReturnTo } from "./redirect";
import { readSession, SESSION_COOKIE } from "./session";

export async function getClubSession() {
  const config = getAuthConfig();
  if (!config) return null;
  const cookieStore = await cookies();
  return readSession(cookieStore.get(SESSION_COOKIE)?.value, config);
}

// Check each protected page or operation; layouts do not enforce authorization.
export async function requireClubSession(returnTo = "/") {
  const session = await getClubSession();
  if (!session) {
    const next = safeReturnTo(returnTo);
    redirect(next === "/" ? "/" : `/?next=${encodeURIComponent(next)}`);
  }
  return session;
}

// The verified Google identity of the signed-in USC user, or null.
export async function getIdentity() {
  const config = getGoogleConfig();
  if (!config) return null;
  const cookieStore = await cookies();
  return readIdentitySession(
    cookieStore.get(IDENTITY_COOKIE)?.value,
    config.sessionSecret,
  );
}

export async function requireIdentity(returnTo = "/") {
  const identity = await getIdentity();
  if (!identity) {
    const next = safeReturnTo(returnTo);
    redirect(next === "/" ? "/" : `/?next=${encodeURIComponent(next)}`);
  }
  return identity;
}
