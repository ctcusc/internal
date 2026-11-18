import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAuthConfig, type AuthConfig } from "./config";
import { safeReturnTo } from "./redirect";
import {
  createSession,
  readSession,
  SESSION_COOKIE,
  SESSION_SECONDS,
} from "./session";

export async function startClubSession(config: AuthConfig) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, await createSession(config), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

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
