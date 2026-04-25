export type DemoContext = {
  city: string;
  weather: {
    condition: "Rain" | "Sunny" | "Cloudy";
    temperature: number;
  };
  time: {
    day: string;
    hour: string;
    period: string;
  };
  user: {
    name: string;
    distanceToMerchantMeters: number;
    movementIntent: "browsing" | "commuting" | "waiting";
    preference: string;
    abstractIntent: string;
  };
  merchant: {
    id: string;
    name: string;
    category: string;
    currentDemand: "low" | "normal" | "high";
    transactionDensity: number;
    normalTransactionDensity: number;
    goal: string;
    maxDiscount: number;
    targetProduct: string;
  };
};

export const rainCafeScenario: DemoContext = {
  city: "Stuttgart",
  weather: {
    condition: "Rain",
    temperature: 11,
  },
  time: {
    day: "Tuesday",
    hour: "12:08",
    period: "Lunch break",
  },
  user: {
    name: "Mia",
    distanceToMerchantMeters: 80,
    movementIntent: "browsing",
    preference: "warm drinks",
    abstractIntent: "nearby_browsing_warm_drink",
  },
  merchant: {
    id: "cafe-mueller",
    name: "Café Müller",
    category: "Café",
    currentDemand: "low",
    transactionDensity: 32,
    normalTransactionDensity: 78,
    goal: "Fill quiet lunch hours",
    maxDiscount: 20,
    targetProduct: "Cappuccino",
  },
};

export const sunnyNormalScenario: DemoContext = {
  city: "Stuttgart",
  weather: {
    condition: "Sunny",
    temperature: 22,
  },
  time: {
    day: "Tuesday",
    hour: "15:30",
    period: "Afternoon",
  },
  user: {
    name: "Mia",
    distanceToMerchantMeters: 240,
    movementIntent: "commuting",
    preference: "snacks",
    abstractIntent: "passing_by_light_snack",
  },
  merchant: {
    id: "bakery-schmidt",
    name: "Bakery Schmidt",
    category: "Bakery",
    currentDemand: "normal",
    transactionDensity: 65,
    normalTransactionDensity: 70,
    goal: "Promote fresh pastries",
    maxDiscount: 10,
    targetProduct: "Croissant",
  },
};

export const eventDinnerScenario: DemoContext = {
  city: "Stuttgart",
  weather: {
    condition: "Cloudy",
    temperature: 14,
  },
  time: {
    day: "Friday",
    hour: "18:40",
    period: "Pre-event evening",
  },
  user: {
    name: "Mia",
    distanceToMerchantMeters: 130,
    movementIntent: "waiting",
    preference: "quick dinner",
    abstractIntent: "nearby_waiting_quick_dinner",
  },
  merchant: {
    id: "noodle-house",
    name: "Noodle House Mitte",
    category: "Restaurant",
    currentDemand: "low",
    transactionDensity: 41,
    normalTransactionDensity: 90,
    goal: "Fill tables before event crowd arrives",
    maxDiscount: 18,
    targetProduct: "Dinner bowl",
  },
};
