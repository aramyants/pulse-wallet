import { Stack } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState, StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  onNotificationDelivered,
  onNotificationOpened,
  setupNotifications,
} from "../src/services/notifications";
import { useWalletStore } from "../src/store/walletStore";
import { palette } from "../src/theme";

export default function RootLayout() {
  const refreshAll = useWalletStore((s) => s.refreshAll);
  const markPushDelivered = useWalletStore((s) => s.markPushDelivered);
  const markPushOpened = useWalletStore((s) => s.markPushOpened);
  const refreshNotificationSupport = useWalletStore(
    (s) => s.refreshNotificationSupport,
  );
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    void setupNotifications();
    void refreshNotificationSupport();
    void refreshAll();

    const offDelivered = onNotificationDelivered((offerId) => {
      markPushDelivered(offerId);
    });
    const offOpened = onNotificationOpened((offerId) => {
      markPushOpened(offerId);
    });
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void refreshNotificationSupport();
      }
    });

    return () => {
      offDelivered();
      offOpened();
      appStateSub.remove();
    };
  }, [refreshAll, markPushDelivered, markPushOpened, refreshNotificationSupport]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={palette.bg} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: palette.bg },
          headerTintColor: palette.ink,
          headerTitleStyle: {
            fontWeight: "700",
            fontSize: 16,
          },
          contentStyle: { backgroundColor: palette.bg },
          headerShadowVisible: false,
          headerBackTitle: "Back",
        }}
      >
        <Stack.Screen name="index" options={{ title: "City Wallet" }} />
        <Stack.Screen name="merchant" options={{ title: "Merchant" }} />
        <Stack.Screen name="redeem" options={{ title: "Redeem" }} />
        <Stack.Screen name="demo" options={{ title: "Scenarios" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
