import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSession,
  passwordMatches,
  readSession,
  SESSION_SECONDS,
} from "@/server/auth/session";

const config = {
  sitePassword: "a-test-club-password",
  sessionSecret: "a-test-only-secret-that-is-long-enough",
};
afterEach(() => vi.useRealTimers());

describe("club sessions", () => {
  it("accepts a signed session", async () => {
    const session = await readSession(await createSession(config), config);
    expect(session?.access).toBe("club");
  });
  it("rejects missing, malformed, and tampered tokens", async () => {
    const token = await createSession(config);
    expect(await readSession(undefined, config)).toBeNull();
    expect(await readSession("not-a-token", config)).toBeNull();
    expect(
      await readSession(`${token.slice(0, -12)}tampered`, config),
    ).toBeNull();
  });
  it("expires after eight hours", async () => {
    vi.useFakeTimers();
    const token = await createSession(config);
    vi.advanceTimersByTime((SESSION_SECONDS + 1) * 1000);
    expect(await readSession(token, config)).toBeNull();
  });
  it("invalidates sessions when either secret rotates", async () => {
    const token = await createSession(config);
    expect(
      await readSession(token, {
        ...config,
        sitePassword: "a-new-club-password",
      }),
    ).toBeNull();
    expect(
      await readSession(token, {
        ...config,
        sessionSecret: "a-new-server-secret-that-is-long-enough",
      }),
    ).toBeNull();
  });
  it("does not accept sessions signed with only the club password", async () => {
    const token = await createSession({
      ...config,
      sessionSecret: config.sitePassword,
    });
    expect(await readSession(token, config)).toBeNull();
  });
});

describe("password matching", () => {
  it("requires the exact password, including spaces and case", () => {
    expect(passwordMatches(config.sitePassword, config.sitePassword)).toBe(
      true,
    );
    expect(
      passwordMatches(config.sitePassword.toUpperCase(), config.sitePassword),
    ).toBe(false);
    expect(
      passwordMatches(` ${config.sitePassword}`, config.sitePassword),
    ).toBe(false);
    expect(passwordMatches("", config.sitePassword)).toBe(false);
    expect(passwordMatches("x".repeat(1025), config.sitePassword)).toBe(false);
  });
});
