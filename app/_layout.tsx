import { Stack } from "expo-router";
import { useEffect } from "react";
import { useWalletStore } from "../src/store/walletStore";

const colors = {
  bg: "#F7F1E8",
  card: "#FFF8EF",
  text: "#1F1A17",
  accent: "#8A4E2F",
  border: "#E7D8C4",
};

export default function RootLayout() {
  const refreshWeather = useWalletStore((s) => s.refreshWeather);
  const refreshEvents = useWalletStore((s) => s.refreshEvents);
  const refreshLocation = useWalletStore((s) => s.refreshLocation);
  const refreshDemand = useWalletStore((s) => s.refreshDemand);

  useEffect(() => {
    void refreshLocation();
    void refreshWeather();
    void refreshEvents();
    void refreshDemand();
  }, [refreshLocation, refreshWeather, refreshEvents, refreshDemand]);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "PulseWallet" }} />
      <Stack.Screen name="merchant" options={{ title: "Merchant Dashboard" }} />
      <Stack.Screen name="redeem" options={{ title: "Redeem Offer" }} />
      <Stack.Screen name="demo" options={{ title: "Demo Scenarios" }} />
    </Stack>
  );
}
