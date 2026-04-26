import Constants from "expo-constants";
import { Alert, Platform } from "react-native";
import type { GeneratedOffer } from "../logic/offerEngine";

/**
 * Local push delivery for the Generative City Wallet.
 *
 * Channels in the brief:
 *   1. Push notification -> expo-notifications local push (this file)
 *   2. In-app card -> rendered by app/index.tsx
 *   3. Lock-screen widget -> preview-only in MVP
 *   4. Home banner -> preview-only in MVP
 *
 * Expo Go on Android (SDK 53+) no longer supports the notification runtime
 * this app uses. Importing expo-notifications eagerly is enough to trigger the
 * removed native path, so we lazy-load the module and mark that runtime as
 * unsupported. Development builds still work.
 */

type NotificationsModule = typeof import("expo-notifications");
type NotificationTrigger = NonNullable<
  Parameters<NotificationsModule["scheduleNotificationAsync"]>[0]["trigger"]
>;

export type NotificationSupport =
  | "ready"
  | "denied"
  | "unsupported"
  | "unknown";

const ANDROID_CHANNEL_ID = "generative-city-wallet";
const executionEnvironment = Constants.executionEnvironment;
const isExpoGo = executionEnvironment === "storeClient";
const allowExpoGoFallback =
  process.env.EXPO_PUBLIC_ENABLE_EXPO_GO_PUSH_FALLBACK === "1";

const isExpoGoAndroid =
  Platform.OS === "android" &&
  isExpoGo;

let configured = false;
let runtimeUnsupported = Platform.OS === "web" || isExpoGoAndroid;
let unsupportedReason: string | null =
  Platform.OS === "web"
    ? "web"
    : isExpoGoAndroid
      ? "expo-go-android"
      : null;
let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;
const FALLBACK_ID_PREFIX = "fallback-local-push-";
const fallbackTimers = new Map<string, ReturnType<typeof setTimeout>>();
const fallbackDeliveredListeners = new Set<(offerId: string) => void>();
const fallbackOpenedListeners = new Set<(offerId: string) => void>();

function isExpoGoFallbackMode() {
  return (
    allowExpoGoFallback &&
    Platform.OS === "android" &&
    unsupportedReason === "expo-go-android"
  );
}

async function getNotificationsModule(): Promise<NotificationsModule | null> {
  if (runtimeUnsupported) return null;

  if (!notificationsModulePromise) {
    notificationsModulePromise = import("expo-notifications").catch((error) => {
      runtimeUnsupported = true;
      unsupportedReason = "module-unavailable";
      if (__DEV__) {
        console.warn("[notifications] expo-notifications unavailable", error);
      }
      return null;
    });
  }

  return notificationsModulePromise;
}

async function configureHandlerOnce() {
  const Notifications = await getNotificationsModule();
  if (!Notifications || configured) return;

  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel() {
  const Notifications = await getNotificationsModule();
  if (!Notifications || Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "Local offers",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 100, 200],
    lightColor: "#B53F1E",
    sound: "default",
  });
}

/**
 * Initialise notifications: foreground handler + android channel.
 * Idempotent and safe to call in unsupported environments (it just no-ops).
 */
export async function setupNotifications(): Promise<void> {
  if (runtimeUnsupported) return;

  try {
    await configureHandlerOnce();
    await ensureAndroidChannel();
  } catch (error) {
    unsupportedReason = "setup-failed";
    if (__DEV__) {
      console.warn("[notifications] setup failed", error);
    }
  }
}

/**
 * Returns the current support state. Does NOT prompt the user.
 */
export async function getNotificationSupport(): Promise<NotificationSupport> {
  if (isExpoGoFallbackMode()) return "ready";

  const Notifications = await getNotificationsModule();
  if (!Notifications) return "unsupported";

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === "granted") return "ready";
    if (status === "denied") return "denied";
    return "unknown";
  } catch {
    unsupportedReason = "permissions-api-unavailable";
    return "unknown";
  }
}

/**
 * Asks the user once for notification permission. Returns the resolved state.
 */
export async function requestNotificationPermission(): Promise<NotificationSupport> {
  if (isExpoGoFallbackMode()) return "ready";

  const Notifications = await getNotificationsModule();
  if (!Notifications) return "unsupported";

  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === "granted") return "ready";
    const result = await Notifications.requestPermissionsAsync();
    if (result.status === "granted") return "ready";
    if (result.status === "denied") return "denied";
    return "unknown";
  } catch {
    unsupportedReason = "request-permission-unavailable";
    return "unknown";
  }
}

/**
 * Schedules an immediate local push for an offer. Returns the notification id
 * so it can be cancelled if the offer is replaced.
 */
export async function scheduleOfferPush(
  offer: GeneratedOffer,
): Promise<string | null> {
  if (isExpoGoFallbackMode()) {
    const id = `${FALLBACK_ID_PREFIX}${offer.id}-${Date.now()}`;
    const timer = setTimeout(() => {
      fallbackTimers.delete(id);
      fallbackDeliveredListeners.forEach((handler) => handler(offer.id));
      Alert.alert(offer.title, offer.subtitle, [
        { text: "Dismiss", style: "cancel" },
        {
          text: "Open offer",
          onPress: () => {
            fallbackOpenedListeners.forEach((handler) => handler(offer.id));
          },
        },
      ]);
    }, 1000);
    fallbackTimers.set(id, timer);
    return id;
  }

  const Notifications = await getNotificationsModule();
  if (!Notifications) return null;

  try {
    const trigger: NotificationTrigger =
      Platform.OS === "android"
        ? ({ channelId: ANDROID_CHANNEL_ID, seconds: 1 } as NotificationTrigger)
        : ({ seconds: 1 } as NotificationTrigger);

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: offer.title,
        body: offer.subtitle,
        data: {
          offerId: offer.id,
          token: offer.token,
          merchant: offer.merchantName,
        },
        sound: "default",
      },
      trigger,
    });
    return id;
  } catch (error) {
    if (__DEV__) {
      console.warn("[notifications] scheduleOfferPush failed", error);
    }
    return null;
  }
}

export async function cancelScheduledPush(id: string | null): Promise<void> {
  if (id?.startsWith(FALLBACK_ID_PREFIX)) {
    const timer = fallbackTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      fallbackTimers.delete(id);
    }
    return;
  }

  const Notifications = await getNotificationsModule();
  if (!id || !Notifications) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // best-effort
  }
}

/**
 * Subscribe to notification taps. Returns an unsubscribe handle.
 */
export function onNotificationOpened(
  handler: (offerId: string) => void,
): () => void {
  fallbackOpenedListeners.add(handler);

  if (runtimeUnsupported) {
    return () => {
      fallbackOpenedListeners.delete(handler);
    };
  }

  let disposed = false;
  let remove = () => {};

  void getNotificationsModule().then((Notifications) => {
    if (!Notifications || disposed) return;

    try {
      const subscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const offerId = response.notification.request.content.data?.offerId;
          if (typeof offerId === "string") handler(offerId);
        },
      );
      remove = () => subscription.remove();
      if (disposed) remove();
    } catch {
      // best-effort
    }
  });

  return () => {
    disposed = true;
    fallbackOpenedListeners.delete(handler);
    remove();
  };
}

export function onNotificationDelivered(
  handler: (offerId: string) => void,
): () => void {
  fallbackDeliveredListeners.add(handler);

  if (runtimeUnsupported) {
    return () => {
      fallbackDeliveredListeners.delete(handler);
    };
  }

  let disposed = false;
  let remove = () => {};

  void getNotificationsModule().then((Notifications) => {
    if (!Notifications || disposed) return;

    try {
      const subscription = Notifications.addNotificationReceivedListener(
        (notification) => {
          const offerId = notification.request.content.data?.offerId;
          if (typeof offerId === "string") handler(offerId);
        },
      );
      remove = () => subscription.remove();
      if (disposed) remove();
    } catch {
      // best-effort
    }
  });

  return () => {
    disposed = true;
    fallbackDeliveredListeners.delete(handler);
    remove();
  };
}

/**
 * Diagnostic info used by the merchant dashboard / dev hints. Not user-facing.
 */
export function getNotificationsRuntimeInfo(): {
  available: boolean;
  reason: string | null;
  isExpoGoAndroid: boolean;
} {
  return {
    available: !runtimeUnsupported,
    reason: unsupportedReason,
    isExpoGoAndroid,
  };
}
