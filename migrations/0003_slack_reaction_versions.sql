-- Keep the latest event time even after a removal, so a late retry cannot
-- resurrect a deleted reaction. The active set remains in slack_reactions.
CREATE TABLE slack_reaction_versions (
  channel_id TEXT NOT NULL,
  message_ts TEXT NOT NULL,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  last_event_us INTEGER NOT NULL,
  PRIMARY KEY (channel_id, message_ts, user_id, emoji)
) WITHOUT ROWID;
