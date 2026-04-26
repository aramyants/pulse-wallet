import { DemoContext } from "../data/demoData";
import Constants from "expo-constants";
import { Platform } from "react-native";

export type GeneratedOffer = {
  id: string;
  title: string;
  subtitle: string;
  merchantName: string;
  targetProduct: string;
  discount: number;
  expiresInMinutes: number;
  token: string;
  tone: "emotional" | "informative";
  reasons: string[];
  privacyNote: string;
  widgetStyle: {
    background: string;
    accent: string;
    mood: string;
  };
};

function makeToken() {
  return `PW-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildOfferPrompt(context: DemoContext) {
  return [
    "You are the Generative City Wallet offer engine. Generate ONE local offer that fits the user's current real-world context.",
    "The merchant might be food, drink, quick service, entertainment (cinema/theatre/club), culture (museum/gallery/library), retail (bookstore, supermarket, florist, boutique...) or leisure (park, gym, attraction). Adapt language to the category — never default to 'coffee' if it doesn't fit.",
    "Tone: choose factual-informative (e.g. '15% off at Café Müller, 300m away') OR emotional-situational (e.g. 'Cold outside? Your cappuccino is waiting.') — pick whichever the context implies.",
    "Output strict JSON only (no markdown, no prose) matching exactly:",
    '{"title":"string","subtitle":"string","discount":number,"expiresInMinutes":number,"tone":"emotional|informative","reasons":["string"],"privacyNote":"string","widgetStyle":{"background":"#RRGGBB","accent":"#RRGGBB","mood":"string"}}',
    "",
    "Rules:",
    "- Title <= 70 chars, subtitle <= 90 chars.",
    "- discount: integer between 5 and the merchant max discount.",
    "- expiresInMinutes: integer 8-45.",
    "- Mention city or a real-world cue (weather, time, distance) naturally.",
    "- reasons: 3-5 short strings; the FIRST reason must be the strongest signal (weather / demand / time / distance).",
    "- privacyNote: must mention abstract intent and explicitly state no raw GPS is shared.",
    "- widgetStyle.background and widgetStyle.accent: valid #RRGGBB hex; ensure accent contrasts the background.",
    "- Never invent merchant features or events that are not in the context.",
    "",
    `Context city: ${context.city}`,
    `Weather: ${context.weather.condition}, ${context.weather.temperature}C`,
    `Time: ${context.time.period} at ${context.time.hour} (${context.time.day})`,
    `User distance: ${context.user.distanceToMerchantMeters}m`,
    `User abstract intent: ${context.user.abstractIntent}`,
    context.user.preference
      ? `User taste hint (on-device only): leans toward ${context.user.preference}`
      : "User taste hint: none yet",
    `Merchant: ${context.merchant.name} (${context.merchant.category})`,
    `Merchant demand: ${context.merchant.currentDemand}`,
    `Density: ${context.merchant.transactionDensity}/${context.merchant.normalTransactionDensity}`,
    `Merchant max discount: ${context.merchant.maxDiscount}`,
    `Merchant target product: ${context.merchant.targetProduct}`,
    `Merchant goal: ${context.merchant.goal}`,
  ].join("\n");
}

function inferLanApiBaseUrl(port: string): string | null {
  const anyConstants = Constants as unknown as {
    expoConfig?: { hostUri?: string };
    expoGoConfig?: { debuggerHost?: string };
    manifest2?: { extra?: { expoClient?: { hostUri?: string } } };
  };

  const hostLike =
    anyConstants.expoConfig?.hostUri ||
    anyConstants.expoGoConfig?.debuggerHost ||
    anyConstants.manifest2?.extra?.expoClient?.hostUri;

  if (!hostLike) return null;
  const host = hostLike.split(":")[0];
  if (!host) return null;
  return `http://${host}:${port}`;
}

function buildCandidateApiBaseUrls() {
  const urls: string[] = [];
  const envUrlRaw =
    process.env.EXPO_PUBLIC_OFFER_API_BASE_URL?.trim() || process.env.EXPO_PUBLIC_REDEEM_API_BASE_URL?.trim();
  const lanUrl = inferLanApiBaseUrl("8787");

  if (envUrlRaw) {
    // If user accidentally points to Ollama's default port, reroute to backend API port.
    const envUrl = envUrlRaw.replace(/:11434(?=\/|$)/, ":8787").replace(/\/+$/, "");
    urls.push(envUrl);
    // Respect explicit override to avoid slow retries on inferred hosts.
    return [...new Set(urls)];
  }
  if (Platform.OS === "android") {
    urls.push("http://10.0.2.2:8787");
  } else {
    urls.push("http://localhost:8787");
  }
  if (lanUrl) urls.push(lanUrl);

  return [...new Set(urls)];
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 60000) {
  return await Promise.race([
    fetch(url, init),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value);
}

function parseReasons(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}

type CategoryGroup =
  | "food"
  | "drink"
  | "quick_service"
  | "entertainment"
  | "culture"
  | "retail"
  | "leisure"
  | "generic";

function inferCategoryGroup(category: string): CategoryGroup {
  const c = category.toLowerCase();
  if (c.includes("café") || c.includes("cafe") || c.includes("coffee")) return "drink";
  if (c.includes("bar") || c.includes("pub") || c.includes("club")) return "drink";
  if (c.includes("bakery") || c.includes("restaurant") || c.includes("bistro")) return "food";
  if (c.includes("ice cream") || c.includes("deli") || c.includes("quick")) return "quick_service";
  if (c.includes("cinema") || c.includes("theatre") || c.includes("arts")) return "entertainment";
  if (c.includes("museum") || c.includes("gallery") || c.includes("library")) return "culture";
  if (
    c.includes("supermarket") ||
    c.includes("convenience") ||
    c.includes("bookstore") ||
    c.includes("boutique") ||
    c.includes("florist") ||
    c.includes("gift shop")
  )
    return "retail";
  if (c.includes("park") || c.includes("viewpoint") || c.includes("attraction") || c.includes("gym"))
    return "leisure";
  return "generic";
}

function pickFallbackTitle(context: DemoContext, group: CategoryGroup): string {
  const { merchant, weather, time } = context;
  const period = time.period.toLowerCase();
  const isCold = weather.condition === "Rain" || weather.temperature <= 12;
  const isWarm = weather.condition === "Sunny" && weather.temperature >= 18;

  switch (group) {
    case "drink":
      if (isCold) return `Warm break at ${merchant.name}`;
      if (period.includes("morning")) return `Morning fix at ${merchant.name}`;
      if (period.includes("evening") || period.includes("night"))
        return `Evening pour at ${merchant.name}`;
      return `${merchant.name} — quiet hour, your seat`;
    case "food":
      if (period.includes("lunch")) return `Lunch at ${merchant.name}`;
      if (period.includes("evening")) return `Dinner at ${merchant.name}`;
      if (period.includes("morning")) return `Fresh bake at ${merchant.name}`;
      return `Local plate at ${merchant.name}`;
    case "quick_service":
      return `${merchant.name} — quick stop on the way`;
    case "entertainment":
      if (period.includes("evening") || period.includes("night"))
        return `Tonight at ${merchant.name}`;
      return `Quiet show at ${merchant.name}`;
    case "culture":
      if (isCold) return `Stay dry inside ${merchant.name}`;
      if (isWarm && period.includes("afternoon"))
        return `Afternoon visit to ${merchant.name}`;
      return `${merchant.name} — quiet hour visit`;
    case "retail":
      if (isCold) return `Indoor browse at ${merchant.name}`;
      if (period.includes("evening")) return `End-of-day pick at ${merchant.name}`;
      return `${merchant.name} — local pick`;
    case "leisure":
      if (isWarm) return `Sunny detour: ${merchant.name}`;
      if (isCold) return `Indoor swap from ${merchant.name}`;
      return `Drop-in at ${merchant.name}`;
    case "generic":
    default:
      return `${merchant.name} — local offer`;
  }
}

function pickFallbackSubtitle(
  context: DemoContext,
  discount: number,
  group: CategoryGroup,
): string {
  const product = context.merchant.targetProduct;
  const distance = context.user.distanceToMerchantMeters;
  const distanceCue = distance > 0 ? `${distance} m away` : "in walking range";
  switch (group) {
    case "drink":
    case "food":
    case "quick_service":
      return `${discount}% cashback on ${product} • ${distanceCue}`;
    case "entertainment":
      return `${discount}% off ${product} tonight • ${distanceCue}`;
    case "culture":
      return `${discount}% off ${product} • ${distanceCue}`;
    case "retail":
      return `${discount}% back on ${product} • ${distanceCue}`;
    case "leisure":
      return `${discount}% off ${product} • ${distanceCue}`;
    default:
      return `${discount}% cashback on ${product} • ${distanceCue}`;
  }
}

function buildLocalFallbackOffer(context: DemoContext): GeneratedOffer {
  const group = inferCategoryGroup(context.merchant.category);
  const isNearby = context.user.distanceToMerchantMeters <= 250;
  const isQuiet = context.merchant.currentDemand === "low";
  const baseDiscount = isQuiet ? 16 : isNearby ? 12 : 9;
  const discount = clamp(baseDiscount, 5, context.merchant.maxDiscount);

  const reasons = [
    isQuiet
      ? `${context.merchant.name} is below normal volume`
      : isNearby
        ? `Within ${context.user.distanceToMerchantMeters} m`
        : `${context.weather.condition}, ${context.weather.temperature}°C`,
    `${context.time.period} in ${context.city}`,
    `Demand is ${context.merchant.currentDemand}`,
  ];

  return {
    id: `offer-${Date.now()}`,
    merchantName: context.merchant.name,
    targetProduct: context.merchant.targetProduct,
    token: makeToken(),
    title: pickFallbackTitle(context, group),
    subtitle: pickFallbackSubtitle(context, discount, group),
    discount,
    expiresInMinutes: 20,
    tone: isQuiet ? "emotional" : "informative",
    reasons,
    privacyNote:
      "Generated from abstract intent and local context. No raw GPS or identity is shared.",
    widgetStyle: {
      background: "#FFFFFF",
      accent: "#7A2811",
      mood: isQuiet ? "calm, inviting" : "calm, local, reliable",
    },
  };
}

// Track endpoints whose first attempt already logged a warning; this keeps the
// dev console quiet when the API server is intentionally not running. We still
// retry on every call (so the moment the server comes up, the next offer is
// "live"), but we only print one warning per endpoint per session.
const warnedEndpoints = new Set<string>();
let warnedFallback = false;

export async function generateOffer(context: DemoContext): Promise<GeneratedOffer> {
  const baseUrls = buildCandidateApiBaseUrls();
  const model = process.env.EXPO_PUBLIC_OLLAMA_MODEL?.trim() || "gemma3:4b";
  let lastError: unknown = null;

  for (const baseUrl of baseUrls) {
    const endpoint = `${baseUrl}/api/offer`;
    try {
      const response = await fetchWithTimeout(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          stream: false,
          format: "json",
          options: {
            temperature: 0.7,
          },
          prompt: buildOfferPrompt(context),
        }),
      });

      if (!response.ok) {
        const message = `Ollama request failed with status ${response.status} at ${endpoint}.`;
        console.error("[offerEngine] " + message);
        throw new Error(message);
      }

      const data = await response.json();
      const rawText = data?.response;
      if (typeof rawText !== "string" || !rawText.trim()) {
        const message = "Ollama returned an empty response.";
        console.error("[offerEngine] " + message, data);
        throw new Error(message);
      }

      const parsed = JSON.parse(rawText) as Record<string, unknown>;
      const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
      const subtitle = typeof parsed.subtitle === "string" ? parsed.subtitle.trim() : "";
      const reasons = parseReasons(parsed.reasons);
      const privacyNote = typeof parsed.privacyNote === "string" ? parsed.privacyNote.trim() : "";
      const tone = parsed.tone === "emotional" ? "emotional" : "informative";
      const discountRaw = typeof parsed.discount === "number" ? parsed.discount : NaN;
      const expiresRaw = typeof parsed.expiresInMinutes === "number" ? parsed.expiresInMinutes : NaN;
      const parsedStyle = typeof parsed.widgetStyle === "object" && parsed.widgetStyle ? parsed.widgetStyle : null;
      const background = isHexColor((parsedStyle as { background?: unknown } | null)?.background)
        ? (parsedStyle as { background: string }).background
        : "";
      const accent = isHexColor((parsedStyle as { accent?: unknown } | null)?.accent)
        ? (parsedStyle as { accent: string }).accent
        : "";
      const mood =
        typeof (parsedStyle as { mood?: unknown } | null)?.mood === "string" &&
        (parsedStyle as { mood: string }).mood.trim()
          ? (parsedStyle as { mood: string }).mood.trim()
          : "";

      if (!title || !subtitle || !privacyNote || reasons.length === 0 || !background || !accent || !mood) {
        const message = "Ollama response is missing required offer fields.";
        console.error("[offerEngine] " + message, parsed);
        throw new Error(message);
      }

      if (!Number.isFinite(discountRaw) || !Number.isFinite(expiresRaw)) {
        const message = "Ollama response has invalid numeric fields.";
        console.error("[offerEngine] " + message, parsed);
        throw new Error(message);
      }

      return {
        id: `offer-${Date.now()}`,
        merchantName: context.merchant.name,
        targetProduct: context.merchant.targetProduct,
        token: makeToken(),
        title,
        subtitle,
        discount: clamp(Math.round(discountRaw), 5, context.merchant.maxDiscount),
        expiresInMinutes: clamp(Math.round(expiresRaw), 8, 45),
        tone,
        reasons,
        privacyNote,
        widgetStyle: {
          background,
          accent,
          mood,
        },
      };
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!warnedEndpoints.has(endpoint)) {
        warnedEndpoints.add(endpoint);
        console.warn(
          "[offerEngine] API not reachable at",
          endpoint,
          "— using local fallback. (",
          message,
          ")",
        );
      }
      if (/timeout|network request failed/i.test(message)) {
        // Network/timeouts are unlikely to recover immediately; avoid repeated long waits.
        break;
      }
    }
  }

  if (lastError instanceof Error && !warnedFallback) {
    warnedFallback = true;
    console.warn(
      "[offerEngine] Live LLM offline → deterministic local offers.",
      "Start the API with `npm run api:redeem` and ensure Ollama is running.",
    );
  }

  return buildLocalFallbackOffer(context);
}
