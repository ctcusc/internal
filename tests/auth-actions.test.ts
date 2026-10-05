import { beforeEach, expect, it, vi } from "vitest";
import { signIn, signOut } from "@/server/auth/actions";
import { getClubSession, requireClubSession } from "@/server/auth/server";
import { createSession, SESSION_COOKIE } from "@/server/auth/session";

const mocks = vi.hoisted<{
  config: { sitePassword: string; sessionSecret: string } | null;
  limit: "allowed" | "limited" | "unavailable";
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}>(() => ({
  config: {
    sitePassword: "a-test-club-password",
    sessionSecret: "a-test-server-secret-at-least-32-characters",
  },
  limit: "allowed",
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("@/server/auth/config", () => ({ getAuthConfig: () => mocks.config }));
vi.mock("@/server/auth/rate-limit", () => ({
  checkLoginRateLimit: () => Promise.resolve(mocks.limit),
}));
vi.mock("next/headers", () => ({ cookies: () => Promise.resolve(mocks) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.config = {
    sitePassword: "a-test-club-password",
    sessionSecret: "a-test-server-secret-at-least-32-characters",
  };
  mocks.limit = "allowed";
  mocks.get.mockReturnValue(undefined);
});

function form(password: string, next = "/") {
  const data = new FormData();
  data.set("password", password);
  data.set("next", next);
  return data;
}

it("rejects wrong passwords without issuing a cookie", async () => {
  expect((await signIn({}, form("wrong"))).error).toBeTruthy();
  expect(mocks.set).not.toHaveBeenCalled();
});
it.each(["limited", "unavailable"] as const)(
  "rejects login when rate limiting is %s",
  async (limit) => {
    mocks.limit = limit;
    expect((await signIn({}, form("a-test-club-password"))).error).toBeTruthy();
    expect(mocks.set).not.toHaveBeenCalled();
  },
);
it("sets a protected session and returns to an internal deep link", async () => {
  await expect(
    signIn({}, form("a-test-club-password", "/tools/example")),
  ).rejects.toThrow("redirect:/tools/example");
  expect(mocks.set).toHaveBeenCalledWith(
    SESSION_COOKIE,
    expect.any(String),
    expect.objectContaining({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 28800,
    }),
  );
});
it("sends external return URLs to the dashboard", async () => {
  await expect(
    signIn({}, form("a-test-club-password", "https://evil.example")),
  ).rejects.toThrow("redirect:/");
});
it("fails closed when runtime secrets are absent", async () => {
  mocks.config = null;
  expect((await signIn({}, form("anything"))).error).toBeTruthy();
  expect(await getClubSession()).toBeNull();
  expect(mocks.set).not.toHaveBeenCalled();
});
it("protects direct page/data access without a session", async () => {
  await expect(requireClubSession("/tools/example")).rejects.toThrow(
    "redirect:/?next=%2Ftools%2Fexample",
  );
});
it("permits protected access with a valid cookie", async () => {
  mocks.get.mockReturnValue({ value: await createSession(mocks.config!) });
  expect((await requireClubSession()).access).toBe("club");
});
it("clears the cookie on sign-out", async () => {
  await expect(signOut()).rejects.toThrow("redirect:/");
  expect(mocks.delete).toHaveBeenCalledWith(SESSION_COOKIE);
});
