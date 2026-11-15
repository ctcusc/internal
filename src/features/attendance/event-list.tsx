"use client";

import { CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { AttendanceEvent } from "@/server/data/attendance";

type EventGroups = {
  live: AttendanceEvent[];
  upcoming: AttendanceEvent[];
  past: AttendanceEvent[];
};

const groupDetails = [
  { key: "live", label: "Live" },
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
] as const;

function formatEventType(eventType: string) {
  return eventType.charAt(0).toUpperCase() + eventType.slice(1);
}

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function EventCard({ event }: { event: AttendanceEvent }) {
  return (
    <Link href={`/attendance/${event.id}`} className="group block">
      <Card className="group-hover:bg-muted/40 h-full transition-colors">
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-4">
            <h3 className="font-bold">{event.name}</h3>
            <Badge variant="secondary">
              {formatEventType(event.event_type)}
            </Badge>
          </div>

          <div className="text-muted-foreground flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
              <time dateTime={event.starts_at}>
                {formatEventDate(event.starts_at)}
              </time>
            </div>

            {event.location ? (
              <div className="flex items-center gap-2">
                <MapPin className="size-4 shrink-0" aria-hidden="true" />
                <span>{event.location}</span>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EventGroup({
  label,
  events,
}: {
  label: string;
  events: AttendanceEvent[];
}) {
  if (!events.length) return null;

  return (
    <section aria-labelledby={`${label.toLowerCase()}-events`}>
      <h2
        id={`${label.toLowerCase()}-events`}
        className="mb-3 text-lg font-bold"
      >
        {label}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}

export function EventList({ groups }: { groups: EventGroups }) {
  const hasEvents =
    groups.live.length || groups.upcoming.length || groups.past.length;

  if (!hasEvents) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-sm">
        No events are available yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {groupDetails.map(({ key, label }) => (
        <EventGroup key={key} label={label} events={groups[key]} />
      ))}
    </div>
  );
}
