import Link from "next/link";
import { ArrowRight, UsersRound } from "lucide-react";

import type { Tool } from "@/config/tools";
import { Card, CardContent } from "@/components/ui/card";

const icons = { people: UsersRound };

export function ToolCard({ tool }: { tool: Tool }) {
  const Icon = icons[tool.icon];
  const content = (
    <Card className="rounded-lg py-0 shadow-none">
      <CardContent className="flex items-center gap-4 p-5">
        <Icon
          className="text-muted-foreground size-5 shrink-0"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold">{tool.name}</h2>
          {tool.description ? (
            <p className="text-muted-foreground mt-1 text-sm">
              {tool.description}
            </p>
          ) : null}
        </div>
        {tool.status === "available" ? (
          <ArrowRight
            className="text-muted-foreground size-4 shrink-0"
            aria-hidden="true"
          />
        ) : (
          <span className="text-muted-foreground shrink-0 text-xs">
            Coming soon
          </span>
        )}
      </CardContent>
    </Card>
  );

  return tool.status === "available" ? (
    <Link
      href={tool.href}
      className="hover:bg-muted block rounded-lg transition-colors"
    >
      {content}
    </Link>
  ) : (
    content
  );
}
