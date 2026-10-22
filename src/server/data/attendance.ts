import "server-only";

import { z } from "zod";
import { getDatabase } from "./db";
import { authorize, DataError, pagination, parse, type Page } from "./shared";

const eventIdSchema = z.string().uuid("Use a valid event ID.");
const eventSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    starts_at: z
      .string()
      .datetime({ offset: true })
      .transform((value) => new Date(value).toISOString()),
    location: z.string().trim().max(200).optional(),
  })
  .strict();
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
  starts_at: string;
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
      "INSERT INTO attendance_events (id, name, starts_at, location) VALUES (?, ?, ?, ?) RETURNING *",
    )
    .bind(crypto.randomUUID(), data.name, data.starts_at, data.location ?? null)
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
  if (!(await getEvent(eventId))) throw new DataError(404, "Event not found.");
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
