# Generative City Wallet

Privacy-first mobile wallet that surfaces a single, contextually relevant local
offer at the right moment — generated on-device against live signals, not
broadcast to everyone.

Built for the DSV-Gruppe **Generative City Wallet** hackathon brief.

---

## What it does

When the user opens the wallet, the app fuses real signals into one offer:

| Signal       | Source                                   | What it tells us                     |
| ------------ | ---------------------------------------- | ------------------------------------ |
| Location     | Device GPS (`expo-location`)             | Where the user actually is           |
| Merchants    | OpenStreetMap Overpass API (key-free)    | Real cafés, restaurants, museums, shops, parks…  |
| Weather      | OpenWeatherMap (by coords)               | Rain → push warm drinks, etc.        |
| Events       | Ticketmaster Discovery (by city)         | Pre-event quiet hours, footfall      |
| Demand       | Payone demand feed (live or simulator)   | "How quiet is this merchant now?"    |
| Time / day   | Device clock                             | Lunch break? Late night?             |
| Taste        | On-device AsyncStorage (private)         | Past accepts/dismisses, no sync      |

Those signals are folded into a **composite trigger** — for example
`Cold rain · Quiet -55% · 80 m away · Lunch break, browsing` — which both
explains the offer to the user and gates whether the wallet is allowed to
interrupt them with a real push notification.

A local LLM (Ollama / Gemma) writes the offer JSON — wording, %, mood, widget
colors — using that composite plus the user's on-device taste hint. The app
never shares raw GPS, identity, or history with the merchant.

The same offer is previewed across **four channels** — push, lock-screen
widget, home banner, and in-app card — so judges see how the offer holds the
3-second attention test on every surface.

---

## Screens

| Route          | Question it answers                              |
| -------------- | ------------------------------------------------ |
| `/`            | What offer do I have, and why should I use it?   |
| `/merchant`    | How is my campaign doing — and what can I tune?  |
| `/redeem`      | Is this offer ready to redeem?                   |
| `/demo`        | Which scenario should we present?                |

---

## Architecture

```
app/                    Expo Router screens (UI only)
  _layout.tsx           Root stack; kicks off live refresh
  index.tsx             Customer wallet
  merchant.tsx          Merchant dashboard
  redeem.tsx            QR redemption
  demo.tsx              Live ↔ scenario switcher

src/
  theme.ts                  Editorial-fintech design tokens + WCAG helpers
  config/
    dataSources.ts          Single config block for providers + push rules
  components/
    ChannelPreview.tsx      Push / lock / home / in-app preview (rendered on /demo)
    Section.tsx             Eyebrow + title block
  data/
    demoData.ts             Three storyboard scenarios
    merchantCatalog.ts      Scenario merchant seeds (NOT used in live mode)
  logic/
    offerEngine.ts          Calls Ollama backend, validates, falls back
    contextBuilder.ts       Live-time, intent inference, default rules
    triggerComposition.ts   Builds composite trigger relation + scores
    pushRules.ts            Cooldown / distance / signal-strength gating
  services/
    location.ts             expo-location → coords + city
    overpass.ts             OSM Overpass POI search (real merchants)
    openWeather.ts          Live weather by coords
    eventbrite.ts           Ticketmaster city events
    payone.ts               Live or simulated demand signal
    notifications.ts        expo-notifications local push
    preferences.ts          On-device AsyncStorage taste memory
    redeemApi.ts            Token validation
  store/
    walletStore.ts          Zustand: signals, offer, aggregates, periodic refresh
```

### Live vs. scenario

- **Live mode** (default): GPS fix → Overpass query for nearby cafés/restaurants
  /bakeries → closest real venue becomes the merchant. If nothing real is
  within ~3 km, the wallet shows an honest empty state and offers the user a
  scenario instead.
- **Scenario mode** (`/demo`): three deterministic stories (Rainy café, Sunny
  commute, Pre-event dinner) for repeatable judging.

The merchant catalog is **only** used to seed those three scenarios. Live mode
never invents a merchant.

---

## Setup

```bash
npm install
```

**macOS / Linux**

```bash
cp .env.example .env   # then fill in keys
npx expo start
```

**Windows (PowerShell)**

```powershell
Copy-Item .env.example .env
npx expo start
```

### What you need to provide

| Variable                              | Why                                                 | Required?     |
| ------------------------------------- | --------------------------------------------------- | ------------- |
| `EXPO_PUBLIC_OPENWEATHER_API_KEY`     | Live weather by coordinates                         | for live mode |
| `EXPO_PUBLIC_TICKETMASTER_API_KEY`    | Live nearby events                                  | for live mode |
| `EXPO_PUBLIC_DEFAULT_CITY`            | Cosmetic city label until GPS resolves              | optional      |
| `EXPO_PUBLIC_OLLAMA_MODEL`            | LLM model name installed in your Ollama backend     | optional      |
| `EXPO_PUBLIC_PAYONE_API_BASE_URL`     | Real Payone-style demand feed                       | optional      |
| `EXPO_PUBLIC_OFFER_API_BASE_URL`      | Override LLM backend host                           | optional      |
| `EXPO_PUBLIC_REDEEM_API_BASE_URL`     | Override redemption-validation host                 | optional      |
| `EXPO_PUBLIC_PUSH_COOLDOWN_MIN`       | Minimum minutes between two pushes                  | optional      |
| `EXPO_PUBLIC_PUSH_QUIET_RATIO`        | Required Payone quiet ratio for push (0..1)         | optional      |
| `EXPO_PUBLIC_PUSH_DISTANCE_M`         | Maximum walking distance to push                    | optional      |
| `EXPO_PUBLIC_ZYTE_API_KEY`            | Optional: route Overpass via Zyte when IP-blocked   | optional      |

The mobile app supports an external offer-generation backend via
`EXPO_PUBLIC_OFFER_API_BASE_URL` (optional). This repository currently ships the
redemption API only (`server/redeemApi.js`, run with `npm run api:redeem`).
If the offer backend is unreachable, the offer engine returns a deterministic
local fallback so the demo never breaks.

If `EXPO_PUBLIC_PAYONE_API_BASE_URL` is unset, the wallet uses a deterministic
demand simulator that is **clearly labeled "Payone (simulator)"** in both the
customer wallet and the merchant dashboard — so judges always see the truth.

If Overpass starts rate-limiting or blocking your IP, set
`EXPO_PUBLIC_ZYTE_API_KEY` in `.env`. The app will automatically route Overpass
queries through Zyte API (`/v1/extract`) instead of calling Overpass directly.
For production, move this to a backend relay because `EXPO_PUBLIC_*` variables
are embedded into the client build.

---

## Privacy contract

- Raw GPS never leaves the device. Only an abstract intent string and city
  label are passed into the offer prompt.
- Merchant view shows aggregates only — no individual user data.
- Redemption tokens are single-use and don't carry identity.
- Payone demand is consumed as **density**, not transactions.

---

## Hackathon checklist

- [x] Real-time context fusion (location, weather, events, demand, time, taste)
- [x] **Composite trigger** rendered to user as "Why this · why now" relation
- [x] Generative offer copy via local LLM (Ollama Gemma) + safe fallback
- [x] **Generative UI**: AI picks widget background, accent and tone (WCAG-checked)
- [x] **Smart push** — cooldown, distance, signal-strength and quiet-hour gating
- [x] Multi-channel preview (push, lock-screen, home, in-app) with live status
- [x] Merchant-tunable rules (target product, max %, baseline, goal)
- [x] Merchant dashboard exposes the **push trigger rules** transparently
- [x] Aggregate KPIs (generated, accepted, redeem rate, drop-off, push KPIs)
- [x] Redemption QR with single-use token & validation API
- [x] **On-device preference memory** (AsyncStorage) feeds the abstract intent
- [x] Privacy-first messaging on every relevant screen
- [x] Live mode uses **real** OSM merchants across food, drink, culture,
      entertainment, retail and leisure — never invents a venue
- [x] All providers and push thresholds are config-driven via
      `src/config/dataSources.ts` (no codebase changes to swap city/source)
