import { NextResponse, type NextRequest } from "next/server";

import { getGoogleConfig } from "@/server/auth/config";
import { CALLBACK_PATH, completeSignIn } from "@/server/auth/google";
import {
  createIdentitySession,
  FLOW_COOKIE,
  IDENTITY_COOKIE,
  IDENTITY_SECONDS,
  readFlow,
} from "@/server/auth/identity";
import { safeReturnTo } from "@/server/auth/redirect";

export const dynamic = "force-dynamic";

// Google redirects here after consent. Every failure ends at the home page
// with a generic error and no identity cookie; details are never exposed.
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const finish = (path: string) => {
    const response = NextResponse.redirect(new URL(path, origin));
    response.cookies.delete({ name: FLOW_COOKIE, path: "/api/auth/google" });
    response.headers.set("Cache-Control", "no-store");
    return response;
  };
  const fail = (reason: string) => {
    console.error(`Google sign-in failed: ${reason}.`);
    return finish("/?error=google_sign_in_failed");
  };

  const config = getGoogleConfig();
  if (!config) return finish("/?error=google_unavailable");

  const flow = await readFlow(
    request.cookies.get(FLOW_COOKIE)?.value,
    config.sessionSecret,
  );
  if (!flow) return fail("missing or invalid sign-in flow");

  try {
    const identity = await completeSignIn({
      // A plain URL, not Next's NextURL wrapper, which the library rejects.
      callbackUrl: new URL(request.url),
      flow,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: `${origin}${CALLBACK_PATH}`,
    });
    const response = finish(safeReturnTo(flow.returnTo));
    response.cookies.set(
      IDENTITY_COOKIE,
      await createIdentitySession(config.sessionSecret, identity),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: IDENTITY_SECONDS,
      },
    );
    return response;
  } catch (error) {
    return fail(error instanceof Error ? error.message : "unexpected error");
  }
}
