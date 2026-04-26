import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * On-device preferences memory.
 *
 * The brief explicitly references Mia's history: "It knows she has responded
 * to warm-drink offers before." Without server-side history (and without
 * compromising GDPR), we keep a rolling window of accept/dismiss/redeem
 * events on the device only. This data NEVER leaves the device — it is
 * folded into the abstract intent string we send upstream.
 */

const STORAGE_KEY = "city-wallet/preferences/v1";
const MAX_EVENTS = 20;

export type PreferenceEvent = {
  type: "accepted" | "dismissed" | "redeemed";
  category: string;
  group: string;
  hourOfDay: number;
  weather: string;
  at: number;
};

export type PreferenceSummary = {
  events: PreferenceEvent[];
  /** Most-accepted category group, e.g. "drink", "culture". null if no data. */
  dominantGroup: string | null;
  /** Human-readable label for the dominant group, e.g. "warm drinks". */
  dominantLabel: string | null;
  acceptCount: number;
  dismissCount: number;
  redeemCount: number;
};

const GROUP_LABELS: Record<string, string> = {
  drink: "warm drinks",
  food: "local meals",
  quick_service: "quick bites",
  entertainment: "evening shows",
  culture: "museums & galleries",
  retail: "local shops",
  leisure: "outdoor spots",
};

async function readEvents(): Promise<PreferenceEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is PreferenceEvent =>
        e &&
        typeof e === "object" &&
        typeof e.type === "string" &&
        typeof e.category === "string" &&
        typeof e.group === "string" &&
        typeof e.hourOfDay === "number" &&
        typeof e.weather === "string" &&
        typeof e.at === "number",
    );
  } catch (error) {
    console.warn("[preferences] read failed", error);
    return [];
  }
}

async function writeEvents(events: PreferenceEvent[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (error) {
    console.warn("[preferences] write failed", error);
  }
}

function summarize(events: PreferenceEvent[]): PreferenceSummary {
  const groupTally = new Map<string, number>();
  let acceptCount = 0;
  let dismissCount = 0;
  let redeemCount = 0;
  for (const event of events) {
    if (event.type === "accepted" || event.type === "redeemed") {
      const weight = event.type === "redeemed" ? 2 : 1;
      groupTally.set(event.group, (groupTally.get(event.group) ?? 0) + weight);
    }
    if (event.type === "accepted") acceptCount += 1;
    if (event.type === "dismissed") dismissCount += 1;
    if (event.type === "redeemed") redeemCount += 1;
  }

  let dominantGroup: string | null = null;
  let topScore = 0;
  for (const [group, score] of groupTally.entries()) {
    if (score > topScore) {
      dominantGroup = group;
      topScore = score;
    }
  }

  return {
    events,
    dominantGroup,
    dominantLabel: dominantGroup ? GROUP_LABELS[dominantGroup] ?? null : null,
    acceptCount,
    dismissCount,
    redeemCount,
  };
}

export async function getPreferenceSummary(): Promise<PreferenceSummary> {
  const events = await readEvents();
  return summarize(events);
}

export async function recordPreferenceEvent(
  event: Omit<PreferenceEvent, "at">,
): Promise<PreferenceSummary> {
  const events = await readEvents();
  const next: PreferenceEvent = { ...event, at: Date.now() };
  const merged = [next, ...events].slice(0, MAX_EVENTS);
  await writeEvents(merged);
  return summarize(merged);
}

export async function clearPreferences(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("[preferences] clear failed", error);
  }
}

/**
 * Maps a category label (from OSM / catalog) to a coarse group used for
 * preference learning. Mirrors `OsmCategoryGroup` plus a "generic" bucket.
 */
export function inferPreferenceGroup(category: string): string {
  const c = category.toLowerCase();
  if (c.includes("café") || c.includes("cafe") || c.includes("coffee"))
    return "drink";
  if (c.includes("bar") || c.includes("pub") || c.includes("club"))
    return "drink";
  if (c.includes("bakery") || c.includes("restaurant") || c.includes("bistro"))
    return "food";
  if (c.includes("ice cream") || c.includes("deli") || c.includes("quick"))
    return "quick_service";
  if (c.includes("cinema") || c.includes("theatre") || c.includes("arts"))
    return "entertainment";
  if (c.includes("museum") || c.includes("gallery") || c.includes("library"))
    return "culture";
  if (
    c.includes("supermarket") ||
    c.includes("convenience") ||
    c.includes("bookstore") ||
    c.includes("boutique") ||
    c.includes("florist") ||
    c.includes("gift")
  )
    return "retail";
  if (
    c.includes("park") ||
    c.includes("viewpoint") ||
    c.includes("attraction") ||
    c.includes("gym")
  )
    return "leisure";
  return "generic";
}

export function getGroupLabel(group: string | null): string | null {
  if (!group) return null;
  return GROUP_LABELS[group] ?? null;
}
