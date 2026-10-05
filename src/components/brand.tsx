import { cn } from "@/lib/utils";

export function CtcMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 37 23"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M4.52865 11.2495L15.4466 22.1674H10.9194L0 11.248L11.248 0H15.7781L4.52865 11.2495Z" />
      <path d="M36.2889 11.248L25.3695 22.1674H20.7124L31.6304 11.2495L20.3809 0H25.0409L36.2889 11.248Z" />
      <path d="M21.5417 4.91067L18.5119 7.94043L18.5117 7.94024L15.3981 11.0538L18.5117 14.1674L21.617 11.0621L21.6172 11.0623L24.6553 8.02427L27.8781 11.2471L18.4679 20.6573L9.05775 11.2471L18.4679 1.83692L21.5417 4.91067Z" />
    </svg>
  );
}

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <CtcMark className="text-primary h-5 w-8 shrink-0" />
      <span className="text-base font-bold tracking-tight">ctc internal</span>
    </span>
  );
}
