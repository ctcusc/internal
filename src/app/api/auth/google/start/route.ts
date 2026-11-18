import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAuthConfig } from "@/server/auth/config";
import {
  createAuthRequest,
  getGoogleConfig,
  GOOGLE_STATE_COOKIE,
} from "@/server/auth/google";
import { safeReturnTo } from "@/server/auth/redirect";

export async function GET(request: Request) {
  const google = getGoogleConfig();
  if (!google || !getAuthConfig()) redirect("/?google=unavailable");

  const { url, state, nonce, verifier } = createAuthRequest(google);
  const next = safeReturnTo(new URL(request.url).searchParams.get("next"));
  const cookieStore = await cookies();
  cookieStore.set(
    GOOGLE_STATE_COOKIE,
    JSON.stringify({ state, nonce, verifier, next }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/google",
      maxAge: 600,
    },
  );
  redirect(url);
}
