import { describe, expect, it } from "vitest";
import { safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("keeps same-site paths", () => {
    expect(safeNextPath("/account/reset-password")).toBe(
      "/account/reset-password",
    );
  });

  it("rejects anything that could leave the site", () => {
    expect(safeNextPath("https://evil.example")).toBe("/account");
    expect(safeNextPath("//evil.example")).toBe("/account");
    expect(safeNextPath("/\\evil.example")).toBe("/account");
    expect(safeNextPath(null)).toBe("/account");
  });

  it("rejects tabs and newlines browsers would strip", () => {
    expect(safeNextPath("/\t/evil.example")).toBe("/account");
    expect(safeNextPath("/%09/evil.example")).toBe("/%09/evil.example");
    expect(safeNextPath("/\n/evil.example")).toBe("/account");
    expect(safeNextPath("/\r/evil.example")).toBe("/account");
  });

  it("keeps query strings and hashes", () => {
    expect(safeNextPath("/account/orders?page=2#top")).toBe(
      "/account/orders?page=2#top",
    );
  });
});
