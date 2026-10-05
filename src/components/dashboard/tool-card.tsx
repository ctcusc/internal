import Link from "next/link";
import { ArrowRight, UsersRound } from "lucide-react";

import type { Tool } from "@/config/tools";
import { Card, CardContent } from "@/components/ui/card";

const icons = { people: UsersRound };

export function ToolCard({ tool }: { tool: Tool }) {
  const Icon = icons[tool.icon];
  const content = (
    <Card className="group-hover:bg-muted/40 h-full gap-0 rounded-lg py-0 shadow-none transition-colors">
      <CardContent className="flex h-full flex-col gap-6 p-6">
        <div className="bg-muted text-primary flex size-11 items-center justify-center rounded-lg">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <div>
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base font-bold">{tool.name}</h2>
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
          </div>
          {tool.description ? (
            <p className="text-muted-foreground mt-1 text-sm">
              {tool.description}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );

  return tool.status === "available" ? (
    <Link href={tool.href} className="group block rounded-lg">
      {content}
    </Link>
  ) : (
    content
  );
}
