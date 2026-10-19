import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge doesn't know the custom type-scale utilities from
 * globals.css, and would treat `text-body-3` as a colour and drop it next to
 * `text-black`. Registering them as font sizes keeps both.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["h1", "h2", "h3", "h4", "h5", "h6", "h7"] },
        { text: ["body-1", "body-2", "body-3", "body-4"] },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
