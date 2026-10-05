import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/shell";
import { Flashcards } from "@/features/flashcards/flashcards";
import { requireClubSession } from "@/server/auth/server";

export const metadata: Metadata = { title: "Flashcards" };
export const dynamic = "force-dynamic";

export default async function FlashcardsPage() {
  await requireClubSession("/flashcards");

  return (
    <DashboardShell
      title="Flashcards"
      backLink={{ href: "/", label: "Back to tools" }}
      contentClassName="max-w-3xl"
    >
      <Flashcards />
    </DashboardShell>
  );
}
