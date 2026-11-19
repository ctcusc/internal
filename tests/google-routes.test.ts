import {
  exportJWK,
  generateKeyPair,
  SignJWT,
  type CryptoKey,
  type JWK,
} from "jose";
import { NextRequest } from "next/server";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { GET as start } from "@/app/api/auth/google/route";
import { GET as callback } from "@/app/api/auth/google/callback/route";
import {
  FLOW_COOKIE,
  IDENTITY_COOKIE,
  readIdentitySession,
} from "@/server/auth/identity";

const config = {
  clientId: "client-123.apps.googleusercontent.com",
  clientSecret: "client-secret",
  sessionSecret: "a-test-server-secret-at-least-32-characters",
};
const mocks = vi.hoisted<{ config: Record<string, string> | null }>(() => ({
  config: null,
}));
vi.mock("@/server/auth/config", () => ({
  getGoogleConfig: () => mocks.config,
}));

const origin = "https://internal.ctcusc.com";
let privateKey: CryptoKey;
let jwk: JWK;
beforeAll(async () => {
  const pair = await generateKeyPair("RS256", { extractable: true });
  privateKey = pair.privateKey;
  jwk = {
    ...(await exportJWK(pair.publicKey)),
    kid: "test-key",
    alg: "RS256",
    use: "sig",
  };
});
beforeEach(() => {
  mocks.config = { ...config };
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function cookieValue(response: Response, name: string) {
  const header = response.headers
    .getSetCookie()
    .find((cookie) => cookie.startsWith(`${name}=`));
  return header ? header.split(";")[0]!.slice(name.length + 1) : undefined;
}
async function begin(next?: string) {
  const query = next ? `?next=${encodeURIComponent(next)}` : "";
  const response = await start(
    new NextRequest(`${origin}/api/auth/google${query}`),
  );
  const location = new URL(response.headers.get("location")!);
  return {
    response,
    location,
    flowCookie: cookieValue(response, FLOW_COOKIE)!,
  };
}
function callbackRequest(params: Record<string, string>, flowCookie?: string) {
  return new NextRequest(
    `${origin}/api/auth/google/callback?${new URLSearchParams(params)}`,
    { headers: flowCookie ? { cookie: `${FLOW_COOKIE}=${flowCookie}` } : {} },
  );
}
async function idToken(nonce: string, claims: Record<string, unknown> = {}) {
  return new SignJWT({
    email: "trojan@usc.edu",
    email_verified: true,
    hd: "usc.edu",
    name: "Tommy Trojan",
    nonce,
    ...claims,
  })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setSubject("1234567890")
    .setIssuer("https://accounts.google.com")
    .setAudience(config.clientId)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(privateKey);
}
function requestUrl(input: string | URL | Request) {
  if (typeof input === "string") return input;
  return input instanceof URL ? input.href : input.url;
}
function bodyText(body: unknown) {
  if (typeof body === "string") return body;
  return body instanceof URLSearchParams ? body.toString() : "";
}

// Stubs Google's token endpoint and key set.
function stubTokenEndpoint(token: string, status = 200) {
  const fetchMock = vi.fn(async (input: string | URL | Request) => {
    const url = requestUrl(input);
    if (url === "https://www.googleapis.com/oauth2/v3/certs")
      return Response.json({ keys: [jwk] });
    if (url === "https://oauth2.googleapis.com/token")
      return status === 200
        ? Response.json({
            access_token: "access-token",
            token_type: "Bearer",
            expires_in: 3599,
            id_token: token,
          })
        : Response.json({ error: "invalid_grant" }, { status });
    throw new Error(`Unexpected request to ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
const failed = (response: Response) =>
  expect(response.headers.get("location")).toBe(
    `${origin}/?error=google_sign_in_failed`,
  );

describe("GET /api/auth/google", () => {
  it("redirects to Google with state, nonce, PKCE, and a protected flow cookie", async () => {
    const { response, location } = await begin("/attendance");
    expect(response.status).toBe(307);
    expect(location.origin + location.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(location.searchParams.get("client_id")).toBe(config.clientId);
    expect(location.searchParams.get("redirect_uri")).toBe(
      `${origin}/api/auth/google/callback`,
    );
    for (const key of ["state", "nonce", "code_challenge"])
      expect(location.searchParams.get(key)).toBeTruthy();
    const cookie = response.headers
      .getSetCookie()
      .find((value) => value.startsWith(`${FLOW_COOKIE}=`))!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Path=\/api\/auth\/google/);
    expect(cookie).toMatch(/Max-Age=600/);
  });
  it("uses a fresh state and nonce each time", async () => {
    const [a, b] = [await begin(), await begin()];
    expect(a.location.searchParams.get("state")).not.toBe(
      b.location.searchParams.get("state"),
    );
    expect(a.location.searchParams.get("nonce")).not.toBe(
      b.location.searchParams.get("nonce"),
    );
  });
  it("sends the user home when Google sign-in is not configured", async () => {
    mocks.config = null;
    const response = await start(new NextRequest(`${origin}/api/auth/google`));
    expect(response.headers.get("location")).toBe(
      `${origin}/?error=google_unavailable`,
    );
    expect(cookieValue(response, FLOW_COOKIE)).toBeUndefined();
  });
});

describe("GET /api/auth/google/callback", () => {
  it("signs in a verified USC account and returns to the requested page", async () => {
    const { location, flowCookie } = await begin("/attendance");
    stubTokenEndpoint(await idToken(location.searchParams.get("nonce")!));
    const response = await callback(
      callbackRequest(
        { code: "auth-code", state: location.searchParams.get("state")! },
        flowCookie,
      ),
    );
    expect(response.headers.get("location")).toBe(`${origin}/attendance`);
    const session = await readIdentitySession(
      cookieValue(response, IDENTITY_COOKIE),
      config.sessionSecret,
    );
    expect(session).toMatchObject({
      sub: "1234567890",
      name: "Tommy Trojan",
      email: "trojan@usc.edu",
    });
    const identityCookie = response.headers
      .getSetCookie()
      .find((value) => value.startsWith(`${IDENTITY_COOKIE}=`))!;
    expect(identityCookie).toMatch(/HttpOnly/i);
    expect(identityCookie).toMatch(/SameSite=lax/i);
    // The one-time flow cookie is cleared.
    expect(
      response.headers
        .getSetCookie()
        .find((value) => value.startsWith(`${FLOW_COOKIE}=;`)),
    ).toBeTruthy();
  });
  it("sends the code verifier from the flow cookie to Google", async () => {
    const { location, flowCookie } = await begin();
    const fetchMock = stubTokenEndpoint(
      await idToken(location.searchParams.get("nonce")!),
    );
    await callback(
      callbackRequest(
        { code: "auth-code", state: location.searchParams.get("state")! },
        flowCookie,
      ),
    );
    const exchange = fetchMock.mock.calls.find(
      ([input]) => requestUrl(input) === "https://oauth2.googleapis.com/token",
    ) as unknown as [string, RequestInit];
    const body = new URLSearchParams(bodyText(exchange[1].body));
    expect(body.get("code")).toBe("auth-code");
    expect(body.get("code_verifier")).toBeTruthy();
    expect(body.get("redirect_uri")).toBe(`${origin}/api/auth/google/callback`);
  });
  it("never redirects off-site, even with a hostile return path", async () => {
    const { location, flowCookie } = await begin("https://evil.example");
    stubTokenEndpoint(await idToken(location.searchParams.get("nonce")!));
    const response = await callback(
      callbackRequest(
        { code: "c", state: location.searchParams.get("state")! },
        flowCookie,
      ),
    );
    expect(response.headers.get("location")).toBe(`${origin}/`);
  });

  it("rejects a mismatched state without issuing an identity", async () => {
    const { flowCookie } = await begin();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await callback(
      callbackRequest({ code: "c", state: "attacker-state" }, flowCookie),
    );
    failed(response);
    expect(cookieValue(response, IDENTITY_COOKIE)).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects a callback with no flow cookie, a bad cookie, or no code", async () => {
    const { location, flowCookie } = await begin();
    const state = location.searchParams.get("state")!;
    for (const request of [
      callbackRequest({ code: "c", state }),
      callbackRequest(
        { code: "c", state },
        `${flowCookie.slice(0, -8)}tampered`,
      ),
      callbackRequest({ state }, flowCookie),
    ]) {
      const response = await callback(request);
      failed(response);
      expect(cookieValue(response, IDENTITY_COOKIE)).toBeUndefined();
    }
  });
  it("rejects when the user denies access at Google", async () => {
    const { flowCookie } = await begin();
    failed(
      await callback(callbackRequest({ error: "access_denied" }, flowCookie)),
    );
  });
  it.each([
    ["a personal Gmail account", { email: "a@gmail.com", hd: undefined }],
    ["an unverified email", { email_verified: false }],
    [
      "a different hosted domain",
      { hd: "example.edu", email: "a@example.edu" },
    ],
    ["a replayed nonce", { nonce: "someone-elses-nonce" }],
  ])("rejects %s and issues no identity", async (_name, claims) => {
    const { location, flowCookie } = await begin();
    stubTokenEndpoint(
      await idToken(location.searchParams.get("nonce")!, claims),
    );
    const response = await callback(
      callbackRequest(
        { code: "c", state: location.searchParams.get("state")! },
        flowCookie,
      ),
    );
    failed(response);
    expect(cookieValue(response, IDENTITY_COOKIE)).toBeUndefined();
  });
  it("rejects when Google's token endpoint fails", async () => {
    const { location, flowCookie } = await begin();
    stubTokenEndpoint("", 400);
    const response = await callback(
      callbackRequest(
        { code: "c", state: location.searchParams.get("state")! },
        flowCookie,
      ),
    );
    failed(response);
    expect(cookieValue(response, IDENTITY_COOKIE)).toBeUndefined();
  });
});
