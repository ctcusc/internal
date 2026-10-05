"use client";

import { useState } from "react";
import { RotateCw, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import styles from "./member-flashcards.module.css";

export function MemberFlashcards() {
  const [showName, setShowName] = useState(false);
  const flip = () => setShowName((current) => !current);

  return (
    <div>
      <button
        type="button"
        onClick={flip}
        aria-label={
          showName
            ? "Member name. Show photo"
            : "Member photo placeholder. Show name"
        }
        className={cn(
          styles.card,
          "group block w-full cursor-pointer rounded-2xl text-left",
        )}
      >
        <span className={cn(styles.faces, showName && styles.flipped)}>
          <span
            aria-hidden={showName}
            className={cn(
              styles.face,
              "border-border bg-muted flex flex-col items-center justify-center gap-5 rounded-2xl border p-6 shadow-sm transition-shadow group-hover:shadow-md",
            )}
          >
            <UserRound
              className="text-primary/40 size-16"
              strokeWidth={1}
              aria-hidden="true"
            />
            <span className="text-muted-foreground text-sm">Member photo</span>
          </span>
          <span
            aria-hidden={!showName}
            className={cn(
              styles.face,
              styles.back,
              "bg-primary text-primary-foreground flex items-center justify-center rounded-2xl border border-transparent p-8 text-center shadow-sm",
            )}
          >
            <span className="text-3xl font-bold tracking-tight sm:text-4xl">
              Member name
            </span>
          </span>
        </span>
      </button>
      <div className="mt-5 flex items-center justify-between gap-4">
        <span className="text-muted-foreground text-xs">Sample card</span>
        <Button
          type="button"
          variant="outline"
          className="bg-card h-11 gap-2 rounded-full px-5"
          onClick={flip}
        >
          <RotateCw className="size-4" aria-hidden="true" />
          {showName ? "Show photo" : "Show name"}
        </Button>
      </div>
      <span className="sr-only" role="status" aria-atomic="true">
        {showName ? "Member name" : "Member photo placeholder"}
      </span>
    </div>
  );
}
