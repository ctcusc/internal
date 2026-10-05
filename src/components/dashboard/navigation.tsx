"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { tools } from "@/config/tools";
import { cn } from "@/lib/utils";

export function Navigation() {
  const pathname = usePathname();
  const available = tools.filter((tool) => tool.status === "available");
  if (available.length < 2) return null;

  const links = [{ id: "home", name: "Tools", href: "/" }, ...available];
  return (
    <nav
      aria-label="Tools"
      className="mx-auto flex max-w-4xl flex-wrap gap-x-6 px-6 pb-2 sm:px-8"
    >
      {links.map((link) => (
        <Link
          key={link.id}
          href={link.href}
          aria-current={pathname === link.href ? "page" : undefined}
          className={cn(
            "hover:text-foreground flex min-h-11 items-center text-sm transition-colors",
            pathname === link.href
              ? "text-foreground font-bold"
              : "text-muted-foreground",
          )}
        >
          {link.name}
        </Link>
      ))}
    </nav>
  );
}
