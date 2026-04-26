import type { DemoContext } from "../data/demoData";

export type PayoneDemandSource = "payone-live" | "payone-simulated";

export type PayoneDemandSignal = {
  transactionDensity: number;
  normalTransactionDensity: number;
  currentDemand: DemoContext["merchant"]["currentDemand"];
  quietRatio: number;
  generatedAt: string;
  source: PayoneDemandSource;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function parseHour(hourText: string) {
  const match = hourText.match(/^(\d{1,2})/);
  if (!match) return 12;
  return clamp(Number(match[1]), 0, 23);
}

function hashToUnit(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return (Math.abs(h) % 1000) / 1000;
}

function classifyDemand(
  current: number,
  normal: number,
): DemoContext["merchant"]["currentDemand"] {
  const ratio = current / normal;
  if (ratio < 0.72) return "low";
  if (ratio > 1.15) return "high";
  return "normal";
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 4500,
) {
  return await Promise.race([
    fetch(url, init),
    new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Payone request timeout after ${timeoutMs}ms`)),
        timeoutMs,
      );
    }),
  ]);
}

async function tryRemotePayone(
  context: DemoContext,
): Promise<PayoneDemandSignal | null> {
  const base = process.env.EXPO_PUBLIC_PAYONE_API_BASE_URL?.trim();
  if (!base) return null;
  try {
    const url = `${base.replace(/\/+$/, "")}/api/density?merchant=${encodeURIComponent(context.merchant.id)}`;
    const response = await fetchWithTimeout(url, { method: "GET" });
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<PayoneDemandSignal>;
    if (
      typeof data.transactionDensity !== "number" ||
      typeof data.normalTransactionDensity !== "number"
    ) {
      return null;
    }
    const currentDemand =
      data.currentDemand === "low" ||
      data.currentDemand === "high" ||
      data.currentDemand === "normal"
        ? data.currentDemand
        : classifyDemand(
            data.transactionDensity,
            data.normalTransactionDensity,
          );
    return {
      transactionDensity: data.transactionDensity,
      normalTransactionDensity: data.normalTransactionDensity,
      currentDemand,
      quietRatio:
        typeof data.quietRatio === "number"
          ? data.quietRatio
          : Number(
              (
                1 -
                data.transactionDensity / data.normalTransactionDensity
              ).toFixed(3),
            ),
      generatedAt:
        typeof data.generatedAt === "string"
          ? data.generatedAt
          : new Date().toISOString(),
      source: "payone-live",
    };
  } catch {
    return null;
  }
}

function simulatePayoneDensity(context: DemoContext): PayoneDemandSignal {
  const baseNormal = Math.max(20, context.merchant.normalTransactionDensity);
  const hour = parseHour(context.time.hour);
  const weatherPenalty =
    context.weather.condition === "Rain"
      ? -0.18
      : context.weather.condition === "Cloudy"
        ? -0.08
        : 0.05;
  const eventBoost = context.time.period.toLowerCase().includes("event")
    ? 0.14
    : 0;
  const timeShape =
    hour >= 11 && hour <= 13
      ? -0.1
      : hour >= 17 && hour <= 20
        ? 0.08
        : -0.03;
  const localNoise =
    (hashToUnit(`${context.merchant.id}-${context.time.day}-${hour}`) - 0.5) *
    0.16;
  const realtimeNoise = (Math.random() - 0.5) * 0.12;
  const minutePulse =
    (hashToUnit(`${Date.now()}-${context.merchant.id}`) - 0.5) * 0.08;

  const baselineShift =
    (Math.random() - 0.5) * 8 +
    (eventBoost > 0 ? 3 : 0) +
    (weatherPenalty < 0 ? -2 : 2);
  const normal = Math.max(18, Math.round(baseNormal + baselineShift));
  const ratio = clamp(
    1 +
      weatherPenalty +
      eventBoost +
      timeShape +
      localNoise +
      realtimeNoise +
      minutePulse,
    0.28,
    1.45,
  );
  const transactionDensity = Math.max(5, Math.round(normal * ratio));
  const currentDemand = classifyDemand(transactionDensity, normal);

  return {
    transactionDensity,
    normalTransactionDensity: normal,
    currentDemand,
    quietRatio: Number((1 - transactionDensity / normal).toFixed(3)),
    generatedAt: new Date().toISOString(),
    source: "payone-simulated",
  };
}

/**
 * Returns a Payone-style transaction-density demand signal.
 * - If `EXPO_PUBLIC_PAYONE_API_BASE_URL` is set and reachable, use the live feed.
 * - Otherwise fall back to a deterministic simulator that reacts to weather,
 *   time-of-day, events, and merchant baseline. Same shape, same interface.
 */
export async function fetchPayoneDensity(
  context: DemoContext,
): Promise<PayoneDemandSignal> {
  // Tiny artificial wait so the network feel is consistent in demos.
  await new Promise((resolve) => setTimeout(resolve, 220));
  const remote = await tryRemotePayone(context);
  if (remote) return remote;
  return simulatePayoneDensity(context);
}
