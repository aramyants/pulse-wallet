import { Stack } from "expo-router";

const colors = {
  bg: "#F7F1E8",
  card: "#FFF8EF",
  text: "#1F1A17",
  accent: "#8A4E2F",
  border: "#E7D8C4",
};

export default function RootLayout() {
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
