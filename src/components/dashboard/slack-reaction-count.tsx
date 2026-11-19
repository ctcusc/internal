import { Card, CardContent } from "@/components/ui/card";
import { env } from "@/env";
import { getSlackReactionCount } from "@/server/data/slack-reactions";

export async function SlackReactionCount() {
  const channel = env.SLACK_REACTION_CHANNEL_ID;
  const emoji = env.SLACK_REACTION_EMOJI;
  const count = await getSlackReactionCount().catch(() => null);

  return (
    <Card className="mt-4 gap-0 rounded-lg py-0 shadow-none">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div className="min-w-0">
          <h2 className="text-base font-bold">Slack reactions</h2>
          {channel && emoji && (
            <p className="text-muted-foreground mt-1 text-sm wrap-anywhere">
              :{emoji}: in{" "}
              <a
                className="underline underline-offset-2"
                href={`https://slack.com/app_redirect?channel=${encodeURIComponent(channel)}`}
              >
                channel {channel}
              </a>
            </p>
          )}
        </div>
        {count === null ? (
          <p className="text-muted-foreground text-sm">Count unavailable</p>
        ) : (
          <p className="text-2xl font-bold tabular-nums">
            {count.toLocaleString("en-US")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
