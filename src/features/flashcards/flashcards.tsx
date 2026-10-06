"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, RotateCw, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { Member } from "./members";
import styles from "./flashcards.module.css";

export function Flashcards({ members }: { members: readonly Member[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showName, setShowName] = useState(false);
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const member = members[currentIndex];
  const flip = () => setShowName((current) => !current);
  const changeCard = (index: number) => {
    setCurrentIndex(index);
    setShowName(false);
  };

  if (!member) {
    return <p className="text-muted-foreground text-sm">No members yet.</p>;
  }

  const photo = member.photo === failedPhoto ? null : member.photo;
  const photoLabel = photo ? "Member photo" : "Member photo placeholder";

  return (
    <div>
      <Button
        key={member.id}
        type="button"
        variant="unstyled"
        size="custom"
        onClick={flip}
        aria-label={
          showName ? `${member.name}. Show photo` : `${photoLabel}. Show name`
        }
        className={cn(styles.card, "group block w-full rounded-2xl text-left")}
      >
        <span className={cn(styles.faces, showName && styles.flipped)}>
          <span
            aria-hidden={showName}
            className={cn(
              styles.face,
              "border-border bg-muted flex flex-col items-center justify-center gap-5 overflow-hidden rounded-2xl border p-6 shadow-sm transition-shadow group-hover:shadow-md",
            )}
          >
            {photo ? (
              <Image
                src={photo}
                alt="Member photo"
                fill
                sizes="(max-width: 768px) 100vw, 720px"
                className="object-contain object-center"
                unoptimized
                onError={() => setFailedPhoto(photo)}
              />
            ) : (
              <>
                <UserRound
                  className="text-primary/40 size-16"
                  strokeWidth={1}
                  aria-hidden="true"
                />
                <span className="text-muted-foreground text-sm">
                  Member photo
                </span>
              </>
            )}
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
              {member.name}
            </span>
          </span>
        </span>
      </Button>
      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {members.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => changeCard(currentIndex - 1)}
              disabled={currentIndex === 0}
              aria-label="Previous card"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
          )}
          <span
            className="text-muted-foreground text-xs tabular-nums"
            aria-label={`Card ${currentIndex + 1} of ${members.length}`}
          >
            {currentIndex + 1} / {members.length}
          </span>
          {members.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => changeCard(currentIndex + 1)}
              disabled={currentIndex === members.length - 1}
              aria-label="Next card"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="bg-card rounded-full"
          onClick={flip}
        >
          <RotateCw className="size-4" aria-hidden="true" />
          {showName ? "Show photo" : "Show name"}
        </Button>
      </div>
      <span className="sr-only" role="status" aria-atomic="true">
        {`Card ${currentIndex + 1} of ${members.length}. ${showName ? member.name : photoLabel}`}
      </span>
    </div>
  );
}
