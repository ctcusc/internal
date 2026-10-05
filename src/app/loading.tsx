import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return (
    <main
      id="main-content"
      className="flex min-h-svh items-center justify-center"
      role="status"
    >
      <LoaderCircle
        className="text-muted-foreground size-5 animate-spin"
        aria-hidden="true"
      />
      <span className="sr-only">Loading…</span>
    </main>
  );
}
