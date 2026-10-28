import type { Field } from "payload";
import { describe, expect, it } from "vitest";
import { staffOnly } from "./staff-only";

const read = (fields: Field[], path: number[]) => {
  let field: unknown = { fields };
  for (const i of path) {
    const f = field as { fields?: Field[]; tabs?: { fields: Field[] }[] };
    field = f.fields ? f.fields[i] : f.tabs![i];
  }
  return (field as { access?: { read?: unknown } }).access?.read;
};

describe("staffOnly", () => {
  const fields: Field[] = [
    { name: "title", type: "text" },
    { name: "inventory", type: "number" },
    { type: "row", fields: [{ name: "sku", type: "text" }] },
    {
      type: "tabs",
      tabs: [
        { label: "Stock", fields: [{ name: "inventory", type: "number" }] },
      ],
    },
  ];
  const locked = staffOnly(fields, ["inventory", "sku"]);

  it("locks named fields, including inside rows and tabs", () => {
    expect(read(locked, [1])).toBeTypeOf("function");
    expect(read(locked, [2, 0])).toBeTypeOf("function");
    expect(read(locked, [3, 0, 0])).toBeTypeOf("function");
  });

  it("leaves other fields public", () => {
    expect(read(locked, [0])).toBeUndefined();
  });

  it("lets staff read and hides from everyone else", () => {
    const access = read(locked, [1]) as (args: unknown) => boolean;
    expect(access({ req: { user: { collection: "users" } } })).toBe(true);
    expect(access({ req: { user: null } })).toBe(false);
  });
});
