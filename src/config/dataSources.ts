/**
 * Single source of truth for all external data providers and signal switches.
 *
 * The brief is explicit: "Context signals must be configurable without changing
 * the codebase — a different city or data source should slot in as a
 * configuration, not a rewrite."
 *
 * Anything env-driven that influences provider selection or signal weighting
 * should live here, not be sprinkled across services.
 */

const DEFAULT_CITY =
  process.env.EXPO_PUBLIC_DEFAULT_CITY?.trim() || "Locating…";

const PUSH_COOLDOWN_MIN = Number.parseInt(
  process.env.EXPO_PUBLIC_PUSH_COOLDOWN_MIN ?? "",
  10,
);

const QUIET_RATIO_THRESHOLD = Number.parseFloat(
  process.env.EXPO_PUBLIC_PUSH_QUIET_RATIO ?? "",
);

const DISTANCE_THRESHOLD_M = Number.parseInt(
  process.env.EXPO_PUBLIC_PUSH_DISTANCE_M ?? "",
  10,
);

export const dataSources = {
  city: {
    default: DEFAULT_CITY,
  },
  weather: {
    provider: "openweather" as const,
    apiKey: process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY?.trim() || "",
    enabled: Boolean(process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY?.trim()),
  },
  events: {
    provider: "ticketmaster" as const,
    apiKey: process.env.EXPO_PUBLIC_TICKETMASTER_API_KEY?.trim() || "",
    enabled: Boolean(process.env.EXPO_PUBLIC_TICKETMASTER_API_KEY?.trim()),
  },
  merchants: {
    provider: "overpass" as const,
    endpoints: [
      "https://overpass-api.de/api/interpreter",
      "https://overpass.kumi.systems/api/interpreter",
    ],
    radiiMeters: [600, 1500, 3000] as const,
  },
  demand: {
    provider: "payone" as const,
    liveBaseUrl:
      process.env.EXPO_PUBLIC_PAYONE_API_BASE_URL?.trim() || "",
    enabled: true,
  },
  offerEngine: {
    provider: "ollama" as const,
    model: process.env.EXPO_PUBLIC_OLLAMA_MODEL?.trim() || "gemma3:4b",
    apiBaseUrlOverride:
      process.env.EXPO_PUBLIC_OFFER_API_BASE_URL?.trim() || "",
  },
  pushRules: {
    cooldownMinutes:
      Number.isFinite(PUSH_COOLDOWN_MIN) && PUSH_COOLDOWN_MIN > 0
        ? PUSH_COOLDOWN_MIN
        : 15,
    minQuietRatio:
      Number.isFinite(QUIET_RATIO_THRESHOLD) && QUIET_RATIO_THRESHOLD >= 0
        ? QUIET_RATIO_THRESHOLD
        : 0.25,
    maxDistanceMeters:
      Number.isFinite(DISTANCE_THRESHOLD_M) && DISTANCE_THRESHOLD_M > 0
        ? DISTANCE_THRESHOLD_M
        : 600,
    quietHours: { startHour: 22, endHour: 7 },
  },
} as const;

export type SignalProviderName =
  | "openweather"
  | "ticketmaster"
  | "overpass"
  | "payone"
  | "ollama";
