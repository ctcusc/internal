import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/shell";
import { EventList } from "@/features/attendance/event-list";
import { requireClubSession } from "@/server/auth/server";
import { listEvents, type AttendanceEvent } from "@/server/data/attendance";

export const metadata: Metadata = { title: "Attendance" };
export const dynamic = "force-dynamic";

function groupEvents(events: AttendanceEvent[]) {
  const now = Date.now();
  return {
    live: events.filter((event) => {
      return (
        Date.parse(event.starts_at) <= now && now < Date.parse(event.ends_at)
      );
    }),
    upcoming: events.filter((event) => Date.parse(event.starts_at) > now),
    past: events.filter((event) => Date.parse(event.ends_at) <= now),
  };
}

export default async function AttendancePage() {
  await requireClubSession("/attendance");

  const events = await listEvents();
  const groupedEvents = groupEvents(events);

  return (
    <DashboardShell
      title="Attendance"
      backLink={{ href: "/", label: "Back to tools" }}
    >
      <EventList groups={groupedEvents} />
    </DashboardShell>
  );
}
