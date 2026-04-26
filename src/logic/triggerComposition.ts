import type { DemoContext } from "../data/demoData";

/**
 * "The system must recognise a composite context state (e.g. 'raining +
 * Tuesday afternoon + partner café transaction volume unusually low') and
 * trigger the generative pipeline."
 *
 * This module turns the raw context into a small, scored, human-readable
 * set of triggers. The customer wallet renders these as the visible
 * "Why this, why now" relation strip; the push rule engine consumes them
 * to decide whether the moment is strong enough to interrupt the user.
 */

export type TriggerKind =
  | "weather"
  | "demand"
  | "proximity"
  | "time"
  | "intent"
  | "event"
  | "preference";

export type Trigger = {
  kind: TriggerKind;
  label: string; // short, e.g. "Cold rain, 11°C"
  detail: string; // one-line why, e.g. "Indoor venues are more relevant"
  /** 0..1 strength score. ≥0.6 means this trigger alone is push-worthy. */
  strength: number;
};

export type TriggerComposition = {
  triggers: Trigger[];
  /** "rain + lunch + low demand + 80m" style composite line. */
  summary: string;
  /** 0..1 aggregate score across triggers. */
  totalStrength: number;
  /** True when the composite is strong enough to push, not just to render. */
  pushWorthy: boolean;
};

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function weatherTrigger(context: DemoContext): Trigger | null {
  const c = context.weather.condition;
  const t = context.weather.temperature;
  if (c === "Rain") {
    return {
      kind: "weather",
      label: `Cold rain · ${t}°C`,
      detail: "Indoor venues, warm drinks and quick shelter become relevant.",
      strength: 0.75,
    };
  }
  if (c === "Sunny" && t >= 22) {
    return {
      kind: "weather",
      label: `Warm sun · ${t}°C`,
      detail: "Outdoor seating, ice cream, parks and viewpoints fit the moment.",
      strength: 0.55,
    };
  }
  if (t <= 6) {
    return {
      kind: "weather",
      label: `Cold · ${t}°C`,
      detail: "Bias toward warm, indoor offers.",
      strength: 0.6,
    };
  }
  return {
    kind: "weather",
    label: `${c} · ${t}°C`,
    detail: "Neutral conditions; weather alone won't drive an offer.",
    strength: 0.2,
  };
}

function demandTrigger(context: DemoContext): Trigger | null {
  const tx = context.merchant.transactionDensity;
  const baseline = context.merchant.normalTransactionDensity;
  if (!Number.isFinite(tx) || !Number.isFinite(baseline) || baseline <= 0) {
    return null;
  }
  const ratio = tx / baseline;
  if (ratio <= 0.4) {
    const pct = Math.round((1 - ratio) * 100);
    return {
      kind: "demand",
      label: `${context.merchant.name} ${pct}% below normal`,
      detail: `${tx}/${baseline} tx — strong quiet-hour signal from Payone.`,
      strength: 0.85,
    };
  }
  if (ratio <= 0.65) {
    const pct = Math.round((1 - ratio) * 100);
    return {
      kind: "demand",
      label: `Quieter than normal · −${pct}%`,
      detail: `${tx}/${baseline} tx today vs typical.`,
      strength: 0.6,
    };
  }
  if (ratio >= 1.2) {
    return {
      kind: "demand",
      label: "Busy right now",
      detail: "High density — small nudge is enough; push is suppressed.",
      strength: 0.15,
    };
  }
  return {
    kind: "demand",
    label: "Normal volume",
    detail: "No quiet-hour signal from Payone right now.",
    strength: 0.25,
  };
}

function proximityTrigger(context: DemoContext): Trigger | null {
  const d = context.user.distanceToMerchantMeters;
  if (d <= 0) {
    return {
      kind: "proximity",
      label: "Right here",
      detail: "User is at the merchant.",
      strength: 0.8,
    };
  }
  if (d <= 150) {
    return {
      kind: "proximity",
      label: `${d} m away`,
      detail: "Walk-in distance — offer is actionable in under 2 minutes.",
      strength: 0.85,
    };
  }
  if (d <= 400) {
    return {
      kind: "proximity",
      label: `${d} m away`,
      detail: "Comfortable walk if the rest of the context lines up.",
      strength: 0.6,
    };
  }
  if (d <= 900) {
    return {
      kind: "proximity",
      label: `${d} m away`,
      detail: "Stretching distance — needs a stronger reason.",
      strength: 0.35,
    };
  }
  return {
    kind: "proximity",
    label: `${d} m away`,
    detail: "Beyond the spontaneous-visit zone.",
    strength: 0.1,
  };
}

function timeIntentTrigger(context: DemoContext): Trigger {
  const period = context.time.period;
  const intent = context.user.movementIntent;
  return {
    kind: "intent",
    label: `${period}, ${intent}`,
    detail:
      intent === "browsing"
        ? "User is moving slowly — open to a spontaneous suggestion."
        : intent === "waiting"
          ? "User has time to fill — short window matters."
          : "User is on the move; offer must be effortless to act on.",
    strength: intent === "commuting" ? 0.35 : 0.55,
  };
}

function eventTrigger(eventCount: number, eventName: string | null): Trigger | null {
  if (eventCount <= 0) return null;
  return {
    kind: "event",
    label:
      eventCount === 1 && eventName
        ? `Event nearby: ${eventName}`
        : `${eventCount} events nearby`,
    detail: "Event crowd shifts demand for nearby food, drinks and culture.",
    strength: 0.6,
  };
}

function preferenceTrigger(
  preferenceLabel: string | null,
  matchesCategory: boolean,
): Trigger | null {
  if (!preferenceLabel) return null;
  return {
    kind: "preference",
    label: matchesCategory
      ? `Matches your taste · ${preferenceLabel}`
      : `Different from your usual · ${preferenceLabel}`,
    detail: matchesCategory
      ? "On-device history shows you respond well to this category."
      : "Suggesting something outside your usual pattern; soft signal only.",
    strength: matchesCategory ? 0.5 : 0.2,
  };
}

export function buildTriggerComposition(args: {
  context: DemoContext;
  eventCount?: number;
  eventName?: string | null;
  preferenceLabel?: string | null;
  preferenceMatches?: boolean;
}): TriggerComposition {
  const triggers: Trigger[] = [];

  const weather = weatherTrigger(args.context);
  if (weather) triggers.push(weather);

  const demand = demandTrigger(args.context);
  if (demand) triggers.push(demand);

  const proximity = proximityTrigger(args.context);
  if (proximity) triggers.push(proximity);

  triggers.push(timeIntentTrigger(args.context));

  const event = eventTrigger(args.eventCount ?? 0, args.eventName ?? null);
  if (event) triggers.push(event);

  const preference = preferenceTrigger(
    args.preferenceLabel ?? null,
    args.preferenceMatches ?? false,
  );
  if (preference) triggers.push(preference);

  // Rank by strength descending.
  triggers.sort((a, b) => b.strength - a.strength);

  // Aggregate score: average of top 3 triggers, capped to [0, 1].
  const top = triggers.slice(0, 3);
  const totalStrength = clamp01(
    top.reduce((acc, t) => acc + t.strength, 0) / Math.max(1, top.length),
  );

  const summary = top.map((t) => t.label).join(" + ");

  return {
    triggers,
    summary,
    totalStrength,
    // Push-worthy: top trigger ≥ 0.7 AND aggregate ≥ 0.55. This filters out
    // "neutral weather + normal demand + far away" combinations.
    pushWorthy:
      (top[0]?.strength ?? 0) >= 0.7 && totalStrength >= 0.55,
  };
}
