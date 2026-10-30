/*
 * Size chart and "find my size" logic for the size guide.
 *
 * TEMPORARY: one placeholder chart for every product until real per-product
 * measurements come from the CMS. Body measurements are in centimetres.
 */

export type SizeRow = {
  size: string;
  /** Body measurements the size is cut for (cm). */
  chest: [number, number];
  waist: [number, number];
  hip: [number, number];
  /** Garment length, back of neck to hem (cm). */
  length: number;
  /** Typical wearer, used by "find my size". */
  height: [number, number];
  weight: [number, number];
};

export const sizeChart: SizeRow[] = [
  {
    size: "XS",
    chest: [82, 86],
    waist: [66, 70],
    hip: [84, 88],
    length: 66,
    height: [155, 165],
    weight: [45, 55],
  },
  {
    size: "S",
    chest: [86, 90],
    waist: [70, 74],
    hip: [88, 92],
    length: 68,
    height: [160, 172],
    weight: [53, 64],
  },
  {
    size: "M",
    chest: [90, 96],
    waist: [74, 80],
    hip: [92, 98],
    length: 70,
    height: [168, 180],
    weight: [62, 75],
  },
  {
    size: "L",
    chest: [96, 102],
    waist: [80, 86],
    hip: [98, 104],
    length: 72,
    height: [175, 186],
    weight: [73, 86],
  },
  {
    size: "XL",
    chest: [102, 108],
    waist: [86, 92],
    hip: [104, 110],
    length: 74,
    height: [180, 192],
    weight: [84, 98],
  },
  {
    size: "2XL",
    chest: [108, 116],
    waist: [92, 100],
    hip: [110, 118],
    length: 76,
    height: [185, 200],
    weight: [96, 115],
  },
];

/** The model in the product photos. */
export const modelMeasurements = {
  size: "M",
  height: 175,
  chest: 91,
  waist: 71,
  hip: 96,
};

export type BodyPart = "shoulders" | "chest" | "waist" | "hips";

/**
 * How someone carries their frame compared with others of similar height and
 * weight, per body part: -2 (much narrower) … 0 (average) … 2 (much broader).
 */
export type Proportions = Record<BodyPart, number>;

export const PROPORTION_MIN = -2;
export const PROPORTION_MAX = 2;

export const averageProportions: Proportions = {
  shoulders: 0,
  chest: 0,
  waist: 0,
  hips: 0,
};

/** Slider labels from narrowest to broadest, per body part. */
const proportionLabels: Record<
  BodyPart,
  [string, string, string, string, string]
> = {
  shoulders: [
    "Narrow",
    "Slightly narrow",
    "Average",
    "Slightly broad",
    "Broad",
  ],
  chest: ["Slim", "Slightly slim", "Average", "Slightly full", "Full"],
  waist: ["Slim", "Slightly slim", "Average", "Slightly full", "Full"],
  hips: ["Narrow", "Slightly narrow", "Average", "Slightly wide", "Wide"],
};

export const proportionLabel = (part: BodyPart, value: number) =>
  proportionLabels[part][value - PROPORTION_MIN]!;

/**
 * Chest and shoulders decide how a top fits, so they count the most. Whole
 * percentages (summing to 100) keep the maths exact.
 */
const proportionWeights: Proportions = {
  shoulders: 30,
  chest: 35,
  waist: 20,
  hips: 15,
};

export type SizeProfile = {
  height: number;
  weight: number;
  proportions: Proportions;
};

export const HEIGHT_RANGE = { min: 120, max: 230 } as const;
export const WEIGHT_RANGE = { min: 30, max: 250 } as const;

const mid = ([a, b]: [number, number]) => (a + b) / 2;

/** Index of the row whose range midpoint is closest to `value`. */
function closest(value: number, pick: (row: SizeRow) => [number, number]) {
  let best = 0;
  sizeChart.forEach((row, i) => {
    if (
      Math.abs(mid(pick(row)) - value) <
      Math.abs(mid(pick(sizeChart[best]!)) - value)
    ) {
      best = i;
    }
  });
  return best;
}

/**
 * Recommends a size from height and weight (weight counts twice as much, as
 * it drives girth), then moves one size down or up when the body proportions
 * are clearly narrower or broader than average.
 */
export function recommendSize({
  height,
  weight,
  proportions,
}: SizeProfile): SizeRow {
  const byWeight = closest(weight, (r) => r.weight);
  const byHeight = closest(height, (r) => r.height);
  const base = Math.round((byWeight * 2 + byHeight) / 3);
  const score = (Object.keys(proportionWeights) as BodyPart[]).reduce(
    (sum, part) => sum + proportions[part] * proportionWeights[part],
    0,
  );
  // One full step broader (or narrower) on average moves one size.
  const shift = score >= 100 ? 1 : score <= -100 ? -1 : 0;
  const index = Math.min(sizeChart.length - 1, Math.max(0, base + shift));
  return sizeChart[index]!;
}

export const cmToIn = (cm: number) => Math.round((cm / 2.54) * 10) / 10;
