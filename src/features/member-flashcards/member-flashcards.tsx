"use client";

import { useState } from "react";
import { RotateCw, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

export function MemberFlashcards() {
  const [showName, setShowName] = useState(false);

  return (
    <div className="mx-auto max-w-lg">
      <p className="text-muted-foreground mb-3 text-xs">Sample card</p>
      <Card className="gap-0 py-0 shadow-none">
        <CardContent
          id="member-flashcard-face"
          className="flex aspect-[4/3] items-center justify-center p-6 sm:aspect-video"
          aria-live="polite"
          aria-atomic="true"
        >
          {showName ? (
            <h2 className="text-center text-3xl font-bold tracking-tight">
              Member name
            </h2>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-muted text-muted-foreground flex size-24 items-center justify-center rounded-full sm:size-32">
                <UserRound
                  className="size-10 sm:size-12"
                  strokeWidth={1.25}
                  aria-hidden="true"
                />
              </div>
              <span className="text-muted-foreground text-sm">
                Member photo
              </span>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-card p-3">
          <Button
            type="button"
            variant="ghost"
            className="h-11 w-full gap-2"
            aria-controls="member-flashcard-face"
            onClick={() => setShowName((current) => !current)}
          >
            <RotateCw className="size-4" aria-hidden="true" />
            {showName ? "Show photo" : "Show name"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
