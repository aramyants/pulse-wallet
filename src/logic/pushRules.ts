import { dataSources } from "../config/dataSources";
import type { DemoContext } from "../data/demoData";
import type { TriggerComposition } from "./triggerComposition";

/**
 * Decide whether the current moment is strong enough to interrupt the user
 * with a real notification.
 */

export type PushEvaluation = {
  shouldPush: boolean;
  reason: string;
};

export function evaluatePushRules(args: {
  context: DemoContext;
  composition: TriggerComposition;
  quietRatio: number;
  lastPushAt: number | null;
  accepted: boolean;
  dismissed: boolean;
  expired: boolean;
  now?: number;
}): PushEvaluation {
  const now = args.now ?? Date.now();
  const rules = dataSources.pushRules;

  if (args.accepted) {
    return { shouldPush: false, reason: "Offer already accepted." };
  }
  if (args.dismissed) {
    return { shouldPush: false, reason: "Offer was dismissed." };
  }
  if (args.expired) {
    return { shouldPush: false, reason: "Offer expired." };
  }

  const hour = new Date(now).getHours();
  const inQuietHours =
    hour >= rules.quietHours.startHour || hour < rules.quietHours.endHour;
  if (inQuietHours) {
    return {
      shouldPush: false,
      reason: "Alerts are paused for quiet hours.",
    };
  }

  if (args.lastPushAt) {
    const elapsedMinutes = (now - args.lastPushAt) / 60_000;
    if (elapsedMinutes < rules.cooldownMinutes) {
      const remaining = Math.ceil(rules.cooldownMinutes - elapsedMinutes);
      return {
        shouldPush: false,
        reason: `Waiting ${remaining} min before the next alert.`,
      };
    }
  }

  const distance = args.context.user.distanceToMerchantMeters;
  if (distance > rules.maxDistanceMeters) {
    return {
      shouldPush: false,
      reason: "Customer is too far away for an alert right now.",
    };
  }

  if (
    args.quietRatio < rules.minQuietRatio &&
    args.composition.totalStrength < 0.6
  ) {
    return {
      shouldPush: false,
      reason: "Not a strong enough moment yet.",
    };
  }

  if (!args.composition.pushWorthy) {
    return {
      shouldPush: false,
      reason: "Context is not strong enough yet.",
    };
  }

  return {
    shouldPush: true,
    reason: args.composition.summary,
  };
}
