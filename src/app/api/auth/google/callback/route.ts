import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getAuthConfig } from "@/server/auth/config";
import {
  exchangeCode,
  getGoogleConfig,
  GOOGLE_STATE_COOKIE,
} from "@/server/auth/google";
import { safeReturnTo } from "@/server/auth/redirect";
import { startClubSession } from "@/server/auth/server";

const saved = z.object({
  state: z.string().min(1),
  nonce: z.string().min(1),
  verifier: z.string().min(1),
  next: z.string(),
});

async function verifiedEmail(request: Request) {
  const google = getGoogleConfig();
  if (!google) return null;
  const cookieStore = await cookies();
  const raw = cookieStore.get(GOOGLE_STATE_COOKIE)?.value;
  cookieStore.delete({ name: GOOGLE_STATE_COOKIE, path: "/api/auth/google" });

  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  let stored: z.infer<typeof saved>;
  try {
    stored = saved.parse(JSON.parse(raw ?? ""));
  } catch {
    return null;
  }
  if (!code || params.get("state") !== stored.state) return null;
  try {
    const email = await exchangeCode(
      google,
      code,
      stored.verifier,
      stored.nonce,
    );
    return email ? { email, next: stored.next, google } : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const config = getAuthConfig();
  const result = config ? await verifiedEmail(request) : null;
  if (!config || !result) redirect("/?google=failed");
  if (!result.google.allowed.includes(result.email))
    redirect("/?google=denied");

  await startClubSession(config);
  redirect(safeReturnTo(result.next));
}
