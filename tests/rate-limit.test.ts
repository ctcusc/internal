import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { checkLoginRateLimit } from "@/server/auth/rate-limit";

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  limit: vi.fn(),
  headers: vi.fn(),
}));
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mocks.context,
}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.resetAllMocks();
  mocks.context.mockResolvedValue({
    env: { LOGIN_RATE_LIMITER: { limit: mocks.limit } },
  });
  mocks.limit.mockResolvedValue({ success: true });
  mocks.headers.mockResolvedValue(
    new Headers({ "cf-connecting-ip": "192.0.2.1" }),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it("uses the platform-provided client IP with the Worker limiter", async () => {
  expect(await checkLoginRateLimit()).toBe("allowed");
  expect(mocks.limit).toHaveBeenCalledWith({ key: "192.0.2.1" });
});
it("rejects attempts once the Worker limiter is exhausted", async () => {
  mocks.limit.mockResolvedValue({ success: false });
  expect(await checkLoginRateLimit()).toBe("limited");
});
it("fails closed without a trusted client IP or binding", async () => {
  mocks.headers.mockResolvedValue(
    new Headers({ "x-forwarded-for": "192.0.2.1" }),
  );
  expect(await checkLoginRateLimit()).toBe("unavailable");
  expect(mocks.limit).not.toHaveBeenCalled();
  mocks.headers.mockResolvedValue(
    new Headers({ "cf-connecting-ip": "192.0.2.1" }),
  );
  mocks.context.mockResolvedValue({ env: {} });
  expect(await checkLoginRateLimit()).toBe("unavailable");
});
it("fails closed when the Worker runtime or limiter fails", async () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  mocks.context.mockRejectedValue(new Error("unavailable"));
  expect(await checkLoginRateLimit()).toBe("unavailable");
});
