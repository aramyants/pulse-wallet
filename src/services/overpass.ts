import type { LatLng } from "../data/merchantCatalog";

/**
 * Real merchant lookup via the public OpenStreetMap Overpass API (no API key).
 *
 * In live mode this is the only source of merchant identity. We support a
 * broad set of categories so the wallet works in any city, with or without
 * events, weather, or specific anchor venues — food/drink, entertainment,
 * culture, retail, and leisure all flow through the same generative pipeline.
 */

export type OsmCategoryGroup =
  | "food"
  | "drink"
  | "quick_service"
  | "entertainment"
  | "culture"
  | "retail"
  | "leisure";

export type OsmAmenity =
  // food / drink
  | "cafe"
  | "coffee_shop"
  | "restaurant"
  | "bakery"
  | "fast_food"
  | "bar"
  | "pub"
  | "ice_cream"
  | "deli"
  // entertainment
  | "cinema"
  | "theatre"
  | "nightclub"
  | "arts_centre"
  // culture
  | "museum"
  | "gallery"
  | "library"
  // retail (mapped from shop=*)
  | "supermarket"
  | "convenience"
  | "books"
  | "clothes"
  | "florist"
  | "gift"
  // leisure / outdoors (mapped from leisure=* / tourism=*)
  | "park"
  | "fitness_centre"
  | "viewpoint"
  | "attraction";

export type OsmMerchant = {
  id: string;
  osmId: number;
  name: string;
  amenity: OsmAmenity;
  group: OsmCategoryGroup;
  category: string;
  coords: LatLng;
  address?: string;
  distanceMeters: number;
};

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

type ZyteExtractResponse = {
  statusCode?: number;
  httpResponseBody?: string;
};

const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const ZYTE_EXTRACT_ENDPOINT = "https://api.zyte.com/v1/extract";
const REQUEST_TIMEOUT_MS = 8_000;
const OVERPASS_QUERY_TIMEOUT_SECONDS = 7;
const NON_RETRYABLE_STATUS_CODES = new Set([400, 404, 406]);
const BLACKLISTED_ENDPOINTS = new Set<string>();
const ENDPOINT_COOLDOWN_MS = 60_000;
const endpointCooldownUntil = new Map<string, number>();
let loggedProxyMode = false;

const AMENITY_META: Record<
  OsmAmenity,
  { group: OsmCategoryGroup; label: string }
> = {
  cafe: { group: "drink", label: "Café" },
  coffee_shop: { group: "drink", label: "Café" },
  restaurant: { group: "food", label: "Restaurant" },
  bakery: { group: "food", label: "Bakery" },
  fast_food: { group: "quick_service", label: "Quick service" },
  bar: { group: "drink", label: "Bar" },
  pub: { group: "drink", label: "Pub" },
  ice_cream: { group: "quick_service", label: "Ice cream" },
  deli: { group: "quick_service", label: "Deli" },

  cinema: { group: "entertainment", label: "Cinema" },
  theatre: { group: "entertainment", label: "Theatre" },
  nightclub: { group: "entertainment", label: "Club" },
  arts_centre: { group: "entertainment", label: "Arts centre" },

  museum: { group: "culture", label: "Museum" },
  gallery: { group: "culture", label: "Gallery" },
  library: { group: "culture", label: "Library" },

  supermarket: { group: "retail", label: "Supermarket" },
  convenience: { group: "retail", label: "Convenience" },
  books: { group: "retail", label: "Bookstore" },
  clothes: { group: "retail", label: "Boutique" },
  florist: { group: "retail", label: "Florist" },
  gift: { group: "retail", label: "Gift shop" },

  park: { group: "leisure", label: "Park" },
  fitness_centre: { group: "leisure", label: "Gym" },
  viewpoint: { group: "leisure", label: "Viewpoint" },
  attraction: { group: "leisure", label: "Attraction" },
};

const OSM_AMENITY_VALUES = new Set<string>(Object.keys(AMENITY_META));

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function haversineMeters(a: LatLng, b: LatLng) {
  const earthRadius = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Math.round(earthRadius * c);
}

function buildQuery(coords: LatLng, radiusMeters: number) {
  const around = `(around:${radiusMeters},${coords.latitude},${coords.longitude})`;
  // `nwr` is Overpass QL shorthand for "node OR way OR relation" — it
  // collapses what would otherwise be 3 sub-queries per selector into 1,
  // which is critical because the main mirror returns HTTP 406 if the
  // assembled query is too complex. `out center` returns a centroid for
  // ways/relations so polygons (cinemas, supermarkets, museums…) become
  // usable points like nodes.
  const lines = [
    `nwr["amenity"~"^(cafe|restaurant|bakery|fast_food|bar|pub|ice_cream|deli|nightclub|cinema|theatre|arts_centre|library)$"]["name"]${around};`,
    `nwr["tourism"~"^(museum|gallery|attraction|viewpoint)$"]["name"]${around};`,
    `nwr["shop"~"^(bakery|coffee|supermarket|convenience|books|clothes|florist|gift|deli)$"]["name"]${around};`,
    `nwr["leisure"~"^(park|fitness_centre)$"]["name"]${around};`,
  ];
  return `[out:json][timeout:${OVERPASS_QUERY_TIMEOUT_SECONDS}];\n(\n  ${lines.join("\n  ")}\n);\nout center 80;`;
}

function buildLiteQuery(coords: LatLng, radiusMeters: number) {
  const around = `(around:${radiusMeters},${coords.latitude},${coords.longitude})`;
  const lines = [
    `nwr["amenity"~"^(cafe|restaurant|bakery|fast_food|bar|pub)$"]["name"]${around};`,
    `nwr["shop"~"^(supermarket|convenience|bakery|coffee)$"]["name"]${around};`,
    `nwr["tourism"~"^(museum|gallery|attraction)$"]["name"]${around};`,
  ];
  return `[out:json][timeout:${OVERPASS_QUERY_TIMEOUT_SECONDS}];\n(\n  ${lines.join("\n  ")}\n);\nout center 60;`;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
) {
  return await Promise.race([
    fetch(url, init),
    new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Overpass timeout after ${timeoutMs}ms`)),
        timeoutMs,
      );
    }),
  ]);
}

function encodeBasicAuth(input: string): string {
  const nodeBuffer = (globalThis as { Buffer?: { from: (...args: any[]) => { toString: (encoding?: string) => string } } }).Buffer;
  const base64 =
    typeof btoa === "function"
      ? btoa(input)
      : nodeBuffer
        ? nodeBuffer.from(input, "utf8").toString("base64")
        : "";
  if (!base64) throw new Error("Unable to encode auth header");
  return base64;
}

function decodeBase64(input: string): string {
  const nodeBuffer = (globalThis as { Buffer?: { from: (...args: any[]) => { toString: (encoding?: string) => string } } }).Buffer;
  if (typeof atob === "function") return atob(input);
  if (nodeBuffer) {
    return nodeBuffer.from(input, "base64").toString("utf8");
  }
  throw new Error("Unable to decode Zyte response body");
}

async function requestOverpassViaZyte(
  endpoint: string,
  body: string,
  zyteApiKey: string,
): Promise<Response> {
  const encodedBody = `data=${encodeURIComponent(body)}`;
  const targetUrl = `${endpoint}?${encodedBody}`;
  const authorization = `Basic ${encodeBasicAuth(`${zyteApiKey}:`)}`;

  const response = await fetchWithTimeout(ZYTE_EXTRACT_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      url: targetUrl,
      httpResponseBody: true,
    }),
  }, 20_000);

  if (!response.ok) return response;

  const data = (await response.json()) as ZyteExtractResponse;
  const status = typeof data.statusCode === "number" ? data.statusCode : 502;
  const text =
    typeof data.httpResponseBody === "string"
      ? decodeBase64(data.httpResponseBody)
      : "";

  return new Response(text, {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

async function requestOverpass(endpoint: string, body: string): Promise<Response> {
  const zyteApiKey = process.env.EXPO_PUBLIC_ZYTE_API_KEY?.trim();
  if (__DEV__ && !loggedProxyMode) {
    loggedProxyMode = true;
    console.log(
      zyteApiKey
        ? "[overpass] proxy mode: Zyte enabled"
        : "[overpass] proxy mode: direct (no EXPO_PUBLIC_ZYTE_API_KEY)",
    );
  }
  if (zyteApiKey) {
    return requestOverpassViaZyte(endpoint, body, zyteApiKey);
  }

  const encodedBody = `data=${encodeURIComponent(body)}`;
  const attempts =
    endpoint.includes("overpass-api.de")
      ? [
          () =>
            fetchWithTimeout(`${endpoint}?${encodedBody}`, {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
            }),
          () =>
            fetchWithTimeout(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json",
              },
              body: encodedBody,
            }),
        ]
      : [
          () =>
            fetchWithTimeout(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json",
              },
              body: encodedBody,
            }),
          () =>
            fetchWithTimeout(`${endpoint}?${encodedBody}`, {
              method: "GET",
              headers: {
                Accept: "application/json",
              },
            }),
        ];

  let lastResponse: Response | null = null;
  let lastError: unknown = null;

  for (const attempt of attempts) {
    try {
      const response = await attempt();
      if (response.ok) return response;
      lastResponse = response;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastResponse) return lastResponse;
  if (lastError instanceof Error) throw lastError;
  throw new Error(`Overpass request failed for ${endpoint}`);
}

function resolveAmenity(tags: Record<string, string>): OsmAmenity | null {
  const candidates = [
    tags.amenity,
    tags.tourism,
    tags.leisure,
    // shop tag mapping: shop=bakery → bakery, shop=coffee → cafe, etc.
    tags.shop === "coffee" ? "cafe" : tags.shop,
  ].filter((value): value is string => typeof value === "string");

  for (const value of candidates) {
    if (OSM_AMENITY_VALUES.has(value)) return value as OsmAmenity;
  }
  return null;
}

function elementToMerchant(
  element: OverpassElement,
  user: LatLng,
): OsmMerchant | null {
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  const tags = element.tags ?? {};
  const name = tags.name?.trim();
  if (!name) return null;

  const amenity = resolveAmenity(tags);
  if (!amenity) return null;

  const meta = AMENITY_META[amenity];
  const coords: LatLng = { latitude: lat, longitude: lon };
  const street = tags["addr:street"];
  const houseNumber = tags["addr:housenumber"];
  const address = street
    ? `${street}${houseNumber ? ` ${houseNumber}` : ""}`.trim()
    : undefined;

  return {
    id: `osm-${element.id}`,
    osmId: element.id,
    name,
    amenity,
    group: meta.group,
    category: meta.label,
    coords,
    address,
    distanceMeters: Math.max(5, haversineMeters(user, coords)),
  };
}

const DEFAULT_RADIUSES = [800, 2000, 5000];

/**
 * Find the closest real merchants from OSM. Tries an expanding radius until
 * at least one named merchant is found. Returns sorted ascending by distance.
 *
 * On failure we throw with a clear message; on simply-empty results we return
 * `[]` so callers can render an honest "no merchants yet" empty state instead
 * of mistakenly showing a network error.
 */
export async function findNearbyMerchants(
  user: LatLng,
  options: { maxResults?: number } = {},
): Promise<OsmMerchant[]> {
  const maxResults = options.maxResults ?? 8;
  const now = Date.now();
  let lastError: unknown = null;
  let lastEndpointStatus: { endpoint: string; ok: boolean; raw?: number } | null =
    null;
  const activeEndpoints = OVERPASS_ENDPOINTS.filter(
    (endpoint) =>
      !BLACKLISTED_ENDPOINTS.has(endpoint) &&
      (endpointCooldownUntil.get(endpoint) ?? 0) <= now,
  );
  const endpoints = activeEndpoints.length > 0 ? activeEndpoints : OVERPASS_ENDPOINTS;

  for (const radius of DEFAULT_RADIUSES) {
    const queryBodies = [buildQuery(user, radius), buildLiteQuery(user, radius)];
    let hadSuccessfulResponse = false;
    const failures: string[] = [];

    for (const body of queryBodies) {
      for (const endpoint of endpoints) {
        try {
          // Android/RN can disagree with node/curl about which transport shape
          // a mirror accepts. Try a small GET/POST fallback per endpoint before
          // giving up on that mirror.
          const response = await requestOverpass(endpoint, body);

          lastEndpointStatus = {
            endpoint,
            ok: response.ok,
            raw: response.status,
          };

          if (!response.ok) {
            if (NON_RETRYABLE_STATUS_CODES.has(response.status)) {
              BLACKLISTED_ENDPOINTS.add(endpoint);
            } else {
              endpointCooldownUntil.set(endpoint, Date.now() + ENDPOINT_COOLDOWN_MS);
            }
            // Try the next mirror/query, but do not keep expanding radius after server failures.
            throw new Error(`Overpass ${response.status} at ${endpoint}`);
          }

          hadSuccessfulResponse = true;
          const data = (await response.json()) as OverpassResponse;
          const elements = data.elements ?? [];
          const merchants = elements
            .map((el) => elementToMerchant(el, user))
            .filter((m): m is OsmMerchant => m !== null)
            .sort((a, b) => a.distanceMeters - b.distanceMeters)
            .slice(0, maxResults);

          if (__DEV__) {
            console.log(
              `[overpass] r=${radius}m via ${endpoint}: ${elements.length} raw → ${merchants.length} usable`,
            );
          }

          if (merchants.length > 0) return merchants;
          // Empty but successful response → try next query body or radius.
          break;
        } catch (error) {
          lastError = error;
          endpointCooldownUntil.set(endpoint, Date.now() + ENDPOINT_COOLDOWN_MS);
          if (__DEV__) {
            const message =
              error instanceof Error ? error.message : String(error);
            failures.push(`${endpoint}: ${message}`);
          }
        }
      }
      if (hadSuccessfulResponse) break;
    }

    if (__DEV__ && failures.length > 0) {
      console.warn(
        `[overpass] r=${radius}m failed across mirrors: ${failures.join(" | ")}`,
      );
    }

    if (!hadSuccessfulResponse && lastError) {
      break;
    }
  }

  if (lastError instanceof Error) {
    throw new Error(`Overpass lookup failed: ${lastError.message}`);
  }
  if (__DEV__) {
    console.log(
      `[overpass] No merchants in radius ${DEFAULT_RADIUSES[DEFAULT_RADIUSES.length - 1]}m`,
      lastEndpointStatus,
    );
  }
  return [];
}
