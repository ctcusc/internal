import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";

let localWindow = { startedAt: 0, attempts: 0 };

export async function checkLoginRateLimit(): Promise<
  "allowed" | "limited" | "unavailable"
> {
  if (process.env.NODE_ENV !== "production") {
    const now = Date.now();
    if (now - localWindow.startedAt >= 60_000) {
      localWindow = { startedAt: now, attempts: 0 };
    }
    localWindow.attempts += 1;
    return localWindow.attempts <= 100 ? "allowed" : "limited";
  }

  try {
    const ip = (await headers()).get("cf-connecting-ip");
    const { env } = await getCloudflareContext({ async: true });
    if (!ip || !env.LOGIN_RATE_LIMITER) return "unavailable";
    const { success } = await env.LOGIN_RATE_LIMITER.limit({ key: ip });
    return success ? "allowed" : "limited";
  } catch {
    console.error("Login rate limiter is unavailable.");
    return "unavailable";
  }
}
