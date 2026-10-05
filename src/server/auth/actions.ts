"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getAuthConfig } from "./config";
import { checkLoginRateLimit } from "./rate-limit";
import { safeReturnTo } from "./redirect";
import {
  createSession,
  passwordMatches,
  SESSION_COOKIE,
  SESSION_SECONDS,
} from "./session";

export type SignInState = { error?: string };

export async function signIn(
  _state: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const config = getAuthConfig();
  if (!config)
    return {
      error: "Sign-in unavailable. Contact a board member.",
    };

  const limit = await checkLoginRateLimit();
  if (limit === "limited")
    return { error: "Too many attempts. Try again in a minute." };
  if (limit === "unavailable")
    return {
      error: "Sign-in unavailable. Try again later.",
    };

  const password = z
    .string()
    .min(1)
    .max(1024)
    .safeParse(formData.get("password"));
  if (
    !password.success ||
    !passwordMatches(password.data, config.sitePassword)
  ) {
    return { error: "Incorrect password." };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, await createSession(config), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  redirect(safeReturnTo(formData.get("next")));
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/");
}
