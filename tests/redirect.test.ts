import { expect, it } from "vitest";
import { safeReturnTo } from "@/server/auth/redirect";

it.each([
  undefined,
  [],
  "https://evil.example",
  "//evil.example",
  "/\\evil.example",
  "/%2fevil.example",
  "/%5cevil.example",
  "/%0aevil.example",
  "/%",
  "/a/..//evil.example",
  "/a/%2e%2e//evil.example",
  "javascript:alert(1)",
])("rejects unsafe return destinations: %s", (value) => {
  expect(safeReturnTo(value)).toBe("/");
});

it("keeps an internal deep link and query string", () => {
  expect(safeReturnTo("/tools/example?mode=practice#start")).toBe(
    "/tools/example?mode=practice#start",
  );
});
