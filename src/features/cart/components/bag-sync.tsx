"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { syncBag } from "../store";

/** Re-reads the saved bag at most this often when the tab regains focus. */
const FOCUS_INTERVAL_MS = 30_000;

/**
 * Keeps the bag in step with the shopper's account: on page load, on opening
 * the bag (so checkout sees the latest), and when returning to the tab after
 * using another device. Renders nothing.
 */
export function BagSync() {
  const onBag = usePathname() === "/cart";

  useEffect(() => {
    void syncBag();
  }, [onBag]);

  useEffect(() => {
    let last = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - last < FOCUS_INTERVAL_MS) return;
      last = Date.now();
      void syncBag();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return null;
}

/**
 * Syncs once when it mounts. The account page renders it with a `key` for
 * the signed-in customer, so signing in or out (which both land there)
 * syncs straight away.
 */
export function SyncBagNow() {
  useEffect(() => {
    void syncBag();
  }, []);
  return null;
}
