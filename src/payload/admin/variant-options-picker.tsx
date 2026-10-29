"use client";

import { FieldLabel, useConfig, useField, useFormFields } from "@payloadcms/ui";
import { useEffect, useId, useState } from "react";

type Option = { id: number; label: string; variantType: number };
type Type = { id: number; label: string; options: Option[] };

/**
 * Variant options picker for a variant that has no product yet (Inventory →
 * Create new). Watches the Product field and, once one is chosen, loads its
 * variant types (e.g. Color, Size) and offers one select per type. Saved
 * variants use the plugin's own picker.
 */
export function VariantOptionsPicker({ path }: { path: string }) {
  const { config } = useConfig();
  const api = config.routes.api;
  const productId = useFormFields(([fields]) => fields.product?.value) as
    number | string | null | undefined;
  const { value, setValue } = useField<number[]>({ path });
  // Keyed by product, so a different product's options never show.
  const [loaded, setLoaded] = useState<{
    productId: number | string;
    types: Type[] | null;
    error: string | null;
  } | null>(null);
  const current = loaded?.productId === productId ? loaded : null;
  const types = current?.types ?? null;
  const error = current?.error ?? null;
  const baseId = useId();

  useEffect(() => {
    if (productId == null || productId === "") return;
    let cancelled = false;
    const setTypes = (types: Type[]) => {
      if (!cancelled) setLoaded({ productId, types, error: null });
    };
    const get = async (url: string) => {
      const res = await fetch(`${api}${url}`, { credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    };
    (async () => {
      try {
        const product = await get(
          `/products/${productId}?depth=0&draft=true&select[variantTypes]=true`,
        );
        const typeIds: number[] = product.variantTypes ?? [];
        if (typeIds.length === 0) {
          setTypes([]);
          return;
        }
        const ids = typeIds.join(",");
        const [typeDocs, optionDocs] = await Promise.all([
          get(`/variantTypes?where[id][in]=${ids}&depth=0&limit=50`),
          get(
            `/variantOptions?where[variantType][in]=${ids}&depth=0&limit=500&sort=_variantOptions_options_order`,
          ),
        ]);
        setTypes(
          typeIds.map((id) => {
            const t = typeDocs.docs.find((d: { id: number }) => d.id === id);
            return {
              id,
              label: t?.label || t?.name || "Option",
              options: optionDocs.docs.filter(
                (o: Option) => o.variantType === id,
              ),
            };
          }),
        );
      } catch {
        if (!cancelled) {
          setLoaded({
            productId,
            types: null,
            error: "Couldn't load this product's options.",
          });
        }
      }
    })();
    // A different product has different options.
    setValue([]);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the product changes
  }, [api, productId]);

  if (productId == null || productId === "") {
    return (
      <div className="sb-vm sb-vm--note">
        Choose the <strong>Product</strong> on the right first; its colour and
        size options appear here. Quicker for several at once: open the product
        and use its <strong>Variants &amp; stock</strong> panel.
      </div>
    );
  }
  if (error) return <div className="sb-vm sb-vm--note">{error}</div>;
  if (!types) return <div className="sb-vm sb-vm--note">Loading options…</div>;
  if (types.length === 0) {
    return (
      <div className="sb-vm sb-vm--note">
        This product has no variant types. Open the product, tick{" "}
        <strong>Enable variants</strong>, choose its types (e.g. Color and Size)
        and save.
      </div>
    );
  }

  const selected = value ?? [];
  const pick = (type: Type, optionId: number | null) => {
    const others = selected.filter(
      (id) => !type.options.some((o) => o.id === id),
    );
    setValue(optionId == null ? others : [...others, optionId]);
  };

  return (
    <div className="field-type">
      {types.map((type) => {
        const id = `${baseId}-${type.id}`;
        const current = type.options.find((o) => selected.includes(o.id));
        return (
          <div key={type.id} style={{ marginBottom: 16 }}>
            <FieldLabel htmlFor={id} label={type.label} required />
            <select
              id={id}
              value={current?.id ?? ""}
              onChange={(e) =>
                pick(type, e.target.value ? Number(e.target.value) : null)
              }
              style={{
                width: "100%",
                height: 40,
                padding: "0 12px",
                border: "1px solid var(--theme-elevation-150)",
                borderRadius: "var(--style-radius-s)",
                background: "var(--theme-input-bg)",
                color: "var(--theme-text)",
              }}
            >
              <option value="">Choose {type.label.toLowerCase()}…</option>
              {type.options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}
