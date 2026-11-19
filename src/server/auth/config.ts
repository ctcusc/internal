import "server-only";

import { env } from "@/env";

export function getAuthConfig() {
  if (!env.SITE_PASSWORD || !env.SESSION_SECRET) return null;
  return {
    sitePassword: env.SITE_PASSWORD,
    sessionSecret: env.SESSION_SECRET,
  };
}

export function getGoogleConfig() {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.SESSION_SECRET)
    return null;
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    sessionSecret: env.SESSION_SECRET,
  };
}

export type AuthConfig = NonNullable<ReturnType<typeof getAuthConfig>>;
