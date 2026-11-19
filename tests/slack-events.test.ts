import { createHmac } from "node:crypto";
import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/slack/events/route";
import { verifySlackSignature } from "@/server/slack/signature";

const SECRET = "test-signing-secret";
const CHANNEL = "C0123TEST";
const EMOJI = "tada";

const mocks = vi.hoisted(() => {
  const env: Record<string, string | undefined> = {};
  return { env, apply: vi.fn() };
});
vi.mock("@/env", () => ({ env: mocks.env }));
vi.mock("@/server/data/slack-reactions", () => ({
  applySlackReactionEvent: mocks.apply,
}));

beforeEach(() => {
  mocks.apply.mockReset();
  mocks.apply.mockResolvedValue(undefined);
  Object.assign(mocks.env, {
    SLACK_SIGNING_SECRET: SECRET,
    SLACK_REACTION_CHANNEL_ID: CHANNEL,
    SLACK_REACTION_EMOJI: EMOJI,
  });
});

function sign(body: string, timestamp: string, secret = SECRET) {
  const digest = createHmac("sha256", secret)
    .update(`v0:${timestamp}:${body}`)
    .digest("hex");
  return `v0=${digest}`;
}

function slackRequest(
  payload: unknown,
  {
    timestamp = String(Math.floor(Date.now() / 1000)),
    signature,
    headers = {},
  }: {
    timestamp?: string;
    signature?: string;
    headers?: Record<string, string>;
  } = {},
) {
  const body = JSON.stringify(payload);
  return new Request("https://internal.ctcusc.com/api/slack/events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-slack-request-timestamp": timestamp,
      "x-slack-signature": signature ?? sign(body, timestamp),
      ...headers,
    },
    body,
  });
}

function reaction(
  type = "reaction_added",
  { channel = CHANNEL, emoji = EMOJI } = {},
) {
  return {
    type,
    user: "U0001",
    reaction: emoji,
    item: { type: "message", channel, ts: "1700000000.000100" },
    event_ts: "1700000001.000200",
  };
}

const callback = (event: unknown) => ({
  type: "event_callback",
  event_id: "Ev01",
  event,
});

it("verifies signatures with Slack's v0 scheme", async () => {
  const body = '{"a":1}';
  const timestamp = "1700000000";
  const now = 1_700_000_000_000;
  const base = { rawBody: body, timestamp, secret: SECRET, now };
  expect(
    await verifySlackSignature({ ...base, signature: sign(body, timestamp) }),
  ).toBe(true);
  expect(
    await verifySlackSignature({
      ...base,
      signature: sign(body, timestamp, "wrong"),
    }),
  ).toBe(false);
  expect(
    await verifySlackSignature({
      ...base,
      now: now + 301_000,
      signature: sign(body, timestamp),
    }),
  ).toBe(false);
  expect(
    await verifySlackSignature({
      ...base,
      timestamp: null,
      signature: sign(body, timestamp),
    }),
  ).toBe(false);
});

it("answers URL verification challenges", async () => {
  const response = await POST(
    slackRequest({ type: "url_verification", challenge: "abc123" }),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ challenge: "abc123" });
});

it("rejects bad, stale, and missing signatures", async () => {
  const payload = { type: "url_verification", challenge: "x" };
  const stale = String(Math.floor(Date.now() / 1000) - 600);
  for (const request of [
    slackRequest(payload, { signature: "v0=deadbeef" }),
    slackRequest(payload, { timestamp: stale }),
    new Request("https://internal.ctcusc.com/api/slack/events", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  ]) {
    expect((await POST(request)).status).toBe(401);
  }
  expect(mocks.apply).not.toHaveBeenCalled();
});

it("returns 503 when the signing secret is not configured", async () => {
  mocks.env.SLACK_SIGNING_SECRET = undefined;
  const response = await POST(slackRequest(callback(reaction())));
  expect(response.status).toBe(503);
});

it("passes matching reaction events to storage", async () => {
  for (const type of ["reaction_added", "reaction_removed"]) {
    const event = reaction(type);
    const response = await POST(slackRequest(callback(event)));
    expect(response.status).toBe(200);
    expect(mocks.apply).toHaveBeenLastCalledWith(event);
  }
  expect(mocks.apply).toHaveBeenCalledTimes(2);
});

it("acknowledges and ignores unrelated events", async () => {
  for (const event of [
    reaction("reaction_added", { channel: "C0OTHER" }),
    reaction("reaction_added", { emoji: "thumbsup" }),
    { type: "message", channel: CHANNEL, text: "hi" },
    { ...reaction(), item: { type: "file", file: "F01" } },
  ]) {
    const response = await POST(slackRequest(callback(event)));
    expect(response.status).toBe(200);
  }
  expect(mocks.apply).not.toHaveBeenCalled();
});

it("ignores reactions until the channel and emoji are configured", async () => {
  mocks.env.SLACK_REACTION_CHANNEL_ID = undefined;
  const response = await POST(slackRequest(callback(reaction())));
  expect(response.status).toBe(200);
  expect(mocks.apply).not.toHaveBeenCalled();
});

it("acknowledges Slack retries by reapplying idempotently", async () => {
  const event = reaction();
  const response = await POST(
    slackRequest(callback(event), {
      headers: {
        "x-slack-retry-num": "1",
        "x-slack-retry-reason": "http_timeout",
      },
    }),
  );
  expect(response.status).toBe(200);
  expect(mocks.apply).toHaveBeenCalledWith(event);
});

it("returns 500 so Slack retries when storage fails", async () => {
  mocks.apply.mockRejectedValue(new Error("D1 down"));
  const response = await POST(slackRequest(callback(reaction())));
  expect(response.status).toBe(500);
});
