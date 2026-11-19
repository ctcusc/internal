import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/shell";
import { ShortLinkForm } from "@/features/links/short-link-form";
import { requireClubSession } from "@/server/auth/server";

export const metadata: Metadata = { title: "Short links" };
export const dynamic = "force-dynamic";

export default async function LinksPage() {
  await requireClubSession("/links");

  return (
    <DashboardShell
      title="Short links"
      backLink={{ href: "/", label: "Back to tools" }}
      contentClassName="max-w-3xl"
    >
      <ShortLinkForm />
    </DashboardShell>
  );
}
