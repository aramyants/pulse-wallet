import { create } from "zustand";
import {
  DemoContext,
  eventDinnerScenario,
  rainCafeScenario,
  sunnyNormalScenario,
} from "../data/demoData";
import { GeneratedOffer, generateOffer } from "../logic/offerEngine";
import { fetchEventbriteCityEvents } from "../services/eventbrite";
import { fetchLiveLocationSignal } from "../services/location";
import {
  fetchOpenWeatherCurrent,
  fetchOpenWeatherCurrentByCoords,
  type LiveWeather,
} from "../services/openWeather";
import { fetchSimulatedPayoneDensity } from "../services/payone";

export type ScenarioName = "rainCafe" | "sunnyNormal" | "eventDinner";

export type WeatherStatus = "idle" | "loading" | "ready" | "error";
export type WeatherSource = "demo" | "live";
export type EventStatus = "idle" | "loading" | "ready" | "error";
export type EventSource = "demo" | "live";
export type LocationStatus = "idle" | "loading" | "ready" | "error";
export type LocationSource = "demo" | "live";
export type DemandStatus = "idle" | "loading" | "ready" | "error";
export type DemandSource = "demo" | "payone-simulated";

type WalletState = {
  scenarioName: ScenarioName | null;
  scenarioEnabled: boolean;
  context: DemoContext;
  offer: GeneratedOffer;
  accepted: boolean;
  dismissed: boolean;
  redeemed: boolean;
  expired: boolean;
  weatherStatus: WeatherStatus;
  weatherError: string | null;
  weatherSource: WeatherSource;
  eventStatus: EventStatus;
  eventError: string | null;
  eventSource: EventSource;
  upcomingEventCount: number;
  nextEventName: string | null;
  eventFeedMode: "city-search" | "demo";
  locationStatus: LocationStatus;
  locationError: string | null;
  locationSource: LocationSource;
  locationCity: string | null;
  locationCoords: { latitude: number; longitude: number } | null;
  demandStatus: DemandStatus;
  demandError: string | null;
  demandSource: DemandSource;
  demandLastUpdated: string | null;
  quietRatio: number;
  setScenario: (scenario: ScenarioName) => void;
  setScenarioEnabled: (enabled: boolean) => void;
  updateMerchantRules: (patch: Partial<Pick<DemoContext["merchant"], "goal" | "maxDiscount" | "targetProduct" | "normalTransactionDensity">>) => void;
  refreshWeather: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  refreshLocation: () => Promise<void>;
  refreshDemand: () => Promise<void>;
  acceptOffer: () => void;
  dismissOffer: () => void;
  redeemOffer: () => void;
  expireOffer: () => void;
  reset: () => void;
};

function getScenario(name: ScenarioName) {
  if (name === "sunnyNormal") return sunnyNormalScenario;
  if (name === "eventDinner") return eventDinnerScenario;
  return rainCafeScenario;
}

function applyLiveWeatherToContext(context: DemoContext, live: LiveWeather): DemoContext {
  return {
    ...context,
    weather: {
      condition: live.condition,
      temperature: live.temperatureC,
    },
  };
}

function applyEventSignalToContext(context: DemoContext, eventCount: number): DemoContext {
  const periodHasEvent = context.time.period.toLowerCase().includes("event");
  if (eventCount > 0 && !periodHasEvent) {
    return {
      ...context,
      time: {
        ...context.time,
        period: `${context.time.period} · Event pulse`,
      },
    };
  }
  return context;
}

function applyLocationSignalToContext(
  context: DemoContext,
  signal: { city: string | null; distanceToMerchantMeters: number },
): DemoContext {
  return {
    ...context,
    city: signal.city ?? context.city,
    user: {
      ...context.user,
      distanceToMerchantMeters: signal.distanceToMerchantMeters,
    },
  };
}

function applyDemandSignalToContext(
  context: DemoContext,
  signal: {
    transactionDensity: number;
    normalTransactionDensity: number;
    currentDemand: DemoContext["merchant"]["currentDemand"];
  },
): DemoContext {
  return {
    ...context,
    merchant: {
      ...context.merchant,
      transactionDensity: signal.transactionDensity,
      normalTransactionDensity: signal.normalTransactionDensity,
      currentDemand: signal.currentDemand,
    },
  };
}

function buildPendingOffer(context: DemoContext): GeneratedOffer {
  return {
    id: `offer-pending-${Date.now()}`,
    title: "Generating AI offer...",
    subtitle: `Preparing local suggestion for ${context.merchant.name}`,
    merchantName: context.merchant.name,
    targetProduct: context.merchant.targetProduct,
    discount: 0,
    expiresInMinutes: 0,
    token: "PENDING",
    tone: "informative",
    reasons: [`Context: ${context.city}`, "Awaiting local AI response"],
    privacyNote: "Offer will be generated from abstract intent.",
    widgetStyle: {
      background: "#FFFFFF",
      accent: "#1F1A17",
      mood: "pending",
    },
  };
}

export const useWalletStore = create<WalletState>((set, get) => {
  const initialContext: DemoContext = {
    ...rainCafeScenario,
    city: "Locating...",
  };
  let offerRequestId = 0;
  let offerRequestInFlight = false;
  let queuedContext: DemoContext | null = null;

  const refreshOffer = (context: DemoContext) => {
    if (offerRequestInFlight) {
      // Coalesce bursty refresh triggers; keep only the latest context.
      queuedContext = context;
      return;
    }

    offerRequestInFlight = true;
    const requestId = ++offerRequestId;
    void generateOffer(context)
      .then((offer) => {
        const latest = get();
        if (latest.accepted || requestId !== offerRequestId) {
          return;
        }
        set({ offer });
      })
      .catch((error) => {
        console.error("[walletStore] Offer refresh failed", error);
      })
      .finally(() => {
        offerRequestInFlight = false;
        if (!queuedContext) {
          return;
        }
        const nextContext = queuedContext;
        queuedContext = null;
        refreshOffer(nextContext);
      });
  };

  return {
    scenarioName: null,
    scenarioEnabled: false,
    context: initialContext,
    offer: buildPendingOffer(initialContext),
    accepted: false,
    dismissed: false,
    redeemed: false,
    expired: false,
    weatherStatus: "idle",
    weatherError: null,
    weatherSource: "demo",
    eventStatus: "idle",
    eventError: null,
    eventSource: "demo",
    upcomingEventCount: 0,
    nextEventName: null,
    eventFeedMode: "demo",
    locationStatus: "idle",
    locationError: null,
    locationSource: "demo",
    locationCity: null,
    locationCoords: null,
    demandStatus: "idle",
    demandError: null,
    demandSource: "demo",
    demandLastUpdated: null,
    quietRatio: 0,

    refreshWeather: async () => {
      const apiKey = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY?.trim();
      if (!apiKey) {
        set({
          weatherStatus: "error",
          weatherError: "Set EXPO_PUBLIC_OPENWEATHER_API_KEY in .env (see .env.example).",
          weatherSource: "demo",
        });
        return;
      }

      const { context, accepted, locationCoords } = get();
      set({ weatherStatus: "loading", weatherError: null });

      try {
        const live = locationCoords
          ? await fetchOpenWeatherCurrentByCoords(locationCoords, apiKey)
          : await fetchOpenWeatherCurrent(context.city, apiKey);
        const nextContext = applyLiveWeatherToContext(context, live);

        set({
          context: nextContext,
          weatherStatus: "ready",
          weatherError: null,
          weatherSource: "live",
          ...(accepted ? {} : { offer: buildPendingOffer(nextContext) }),
        });
        if (!accepted) {
          refreshOffer(nextContext);
        }
        void get().refreshDemand();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Weather request failed.";
        set({
          weatherStatus: "error",
          weatherError: message,
          weatherSource: "demo",
        });
      }
    },

    refreshEvents: async () => {
      const apiKey = process.env.EXPO_PUBLIC_TICKETMASTER_API_KEY?.trim();
      if (!apiKey) {
        set({
          eventStatus: "error",
          eventError: "Set EXPO_PUBLIC_TICKETMASTER_API_KEY in .env (see .env.example).",
          eventSource: "demo",
          upcomingEventCount: 0,
          nextEventName: null,
          eventFeedMode: "demo",
        });
        return;
      }

      const { context, accepted } = get();
      set({ eventStatus: "loading", eventError: null });

      try {
        const live = await fetchEventbriteCityEvents(context.city, apiKey);
        const nextContext = applyEventSignalToContext(context, live.count);

        set({
          context: nextContext,
          eventStatus: "ready",
          eventError: null,
          eventSource: "live",
          upcomingEventCount: live.count,
          nextEventName: live.nextEventName,
          eventFeedMode: live.sourceMode,
          ...(accepted ? {} : { offer: buildPendingOffer(nextContext) }),
        });
        if (!accepted) {
          refreshOffer(nextContext);
        }
        void get().refreshDemand();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Eventbrite request failed.";
        set({
          eventStatus: "error",
          eventError: message,
          eventSource: "demo",
          upcomingEventCount: 0,
          nextEventName: null,
          eventFeedMode: "demo",
        });
      }
    },

    refreshLocation: async () => {
      const { context, accepted, scenarioEnabled } = get();
      if (scenarioEnabled) {
        set({
          locationStatus: "idle",
          locationError: null,
          locationSource: "demo",
          locationCity: null,
          locationCoords: null,
        });
        return;
      }
      const requestedMerchantId = context.merchant.id;
      const requestedScenario = get().scenarioName;
      set({ locationStatus: "loading", locationError: null });

      try {
        const signal = await fetchLiveLocationSignal(context.merchant.id);
        const latest = get();
        if (
          latest.scenarioName !== requestedScenario ||
          latest.context.merchant.id !== requestedMerchantId
        ) {
          // Ignore stale async result from previous scenario/merchant.
          return;
        }

        const nextContext = applyLocationSignalToContext(context, signal);
        set({
          context: nextContext,
          locationStatus: "ready",
          locationError: null,
          locationSource: "live",
          locationCity: signal.city,
          locationCoords: signal.userCoords,
          ...(accepted ? {} : { offer: buildPendingOffer(nextContext) }),
        });
        if (!accepted) {
          refreshOffer(nextContext);
        }
        void get().refreshWeather();
        void get().refreshEvents();
        void get().refreshDemand();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Location request failed.";
        set({
          locationStatus: "error",
          locationError: message,
          locationSource: "demo",
          locationCity: null,
          locationCoords: null,
        });
      }
    },

    refreshDemand: async () => {
      const { context, accepted } = get();
      set({ demandStatus: "loading", demandError: null });

      try {
        const live = await fetchSimulatedPayoneDensity(context);
        const nextContext = applyDemandSignalToContext(context, live);
        set({
          context: nextContext,
          demandStatus: "ready",
          demandError: null,
          demandSource: "payone-simulated",
          demandLastUpdated: live.generatedAt,
          quietRatio: live.quietRatio,
          ...(accepted ? {} : { offer: buildPendingOffer(nextContext) }),
        });
        if (!accepted) {
          refreshOffer(nextContext);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Payone demand feed failed.";
        set({
          demandStatus: "error",
          demandError: message,
          demandSource: "demo",
        });
      }
    },

    setScenario: (scenarioName) => {
      const context = getScenario(scenarioName);
      set({
        scenarioName,
        scenarioEnabled: true,
        context,
        offer: buildPendingOffer(context),
        accepted: false,
        dismissed: false,
        redeemed: false,
        expired: false,
        weatherStatus: "idle",
        weatherError: null,
        weatherSource: "demo",
        eventStatus: "idle",
        eventError: null,
        eventSource: "demo",
        upcomingEventCount: 0,
        nextEventName: null,
        eventFeedMode: "demo",
        locationStatus: "idle",
        locationError: null,
        locationSource: "demo",
        locationCity: null,
        locationCoords: null,
        demandStatus: "idle",
        demandError: null,
        demandSource: "demo",
        demandLastUpdated: null,
        quietRatio: 0,
      });
      refreshOffer(context);
      void get().refreshWeather();
      void get().refreshEvents();
      void get().refreshDemand();
    },

    setScenarioEnabled: (enabled) => {
      const current = get();
      if (enabled) {
        const fallbackScenario = current.scenarioName ?? "rainCafe";
        current.setScenario(fallbackScenario);
        return;
      }

      const liveContext: DemoContext = {
        ...rainCafeScenario,
        city: current.locationCity ?? "Locating...",
      };

      set({
        scenarioEnabled: false,
        scenarioName: null,
        context: liveContext,
        offer: buildPendingOffer(liveContext),
        accepted: false,
        dismissed: false,
        redeemed: false,
        expired: false,
      });
      refreshOffer(liveContext);
      void get().refreshLocation();
      void get().refreshWeather();
      void get().refreshEvents();
      void get().refreshDemand();
    },

    updateMerchantRules: (patch) => {
      const { context, accepted } = get();
      const nextContext: DemoContext = {
        ...context,
        merchant: {
          ...context.merchant,
          ...patch,
        },
      };
      set({
        context: nextContext,
        ...(accepted ? {} : { offer: buildPendingOffer(nextContext) }),
      });
      if (!accepted) {
        refreshOffer(nextContext);
      }
    },

    acceptOffer: () => {
      set({ accepted: true, dismissed: false });
    },

    dismissOffer: () => {
      set({ dismissed: true, accepted: false });
    },

    redeemOffer: () => {
      set({ redeemed: true, expired: false });
    },

    expireOffer: () => {
      set({ expired: true });
    },

    reset: () => {
      const context = get().context;
      set({
        offer: buildPendingOffer(context),
        accepted: false,
        dismissed: false,
        redeemed: false,
        expired: false,
      });
      refreshOffer(context);
      void get().refreshDemand();
    },
  };
});
