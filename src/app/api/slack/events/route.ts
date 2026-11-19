import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "@/env";
import { dataError, json, readBody } from "@/server/data/api-utils";
import { DataError } from "@/server/data/shared";
import { applySlackReactionEvent } from "@/server/data/slack-reactions";

const envelopeSchema = z.object({
  type: z.string(),
  challenge: z.string().optional(),
  event: z.unknown(),
});
const reactionTarget = z.object({
  type: z.enum(["reaction_added", "reaction_removed"]),
  reaction: z.string().min(1),
  item: z.object({
    type: z.literal("message"),
    channel: z.string().min(1),
  }),
});

async function readSignedEnvelope(request: Request, secret: string) {
  const timestamp = request.headers.get("x-slack-request-timestamp");
  const signature = request.headers.get("x-slack-signature");
  if (
    !timestamp ||
    !/^\d+$/.test(timestamp) ||
    Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > 300 ||
    !signature ||
    !/^v0=[0-9a-f]{64}$/.test(signature)
  ) {
    throw new DataError(401, "Invalid Slack signature.");
  }

  const body = await readBody(request, 64 * 1024);
  const digest = createHmac("sha256", secret)
    .update(`v0:${timestamp}:`)
    .update(body)
    .digest();
  if (!timingSafeEqual(digest, Buffer.from(signature.slice(3), "hex"))) {
    throw new DataError(401, "Invalid Slack signature.");
  }
  try {
    return envelopeSchema.parse(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)),
    );
  } catch {
    throw new DataError(400, "Invalid Slack event payload.");
  }
}

export async function POST(request: Request) {
  if (!env.SLACK_SIGNING_SECRET)
    return json({ error: "Slack signing secret is not configured." }, 503);
  try {
    const envelope = await readSignedEnvelope(
      request,
      env.SLACK_SIGNING_SECRET,
    );
    if (envelope.type === "url_verification") {
      if (!envelope.challenge) throw new DataError(400, "Missing challenge.");
      return json({ challenge: envelope.challenge });
    }
    if (envelope.type === "event_callback") {
      const reaction = reactionTarget.safeParse(envelope.event);
      if (reaction.success) {
        if (!env.SLACK_REACTION_CHANNEL_ID || !env.SLACK_REACTION_EMOJI)
          throw new DataError(503, "Slack reaction target is not configured.");
        if (
          reaction.data.item.channel === env.SLACK_REACTION_CHANNEL_ID &&
          reaction.data.reaction === env.SLACK_REACTION_EMOJI
        ) {
          await applySlackReactionEvent(envelope.event);
        }
      }
    }
    return new Response(null, { status: 200 });
  } catch (error) {
    return dataError(error);
  }
}
