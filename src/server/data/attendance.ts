import "server-only";

import { z } from "zod";
import { getDatabase } from "./db";
import { authorize, DataError, pagination, parse, type Page } from "./shared";

const eventIdSchema = z.string().uuid("Use a valid event ID.");
const eventSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    event_type: z.string().trim().min(1).max(50),
    starts_at: z
      .string()
      .datetime({ offset: true })
      .transform((value) => new Date(value).toISOString()),
    ends_at: z
      .string()
      .datetime({ offset: true })
      .transform((value) => new Date(value).toISOString()),
    location: z.string().trim().max(200).optional(),
  })
  .strict()
  .refine((event) => Date.parse(event.ends_at) > Date.parse(event.starts_at), {
    message: "End time must be after start time.",
    path: ["ends_at"],
  });
const attendeeSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((value) => value.toLowerCase()),
  })
  .strict();
export type NewEvent = z.input<typeof eventSchema>;
export type Attendee = z.input<typeof attendeeSchema>;
export type AttendanceEvent = {
  id: string;
  name: string;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  created_at: string;
};
export type CheckIn = {
  event_id: string;
  name: string;
  email: string;
  checked_in_at: string;
};

export async function createEvent(input: NewEvent): Promise<AttendanceEvent> {
  await authorize();
  const data = parse(eventSchema, input);
  const db = await getDatabase();
  const row = await db
    .prepare(
      "INSERT INTO attendance_events (id, name, event_type, starts_at, ends_at, location) VALUES (?, ?, ?, ?, ?, ?) RETURNING *",
    )
    .bind(
      crypto.randomUUID(),
      data.name,
      data.event_type,
      data.starts_at,
      data.ends_at,
      data.location ?? null,
    )
    .first<AttendanceEvent>();
  if (!row) throw new Error("D1 did not return the event.");
  return row;
}

export async function listEvents(
  options: Page = {},
): Promise<AttendanceEvent[]> {
  await authorize();
  const { limit, offset } = parse(pagination, options);
  const db = await getDatabase();
  const { results } = await db
    .prepare(
      "SELECT * FROM attendance_events ORDER BY starts_at DESC, id LIMIT ? OFFSET ?",
    )
    .bind(limit, offset)
    .all<AttendanceEvent>();
  return results;
}

export async function getEvent(id: string): Promise<AttendanceEvent | null> {
  await authorize();
  parse(eventIdSchema, id);
  const db = await getDatabase();
  return db
    .prepare("SELECT * FROM attendance_events WHERE id = ?")
    .bind(id)
    .first<AttendanceEvent>();
}

export async function listAttendance(
  eventId: string,
  options: Page = {},
): Promise<CheckIn[]> {
  if (!(await getEvent(eventId))) throw new DataError(404, "Event not found.");
  const { limit, offset } = parse(pagination, options);
  const db = await getDatabase();
  const { results } = await db
    .prepare(
      "SELECT * FROM attendance_check_ins WHERE event_id = ? ORDER BY checked_in_at, email LIMIT ? OFFSET ?",
    )
    .bind(eventId, limit, offset)
    .all<CheckIn>();
  return results;
}

// Repeated check-ins update the name while preserving the original check-in time.
export async function checkIn(
  eventId: string,
  input: Attendee,
): Promise<CheckIn> {
  const event = await getEvent(eventId);
  if (!event) throw new DataError(404, "Event not found.");
  const now = Date.now();
  if (
    !event.ends_at ||
    now < Date.parse(event.starts_at) ||
    now >= Date.parse(event.ends_at)
  ) {
    throw new DataError(
      409,
      "Check-in is available only while the event is live.",
    );
  }
  const data = parse(attendeeSchema, input);
  const db = await getDatabase();
  const row = await db
    .prepare(
      `INSERT INTO attendance_check_ins (event_id, name, email) VALUES (?, ?, ?)
     ON CONFLICT (event_id, email) DO UPDATE SET name = excluded.name RETURNING *`,
    )
    .bind(eventId, data.name, data.email)
    .first<CheckIn>();
  if (!row) throw new Error("D1 did not return the check-in.");
  return row;
}
