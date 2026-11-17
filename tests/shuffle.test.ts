import { afterEach, expect, it, vi } from "vitest";

import { shuffle } from "@/features/flashcards/shuffle";

afterEach(() => vi.restoreAllMocks());

it("shuffles a copy without changing or losing members", () => {
  vi.spyOn(Math, "random").mockReturnValue(0);
  const members = Object.freeze(["Alex", "Blair", "Casey", "Drew"]);

  const shuffled = shuffle(members);

  expect(shuffled).toEqual(["Blair", "Casey", "Drew", "Alex"]);
  expect(shuffled).not.toBe(members);
  expect(members).toEqual(["Alex", "Blair", "Casey", "Drew"]);
});

it("allows members to stay in their current positions", () => {
  vi.spyOn(Math, "random").mockReturnValue(0.9999);

  expect(shuffle(["Alex", "Blair", "Casey"])).toEqual([
    "Alex",
    "Blair",
    "Casey",
  ]);
});

it("handles empty and single-member rosters without drawing random numbers", () => {
  const random = vi.spyOn(Math, "random");

  expect(shuffle([])).toEqual([]);
  expect(shuffle(["Alex"])).toEqual(["Alex"]);
  expect(random).not.toHaveBeenCalled();
});
