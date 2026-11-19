import { beforeEach, expect, it, vi } from "vitest";
import { createIdentitySession, IDENTITY_COOKIE } from "@/server/auth/identity";
import { createSession } from "@/server/auth/session";
import { getIdentity, requireIdentity } from "@/server/auth/server";

const secret = "a-test-server-secret-at-least-32-characters";
const identity = {
  sub: "1234567890",
  name: "Tommy Trojan",
  email: "trojan@usc.edu",
};
const mocks = vi.hoisted<{
  google: {
    clientId: string;
    clientSecret: string;
    sessionSecret: string;
  } | null;
  get: ReturnType<typeof vi.fn>;
}>(() => ({ google: null, get: vi.fn() }));
vi.mock("@/server/auth/config", () => ({
  getAuthConfig: () => null,
  getGoogleConfig: () => mocks.google,
}));
vi.mock("next/headers", () => ({ cookies: () => Promise.resolve(mocks) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.google = {
    clientId: "id",
    clientSecret: "secret",
    sessionSecret: secret,
  };
  mocks.get.mockReturnValue(undefined);
});

it("returns the verified identity for a valid identity cookie", async () => {
  const token = await createIdentitySession(secret, identity);
  mocks.get.mockImplementation((name: string) =>
    name === IDENTITY_COOKIE ? { value: token } : undefined,
  );
  expect(await getIdentity()).toMatchObject(identity);
  expect(await requireIdentity("/attendance")).toMatchObject(identity);
});
it("has no identity without a cookie, with a bad cookie, or when Google sign-in is unconfigured", async () => {
  expect(await getIdentity()).toBeNull();
  mocks.get.mockReturnValue({ value: "not-a-token" });
  expect(await getIdentity()).toBeNull();
  const token = await createIdentitySession(secret, identity);
  mocks.get.mockReturnValue({ value: token });
  mocks.google = null;
  expect(await getIdentity()).toBeNull();
});
it("does not treat a club-password session as an identity", async () => {
  const club = await createSession({
    sitePassword: "a-test-club-password",
    sessionSecret: secret,
  });
  mocks.get.mockReturnValue({ value: club });
  expect(await getIdentity()).toBeNull();
});
it("redirects to sign-in, preserving a safe return path", async () => {
  await expect(requireIdentity("/attendance/abc")).rejects.toThrow(
    "redirect:/?next=%2Fattendance%2Fabc",
  );
  await expect(requireIdentity("https://evil.example")).rejects.toThrow(
    "redirect:/",
  );
});
