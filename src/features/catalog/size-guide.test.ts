import { describe, expect, it } from "vitest";
import {
  averageProportions,
  cmToIn,
  fitPreview,
  matchSize,
  proportionLabel,
  recommendSize,
} from "./size-guide";

const average = { proportions: averageProportions };
const all = (n: number) => ({
  proportions: { shoulders: n, chest: n, waist: n, hips: n },
});

describe("recommendSize", () => {
  it("matches the model: 175cm / 68kg with average proportions is an M", () => {
    expect(recommendSize({ height: 175, weight: 68, ...average }).size).toBe(
      "M",
    );
  });

  it("moves one size for clearly narrower or broader proportions", () => {
    const body = { height: 175, weight: 68 };
    expect(recommendSize({ ...body, ...all(-1) }).size).toBe("S");
    expect(recommendSize({ ...body, ...all(1) }).size).toBe("L");
    expect(recommendSize({ ...body, ...all(2) }).size).toBe("L");
  });

  it("ignores small differences", () => {
    const proportions = { shoulders: 1, chest: 0, waist: 0, hips: 1 };
    expect(recommendSize({ height: 175, weight: 68, proportions }).size).toBe(
      "M",
    );
  });

  it("stays within the chart at the extremes", () => {
    expect(recommendSize({ height: 150, weight: 40, ...all(-2) }).size).toBe(
      "XS",
    );
    expect(recommendSize({ height: 205, weight: 130, ...all(2) }).size).toBe(
      "2XL",
    );
  });

  it("weights weight over height", () => {
    expect(recommendSize({ height: 160, weight: 90, ...average }).size).toBe(
      "L",
    );
  });
});

describe("proportionLabel", () => {
  it("maps the slider value to its label", () => {
    expect(proportionLabel("shoulders", 0)).toBe("Average");
    expect(proportionLabel("hips", 2)).toBe("Wide");
    expect(proportionLabel("chest", -2)).toBe("Slim");
  });
});

describe("cmToIn", () => {
  it("converts to one decimal", () => {
    expect(cmToIn(91)).toBe(35.8);
  });
});

describe("matchSize", () => {
  const sizes = [{ label: "Small" }, { label: "m" }, { label: "XXL" }];

  it("matches however the product spells the size", () => {
    expect(matchSize(sizes, "S")).toEqual({ label: "Small" });
    expect(matchSize(sizes, "M")).toEqual({ label: "m" });
    expect(matchSize(sizes, "2XL")).toEqual({ label: "XXL" });
  });

  it("is null when the product doesn't come in that size", () => {
    expect(matchSize(sizes, "XS")).toBeNull();
  });
});

describe("fitPreview", () => {
  const pick = (size: string, cm: number) => {
    const p = fitPreview(size, cm);
    return `${p.size} ${p.height.key}`;
  };

  it("picks the render nearest the shopper's height", () => {
    expect(pick("M", 150)).toBe("M 5-8");
    expect(pick("M", 173)).toBe("M 5-8"); // 5'8.1"
    expect(pick("M", 178)).toBe("M 5-10"); // 5'10.1"
    expect(pick("L", 183)).toBe("L 6-0");
    expect(pick("XL", 200)).toBe("XL 6-2");
  });

  it("goes to the taller render on a tie", () => {
    expect(pick("S", 69 * 2.54)).toBe("S 5-10");
  });

  it("uses the nearest rendered size", () => {
    expect(pick("XS", 175)).toBe("S 5-8");
    expect(pick("2XL", 190)).toBe("XL 6-2");
    expect(pick("Large", 180)).toBe("L 5-10");
    expect(pick("Free", 180)).toBe("M 5-10");
  });
});
