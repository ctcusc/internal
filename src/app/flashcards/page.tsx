import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/shell";
import { MemberFlashcards } from "@/features/member-flashcards/member-flashcards";
import { requireClubSession } from "@/server/auth/server";

export const metadata: Metadata = { title: "Member flashcards" };
export const dynamic = "force-dynamic";

export default async function MemberFlashcardsPage() {
  await requireClubSession("/flashcards");

  return (
    <DashboardShell
      title="Member flashcards"
      backLink={{ href: "/", label: "Back to tools" }}
      contentClassName="max-w-3xl"
    >
      <MemberFlashcards />
    </DashboardShell>
  );
}
