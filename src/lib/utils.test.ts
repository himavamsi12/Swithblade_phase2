import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("keeps a type-scale size next to a text colour", () => {
    expect(cn("text-body-3", "text-black")).toBe("text-body-3 text-black");
    expect(cn("text-h2", "text-muted")).toBe("text-h2 text-muted");
  });

  it("still lets a later size win over an earlier one", () => {
    expect(cn("text-body-3", "text-body-1")).toBe("text-body-1");
  });
});
