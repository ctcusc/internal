import { expect, it } from "vitest";
import { tools } from "@/config/tools";

it("keeps tool routes clear of reserved paths", () => {
  for (const tool of tools)
    if (tool.href) expect(tool.href).not.toMatch(/^\/(go|api)(\/|$)/);
});
