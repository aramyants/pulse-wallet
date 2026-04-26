import type { DemoContext } from "../data/demoData";
import type { MerchantSeed } from "../data/merchantCatalog";
import type { OsmAmenity, OsmMerchant } from "../services/overpass";

function pad2(value: number) {
  return value.toString().padStart(2, "0");
}

export function computeLiveTime(now: Date = new Date()): DemoContext["time"] {
  const hour = now.getHours();
  const minute = now.getMinutes();
  const day = now.toLocaleDateString("en-US", { weekday: "long" });
  const period =
    hour < 6
      ? "Late night"
      : hour < 11
        ? "Morning"
        : hour < 14
          ? "Lunch break"
          : hour < 17
            ? "Afternoon"
            : hour < 20
              ? "Evening"
              : "Night";
  return {
    day,
    hour: `${pad2(hour)}:${pad2(minute)}`,
    period,
  };
}

export function inferMovementIntent(
  period: string,
): DemoContext["user"]["movementIntent"] {
  const p = period.toLowerCase();
  if (p.includes("lunch")) return "browsing";
  if (p.includes("morning")) return "commuting";
  if (p.includes("evening") || p.includes("night")) return "waiting";
  return "browsing";
}

export function inferAbstractIntent(
  period: string,
  weatherCondition: DemoContext["weather"]["condition"],
  category: string,
): string {
  const p = period.toLowerCase();
  const c = category.toLowerCase();
  const isCold = weatherCondition === "Rain";
  const isWarm = weatherCondition === "Sunny";

  const action = p.includes("morning")
    ? "commute"
    : p.includes("lunch")
      ? "browse"
      : p.includes("evening") || p.includes("night")
        ? "wait"
        : "browse";

  const slot = (() => {
    if (c.includes("café") || c.includes("cafe") || c.includes("coffee"))
      return isCold ? "warm_drink" : "coffee";
    if (c.includes("bakery")) return "pastry";
    if (c.includes("restaurant") || c.includes("bistro")) return "meal";
    if (c.includes("deli") || c.includes("quick") || c.includes("ice cream"))
      return "quick_bite";
    if (c.includes("bar") || c.includes("pub") || c.includes("club"))
      return "drink";
    if (
      c.includes("cinema") ||
      c.includes("theatre") ||
      c.includes("arts")
    )
      return "show";
    if (c.includes("museum") || c.includes("gallery") || c.includes("library"))
      return "culture";
    if (
      c.includes("supermarket") ||
      c.includes("convenience") ||
      c.includes("bookstore") ||
      c.includes("boutique") ||
      c.includes("florist") ||
      c.includes("gift") ||
      c.includes("shop")
    )
      return "errand";
    if (
      c.includes("park") ||
      c.includes("viewpoint") ||
      c.includes("attraction")
    )
      return "stroll";
    if (c.includes("gym") || c.includes("fitness")) return "active";
    return "snack";
  })();

  const mood = isCold ? "shelter" : isWarm ? "outdoor" : "casual";
  return `${action}_${slot}_${mood}`;
}

type MerchantRules = {
  goal: string;
  maxDiscount: number;
  targetProduct: string;
  normalTransactionDensity: number;
};

/**
 * Default per-category merchant rules. Used when a real OSM merchant has no
 * configured rules. In production these would be set by the merchant in
 * S-Markt / Mehrwert; here we stamp sensible defaults transparent to the user.
 *
 * Covers food, drink, quick-service, entertainment, culture, retail and
 * leisure so the Generative Wallet works in any city, any time of day, with
 * or without a coincident event signal.
 */
const RULES_BY_AMENITY: Record<OsmAmenity, MerchantRules> = {
  cafe: {
    goal: "Fill quiet coffee hours",
    maxDiscount: 18,
    targetProduct: "Cappuccino",
    normalTransactionDensity: 75,
  },
  coffee_shop: {
    goal: "Fill quiet coffee hours",
    maxDiscount: 18,
    targetProduct: "Cappuccino",
    normalTransactionDensity: 75,
  },
  bakery: {
    goal: "Move fresh pastries before close",
    maxDiscount: 16,
    targetProduct: "Fresh pastry",
    normalTransactionDensity: 70,
  },
  restaurant: {
    goal: "Fill quiet tables this hour",
    maxDiscount: 18,
    targetProduct: "Lunch special",
    normalTransactionDensity: 90,
  },
  fast_food: {
    goal: "Lift dwell-time visits",
    maxDiscount: 14,
    targetProduct: "Combo meal",
    normalTransactionDensity: 100,
  },
  bar: {
    goal: "Steady early-evening flow",
    maxDiscount: 15,
    targetProduct: "Happy-hour drink",
    normalTransactionDensity: 80,
  },
  pub: {
    goal: "Steady early-evening flow",
    maxDiscount: 15,
    targetProduct: "Happy-hour drink",
    normalTransactionDensity: 80,
  },
  ice_cream: {
    goal: "Drive walk-by visits",
    maxDiscount: 15,
    targetProduct: "House scoop",
    normalTransactionDensity: 65,
  },
  deli: {
    goal: "Move daily prepared bowls",
    maxDiscount: 15,
    targetProduct: "Lunch bowl",
    normalTransactionDensity: 78,
  },

  cinema: {
    goal: "Sell quiet-screening seats",
    maxDiscount: 25,
    targetProduct: "Evening ticket",
    normalTransactionDensity: 85,
  },
  theatre: {
    goal: "Last-call seats for tonight",
    maxDiscount: 22,
    targetProduct: "Tonight's show",
    normalTransactionDensity: 70,
  },
  nightclub: {
    goal: "Pull early arrivals",
    maxDiscount: 20,
    targetProduct: "Pre-1am entry",
    normalTransactionDensity: 90,
  },
  arts_centre: {
    goal: "Drive weekday foot traffic",
    maxDiscount: 18,
    targetProduct: "Day pass",
    normalTransactionDensity: 60,
  },

  museum: {
    goal: "Activate quiet hours",
    maxDiscount: 20,
    targetProduct: "Day pass",
    normalTransactionDensity: 55,
  },
  gallery: {
    goal: "Drive walk-ins",
    maxDiscount: 18,
    targetProduct: "Exhibit ticket",
    normalTransactionDensity: 40,
  },
  library: {
    goal: "Promote café & event tickets",
    maxDiscount: 12,
    targetProduct: "Event seat",
    normalTransactionDensity: 50,
  },

  supermarket: {
    goal: "Lift basket size",
    maxDiscount: 12,
    targetProduct: "Fresh basket",
    normalTransactionDensity: 130,
  },
  convenience: {
    goal: "Reward grab-and-go visits",
    maxDiscount: 15,
    targetProduct: "Snack & drink",
    normalTransactionDensity: 110,
  },
  books: {
    goal: "Pull weekend readers",
    maxDiscount: 18,
    targetProduct: "Featured title",
    normalTransactionDensity: 45,
  },
  clothes: {
    goal: "Clear seasonal stock",
    maxDiscount: 25,
    targetProduct: "Seasonal pick",
    normalTransactionDensity: 60,
  },
  florist: {
    goal: "Move daily fresh stems",
    maxDiscount: 18,
    targetProduct: "Bouquet",
    normalTransactionDensity: 35,
  },
  gift: {
    goal: "Tap walk-by gifting",
    maxDiscount: 15,
    targetProduct: "Featured gift",
    normalTransactionDensity: 40,
  },

  park: {
    goal: "Promote partner kiosks",
    maxDiscount: 15,
    targetProduct: "Refreshment",
    normalTransactionDensity: 50,
  },
  fitness_centre: {
    goal: "Convert walk-by interest",
    maxDiscount: 25,
    targetProduct: "Day pass",
    normalTransactionDensity: 50,
  },
  viewpoint: {
    goal: "Promote nearby refreshments",
    maxDiscount: 15,
    targetProduct: "Coffee & view",
    normalTransactionDensity: 40,
  },
  attraction: {
    goal: "Drive sightseer visits",
    maxDiscount: 18,
    targetProduct: "Visitor pass",
    normalTransactionDensity: 60,
  },
};

export function defaultMerchantRulesFor(amenity: OsmAmenity): MerchantRules {
  return RULES_BY_AMENITY[amenity];
}

type LiveBuildArgs = {
  source: "scenario" | "osm";
  city: string;
  weather: DemoContext["weather"];
  distanceToMerchantMeters: number;
  merchant: {
    id: string;
    name: string;
    category: string;
    goal: string;
    maxDiscount: number;
    targetProduct: string;
    normalTransactionDensity: number;
  };
  userName?: string;
  preference?: string;
};

export function buildLiveContext(args: LiveBuildArgs): DemoContext {
  const time = computeLiveTime();
  const intent = inferMovementIntent(time.period);
  const abstractIntent = inferAbstractIntent(
    time.period,
    args.weather.condition,
    args.merchant.category,
  );
  return {
    city: args.city,
    weather: args.weather,
    time,
    user: {
      name: args.userName ?? "You",
      distanceToMerchantMeters: args.distanceToMerchantMeters,
      movementIntent: intent,
      preference: args.preference ?? "",
      abstractIntent,
    },
    merchant: {
      id: args.merchant.id,
      name: args.merchant.name,
      category: args.merchant.category,
      currentDemand: "normal",
      transactionDensity: args.merchant.normalTransactionDensity,
      normalTransactionDensity: args.merchant.normalTransactionDensity,
      goal: args.merchant.goal,
      maxDiscount: args.merchant.maxDiscount,
      targetProduct: args.merchant.targetProduct,
    },
  };
}

export function buildContextFromOsmMerchant(args: {
  city: string;
  weather: DemoContext["weather"];
  merchant: OsmMerchant;
}): DemoContext {
  const rules = defaultMerchantRulesFor(args.merchant.amenity);
  return buildLiveContext({
    source: "osm",
    city: args.city,
    weather: args.weather,
    distanceToMerchantMeters: args.merchant.distanceMeters,
    merchant: {
      id: args.merchant.id,
      name: args.merchant.name,
      category: args.merchant.category,
      goal: rules.goal,
      maxDiscount: rules.maxDiscount,
      targetProduct: rules.targetProduct,
      normalTransactionDensity: rules.normalTransactionDensity,
    },
  });
}

export function buildContextFromSeedMerchant(args: {
  city: string;
  weather: DemoContext["weather"];
  merchant: MerchantSeed;
  distanceToMerchantMeters?: number;
  userName?: string;
}): DemoContext {
  return buildLiveContext({
    source: "scenario",
    city: args.city,
    weather: args.weather,
    distanceToMerchantMeters: args.distanceToMerchantMeters ?? 80,
    merchant: {
      id: args.merchant.id,
      name: args.merchant.name,
      category: args.merchant.category,
      goal: args.merchant.goal,
      maxDiscount: args.merchant.maxDiscount,
      targetProduct: args.merchant.targetProduct,
      normalTransactionDensity: args.merchant.normalTransactionDensity,
    },
    userName: args.userName ?? "Mia",
  });
}
