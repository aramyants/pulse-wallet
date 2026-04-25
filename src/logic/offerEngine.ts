import { DemoContext } from "../data/demoData";

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

function isQuietMerchant(context: DemoContext) {
  return context.merchant.transactionDensity < context.merchant.normalTransactionDensity * 0.55;
}

export function generateOffer(context: DemoContext): GeneratedOffer {
  const strongMoment =
    context.weather.condition === "Rain" &&
    isQuietMerchant(context) &&
    context.user.distanceToMerchantMeters <= 120 &&
    context.user.movementIntent === "browsing";

  const eventMoment =
    context.time.period.toLowerCase().includes("event") &&
    isQuietMerchant(context) &&
    context.user.distanceToMerchantMeters <= 180;

  const discount = strongMoment
    ? Math.min(15, context.merchant.maxDiscount)
    : eventMoment
      ? Math.min(12, context.merchant.maxDiscount)
      : Math.min(7, context.merchant.maxDiscount);

  const title = strongMoment
    ? "Cold outside? Your cappuccino is waiting."
    : eventMoment
      ? "Before the crowd arrives, dinner is closer than you think."
      : "A local treat is nearby.";

  const subtitle = `${discount}% cashback at ${context.merchant.name} · ${context.user.distanceToMerchantMeters}m away`;

  return {
    id: `offer-${Date.now()}`,
    title,
    subtitle,
    merchantName: context.merchant.name,
    targetProduct: context.merchant.targetProduct,
    discount,
    expiresInMinutes: strongMoment ? 12 : eventMoment ? 15 : 20,
    token: makeToken(),
    tone: strongMoment || eventMoment ? "emotional" : "informative",
    reasons: [
      `${context.weather.condition}, ${context.weather.temperature}°C`,
      `${context.time.period} at ${context.time.hour}`,
      `${context.user.distanceToMerchantMeters}m from merchant`,
      `Merchant demand is ${context.merchant.currentDemand}`,
      `Transaction density: ${context.merchant.transactionDensity}/${context.merchant.normalTransactionDensity}`,
      `Privacy-safe intent: ${context.user.abstractIntent}`,
    ],
    privacyNote:
      "Raw GPS, movement, and preferences stay on-device. Only an abstract intent signal is used for offer generation.",
    widgetStyle: {
      background: strongMoment ? "#FFF8EF" : "#FFFFFF",
      accent: strongMoment ? "#8A4E2F" : "#1F1A17",
      mood: strongMoment ? "warm, cozy, urgent" : "calm, useful, local",
    },
  };
}
