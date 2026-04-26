import { create } from "zustand";
import { dataSources } from "../config/dataSources";
import {
  DemoContext,
  eventDinnerScenario,
  rainCafeScenario,
  sunnyNormalScenario,
} from "../data/demoData";
import {
  buildContextFromOsmMerchant,
  computeLiveTime,
} from "../logic/contextBuilder";
import { GeneratedOffer, generateOffer } from "../logic/offerEngine";
import { evaluatePushRules } from "../logic/pushRules";
import {
  buildTriggerComposition,
  type TriggerComposition,
} from "../logic/triggerComposition";
import { fetchEventbriteCityEvents } from "../services/eventbrite";
import { fetchLiveLocationSignal } from "../services/location";
import {
  cancelScheduledPush,
  getNotificationSupport,
  type NotificationSupport,
  requestNotificationPermission,
  scheduleOfferPush,
} from "../services/notifications";
import {
  fetchOpenWeatherCurrent,
  fetchOpenWeatherCurrentByCoords,
  type LiveWeather,
} from "../services/openWeather";
import { findNearbyMerchants, type OsmMerchant } from "../services/overpass";
import {
  fetchPayoneDensity,
  type PayoneDemandSource,
} from "../services/payone";
import {
  getPreferenceSummary,
  inferPreferenceGroup,
  type PreferenceSummary,
  recordPreferenceEvent,
} from "../services/preferences";

export type ScenarioName = "rainCafe" | "sunnyNormal" | "eventDinner";

export type SignalStatus = "idle" | "loading" | "ready" | "error";

const DEFAULT_CITY = dataSources.city.default;

const PERIODIC_DEMAND_INTERVAL_MS = 60_000;

const EMPTY_TRIGGER_COMPOSITION: TriggerComposition = {
  triggers: [],
  summary: "",
  totalStrength: 0,
  pushWorthy: false,
};

const EMPTY_PREFERENCES: PreferenceSummary = {
  events: [],
  dominantGroup: null,
  dominantLabel: null,
  acceptCount: 0,
  dismissCount: 0,
  redeemCount: 0,
};

type WalletState = {
  scenarioName: ScenarioName | null;
  scenarioEnabled: boolean;

  context: DemoContext;
  offer: GeneratedOffer;
  offerGeneratedAt: number | null;

  accepted: boolean;
  dismissed: boolean;
  redeemed: boolean;
  expired: boolean;

  // Signal state
  weatherStatus: SignalStatus;
  weatherError: string | null;
  weatherDescription: string | null;

  eventStatus: SignalStatus;
  eventError: string | null;
  upcomingEventCount: number;
  nextEventName: string | null;

  locationStatus: SignalStatus;
  locationError: string | null;
  locationCity: string | null;
  locationCoords: { latitude: number; longitude: number } | null;

  merchantSearchStatus: SignalStatus;
  merchantSearchError: string | null;
  merchantSource: "scenario" | "osm" | "none";
  nearbyMerchants: OsmMerchant[];

  demandStatus: SignalStatus;
  demandError: string | null;
  demandSource: PayoneDemandSource | "demo";
  demandLastUpdated: string | null;
  quietRatio: number;

  // Aggregate counters (this session)
  generatedTotal: number;
  acceptedTotal: number;
  redeemedTotal: number;
  dismissedTotal: number;
  expiredTotal: number;

  // Multi-channel delivery
  notificationSupport: NotificationSupport;
  pushAutoEnabled: boolean;
  pushScheduledId: string | null;
  pushChannelStatus:
    | "idle"
    | "scheduled"
    | "delivered"
    | "opened"
    | "blocked"
    | "suppressed";
  pushSentTotal: number;
  pushOpenedTotal: number;
  pushSuppressedTotal: number;
  lastPushAt: number | null;
  lastPushReason: string;

  // Composite trigger relation + on-device preferences
  triggerComposition: TriggerComposition;
  preferences: PreferenceSummary;

  setScenario: (scenario: ScenarioName) => void;
  setScenarioEnabled: (enabled: boolean) => void;
  updateMerchantRules: (
    patch: Partial<
      Pick<
        DemoContext["merchant"],
        "goal" | "maxDiscount" | "targetProduct" | "normalTransactionDensity"
      >
    >,
  ) => void;
  refreshWeather: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  refreshLocation: () => Promise<void>;
  refreshDemand: () => Promise<void>;
  refreshAll: () => Promise<void>;
  acceptOffer: () => void;
  dismissOffer: () => void;
  redeemOffer: () => void;
  expireOffer: () => void;
  reset: () => void;

  enablePushChannel: () => Promise<NotificationSupport>;
  setPushAutoEnabled: (enabled: boolean) => void;
  triggerTestPush: () => Promise<void>;
  markPushDelivered: (offerId: string) => void;
  markPushOpened: (offerId: string) => void;
  refreshNotificationSupport: () => Promise<NotificationSupport>;
  refreshPreferences: () => Promise<void>;
};

function getScenarioSeed(name: ScenarioName) {
  if (name === "sunnyNormal") return sunnyNormalScenario;
  if (name === "eventDinner") return eventDinnerScenario;
  return rainCafeScenario;
}

function applyLiveWeatherToContext(
  context: DemoContext,
  live: LiveWeather,
): DemoContext {
  return {
    ...context,
    weather: {
      condition: live.condition,
      temperature: live.temperatureC,
    },
  };
}

function applyEventSignalToContext(
  context: DemoContext,
  eventCount: number,
): DemoContext {
  const periodHasEvent = context.time.period.toLowerCase().includes("event");
  if (eventCount > 0 && !periodHasEvent) {
    return {
      ...context,
      time: {
        ...context.time,
        period: `${context.time.period} · Event nearby`,
      },
    };
  }
  return context;
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

function applyLiveTimeToContext(context: DemoContext): DemoContext {
  return {
    ...context,
    time: computeLiveTime(),
  };
}

function buildPendingOffer(context: DemoContext): GeneratedOffer {
  return {
    id: `offer-pending-${Date.now()}`,
    title: "Generating local offer…",
    subtitle: `Reading context for ${context.merchant.name || context.city}`,
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
      accent: "#14110D",
      mood: "pending",
    },
  };
}

function buildEmptyLiveContext(city: string): DemoContext {
  return {
    city,
    weather: { condition: "Cloudy", temperature: 15 },
    time: computeLiveTime(),
    user: {
      name: "You",
      distanceToMerchantMeters: 0,
      movementIntent: "browsing",
      preference: "",
      abstractIntent: "browse_local_casual",
    },
    merchant: {
      id: "no-merchant",
      name: "Looking for nearby partners…",
      category: "Pending",
      currentDemand: "normal",
      transactionDensity: 0,
      normalTransactionDensity: 0,
      goal: "—",
      maxDiscount: 0,
      targetProduct: "—",
    },
  };
}

export const useWalletStore = create<WalletState>((set, get) => {
  const initialContext = buildEmptyLiveContext(DEFAULT_CITY);
  let offerRequestId = 0;
  let offerRequestInFlight = false;
  let queuedContext: DemoContext | null = null;
  let periodicTimer: ReturnType<typeof setInterval> | null = null;
  let locationRefreshPromise: Promise<void> | null = null;

  const recomputeComposition = () => {
    const state = get();
    const composition = buildTriggerComposition({
      context: state.context,
      eventCount: state.upcomingEventCount,
      eventName: state.nextEventName,
      preferenceLabel: state.preferences.dominantLabel,
      preferenceMatches: state.preferences.dominantGroup
        ? inferPreferenceGroup(state.context.merchant.category) ===
          state.preferences.dominantGroup
        : false,
    });
    set({ triggerComposition: composition });
    return composition;
  };

  const maybeScheduleOfferPush = async (offer: GeneratedOffer) => {
    const state = get();
    if (offer.token === "PENDING") return;
    if (!state.pushAutoEnabled) return;
    if (state.notificationSupport !== "ready") return;

    const composition = recomputeComposition();
    const evaluation = evaluatePushRules({
      context: state.context,
      composition,
      quietRatio: state.quietRatio,
      lastPushAt: state.lastPushAt,
      accepted: state.accepted,
      dismissed: state.dismissed,
      expired: state.expired,
    });

    if (!evaluation.shouldPush) {
      await cancelScheduledPush(state.pushScheduledId);
      set((s) => ({
        pushScheduledId: null,
        pushChannelStatus: "suppressed",
        pushSuppressedTotal: s.pushSuppressedTotal + 1,
        lastPushReason: evaluation.reason,
      }));
      return;
    }

    await cancelScheduledPush(state.pushScheduledId);
    const id = await scheduleOfferPush(offer);
    if (!id) return;
    set((s) => ({
      pushScheduledId: id,
      pushChannelStatus: "scheduled",
      pushSentTotal: s.pushSentTotal + 1,
      lastPushAt: Date.now(),
      lastPushReason: evaluation.reason,
    }));
  };

  const cancelOfferPush = async () => {
    const { pushScheduledId } = get();
    if (!pushScheduledId) return;
    await cancelScheduledPush(pushScheduledId);
    set({ pushScheduledId: null });
  };

  const enrichWithPreferences = (context: DemoContext): DemoContext => {
    const { preferences } = get();
    if (!preferences.dominantLabel) return context;
    return {
      ...context,
      user: {
        ...context.user,
        preference: preferences.dominantLabel,
      },
    };
  };

  const refreshOffer = (context: DemoContext) => {
    if (context.merchant.id === "no-merchant") return;
    const enriched = enrichWithPreferences(context);
    if (offerRequestInFlight) {
      queuedContext = enriched;
      return;
    }
    offerRequestInFlight = true;
    const requestId = ++offerRequestId;
    void generateOffer(enriched)
      .then((offer) => {
        const latest = get();
        if (latest.accepted || requestId !== offerRequestId) return;
        set({
          offer,
          offerGeneratedAt: Date.now(),
          generatedTotal: latest.generatedTotal + 1,
        });
        void maybeScheduleOfferPush(offer);
      })
      .catch((error) => {
        console.error("[walletStore] Offer refresh failed", error);
      })
      .finally(() => {
        offerRequestInFlight = false;
        if (!queuedContext) return;
        const next = queuedContext;
        queuedContext = null;
        refreshOffer(next);
      });
  };

  const startPeriodicRefresh = () => {
    if (periodicTimer) return;
    periodicTimer = setInterval(() => {
      const latest = get();
      if (
        latest.context.merchant.id !== "no-merchant" &&
        !latest.accepted
      ) {
        const tickContext = applyLiveTimeToContext(latest.context);
        if (tickContext.time.period !== latest.context.time.period) {
          set({ context: tickContext });
          recomputeComposition();
        }
      }
      void get().refreshDemand();
    }, PERIODIC_DEMAND_INTERVAL_MS);
  };

  startPeriodicRefresh();

  return {
    scenarioName: null,
    scenarioEnabled: false,
    context: initialContext,
    offer: buildPendingOffer(initialContext),
    offerGeneratedAt: null,
    accepted: false,
    dismissed: false,
    redeemed: false,
    expired: false,

    weatherStatus: "idle",
    weatherError: null,
    weatherDescription: null,

    eventStatus: "idle",
    eventError: null,
    upcomingEventCount: 0,
    nextEventName: null,

    locationStatus: "idle",
    locationError: null,
    locationCity: null,
    locationCoords: null,

    merchantSearchStatus: "idle",
    merchantSearchError: null,
    merchantSource: "none",
    nearbyMerchants: [],

    demandStatus: "idle",
    demandError: null,
    demandSource: "demo",
    demandLastUpdated: null,
    quietRatio: 0,

    generatedTotal: 0,
    acceptedTotal: 0,
    redeemedTotal: 0,
    dismissedTotal: 0,
    expiredTotal: 0,

    notificationSupport: "unknown",
    pushAutoEnabled: false,
    pushScheduledId: null,
    pushChannelStatus: "idle",
    pushSentTotal: 0,
    pushOpenedTotal: 0,
    pushSuppressedTotal: 0,
    lastPushAt: null,
    lastPushReason: "Awaiting first signal evaluation.",

    triggerComposition: EMPTY_TRIGGER_COMPOSITION,
    preferences: EMPTY_PREFERENCES,

    refreshWeather: async () => {
      const apiKey = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY?.trim();
      if (!apiKey) {
        set({
          weatherStatus: "error",
          weatherError:
            "Set EXPO_PUBLIC_OPENWEATHER_API_KEY in .env to enable real weather.",
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
          weatherDescription: live.description,
          ...(accepted ? {} : { offer: buildPendingOffer(nextContext) }),
        });
        recomputeComposition();
        if (!accepted) refreshOffer(nextContext);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Weather request failed.";
        set({ weatherStatus: "error", weatherError: message });
      }
    },

    refreshEvents: async () => {
      const apiKey = process.env.EXPO_PUBLIC_TICKETMASTER_API_KEY?.trim();
      if (!apiKey) {
        set({
          eventStatus: "error",
          eventError:
            "Set EXPO_PUBLIC_TICKETMASTER_API_KEY in .env to enable live events.",
          upcomingEventCount: 0,
          nextEventName: null,
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
          upcomingEventCount: live.count,
          nextEventName: live.nextEventName,
          ...(accepted ? {} : { offer: buildPendingOffer(nextContext) }),
        });
        recomputeComposition();
        if (!accepted) refreshOffer(nextContext);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Events request failed.";
        set({
          eventStatus: "error",
          eventError: message,
          upcomingEventCount: 0,
          nextEventName: null,
        });
      }
    },

    refreshLocation: async () => {
      const { scenarioEnabled, accepted } = get();
      if (scenarioEnabled) return;
      if (locationRefreshPromise) return locationRefreshPromise;

      locationRefreshPromise = (async () => {
        set({
        locationStatus: "loading",
        locationError: null,
        merchantSearchStatus: "loading",
        merchantSearchError: null,
      });

      try {
        const signal = await fetchLiveLocationSignal();
        const cityLabel = signal.city ?? DEFAULT_CITY;

        let merchants: OsmMerchant[] = [];
        try {
          merchants = await findNearbyMerchants(signal.userCoords, {
            maxResults: 6,
          });
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Merchant search failed.";
          set({
            merchantSearchStatus: "error",
            merchantSearchError: message,
            nearbyMerchants: [],
          });
        }

        const apiKey = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY?.trim();
        let weather: DemoContext["weather"] = get().context.weather;
        if (apiKey) {
          try {
            const live = await fetchOpenWeatherCurrentByCoords(
              signal.userCoords,
              apiKey,
            );
            weather = {
              condition: live.condition,
              temperature: live.temperatureC,
            };
            set({
              weatherStatus: "ready",
              weatherError: null,
              weatherDescription: live.description,
            });
          } catch (err) {
            const message =
              err instanceof Error ? err.message : "Weather request failed.";
            set({ weatherStatus: "error", weatherError: message });
          }
        }

        if (merchants.length > 0) {
          const closest = merchants[0];
          const nextContext = buildContextFromOsmMerchant({
            city: cityLabel,
            weather,
            merchant: closest,
          });
          set({
            context: nextContext,
            locationStatus: "ready",
            locationError: null,
            locationCity: cityLabel,
            locationCoords: signal.userCoords,
            merchantSearchStatus: "ready",
            merchantSearchError: null,
            merchantSource: "osm",
            nearbyMerchants: merchants,
            ...(accepted ? {} : { offer: buildPendingOffer(nextContext) }),
          });
          recomputeComposition();
          if (!accepted) refreshOffer(nextContext);
          void get().refreshEvents();
          void get().refreshDemand();
          return;
        }

        // No real merchant within reach — show honest empty state.
        const emptyContext = buildEmptyLiveContext(cityLabel);
        set({
          context: emptyContext,
          offer: buildPendingOffer(emptyContext),
          offerGeneratedAt: null,
          locationStatus: "ready",
          locationError: null,
          locationCity: cityLabel,
          locationCoords: signal.userCoords,
          merchantSearchStatus: "ready",
          merchantSearchError: null,
          merchantSource: "none",
          nearbyMerchants: [],
        });
        recomputeComposition();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Location request failed.";
        set({
          locationStatus: "error",
          locationError: message,
          merchantSearchStatus: "idle",
        });
      }
      })().finally(() => {
        locationRefreshPromise = null;
      });

      return locationRefreshPromise;
    },

    refreshDemand: async () => {
      const { context, accepted } = get();
      if (context.merchant.id === "no-merchant") return;
      set({ demandStatus: "loading", demandError: null });
      try {
        const live = await fetchPayoneDensity(context);
        const nextContext = applyDemandSignalToContext(context, live);
        set({
          context: nextContext,
          demandStatus: "ready",
          demandError: null,
          demandSource: live.source,
          demandLastUpdated: live.generatedAt,
          quietRatio: live.quietRatio,
          ...(accepted ? {} : { offer: buildPendingOffer(nextContext) }),
        });
        recomputeComposition();
        if (!accepted) refreshOffer(nextContext);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Payone demand feed failed.";
        set({
          demandStatus: "error",
          demandError: message,
          demandSource: "demo",
        });
      }
    },

    refreshAll: async () => {
      const { scenarioEnabled } = get();
      if (scenarioEnabled) {
        // Scenarios: weather + events + demand (location not used).
        await Promise.allSettled([
          get().refreshWeather(),
          get().refreshEvents(),
          get().refreshDemand(),
        ]);
      } else {
        // Live: location triggers everything else internally.
        await get().refreshLocation();
      }
    },

    setScenario: (scenarioName) => {
      const baseContext = getScenarioSeed(scenarioName);
      set({
        scenarioName,
        scenarioEnabled: true,
        context: baseContext,
        offer: buildPendingOffer(baseContext),
        offerGeneratedAt: null,
        accepted: false,
        dismissed: false,
        redeemed: false,
        expired: false,
        weatherStatus: "idle",
        weatherError: null,
        eventStatus: "idle",
        eventError: null,
        upcomingEventCount: 0,
        nextEventName: null,
        locationStatus: "idle",
        locationError: null,
        locationCity: null,
        locationCoords: null,
        merchantSearchStatus: "idle",
        merchantSearchError: null,
        merchantSource: "scenario",
        nearbyMerchants: [],
        demandStatus: "idle",
        demandError: null,
        demandSource: "demo",
        demandLastUpdated: null,
        quietRatio: 0,
      });
      recomputeComposition();
      refreshOffer(baseContext);
      void get().refreshWeather();
      void get().refreshEvents();
      void get().refreshDemand();
    },

    setScenarioEnabled: (enabled) => {
      const current = get();
      if (enabled) {
        const fallback = current.scenarioName ?? "rainCafe";
        current.setScenario(fallback);
        return;
      }
      const liveContext = buildEmptyLiveContext(
        current.locationCity ?? DEFAULT_CITY,
      );
      set({
        scenarioEnabled: false,
        scenarioName: null,
        context: liveContext,
        offer: buildPendingOffer(liveContext),
        offerGeneratedAt: null,
        accepted: false,
        dismissed: false,
        redeemed: false,
        expired: false,
        merchantSource: "none",
        nearbyMerchants: [],
      });
      recomputeComposition();
      void get().refreshLocation();
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
      recomputeComposition();
      if (!accepted) refreshOffer(nextContext);
    },

    acceptOffer: () => {
      const { accepted, acceptedTotal, context } = get();
      set({
        accepted: true,
        dismissed: false,
        acceptedTotal: accepted ? acceptedTotal : acceptedTotal + 1,
      });
      void cancelOfferPush();
      void recordPreferenceEvent({
        type: "accepted",
        category: context.merchant.category,
        group: inferPreferenceGroup(context.merchant.category),
        hourOfDay: new Date().getHours(),
        weather: context.weather.condition,
      }).then((summary) => {
        set({ preferences: summary });
        recomputeComposition();
      });
    },

    dismissOffer: () => {
      const { dismissed, dismissedTotal, context } = get();
      set({
        dismissed: true,
        accepted: false,
        dismissedTotal: dismissed ? dismissedTotal : dismissedTotal + 1,
      });
      void cancelOfferPush();
      void recordPreferenceEvent({
        type: "dismissed",
        category: context.merchant.category,
        group: inferPreferenceGroup(context.merchant.category),
        hourOfDay: new Date().getHours(),
        weather: context.weather.condition,
      }).then((summary) => {
        set({ preferences: summary });
        recomputeComposition();
      });
    },

    redeemOffer: () => {
      const { redeemed, redeemedTotal, context } = get();
      set({
        redeemed: true,
        expired: false,
        redeemedTotal: redeemed ? redeemedTotal : redeemedTotal + 1,
      });
      void recordPreferenceEvent({
        type: "redeemed",
        category: context.merchant.category,
        group: inferPreferenceGroup(context.merchant.category),
        hourOfDay: new Date().getHours(),
        weather: context.weather.condition,
      }).then((summary) => {
        set({ preferences: summary });
        recomputeComposition();
      });
    },

    expireOffer: () => {
      const { expired, expiredTotal } = get();
      set({
        expired: true,
        expiredTotal: expired ? expiredTotal : expiredTotal + 1,
      });
      void cancelOfferPush();
    },

    refreshPreferences: async () => {
      const summary = await getPreferenceSummary();
      set({ preferences: summary });
      recomputeComposition();
    },

    reset: () => {
      const { context } = get();
      set({
        offer: buildPendingOffer(context),
        offerGeneratedAt: null,
        accepted: false,
        dismissed: false,
        redeemed: false,
        expired: false,
      });
      refreshOffer(context);
      void get().refreshDemand();
    },

    enablePushChannel: async () => {
      const support = await requestNotificationPermission();
      set({
        notificationSupport: support,
        pushAutoEnabled: support === "ready",
        pushChannelStatus: support === "ready" ? "idle" : "blocked",
      });
      const { offer } = get();
      if (support === "ready" && offer.token !== "PENDING") {
        void maybeScheduleOfferPush(offer);
      }
      return support;
    },

    refreshNotificationSupport: async () => {
      const support = await getNotificationSupport();
      set({
        notificationSupport: support,
        pushAutoEnabled: support === "ready",
        pushChannelStatus: support === "ready" ? "idle" : "blocked",
      });
      return support;
    },

    setPushAutoEnabled: (enabled) => {
      set({ pushAutoEnabled: enabled });
      if (!enabled) void cancelOfferPush();
    },

    triggerTestPush: async () => {
      const state = get();
      let support = state.notificationSupport;
      if (support !== "ready") {
        support = await requestNotificationPermission();
        set({
          notificationSupport: support,
          pushAutoEnabled: support === "ready" ? true : state.pushAutoEnabled,
          pushChannelStatus: support === "ready" ? "idle" : "blocked",
        });
      }
      if (support !== "ready") return;
      if (state.offer.token === "PENDING") return;
      await cancelScheduledPush(state.pushScheduledId);
      const id = await scheduleOfferPush(state.offer);
      if (!id) return;
      set((s) => ({
        pushScheduledId: id,
        pushChannelStatus: "scheduled",
        pushSentTotal: s.pushSentTotal + 1,
        lastPushAt: Date.now(),
        lastPushReason: "Manual test push (rules bypassed).",
      }));
    },

    markPushDelivered: (offerId) => {
      const { offer, pushChannelStatus } = get();
      if (offer.id !== offerId) return;
      if (pushChannelStatus === "opened") return;
      set({ pushChannelStatus: "delivered" });
    },

    markPushOpened: (offerId) => {
      const { offer } = get();
      if (offer.id !== offerId) return;
      set((s) => ({
        pushChannelStatus: "opened",
        pushOpenedTotal: s.pushOpenedTotal + 1,
      }));
    },
  };
});

// Initialise notification support state (no permission prompt).
void getNotificationSupport().then((support) => {
  useWalletStore.setState({
    notificationSupport: support,
    pushAutoEnabled: support === "ready",
    pushChannelStatus: support === "ready" ? "idle" : "blocked",
  });
});

// Hydrate on-device preferences from AsyncStorage.
void useWalletStore.getState().refreshPreferences();
