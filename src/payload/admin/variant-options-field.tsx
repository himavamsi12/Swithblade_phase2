import { VariantOptionsSelector } from "@payloadcms/plugin-ecommerce/rsc";
import type { ComponentProps } from "react";
import { VariantOptionsPicker } from "./variant-options-picker";

type Props = ComponentProps<typeof VariantOptionsSelector>;

/**
 * The plugin's variant options picker looks up the variant's product with
 * `findByID`, which throws "Not Found" on a new variant that has no product
 * yet (Inventory → Create new) and crashes the whole page. Use our own
 * picker until the variant is saved against a product that exists.
 */
export async function VariantOptionsField(props: Props) {
  const productId = (props.data as { product?: unknown } | undefined)?.product;
  const productsSlug =
    (props.field.custom?.productsSlug as string | undefined) ?? "products";

  const product =
    typeof productId === "number" || typeof productId === "string"
      ? await props.req.payload.findByID({
          collection: productsSlug as "products",
          id: productId,
          depth: 0,
          draft: true,
          disableErrors: true,
          select: {},
          user: props.user,
        })
      : null;

  if (!product) return <VariantOptionsPicker path={props.path} />;
  return <VariantOptionsSelector {...props} />;
}
