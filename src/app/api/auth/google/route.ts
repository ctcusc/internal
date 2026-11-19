import { NextResponse, type NextRequest } from "next/server";

import { getGoogleConfig } from "@/server/auth/config";
import {
  buildAuthorizationUrl,
  CALLBACK_PATH,
  codeChallenge,
  randomNonce,
  randomState,
  randomVerifier,
} from "@/server/auth/google";
import { createFlow, FLOW_COOKIE, FLOW_SECONDS } from "@/server/auth/identity";
import { safeReturnTo } from "@/server/auth/redirect";

export const dynamic = "force-dynamic";

// Starts Google sign-in: GET /api/auth/google?next=/attendance
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const config = getGoogleConfig();
  if (!config)
    return NextResponse.redirect(new URL("/?error=google_unavailable", origin));

  const flow = {
    state: randomState(),
    nonce: randomNonce(),
    verifier: randomVerifier(),
    returnTo: safeReturnTo(request.nextUrl.searchParams.get("next")),
  };
  const response = NextResponse.redirect(
    buildAuthorizationUrl({
      clientId: config.clientId,
      redirectUri: `${origin}${CALLBACK_PATH}`,
      state: flow.state,
      nonce: flow.nonce,
      challenge: await codeChallenge(flow.verifier),
    }),
  );
  response.cookies.set(
    FLOW_COOKIE,
    await createFlow(config.sessionSecret, flow),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/google",
      maxAge: FLOW_SECONDS,
    },
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}
