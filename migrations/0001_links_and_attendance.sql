CREATE TABLE short_links (
  code TEXT PRIMARY KEY NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX short_links_created_at ON short_links(created_at DESC, code);

CREATE TABLE attendance_events (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  location TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX attendance_events_starts_at ON attendance_events(starts_at DESC, id);

CREATE TABLE attendance_check_ins (
  event_id TEXT NOT NULL REFERENCES attendance_events(id),
  email TEXT NOT NULL COLLATE NOCASE,
  name TEXT NOT NULL,
  checked_in_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (event_id, email)
);
CREATE INDEX attendance_check_ins_time ON attendance_check_ins(event_id, checked_in_at, email);
