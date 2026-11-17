"use client";

import { ChevronLeft, ChevronRight, RotateCw, UserRound } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { preload } from "react-dom";

import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

import styles from "./flashcards.module.css";
import type { Member } from "./members";

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

  useEffect(() => {
    if (members.length === 0) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;

      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        (target instanceof HTMLElement &&
          (target.isContentEditable ||
            target.closest("input, textarea, select, [role='textbox']")))
      ) {
        return;
      }

      const isNavigationKey =
        event.key === "ArrowLeft" || event.key === "ArrowRight";
      const isFlipKey =
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        (event.key === " " &&
          !(
            target instanceof HTMLElement &&
            target.closest("button, a[href], [role='button']")
          ));

      if (!isNavigationKey && !isFlipKey) return;

      event.preventDefault();
      if (event.repeat) return;

      if (isNavigationKey) {
        const nextIndex = currentIndex + (event.key === "ArrowRight" ? 1 : -1);

        if (nextIndex >= 0 && nextIndex < members.length) {
          setCurrentIndex(nextIndex);
          setShowName(false);
        }
      } else {
        setShowName((current) => !current);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, members.length]);

  if (!member) {
    return <p className="text-muted-foreground text-sm">No members yet.</p>;
  }

  const photo = member.photo === failedPhoto ? null : member.photo;
  const photoLabel = photo ? "Member photo" : "Member photo placeholder";
  const memberDetails = [member.year, member.role];
  const memberLabel = [member.name, ...memberDetails].join(". ");
  const nextPhoto = members[currentIndex + 1]?.photo;

  if (nextPhoto) {
    preload(nextPhoto, { as: "image", fetchPriority: "low" });
  }

  return (
    <div>
      <Button
        type="button"
        variant="unstyled"
        size="custom"
        onClick={flip}
        aria-label={
          showName ? `${memberLabel}. Show photo` : `${photoLabel}. Show name`
        }
        aria-keyshortcuts="ArrowUp ArrowDown Space Enter"
        className={cn(styles.card, "group block w-full rounded-2xl text-left")}
      >
        <span
          key={member.id}
          className={cn(styles.faces, showName && styles.flipped)}
        >
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
                priority
                fetchPriority="high"
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
              "bg-primary text-primary-foreground flex flex-col items-center justify-center gap-3 rounded-2xl border border-transparent p-8 text-center shadow-sm",
            )}
          >
            <span className="text-3xl font-bold tracking-tight sm:text-4xl">
              {member.name}
            </span>
            <span className="text-primary-foreground/80 text-sm sm:text-base">
              {memberDetails.join(" · ")}
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
              aria-keyshortcuts="ArrowLeft"
              title="Previous card (←)"
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
              aria-keyshortcuts="ArrowRight"
              title="Next card (→)"
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
      <div
        role="group"
        aria-label="Keyboard shortcuts"
        className="text-muted-foreground mt-6 hidden items-center justify-center gap-6 text-xs sm:flex"
      >
        <div className="flex items-center gap-2">
          <KbdGroup>
            <Kbd>←</Kbd>
            <Kbd>→</Kbd>
          </KbdGroup>
          <span>Move</span>
        </div>
        <div className="flex items-center gap-2">
          <KbdGroup>
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            <Kbd className="px-2">Space</Kbd>
          </KbdGroup>
          <span>Flip</span>
        </div>
      </div>
      <span className="sr-only" role="status" aria-atomic="true">
        {`Card ${currentIndex + 1} of ${members.length}. ${showName ? memberLabel : photoLabel}`}
      </span>
    </div>
  );
}
