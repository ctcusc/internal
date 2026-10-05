import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAuthConfig } from "./config";
import { safeReturnTo } from "./redirect";
import { readSession, SESSION_COOKIE } from "./session";

export async function getClubSession() {
  const config = getAuthConfig();
  if (!config) return null;
  const cookieStore = await cookies();
  return readSession(cookieStore.get(SESSION_COOKIE)?.value, config);
}

// Call at every protected page, data read, and mutation. A layout or hidden
// navigation item is not an authorization boundary.
export async function requireClubSession(returnTo = "/") {
  const session = await getClubSession();
  if (!session) {
    const next = safeReturnTo(returnTo);
    redirect(next === "/" ? "/" : `/?next=${encodeURIComponent(next)}`);
  }
  return session;
}
