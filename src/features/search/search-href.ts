import type { Route } from "next";

/** Link to the search results page for `term`. */
export const searchHref = (term: string) =>
  `/search?${new URLSearchParams({ q: term })}` as Route;
