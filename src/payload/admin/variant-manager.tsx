"use client";

import {
  toast,
  useConfig,
  useDocumentInfo,
  useFormFields,
} from "@payloadcms/ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

/*
 * "Variants & stock" panel on the product page: every variant in one table
 * with its swatch, price and stock editable in place, a bulk stock setter,
 * and a generator that creates every missing combination of the chosen
 * options (e.g. 3 colours × 6 sizes) in one go. Talks to Payload's REST API
 * with the staff member's own session, so normal access rules apply.
 */

type VariantType = { id: number; name: string; label: string };
type Option = {
  id: number;
  label: string;
  swatch?: string | null;
  variantType: number;
};
type Variant = {
  id: number;
  options: number[];
  inventory: number | null;
  priceInINR: number | null;
  _status?: "draft" | "published" | null;
};
type Edit = { price?: string; stock?: string };

const LOW_STOCK = 5;

const idOf = (value: unknown): number | null =>
  typeof value === "number"
    ? value
    : typeof value === "object" && value !== null && "id" in value
      ? Number((value as { id: unknown }).id)
      : typeof value === "object" && value !== null && "value" in value
        ? idOf((value as { value: unknown }).value)
        : null;

const comboKey = (ids: number[]) => [...ids].sort((a, b) => a - b).join("-");

const toPaise = (rupees: string) => {
  const n = Number(rupees);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};
const toStock = (value: string) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
};
const rupees = (paise: number | null) =>
  paise == null ? "" : String(paise / 100);

/** Every combination, one option per type: [[a1,b1],[a1,b2],…]. */
const combinations = (groups: number[][]) =>
  groups.reduce<number[][]>(
    (combos, group) => combos.flatMap((c) => group.map((id) => [...c, id])),
    [[]],
  );

function query(params: Record<string, string | number | (string | number)[]>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((v, i) => search.append(`${key}[${i}]`, String(v)));
    } else {
      search.append(key, String(value));
    }
  }
  return search.toString();
}

export function VariantManager() {
  const { id: docId } = useDocumentInfo();
  const productId = docId == null ? null : Number(docId);
  const { config } = useConfig();
  // Relative on purpose: the admin may be on another domain than serverURL.
  const api = config.routes.api;
  const admin = config.routes.admin;
  const router = useRouter();

  const enabled = useFormFields(([f]) => Boolean(f.enableVariants?.value));
  const typeKey = useFormFields(([f]) =>
    ((f.variantTypes?.value as unknown[] | undefined) ?? [])
      .map(idOf)
      .filter((v): v is number => v !== null)
      .join(","),
  );
  const title = useFormFields(([f]) => String(f.title?.value ?? ""));
  const basePrice = useFormFields(
    ([f]) => (f.priceInINR?.value as number | null | undefined) ?? null,
  );
  const typeIds = useMemo(
    () => (typeKey ? typeKey.split(",").map(Number) : []),
    [typeKey],
  );

  const [types, setTypes] = useState<VariantType[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [edits, setEdits] = useState<Record<number, Edit>>({});
  const [picked, setPicked] = useState<Set<number>>(new Set());
  // Defaults to the product's own price until edited.
  const [genPriceInput, setGenPrice] = useState<string | null>(null);
  const genPrice = genPriceInput ?? rupees(basePrice);
  const [genStock, setGenStock] = useState("0");
  const [bulkStock, setBulkStock] = useState("");

  const call = useCallback(
    async (path: string, init?: RequestInit) => {
      const res = await fetch(`${api}${path}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        ...init,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          body?.errors?.[0]?.message ?? `Request failed (${res.status})`,
        );
      }
      return body;
    },
    [api],
  );

  const fetchAll = useCallback(async () => {
    if (productId == null || typeIds.length === 0) return null;
    const [t, o, v] = await Promise.all([
      call(
        `/variantTypes?${query({ "where[id][in]": typeIds, limit: 50, depth: 0 })}`,
      ),
      call(
        `/variantOptions?${query({ "where[variantType][in]": typeIds, limit: 500, depth: 0, sort: "id" })}`,
      ),
      call(
        `/variants?${query({ "where[product][equals]": productId, limit: 500, depth: 0, draft: "true", sort: "id" })}`,
      ),
    ]);
    const typeOrder = new Map(typeIds.map((id, i) => [id, i]));
    return {
      types: (t.docs as VariantType[]).sort(
        (a, b) => (typeOrder.get(a.id) ?? 0) - (typeOrder.get(b.id) ?? 0),
      ),
      options: (o.docs as (Option & { variantType: unknown })[]).map((opt) => ({
        ...opt,
        variantType: idOf(opt.variantType) ?? 0,
      })),
      variants: (v.docs as (Variant & { options: unknown[] })[]).map(
        (variant) => ({
          ...variant,
          options: variant.options
            .map(idOf)
            .filter((x): x is number => x !== null),
        }),
      ),
    };
  }, [call, productId, typeIds]);

  type Loaded = Awaited<ReturnType<typeof fetchAll>>;
  const apply = useCallback((data: Loaded) => {
    setLoading(false);
    if (!data) return;
    setTypes(data.types);
    setOptions(data.options);
    setPicked((current) =>
      current.size > 0 ? current : new Set(data.options.map((x) => x.id)),
    );
    setVariants(data.variants);
    setEdits({});
  }, []);
  const failed = useCallback((error: unknown) => {
    setLoading(false);
    toast.error(`Couldn't load variants: ${(error as Error).message}`);
  }, []);

  const load = useCallback(
    () => fetchAll().then(apply, failed),
    [fetchAll, apply, failed],
  );

  useEffect(() => {
    let current = true;
    fetchAll().then(
      (data) => current && apply(data),
      (error: unknown) => current && failed(error),
    );
    return () => {
      current = false;
    };
  }, [fetchAll, apply, failed]);

  const optionById = useMemo(
    () => new Map(options.map((o) => [o.id, o])),
    [options],
  );
  const existing = useMemo(
    () => new Set(variants.map((v) => comboKey(v.options))),
    [variants],
  );
  const missing = useMemo(() => {
    const groups = types.map((t) =>
      options
        .filter((o) => o.variantType === t.id && picked.has(o.id))
        .map((o) => o.id),
    );
    if (groups.length === 0 || groups.some((g) => g.length === 0)) return [];
    return combinations(groups).filter((c) => !existing.has(comboKey(c)));
  }, [types, options, picked, existing]);

  const labelOf = (ids: number[]) =>
    ids.map((id) => optionById.get(id)?.label ?? `#${id}`).join(" / ");

  async function generate() {
    const price = toPaise(genPrice);
    const stock = toStock(genStock);
    if (productId == null || price == null || price < 100 || stock == null) {
      toast.error("Enter a price of at least ₹1 and a whole-number stock.");
      return;
    }
    setBusy(true);
    let made = 0;
    try {
      for (const combo of missing) {
        await call(`/variants`, {
          method: "POST",
          body: JSON.stringify({
            title: `${title || "Product"} — ${labelOf(combo)}`,
            product: productId,
            options: combo,
            inventory: stock,
            priceInINREnabled: true,
            priceInINR: price,
            _status: "published",
          }),
        });
        made++;
      }
      toast.success(`Created ${made} variant${made === 1 ? "" : "s"}.`);
    } catch (error) {
      toast.error(`Created ${made}, then failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
      await load();
      router.refresh();
    }
  }

  const changed = variants.filter((v) => {
    const e = edits[v.id];
    if (!e) return false;
    return (
      (e.stock !== undefined && toStock(e.stock) !== v.inventory) ||
      (e.price !== undefined && toPaise(e.price) !== v.priceInINR)
    );
  });
  const invalid = changed.some((v) => {
    const e = edits[v.id]!;
    return (
      (e.stock !== undefined && toStock(e.stock) === null) ||
      (e.price !== undefined && (toPaise(e.price) ?? 0) < 100)
    );
  });

  async function saveEdits() {
    setBusy(true);
    let saved = 0;
    try {
      for (const v of changed) {
        const e = edits[v.id]!;
        await call(`/variants/${v.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            ...(e.stock !== undefined && { inventory: toStock(e.stock) }),
            ...(e.price !== undefined && {
              priceInINREnabled: true,
              priceInINR: toPaise(e.price),
            }),
            _status: v._status ?? "published",
          }),
        });
        saved++;
      }
      toast.success(`Saved ${saved} variant${saved === 1 ? "" : "s"}.`);
    } catch (error) {
      toast.error(`Saved ${saved}, then failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
      await load();
      router.refresh();
    }
  }

  const setEdit = (id: number, patch: Edit) =>
    setEdits((all) => ({ ...all, [id]: { ...all[id], ...patch } }));

  if (productId == null) {
    return (
      <div className="sb-vm sb-vm--note">
        Save the product first, then add its variants and stock here.
      </div>
    );
  }
  if (!enabled || typeIds.length === 0) {
    return (
      <div className="sb-vm sb-vm--note">
        Tick <strong>Enable variants</strong> and choose{" "}
        <strong>Variant types</strong> above (e.g. Color and Size), then save.
        Variants and stock are managed here.
      </div>
    );
  }

  const total = variants.reduce((s, v) => s + (v.inventory ?? 0), 0);

  return (
    <div className="sb-vm">
      <header className="sb-vm__header">
        <div>
          <h3 className="sb-vm__title">Variants &amp; stock</h3>
          <p className="sb-vm__meta">
            {loading
              ? "Loading…"
              : `${variants.length} variants · ${total} units in stock`}
          </p>
        </div>
        <div className="sb-vm__bulk">
          <input
            className="sb-vm__input"
            inputMode="numeric"
            placeholder="Stock"
            value={bulkStock}
            onChange={(e) => setBulkStock(e.target.value)}
            aria-label="Stock for every variant"
          />
          <button
            type="button"
            className="sb-vm__btn"
            disabled={busy || toStock(bulkStock) === null}
            onClick={() =>
              setEdits((all) =>
                Object.fromEntries(
                  variants.map((v) => [
                    v.id,
                    { ...all[v.id], stock: bulkStock },
                  ]),
                ),
              )
            }
          >
            Set stock for all
          </button>
        </div>
      </header>

      {variants.length > 0 && (
        <div className="sb-vm__table-wrap">
          <table className="sb-vm__table">
            <thead>
              <tr>
                <th>Variant</th>
                <th>Price (₹)</th>
                <th>Stock</th>
                <th>Status</th>
                <th aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => {
                const e = edits[v.id] ?? {};
                const stock = toStock(e.stock ?? String(v.inventory ?? 0));
                const tone =
                  stock == null
                    ? "grey"
                    : stock <= 0
                      ? "red"
                      : stock <= LOW_STOCK
                        ? "orange"
                        : "green";
                return (
                  <tr key={v.id}>
                    <td>
                      <span className="sb-vm__variant">
                        {v.options.map((id) => {
                          const o = optionById.get(id);
                          return o?.swatch ? (
                            <span
                              key={id}
                              className="sb-vm__swatch"
                              style={{ background: o.swatch }}
                              title={o.label}
                            />
                          ) : null;
                        })}
                        {labelOf(v.options)}
                      </span>
                    </td>
                    <td>
                      <input
                        className="sb-vm__input"
                        inputMode="decimal"
                        value={e.price ?? rupees(v.priceInINR)}
                        onChange={(ev) =>
                          setEdit(v.id, { price: ev.target.value })
                        }
                        aria-label={`Price for ${labelOf(v.options)}`}
                      />
                    </td>
                    <td>
                      <input
                        className="sb-vm__input"
                        inputMode="numeric"
                        value={e.stock ?? String(v.inventory ?? 0)}
                        onChange={(ev) =>
                          setEdit(v.id, { stock: ev.target.value })
                        }
                        aria-label={`Stock for ${labelOf(v.options)}`}
                      />
                    </td>
                    <td>
                      <span className={`sb-badge sb-badge--${tone}`}>
                        <span className="sb-badge__dot" aria-hidden />
                        {stock == null
                          ? "Invalid"
                          : stock <= 0
                            ? "Sold out"
                            : stock <= LOW_STOCK
                              ? "Low"
                              : "In stock"}
                      </span>
                      {v._status === "draft" && (
                        <span className="sb-vm__draft">Draft</span>
                      )}
                    </td>
                    <td>
                      <a
                        className="sb-vm__link"
                        href={`${admin}/collections/variants/${v.id}`}
                      >
                        Edit
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {changed.length > 0 && (
        <div className="sb-vm__savebar">
          <span>
            {changed.length} unsaved change{changed.length === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            className="sb-vm__btn"
            onClick={() => setEdits({})}
            disabled={busy}
          >
            Discard
          </button>
          <button
            type="button"
            className="sb-vm__btn sb-vm__btn--primary"
            onClick={saveEdits}
            disabled={busy || invalid}
          >
            {busy ? "Saving…" : "Save stock & prices"}
          </button>
        </div>
      )}

      <section className="sb-vm__gen">
        <h4 className="sb-vm__subtitle">Add variants</h4>
        <p className="sb-vm__meta">
          Pick the options to sell; every missing combination is created.
        </p>
        {types.map((t) => (
          <fieldset key={t.id} className="sb-vm__group">
            <legend>{t.label}</legend>
            {options
              .filter((o) => o.variantType === t.id)
              .map((o) => (
                <label key={o.id} className="sb-vm__chip">
                  <input
                    type="checkbox"
                    checked={picked.has(o.id)}
                    onChange={(ev) =>
                      setPicked((cur) => {
                        const next = new Set(cur);
                        if (ev.target.checked) next.add(o.id);
                        else next.delete(o.id);
                        return next;
                      })
                    }
                  />
                  {o.swatch && (
                    <span
                      className="sb-vm__swatch"
                      style={{ background: o.swatch }}
                    />
                  )}
                  {o.label}
                </label>
              ))}
            {options.every((o) => o.variantType !== t.id) && (
              <span className="sb-vm__meta">
                No options yet: add them under Products → Variant options.
              </span>
            )}
          </fieldset>
        ))}
        <div className="sb-vm__gen-row">
          <label className="sb-vm__field">
            Price (₹)
            <input
              className="sb-vm__input"
              inputMode="decimal"
              value={genPrice}
              onChange={(e) => setGenPrice(e.target.value)}
            />
          </label>
          <label className="sb-vm__field">
            Stock each
            <input
              className="sb-vm__input"
              inputMode="numeric"
              value={genStock}
              onChange={(e) => setGenStock(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="sb-vm__btn sb-vm__btn--primary"
            disabled={busy || missing.length === 0}
            onClick={generate}
          >
            {busy
              ? "Creating…"
              : missing.length === 0
                ? "All combinations exist"
                : `Create ${missing.length} variant${missing.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </section>
    </div>
  );
}
