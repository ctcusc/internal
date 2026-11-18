type ReactionCountCardProps = {
  channelName: string;
  emojiName: string;
  count: number | null;
};

export function ReactionCountCard({
  channelName, //channel label
  emojiName, //emoji counted
  count, //null when needed
}: ReactionCountCardProps) {
  return (
    <section
      aria-labelledby="slack-reaction-heading"
      className="border-border bg-card rounded-lg border p-6"
    >
      <h2 id="slack-reaction-heading" className="text-lg font-semibold">
        Slack reactions
      </h2>

      <p className="text-muted-foreground mt-1 text-sm">
        {emojiName} reactions in {channelName}
      </p>

      {count === null ? (
        <p className="text-muted-foreground mt-4 text-sm">
          Reaction count is temporarily unavailable.
        </p>
      ) : (
        <p className="mt-4">
          <span className="text-4xl font-bold tabular-nums">
            {count.toLocaleString()}
          </span>{" "}
          <span className="text-muted-foreground">
            {count === 1 ? "reaction" : "reactions"}
          </span>
        </p>
      )}
    </section>
  );
}
