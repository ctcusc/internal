import { createHmac } from "node:crypto";
import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/slack/events/route";
import { applySlackReactionEvent } from "@/server/data/slack-reactions";
import { DataError } from "@/server/data/shared";

const config = vi.hoisted(() => ({
  SLACK_SIGNING_SECRET: "fixture-signing-secret",
  SLACK_REACTION_CHANNEL_ID: "C_TARGET",
  SLACK_REACTION_EMOJI: "wave",
}));
vi.mock("@/env", () => ({ env: config }));
vi.mock("@/server/data/slack-reactions", () => ({
  applySlackReactionEvent: vi.fn(),
}));

const reaction = {
  type: "reaction_added",
  user: "U_TEST",
  reaction: "wave",
  item: { type: "message", channel: "C_TARGET", ts: "1710000000.000001" },
  event_ts: "1710000001.000002",
};
function signedRequest(
  body: string,
  timestamp = Math.floor(Date.now() / 1000),
  headers: Record<string, string> = {},
) {
  const signature = createHmac("sha256", "fixture-signing-secret")
    .update(`v0:${timestamp}:${body}`)
    .digest("hex");
  return new Request("https://internal.example/api/slack/events", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      "x-slack-request-timestamp": String(timestamp),
      "x-slack-signature": `v0=${signature}`,
      ...headers,
    },
  });
}
function delivery(event: unknown, headers?: Record<string, string>) {
  return signedRequest(
    JSON.stringify({ type: "event_callback", event }),
    undefined,
    headers,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  config.SLACK_SIGNING_SECRET = "fixture-signing-secret";
  config.SLACK_REACTION_CHANNEL_ID = "C_TARGET";
});

it("verifies the raw bytes before answering Slack’s URL challenge", async () => {
  const body = '{ "type": "url_verification",\n "challenge": "test-✓" }';
  const response = await POST(signedRequest(body));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ challenge: "test-✓" });
  const tampered = signedRequest(body.replace("✓", "!"));
  tampered.headers.set(
    "x-slack-signature",
    signedRequest(body).headers.get("x-slack-signature")!,
  );
  expect((await POST(tampered)).status).toBe(401);
  expect(applySlackReactionEvent).not.toHaveBeenCalled();
});

it("rejects missing, malformed and out-of-window credentials before dispatch", async () => {
  const body = JSON.stringify({ type: "event_callback", event: reaction });
  const now = Math.floor(Date.now() / 1000);
  const missing = signedRequest(body);
  missing.headers.delete("x-slack-signature");
  for (const request of [
    missing,
    signedRequest(body, now, { "x-slack-signature": "v0=invalid" }),
    signedRequest(body, now, { "x-slack-request-timestamp": "invalid" }),
    signedRequest(body, now - 301),
    signedRequest(body, now + 301),
  ]) {
    expect((await POST(request)).status).toBe(401);
  }
  expect(applySlackReactionEvent).not.toHaveBeenCalled();
});

it("rejects malformed envelopes and caps the streamed body", async () => {
  expect((await POST(signedRequest("{"))).status).toBe(400);
  expect(
    (await POST(signedRequest('{"type":"url_verification"}'))).status,
  ).toBe(400);
  expect((await POST(signedRequest(" ".repeat(65537)))).status).toBe(413);
  expect(applySlackReactionEvent).not.toHaveBeenCalled();
});

it.each(["reaction_added", "reaction_removed"])(
  "passes the entire matching %s event to storage",
  async (type) => {
    const event = { ...reaction, type };
    expect((await POST(delivery(event))).status).toBe(200);
    expect(applySlackReactionEvent).toHaveBeenCalledExactlyOnceWith(event);
  },
);

it("acknowledges irrelevant deliveries without calling storage", async () => {
  for (const event of [
    { ...reaction, type: "message" },
    { ...reaction, reaction: "tada" },
    { ...reaction, item: { ...reaction.item, channel: "C_OTHER" } },
    { ...reaction, item: { type: "file" } },
  ]) {
    expect((await POST(delivery(event))).status).toBe(200);
  }
  expect(
    (await POST(signedRequest('{"type":"app_rate_limited"}'))).status,
  ).toBe(200);
  expect(applySlackReactionEvent).not.toHaveBeenCalled();
});

it("returns a retryable error if storage fails and processes the signed retry", async () => {
  vi.mocked(applySlackReactionEvent).mockRejectedValueOnce(
    new DataError(503, "Storage unavailable."),
  );
  expect((await POST(delivery(reaction))).status).toBe(503);
  expect(
    (await POST(delivery(reaction, { "x-slack-retry-num": "1" }))).status,
  ).toBe(200);
  expect(applySlackReactionEvent).toHaveBeenCalledTimes(2);
  expect(applySlackReactionEvent).toHaveBeenLastCalledWith(reaction);
});

it("returns a retryable configuration error when the secret or target is missing", async () => {
  config.SLACK_SIGNING_SECRET = "";
  expect((await POST(delivery(reaction))).status).toBe(503);
  config.SLACK_SIGNING_SECRET = "fixture-signing-secret";
  config.SLACK_REACTION_CHANNEL_ID = "";
  expect((await POST(delivery(reaction))).status).toBe(503);
  expect(applySlackReactionEvent).not.toHaveBeenCalled();
});
