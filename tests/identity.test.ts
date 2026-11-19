import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createFlow,
  createIdentitySession,
  IDENTITY_SECONDS,
  readFlow,
  readIdentitySession,
} from "@/server/auth/identity";
import { createSession, readSession } from "@/server/auth/session";

const secret = "a-test-only-secret-that-is-long-enough";
const identity = {
  sub: "1234567890",
  name: "Tommy Trojan",
  email: "trojan@usc.edu",
};
afterEach(() => vi.useRealTimers());

describe("identity sessions", () => {
  it("round-trips the Google account ID, name, and email", async () => {
    const session = await readIdentitySession(
      await createIdentitySession(secret, identity),
      secret,
    );
    expect(session).toMatchObject(identity);
  });
  it("rejects missing, malformed, and tampered tokens", async () => {
    const token = await createIdentitySession(secret, identity);
    expect(await readIdentitySession(undefined, secret)).toBeNull();
    expect(await readIdentitySession("not-a-token", secret)).toBeNull();
    expect(
      await readIdentitySession(`${token.slice(0, -12)}tampered`, secret),
    ).toBeNull();
  });
  it("expires after eight hours", async () => {
    vi.useFakeTimers();
    const token = await createIdentitySession(secret, identity);
    vi.advanceTimersByTime((IDENTITY_SECONDS + 1) * 1000);
    expect(await readIdentitySession(token, secret)).toBeNull();
  });
  it("is invalidated when the session secret rotates", async () => {
    const token = await createIdentitySession(secret, identity);
    expect(
      await readIdentitySession(token, "a-new-secret-that-is-long-enough-too"),
    ).toBeNull();
  });
  it("is not interchangeable with the club-password session or sign-in flow", async () => {
    const club = {
      sitePassword: "a-test-club-password",
      sessionSecret: secret,
    };
    expect(
      await readIdentitySession(await createSession(club), secret),
    ).toBeNull();
    expect(
      await readSession(await createIdentitySession(secret, identity), club),
    ).toBeNull();
    const flow = await createFlow(secret, {
      state: "s",
      nonce: "n",
      verifier: "v",
      returnTo: "/",
    });
    expect(await readIdentitySession(flow, secret)).toBeNull();
    expect(
      await readFlow(await createIdentitySession(secret, identity), secret),
    ).toBeNull();
  });
});

describe("sign-in flow cookie", () => {
  const flow = {
    state: "s",
    nonce: "n",
    verifier: "v",
    returnTo: "/attendance",
  };
  it("round-trips and expires after ten minutes", async () => {
    vi.useFakeTimers();
    const token = await createFlow(secret, flow);
    expect(await readFlow(token, secret)).toEqual(flow);
    vi.advanceTimersByTime(10 * 60 * 1000 + 1000);
    expect(await readFlow(token, secret)).toBeNull();
  });
  it("rejects tampering and other secrets", async () => {
    const token = await createFlow(secret, flow);
    expect(await readFlow(`${token.slice(0, -12)}tampered`, secret)).toBeNull();
    expect(
      await readFlow(token, "a-new-secret-that-is-long-enough-too"),
    ).toBeNull();
  });
});
