import {
  exportJWK,
  generateKeyPair,
  SignJWT,
  type CryptoKey,
  type JWK,
} from "jose";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  buildAuthorizationUrl,
  codeChallenge,
  completeSignIn,
  SignInError,
} from "@/server/auth/google";

const clientId = "client-123.apps.googleusercontent.com";
const clientSecret = "client-secret";
const nonce = "test-nonce";
const redirectUri = "https://internal.ctcusc.com/api/auth/google/callback";
const flow = { state: "test-state", nonce, verifier: "test-verifier" };
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
afterEach(() => vi.unstubAllGlobals());

function requestUrl(input: string | URL | Request) {
  if (typeof input === "string") return input;
  return input instanceof URL ? input.href : input.url;
}
function bodyText(body: unknown) {
  if (typeof body === "string") return body;
  return body instanceof URLSearchParams ? body.toString() : "";
}

type Claims = Record<string, unknown>;
async function idToken(
  claims: Claims = {},
  options: { issuer?: string; audience?: string; expires?: string } = {},
  signWith?: CryptoKey,
) {
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
    .setIssuer(options.issuer ?? "https://accounts.google.com")
    .setAudience(options.audience ?? clientId)
    .setIssuedAt()
    .setExpirationTime(options.expires ?? "10m")
    .sign(signWith ?? privateKey);
}

// Stubs Google's token endpoint and key set; records every request made.
function stubGoogle(token: string, tokenStatus = 200) {
  const requests: { url: string; body: URLSearchParams }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = requestUrl(input);
      requests.push({
        url,
        body: new URLSearchParams(bodyText(init?.body)),
      });
      if (url === "https://www.googleapis.com/oauth2/v3/certs")
        return Response.json({ keys: [jwk] });
      if (url === "https://oauth2.googleapis.com/token")
        return tokenStatus === 200
          ? Response.json({
              access_token: "access-token",
              token_type: "Bearer",
              expires_in: 3599,
              id_token: token,
            })
          : Response.json({ error: "invalid_grant" }, { status: tokenStatus });
      throw new Error(`Unexpected request to ${url}`);
    }),
  );
  return requests;
}
function signIn(
  query: Record<string, string> = { code: "auth-code", state: flow.state },
) {
  return completeSignIn({
    callbackUrl: new URL(
      `${redirectUri}?${new URLSearchParams(query).toString()}`,
    ),
    flow,
    clientId,
    clientSecret,
    redirectUri,
  });
}

describe("ID token validation", () => {
  it("accepts a verified USC Workspace account and returns its identity", async () => {
    stubGoogle(await idToken());
    expect(await signIn()).toEqual({
      sub: "1234567890",
      name: "Tommy Trojan",
      email: "trojan@usc.edu",
    });
  });
  it("accepts a string email_verified", async () => {
    stubGoogle(await idToken({ email_verified: "true" }));
    expect((await signIn()).sub).toBe("1234567890");
  });
  it("normalizes email case and falls back to the email for the name", async () => {
    stubGoogle(await idToken({ email: "Trojan@USC.edu", name: "  " }));
    const identity = await signIn();
    expect(identity.email).toBe("trojan@usc.edu");
    expect(identity.name).toBe("trojan@usc.edu");
  });

  it.each([
    ["wrong audience", () => idToken({}, { audience: "other-client" })],
    ["wrong issuer", () => idToken({}, { issuer: "https://evil.example" })],
    // Google documents this form too; the library requires the https form
    // (what Google's discovery document and real tokens use).
    [
      "issuer without https",
      () => idToken({}, { issuer: "accounts.google.com" }),
    ],
    ["expired", () => idToken({}, { expires: "-1m" })],
    ["wrong nonce", () => idToken({ nonce: "replayed" })],
    ["missing nonce", () => idToken({ nonce: undefined })],
    ["unverified email", () => idToken({ email_verified: false })],
    ["missing email_verified", () => idToken({ email_verified: undefined })],
    [
      "personal Gmail account",
      () => idToken({ email: "a@gmail.com", hd: undefined }),
    ],
    ["usc.edu email without a hosted domain", () => idToken({ hd: undefined })],
    ["other hosted domain", () => idToken({ hd: "example.edu" })],
    [
      "hd claimed but email at another domain",
      () => idToken({ email: "a@example.edu" }),
    ],
    ["lookalike email domain", () => idToken({ email: "a@usc.edu.evil.com" })],
    ["subdomain email", () => idToken({ email: "a@cs.usc.edu" })],
    ["two @ signs", () => idToken({ email: "a@evil.com@usc.edu" })],
    ["missing email", () => idToken({ email: undefined })],
  ])("rejects %s", async (_name, make) => {
    stubGoogle(await make());
    await expect(signIn()).rejects.toBeInstanceOf(SignInError);
  });

  it("rejects a token signed by a different key", async () => {
    const other = await generateKeyPair("RS256");
    stubGoogle(await idToken({}, {}, other.privateKey));
    await expect(signIn()).rejects.toBeInstanceOf(SignInError);
  });
  it("rejects unsigned and malformed tokens", async () => {
    const unsigned = `${btoa('{"alg":"none"}')}.${btoa(
      JSON.stringify({ sub: "1", iss: "https://accounts.google.com" }),
    )}.`;
    for (const token of [unsigned, "not-a-token"]) {
      stubGoogle(token);
      await expect(signIn()).rejects.toBeInstanceOf(SignInError);
    }
  });
  it("rejects a token that uses a non-RS256 algorithm", async () => {
    const token = await new SignJWT({ nonce, email: "a@usc.edu" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("1")
      .setIssuer("https://accounts.google.com")
      .setAudience(clientId)
      .setIssuedAt()
      .setExpirationTime("10m")
      .sign(new TextEncoder().encode("a-shared-secret-of-sufficient-length"));
    stubGoogle(token);
    await expect(signIn()).rejects.toBeInstanceOf(SignInError);
  });
});

describe("authorization response and code exchange", () => {
  it("posts the code, secret, and PKCE verifier to Google's token endpoint", async () => {
    const requests = stubGoogle(await idToken());
    await signIn();
    const exchange = requests.find(
      ({ url }) => url === "https://oauth2.googleapis.com/token",
    )!;
    expect(Object.fromEntries(exchange.body)).toEqual({
      code: "auth-code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: "test-verifier",
    });
  });
  it.each([
    ["a mismatched state (login CSRF)", { code: "c", state: "attacker" }],
    ["a missing state", { code: "c" }],
    ["a missing code", { state: flow.state }],
    ["an error from Google", { error: "access_denied", state: flow.state }],
  ])("rejects %s without contacting Google", async (_name, query) => {
    const requests = stubGoogle(await idToken());
    await expect(signIn(query)).rejects.toBeInstanceOf(SignInError);
    expect(requests).toHaveLength(0);
  });
  it("fails on an error from the token endpoint", async () => {
    stubGoogle(await idToken(), 400);
    await expect(signIn()).rejects.toBeInstanceOf(SignInError);
  });
});

describe("authorization request", () => {
  it("asks for an authorization code with PKCE, state, nonce, and the USC hint", () => {
    const url = new URL(
      buildAuthorizationUrl({
        clientId,
        redirectUri,
        state: "s",
        nonce: "n",
        challenge: "c",
      }),
    );
    expect(url.origin + url.pathname).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: clientId,
      response_type: "code",
      scope: "openid email profile",
      redirect_uri: redirectUri,
      state: "s",
      nonce: "n",
      code_challenge: "c",
      code_challenge_method: "S256",
      hd: "usc.edu",
      prompt: "select_account",
    });
  });
  it("computes the RFC 7636 S256 challenge", async () => {
    expect(
      await codeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    ).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});
