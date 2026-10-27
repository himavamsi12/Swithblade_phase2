import "server-only";
import { currencies, type Rates } from "./currencies";

const RATES_URL = "https://open.er-api.com/v6/latest/INR";

/** Upstream updates once a day; refetching every few hours is plenty. */
const RATES_REVALIDATE_SECONDS = 6 * 60 * 60;

/** Latest INR-based exchange rates, or null if the provider is unavailable. */
export async function getRates(): Promise<Rates | null> {
  try {
    const res = await fetch(RATES_URL, {
      next: { revalidate: RATES_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    const raw = (body as { rates?: Record<string, unknown> } | null)?.rates;
    if (!raw) return null;

    const rates = {} as Rates;
    for (const { code } of currencies) {
      const rate = raw[code];
      if (typeof rate !== "number" || !(rate > 0)) return null;
      rates[code] = rate;
    }
    return rates;
  } catch {
    return null;
  }
}
