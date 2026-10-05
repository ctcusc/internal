import Link from "next/link";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { signOut } from "@/server/auth/actions";
import { Navigation } from "./navigation";

export function DashboardShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="min-h-svh">
      <header className="border-border bg-card border-b">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6 sm:px-8">
          <Link href="/" aria-label="CTC Internal home">
            <Brand />
          </Link>
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              className="text-muted-foreground h-10 text-sm"
            >
              Sign out
            </Button>
          </form>
        </div>
        <Navigation />
      </header>
      <main
        id="main-content"
        className="mx-auto max-w-4xl px-6 py-10 sm:px-8 sm:py-12"
      >
        <h1 className="mb-6 text-2xl font-bold tracking-tight">{title}</h1>
        {children}
      </main>
    </div>
  );
}
