import { create } from "zustand";
import {
  DemoContext,
  eventDinnerScenario,
  rainCafeScenario,
  sunnyNormalScenario,
} from "../data/demoData";
import { GeneratedOffer, generateOffer } from "../logic/offerEngine";

export type ScenarioName = "rainCafe" | "sunnyNormal" | "eventDinner";

type WalletState = {
  scenarioName: ScenarioName;
  context: DemoContext;
  offer: GeneratedOffer;
  accepted: boolean;
  dismissed: boolean;
  redeemed: boolean;
  expired: boolean;
  setScenario: (scenario: ScenarioName) => void;
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

export const useWalletStore = create<WalletState>((set, get) => {
  const initialContext = rainCafeScenario;

  return {
    scenarioName: "rainCafe",
    context: initialContext,
    offer: generateOffer(initialContext),
    accepted: false,
    dismissed: false,
    redeemed: false,
    expired: false,

    setScenario: (scenarioName) => {
      const context = getScenario(scenarioName);
      set({
        scenarioName,
        context,
        offer: generateOffer(context),
        accepted: false,
        dismissed: false,
        redeemed: false,
        expired: false,
      });
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
        offer: generateOffer(context),
        accepted: false,
        dismissed: false,
        redeemed: false,
        expired: false,
      });
    },
  };
});
