import { statSync } from "node:fs";
import { expect, it } from "vitest";

import { members } from "@/features/flashcards/members";

it("uses unique member IDs", () => {
  const ids = members.map((member) => member.id);
  expect(new Set(ids).size).toBe(ids.length);
});

it.each(members)("has valid details and a local photo for $id", (member) => {
  expect(member.id.trim()).not.toBe("");
  expect(member.name.trim()).not.toBe("");

  if (member.photo === null) return;

  expect(member.photo).toMatch(/^\/(?!\/)/);
  const photo = new URL(`../public${member.photo}`, import.meta.url);
  expect(statSync(photo).isFile()).toBe(true);
});
