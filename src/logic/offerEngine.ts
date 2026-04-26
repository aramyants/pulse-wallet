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
    "Generate one mobile wallet offer as strict JSON only. Think about How does the offer address the user? Factual-informative ('15% off at Café Müller, 300m away') or emotional-situational ('Cold outside? Your cappuccino is waiting.')?",
    "Respond with strict JSON only (no markdown, no prose) using this shape:",
    '{"title":"string","subtitle":"string","discount":number,"expiresInMinutes":number,"tone":"emotional|informative","reasons":["string"],"privacyNote":"string","widgetStyle":{"background":"#RRGGBB","accent":"#RRGGBB","mood":"string"}}',
    "",
    "Rules:",
    "- Keep title under 70 chars.",
    "- Keep subtitle under 90 chars.",
    "- Discount must be between 5 and merchant max discount.",
    "- Expires must be 8 to 45 minutes.",
    "- Mention city or local context naturally.",
    "- reasons must be 3-5 short bullet-like strings.",
    "- privacyNote must mention abstract intent and no raw GPS sharing.",
    "- widgetStyle background/accent must be valid hex colors.",
    "",
    `Context city: ${context.city}`,
    `Weather: ${context.weather.condition}, ${context.weather.temperature}C`,
    `Time: ${context.time.period} at ${context.time.hour}`,
    `User distance: ${context.user.distanceToMerchantMeters}m`,
    `User intent: ${context.user.abstractIntent}`,
    `Merchant: ${context.merchant.name} (${context.merchant.category})`,
    `Merchant demand: ${context.merchant.currentDemand}`,
    `Density: ${context.merchant.transactionDensity}/${context.merchant.normalTransactionDensity}`,
    `Merchant max discount: ${context.merchant.maxDiscount}`,
    `Merchant target product: ${context.merchant.targetProduct}`,
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

function buildLocalFallbackOffer(context: DemoContext): GeneratedOffer {
  const isNearby = context.user.distanceToMerchantMeters <= 200;
  const discount = clamp(isNearby ? 12 : 8, 5, context.merchant.maxDiscount);
  return {
    id: `offer-${Date.now()}`,
    merchantName: context.merchant.name,
    targetProduct: context.merchant.targetProduct,
    token: makeToken(),
    title: isNearby ? `${context.merchant.name} is nearby` : `Local offer at ${context.merchant.name}`,
    subtitle: `${discount}% cashback on ${context.merchant.targetProduct} • ${context.user.distanceToMerchantMeters}m away`,
    discount,
    expiresInMinutes: 20,
    tone: "informative",
    reasons: [
      `${context.weather.condition}, ${context.weather.temperature}C`,
      `${context.time.period} in ${context.city}`,
      `Demand is ${context.merchant.currentDemand}`,
    ],
    privacyNote: "Generated from abstract intent and local context without sharing raw GPS.",
    widgetStyle: {
      background: "#FFFFFF",
      accent: "#1F1A17",
      mood: "calm, local, reliable",
    },
  };
}

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
      console.log(data)
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
      console.warn("[offerEngine] API generation attempt failed via", endpoint, message);
      if (/timeout|network request failed/i.test(message)) {
        // Network/timeouts are unlikely to recover immediately; avoid repeated long waits.
        break;
      }
    }
  }

  if (lastError instanceof Error) {
    console.warn("[offerEngine] Falling back to local deterministic offer after API failures:", lastError.message);
    return buildLocalFallbackOffer(context);
  }

  return buildLocalFallbackOffer(context);
}
