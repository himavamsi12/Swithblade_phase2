/**
 * Marker for sample records created by `pnpm seed:demo`, stored in a
 * record's `metadata`. Background jobs skip tagged orders, and
 * `pnpm seed:demo --remove` deletes exactly the tagged records.
 */
export const DEMO_METADATA = { demo: true } as const;

export function isDemo(metadata: unknown): boolean {
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    (metadata as { demo?: unknown }).demo === true
  );
}
