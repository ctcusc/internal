import { env } from "@/env";
import { json } from "@/server/data/api-utils";
import { applySlackReactionEvent } from "@/server/data/slack-reactions";
import { verifySlackSignature } from "@/server/slack/signature";

// Slack event payloads are a few KiB; anything larger is not from Slack.
const MAX_BODY_BYTES = 65_536;
const REACTION_EVENTS = new Set(["reaction_added", "reaction_removed"]);

type SlackPayload = {
  type?: unknown;
  challenge?: unknown;
  event?: {
    type?: unknown;
    reaction?: unknown;
    item?: { type?: unknown; channel?: unknown };
  };
};

// Slack Events API endpoint. Authenticated by Slack's request signature, not
// the club session. Only the configured channel and emoji are stored; every
// other verified event is acknowledged and ignored so Slack does not retry it.
export async function POST(request: Request) {
  const secret = env.SLACK_SIGNING_SECRET;
  if (!secret) {
    console.error("SLACK_SIGNING_SECRET is not configured.");
    return json({ error: "Slack events are not configured." }, 503);
  }

  const rawBody = await readBody(request);
  if (rawBody === null) return json({ error: "Request too large." }, 413);

  const verified = await verifySlackSignature({
    rawBody,
    timestamp: request.headers.get("x-slack-request-timestamp"),
    signature: request.headers.get("x-slack-signature"),
    secret,
  });
  if (!verified) return json({ error: "Invalid signature." }, 401);

  let payload: SlackPayload;
  try {
    payload = JSON.parse(rawBody) as SlackPayload;
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }

  if (payload.type === "url_verification") {
    return json({ challenge: payload.challenge });
  }

  const event = payload.event;
  if (
    payload.type === "event_callback" &&
    event &&
    REACTION_EVENTS.has(event.type as string) &&
    event.item?.type === "message" &&
    env.SLACK_REACTION_CHANNEL_ID &&
    env.SLACK_REACTION_EMOJI &&
    event.item.channel === env.SLACK_REACTION_CHANNEL_ID &&
    event.reaction === env.SLACK_REACTION_EMOJI
  ) {
    try {
      // Storage is idempotent, so Slack retries (X-Slack-Retry-Num) are safe
      // to apply again. A failure returns 500 so Slack retries later.
      await applySlackReactionEvent(event);
    } catch {
      console.error("Failed to store Slack reaction event.");
      return json({ error: "Could not store event." }, 500);
    }
  }

  return new Response(null, { status: 200 });
}

async function readBody(request: Request): Promise<string | null> {
  const length = Number(request.headers.get("content-length"));
  if (length > MAX_BODY_BYTES) return null;
  const body = await request.text();
  return new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES
    ? null
    : body;
}
