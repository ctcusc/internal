import { redirect } from "next/navigation";
import { Welcome } from "@/components/auth/welcome";
import { DashboardShell } from "@/components/dashboard/shell";
import { ToolCard } from "@/components/dashboard/tool-card";
import { tools } from "@/config/tools";
import { getAuthConfig } from "@/server/auth/config";
import { safeReturnTo } from "@/server/auth/redirect";
import { getClubSession } from "@/server/auth/server";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const [session, params] = await Promise.all([getClubSession(), searchParams]);
  const returnTo = safeReturnTo(params.next);
  if (!session)
    return <Welcome configured={!!getAuthConfig()} returnTo={returnTo} />;
  if (returnTo !== "/") redirect(returnTo);

  return (
    <DashboardShell title="Tools">
      {tools.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No tools yet.</p>
      )}
    </DashboardShell>
  );
}
