import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWTPayload,
} from "jose";
import { beforeAll, beforeEach, expect, it, vi } from "vitest";

import { GET as callback } from "@/app/api/auth/google/callback/route";
import { GET as start } from "@/app/api/auth/google/start/route";
import { GOOGLE_STATE_COOKIE, type GoogleConfig } from "@/server/auth/google";
import { SESSION_COOKIE } from "@/server/auth/session";

const mocks = vi.hoisted(() => ({
  google: null as GoogleConfig | null,
  jwks: null as unknown as (...args: unknown[]) => Promise<unknown>,
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("@/env", () => ({ env: {} }));
vi.mock("@/server/auth/config", () => ({
  getAuthConfig: () => ({
    sitePassword: "a-test-club-password",
    sessionSecret: "a-test-server-secret-at-least-32-characters",
  }),
}));
vi.mock(import("@/server/auth/google"), async (original) => ({
  ...(await original()),
  getGoogleConfig: () => mocks.google,
}));
vi.mock("jose", async (original) => ({
  ...(await original<object>()),
  createRemoteJWKSet:
    () =>
    (...args: unknown[]) =>
      mocks.jwks(...args),
}));
vi.mock("next/headers", () => ({ cookies: () => Promise.resolve(mocks) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

let privateKey: CryptoKey;
beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), alg: "RS256" };
  mocks.jwks = createLocalJWKSet({ keys: [jwk] }) as typeof mocks.jwks;
});

const stored = { state: "s", nonce: "n", verifier: "v", next: "/tools/x" };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.google = {
    clientId: "client-id",
    clientSecret: "client-secret",
    redirectUri: "http://localhost:3000/api/auth/google/callback",
    allowed: ["member@example.com"],
  };
  mocks.get.mockReturnValue({ value: JSON.stringify(stored) });
});

async function googleReturns(claims: JWTPayload) {
  const idToken = await new SignJWT({
    nonce: "n",
    email_verified: true,
    ...claims,
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer("https://accounts.google.com")
    .setAudience("client-id")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(Response.json({ id_token: idToken }))),
  );
}

const run = (query = "code=c&state=s") =>
  callback(new Request(`http://localhost/api/auth/google/callback?${query}`));

it("starts the flow with state, nonce and PKCE in a short-lived cookie", async () => {
  await expect(
    start(new Request("http://localhost/api/auth/google/start?next=/a")),
  ).rejects.toThrow(
    /redirect:https:\/\/accounts\.google\.com\/.*code_challenge=/,
  );
  expect(mocks.set).toHaveBeenCalledWith(
    GOOGLE_STATE_COOKIE,
    expect.stringContaining('"next":"/a"'),
    expect.objectContaining({ httpOnly: true, maxAge: 600 }),
  );
});
it("signs in an allowlisted, verified Google account", async () => {
  await googleReturns({ email: "Member@Example.com" });
  await expect(run()).rejects.toThrow("redirect:/tools/x");
  expect(mocks.set).toHaveBeenCalledWith(
    SESSION_COOKIE,
    expect.any(String),
    expect.objectContaining({ httpOnly: true }),
  );
});
it("refuses accounts not on the allowlist", async () => {
  await googleReturns({ email: "stranger@example.com" });
  await expect(run()).rejects.toThrow("redirect:/?google=denied");
  expect(mocks.set).not.toHaveBeenCalled();
});
it.each([
  ["a mismatched state", "code=c&state=other", {}],
  ["a wrong nonce", undefined, { nonce: "x" }],
  ["an unverified email", undefined, { email_verified: false }],
])("rejects %s", async (_name, query, claims) => {
  await googleReturns({ email: "member@example.com", ...claims });
  await expect(run(query)).rejects.toThrow("redirect:/?google=failed");
  expect(mocks.set).not.toHaveBeenCalled();
});
it("fails closed when Google is not configured", async () => {
  mocks.google = null;
  await expect(run()).rejects.toThrow("redirect:/?google=failed");
  expect(mocks.set).not.toHaveBeenCalled();
});
