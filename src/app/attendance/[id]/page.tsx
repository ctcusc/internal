import { CalendarDays, Clock3, MapPin } from "lucide-react";
import { notFound } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/shell";
import { Badge } from "@/components/ui/badge";
import { requireClubSession } from "@/server/auth/server";
import { getEvent } from "@/server/data/attendance";

function formatEventType(eventType: string) {
  return eventType.charAt(0).toUpperCase() + eventType.slice(1);
}

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AttendanceEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  await requireClubSession(`/attendance/${id}`);

  const event = await getEvent(id);

  if (!event) {
    notFound();
  }

  return (
    <DashboardShell
      title={event.name}
      backLink={{ href: "/attendance", label: "Back to attendance" }}
      contentClassName="max-w-3xl"
    >
      <section aria-labelledby="event-details-heading">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 id="event-details-heading" className="text-lg font-bold">
            Event details
          </h2>
          <Badge variant="secondary">{formatEventType(event.event_type)}</Badge>
        </div>

        <dl className="divide-y border-y">
          <div className="flex items-start gap-4 py-4">
            <CalendarDays
              className="text-muted-foreground mt-0.5 size-5 shrink-0"
              aria-hidden="true"
            />
            <div>
              <dt className="text-muted-foreground text-xs font-medium uppercase">
                Starts
              </dt>
              <dd>
                <time className="text-sm" dateTime={event.starts_at}>
                  {formatEventDate(event.starts_at)}
                </time>
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-4 py-4">
            <Clock3
              className="text-muted-foreground mt-0.5 size-5 shrink-0"
              aria-hidden="true"
            />
            <div>
              <dt className="text-muted-foreground text-xs font-medium uppercase">
                Ends
              </dt>
              <dd>
                <time className="text-sm" dateTime={event.ends_at}>
                  {formatEventDate(event.ends_at)}
                </time>
              </dd>
            </div>
          </div>

          {event.location ? (
            <div className="flex items-start gap-4 py-4">
              <MapPin
                className="text-muted-foreground mt-0.5 size-5 shrink-0"
                aria-hidden="true"
              />
              <div>
                <dt className="text-muted-foreground text-xs font-medium uppercase">
                  Location
                </dt>
                <dd className="text-sm">{event.location}</dd>
              </div>
            </div>
          ) : null}
        </dl>
      </section>
    </DashboardShell>
  );
}
