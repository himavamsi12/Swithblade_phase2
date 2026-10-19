"use client";

import { useSyncExternalStore } from "react";

/**
 * A small value kept in localStorage, shared by every component that reads
 * it and synced across browser tabs. Used for the bag and the wishlist.
 *
 * `parse` validates whatever is stored and must return `empty` for anything
 * malformed, so a bad or outdated value can never break the page.
 */
export function createLocalStore<T>(
  key: string,
  parse: (value: unknown) => T,
  empty: T,
) {
  let value = empty;
  let loaded = false;
  const listeners = new Set<() => void>();

  const read = (): T => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? empty : parse(JSON.parse(raw));
    } catch {
      return empty;
    }
  };

  const get = (): T => {
    if (!loaded && typeof window !== "undefined") {
      value = read();
      loaded = true;
    }
    return value;
  };

  const set = (next: T) => {
    value = next;
    loaded = true;
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Storage full or blocked (private mode): still works for this visit.
    }
    listeners.forEach((l) => l());
  };

  const subscribe = (listener: () => void) => {
    get();
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        value = read();
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  };

  /** Current value; `empty` during server render and hydration. */
  const useValue = () => useSyncExternalStore(subscribe, get, () => empty);

  return { get, set, useValue };
}

const subscribeNoop = () => () => {};

/**
 * False during server render and hydration, true after. Tells "not loaded
 * yet" apart from a genuinely empty store, so empty states don't flash.
 */
export const useIsClient = () =>
  useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
