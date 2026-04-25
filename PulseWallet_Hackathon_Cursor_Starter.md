# PulseWallet — Hackathon Starter Plan for Cursor

## Project

**PulseWallet** — a privacy-preserving Generative City Wallet for local merchants.

### One-sentence pitch

PulseWallet detects the right local moment using weather, time, proximity, user intent, and merchant demand, then dynamically generates a redeemable offer with a QR/token flow and merchant dashboard.

---

## Challenge interpretation

This project is for the **Generative City-Wallet** challenge.

The brief asks for a working end-to-end MVP that:

1. Detects the most relevant local offer for a user in real time.
2. Generates the offer dynamically.
3. Makes it redeemable through a simulated checkout.
4. Shows both consumer and merchant views.
5. Uses visible context signals such as weather, time, location, local events, or demand proxies.
6. Shows a merchant-side rule interface, even as a mockup.
7. Handles privacy/GDPR honestly by avoiding raw movement/preference data being sent upstream.
8. Demonstrates the full loop: context detection → offer generation → display → accept/decline → checkout/redemption.

The strongest hackathon version is **not** a huge AI system. It is one complete, polished, believable scenario.

---

## Recommended MVP scope

Build one perfect scenario:

> Mia is walking in Stuttgart during a rainy Tuesday lunch break. She is 80m from Café Müller. The café has unusually low transaction density. The merchant rule says: “Fill quiet lunch hours, max 20% discount, warm drinks preferred.” PulseWallet generates: “Cold outside? Your cappuccino is waiting.” Mia accepts, receives a QR token, the merchant validates it, and the dashboard updates.

---

## What to build

### Required screens

Use **Expo React Native** with **Expo Router**.

```txt
app/
  _layout.tsx
  index.tsx       # Customer Wallet screen
  merchant.tsx    # Merchant Dashboard screen
  redeem.tsx      # QR/token validation screen
  demo.tsx        # Demo scenario switcher
```

### Required source files

```txt
src/
  data/
    demoData.ts
  logic/
    offerEngine.ts
  store/
    walletStore.ts
```

---

## Tech stack

Use:

```txt
Expo React Native
TypeScript
Expo Router
Zustand
react-native-qrcode-svg
lucide-react-native
```

Do **not** build bare React Native CLI unless there is extra time. Expo is safer for a 12-hour hackathon.

---

## Setup commands

Open PowerShell:

```powershell
cd $env:USERPROFILE\Desktop

npx create-expo-app@latest pulse-wallet --template default

cd pulse-wallet

npm install lucide-react-native react-native-svg react-native-qrcode-svg zustand
```

Start the app:

```powershell
npx expo start
```

Press:

```txt
a
```

This opens the Android emulator.

---

## Android Studio checklist

Use Android Studio only for emulator/device testing.

Install/check:

```txt
Android SDK Platform
Android SDK Build-Tools
Android SDK Command-line Tools
Android Emulator
Android SDK Platform-Tools
```

Create emulator:

```txt
Pixel 7 or Pixel 8
Recent Android API image
```

---

## Core product logic

### Privacy-first architecture

The app should show this architecture in the UI/pitch:

```txt
Raw phone context:
- exact location
- movement pattern
- preference history

stays on device.

The app locally converts this into an abstract intent:
nearby_browsing_warm_drink

Only this abstract intent is sent to the offer engine.
Merchant only sees aggregate analytics.
```

### AI/SLM strategy

For the 12-hour MVP:

```txt
Rule engine decides:
- discount
- expiry
- eligibility
- QR token
- redemption status

AI/SLM or template engine writes:
- title
- subtitle
- emotional tone
- short explanation
```

Use optional Ollama/Gemma only if stable. Always include fallback text generation.

Do **not** claim that the React Native app runs a full SLM on every real phone unless actually implemented.

Recommended claim:

> In this MVP, privacy-preserving intent extraction runs locally on the phone. The generative layer can run on-device in production with Gemma/Phi-style SLMs; for this demo we keep a fallback offer generator so the end-to-end flow never breaks.

---

## Data model

Create `src/data/demoData.ts`.

```ts
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
```

---

## Offer engine

Create `src/logic/offerEngine.ts`.

```ts
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
```

---

## Zustand store

Create `src/store/walletStore.ts`.

```ts
import { create } from "zustand";
import {
  DemoContext,
  rainCafeScenario,
  sunnyNormalScenario,
  eventDinnerScenario,
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
      set({ redeemed: true });
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
```

---

## UI requirements

### Customer Wallet screen

Must visibly show:

```txt
- Header: PulseWallet
- "Generated for Mia"
- Context chips:
  - Rain, 11°C
  - 80m away
  - Lunch break
  - Low demand
- Main generated offer card:
  - Cold outside?
  - Your cappuccino is waiting.
  - 15% cashback
  - Café Müller · 80m away · expires in 12 min
- Buttons:
  - Accept offer
  - Dismiss
- After acceptance:
  - QR token
  - Token ID
  - "Show this QR at merchant checkout"
- Privacy note:
  - Raw GPS and behavior stay on device.
```

### Merchant dashboard

Must visibly show:

```txt
- Merchant name
- Goal: Fill quiet lunch hours
- Max discount: 20%
- Trigger: low demand + bad weather + nearby browsing user
- Demand signal:
  - current transaction density
  - normal transaction density
- Performance:
  - generated offers
  - accepted
  - redeemed
  - acceptance rate
- Mock rule form:
  - goal
  - max discount
  - target product
  - quiet threshold
```

### Redeem screen

Must visibly show:

```txt
- Token validation
- Merchant
- Token ID
- Cashback amount
- Status:
  - waiting
  - accepted
  - redeemed
  - expired
```

### Demo screen

Must visibly show:

```txt
- Scenario switcher:
  1. Rain + quiet café + nearby browsing user
  2. Sunny + normal demand + commuting user
  3. Event nearby + low restaurant demand
- Current context summary
- Button to run customer demo
```

---

## Design direction

Visual style:

```txt
Warm, local, trustworthy, city-wallet feel.
Not crypto.
Not bank-heavy.
Not generic coupon app.
```

Colors:

```txt
Background: #F7F1E8
Card: #FFF8EF
Text dark: #1F1A17
Brown accent: #8A4E2F
Gold accent: #E8C37D
Green success: #2F6B4F
Border: #E7D8C4
```

UX principle:

```txt
The offer must be understood in 3 seconds.
```

Main card hierarchy:

```txt
Cold outside?
Your cappuccino is waiting.

15% cashback
Café Müller · 80m away · expires in 12 min
```

---

## What not to build

Do not waste hackathon time on:

```txt
- Real Payone integration
- Real bank account integration
- Real payment processor
- Real merchant login/auth
- Native Kotlin app
- Full on-device SLM
- Real geofencing
- Complex maps
- Many merchants
- Many cities
```

Build the full loop first.

---

## Team split

### Developer 1 — Mobile UI

Own:

```txt
app/_layout.tsx
app/index.tsx
app/merchant.tsx
app/redeem.tsx
app/demo.tsx
```

Focus:

```txt
- beautiful mobile screen
- 3-second offer card
- QR token screen
- merchant dashboard
```

### Developer 2 — Logic/state/demo

Own:

```txt
src/data/demoData.ts
src/logic/offerEngine.ts
src/store/walletStore.ts
```

Focus:

```txt
- dynamic offer generation
- scenario switching
- token state
- accept/dismiss/redeem/expire flow
```

### Cybersecurity specialist — Privacy/security story

Own:

```txt
- privacy slide
- GDPR explanation
- QR token abuse risks
- one-time token model
- aggregate-only merchant analytics
```

Privacy/security points:

```txt
- Raw GPS stays on device
- Raw movement history stays on device
- Preference history stays on device
- Only abstract intent reaches offer engine
- QR token expires
- QR token is single-use
- Merchant sees aggregate analytics only
- User can dismiss without penalty
```

---

## 12-hour timeline

```txt
Hour 0–1:
Project setup, Expo emulator running, base routes.

Hour 1–3:
Customer Wallet screen with context chips and offer card.

Hour 3–4:
Offer engine and Zustand store.

Hour 4–5:
Accept/dismiss states and QR generation.

Hour 5–6:
Redeem screen and token validation state.

Hour 6–7.5:
Merchant dashboard and rule mockup.

Hour 7.5–8.5:
Demo scenario switcher.

Hour 8.5–9.5:
Privacy explanation and UI polish.

Hour 9.5–10.5:
Bug fixing on Android emulator.

Hour 10.5–11:
Prepare pitch script.

Hour 11–12:
Record backup video, test final demo twice.
```

---

## Final demo order

```txt
1. Open Demo screen.
2. Select "Rain + quiet café + nearby browsing user."
3. Open Customer Wallet.
4. Show context chips.
5. Show generated offer.
6. Accept offer.
7. Show QR token.
8. Open Redeem screen.
9. Validate token.
10. Open Merchant Dashboard.
11. Show accepted/redeemed numbers changed.
12. Explain privacy model.
13. Switch to another scenario to prove configurability.
```

---

## Final pitch script

Use this:

```txt
PulseWallet is not a coupon app.

Traditional coupon systems create static discounts and hope the user cares.
PulseWallet creates offers only when the moment is right.

In this demo, Mia is walking in Stuttgart during a rainy Tuesday lunch break.
She is 80 meters from Café Müller, which currently has unusually low transaction density.
The merchant did not write a coupon manually. They only set a goal: fill quiet lunch hours, with a max 20% discount.

PulseWallet combines weather, time, proximity, user intent, and merchant demand.
It generates a specific offer: "Cold outside? Your cappuccino is waiting."
The user understands it in under three seconds, accepts it, and receives a QR token.
The merchant validates the token in a simulated checkout, and the dashboard updates.

For privacy, raw GPS, movement history, and preferences stay on-device.
Only the abstract intent label — nearby_browsing_warm_drink — is used by the offer engine.
The merchant only sees aggregate performance, not the user's private behavior.

This gives local merchants algorithmic personalization without needing a data science team.
```

---

# Cursor prompt

Copy this whole prompt into Cursor.

```txt
You are building a 12-hour hackathon MVP called PulseWallet.

It is an Expo React Native app using TypeScript and Expo Router.

Goal:
Build a privacy-preserving Generative City Wallet for local merchants.

Core demo:
Mia is in Stuttgart during a rainy Tuesday lunch break. She is 80m from Café Müller. The café has unusually low transaction density. The merchant rule is: fill quiet lunch hours, max 20% discount, target warm drinks. The app dynamically generates a contextual offer: “Cold outside? Your cappuccino is waiting.” Mia accepts, gets a QR token, merchant validates it, and dashboard updates.

Important:
This must not look like a static coupon app. The offer should be generated from context inputs.

Use this stack:
- Expo React Native
- TypeScript
- Expo Router
- Zustand
- lucide-react-native
- react-native-qrcode-svg
- react-native-svg

Create this structure:
app/
  _layout.tsx
  index.tsx
  merchant.tsx
  redeem.tsx
  demo.tsx
src/
  data/
    demoData.ts
  logic/
    offerEngine.ts
  store/
    walletStore.ts

Implement:
1. Customer Wallet screen:
   - warm premium UI
   - context chips: weather, distance, time, demand
   - generated offer card
   - 3-second comprehension hierarchy:
     “Cold outside?”
     “Your cappuccino is waiting.”
     “15% cashback”
     “Café Müller · 80m away · expires in 12 min”
   - Accept offer button
   - Dismiss button
   - after accept, show QR code and token
   - privacy note

2. Merchant Dashboard:
   - merchant name
   - campaign rules:
     goal, max discount, trigger, quiet threshold
   - demand signal:
     current transaction density and normal transaction density
   - performance cards:
     generated, accepted, redeemed, acceptance rate
   - mock merchant rule interface

3. Redeem screen:
   - validates accepted token
   - shows merchant, token, discount, cashback, status
   - button to validate token
   - link back to merchant dashboard and wallet

4. Demo screen:
   - scenario switcher:
     rainCafe
     sunnyNormal
     eventDinner
   - show current context summary
   - button to run customer demo

5. Offer engine:
   - input: DemoContext
   - output: GeneratedOffer
   - compute discount based on:
     weather condition
     merchant demand
     distance
     movement intent
     max merchant discount
   - generate title, subtitle, expiry, reasons, privacy note, widget style
   - generate unique token
   - include privacy-safe abstract intent in reasons

6. State:
   - Zustand store
   - scenarioName
   - context
   - offer
   - accepted
   - dismissed
   - redeemed
   - expired
   - setScenario
   - acceptOffer
   - dismissOffer
   - redeemOffer
   - expireOffer
   - reset

Design:
Use warm city-wallet style:
- background #F7F1E8
- card #FFF8EF
- dark text #1F1A17
- brown accent #8A4E2F
- gold accent #E8C37D
- success green #2F6B4F
- border #E7D8C4
Use rounded cards, clean hierarchy, mobile-first layout.

Privacy message:
Raw GPS, movement, and preferences stay on-device. Only an abstract intent signal like nearby_browsing_warm_drink is used by the offer engine. Merchant sees aggregate analytics only.

Do not build:
- real Payone
- real payments
- real login
- real map
- native Kotlin
- full on-device LLM

Generate all required files with complete code. Make it run with:
npm install lucide-react-native react-native-svg react-native-qrcode-svg zustand
npx expo start
```

---

## Acceptance checklist

Before submission, verify:

```txt
[ ] App opens in Android emulator
[ ] Customer screen shows context chips
[ ] Offer is generated from current scenario
[ ] User can accept offer
[ ] QR appears after acceptance
[ ] User can validate token
[ ] Merchant dashboard updates accepted/redeemed stats
[ ] Demo screen can switch scenarios
[ ] Privacy note is visible
[ ] Merchant rule interface is visible
[ ] Pitch says “not a coupon app”
```

---

## Backup plan

If anything breaks:

```txt
Keep only:
- Customer screen
- Accept offer
- QR token
- Merchant dashboard
- Privacy note
```

The challenge rewards a connected partial flow more than a polished disconnected mockup.

