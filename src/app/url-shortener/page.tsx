import type { Metadata } from "next";

//import shared dashboard
import { DashboardShell } from "@/components/dashboard/shell";
//import to use sign-in
import { requireClubSession } from "@/server/auth/server";

import { UrlShortener } from "@/features/url-shortener/url-shortener";

//set page title
export const metadata: Metadata = {
  title: "URL Shortener & QR",
};

//render page when requested
export const dynamic = "force-dynamic";

//define component Next.js displays
export default async function UrlShortenerPage() {
  //require login before displaying
  await requireClubSession("/url-shortener");

  return (
    <DashboardShell
      title="URL Shortener & QR" //page heading
      backLink={{ href: "/", label: "Back to tools" }} //back arrow dest.
      contentClassName="max-w-3xl" //limit content max width
    >
      <UrlShortener />
    </DashboardShell>
  );
}
