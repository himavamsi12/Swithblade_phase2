"use client";

import { createContext, useContext, useState } from "react";
import type { ProductColor } from "../types";
import { ProductGallery } from "./product-gallery";

/*
 * The product page's chosen colour, shared by the colour picker and the
 * gallery, which sit in different columns of the page.
 */

type ColorState = {
  colors: ProductColor[];
  index: number;
  setIndex: (index: number) => void;
};

const ColorContext = createContext<ColorState | null>(null);

export function ProductColorProvider({
  colors,
  children,
}: {
  colors: ProductColor[];
  children: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);
  return (
    <ColorContext value={{ colors, index, setIndex }}>{children}</ColorContext>
  );
}

export function useProductColor() {
  const state = useContext(ColorContext);
  if (!state) throw new Error("useProductColor needs a ProductColorProvider");
  return state;
}

/** The gallery for the chosen colour, or every photo if it has none. */
export function ColorGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const { colors, index } = useProductColor();
  const color = colors[index];
  const gallery = color?.gallery?.length ? color.gallery : images;
  // Remount on colour change so the viewer starts at the first photo.
  return (
    <ProductGallery key={color?.name ?? ""} images={gallery} name={name} />
  );
}
