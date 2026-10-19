import { describe, expect, it } from "vitest";
import {
  averageProportions,
  cmToIn,
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
