-- Keep these additions compatible with the existing event and check-in endpoints.
-- The attendance implementation will require ends_at for new events and use
-- google_sub as the check-in identity after Google sign-in is deployed.
ALTER TABLE attendance_events
  ADD COLUMN event_type TEXT NOT NULL DEFAULT 'other';

ALTER TABLE attendance_events
  ADD COLUMN ends_at TEXT;

ALTER TABLE attendance_check_ins
  ADD COLUMN google_sub TEXT;

CREATE UNIQUE INDEX attendance_check_ins_google_sub
  ON attendance_check_ins(event_id, google_sub)
  WHERE google_sub IS NOT NULL;

-- Each Slack reaction is one row, making duplicate event deliveries harmless.
-- The displayed count is COUNT(*) for the configured channel and emoji.
CREATE TABLE slack_reactions (
  channel_id TEXT NOT NULL,
  message_ts TEXT NOT NULL,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (channel_id, message_ts, user_id, emoji)
);

CREATE INDEX slack_reactions_count
  ON slack_reactions(channel_id, emoji);
