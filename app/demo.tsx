import { Link, router } from "expo-router";
import { Check, CloudRain, CloudSun, Theater } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ScenarioName, useWalletStore } from "../src/store/walletStore";

const colors = {
  bg: "#F7F1E8",
  card: "#FFF8EF",
  white: "#FFFFFF",
  text: "#1F1A17",
  accent: "#8A4E2F",
  border: "#E7D8C4",
  muted: "#6D5B4C",
};

type ScenarioOption = {
  name: ScenarioName;
  label: string;
  description: string;
  icon: JSX.Element;
};

const options: ScenarioOption[] = [
  {
    name: "rainCafe",
    label: "Rain + quiet café + nearby browsing user",
    description: "Core hackathon story with strong contextual moment.",
    icon: <CloudRain size={18} color={colors.accent} />,
  },
  {
    name: "sunnyNormal",
    label: "Sunny + normal demand + commuting user",
    description: "Lower urgency, softer recommendation.",
    icon: <CloudSun size={18} color={colors.accent} />,
  },
  {
    name: "eventDinner",
    label: "Event nearby + low restaurant demand",
    description: "Pre-event demand shaping for dinner traffic.",
    icon: <Theater size={18} color={colors.accent} />,
  },
];

export default function DemoScreen() {
  const { scenarioName, context, setScenario } = useWalletStore();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Scenario Switcher</Text>
      <Text style={styles.subtitle}>Pick a context and regenerate the full wallet flow.</Text>

      {options.map((option) => {
        const selected = scenarioName === option.name;
        return (
          <TouchableOpacity
            key={option.name}
            style={[styles.optionCard, selected && styles.optionCardSelected]}
            onPress={() => setScenario(option.name)}
          >
            <View style={styles.optionTop}>
              <View style={styles.optionTitleRow}>
                {option.icon}
                <Text style={styles.optionTitle}>{option.label}</Text>
              </View>
              {selected ? <Check size={18} color={colors.accent} /> : null}
            </View>
            <Text style={styles.optionDescription}>{option.description}</Text>
          </TouchableOpacity>
        );
      })}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Current Context Summary</Text>
        <Text style={styles.summaryText}>City: {context.city}</Text>
        <Text style={styles.summaryText}>
          Weather: {context.weather.condition}, {context.weather.temperature}°C
        </Text>
        <Text style={styles.summaryText}>
          Time: {context.time.day} {context.time.hour} ({context.time.period})
        </Text>
        <Text style={styles.summaryText}>Distance: {context.user.distanceToMerchantMeters}m</Text>
        <Text style={styles.summaryText}>Intent: {context.user.abstractIntent}</Text>
        <Text style={styles.summaryText}>
          Demand: {context.merchant.currentDemand} ({context.merchant.transactionDensity}/
          {context.merchant.normalTransactionDensity})
        </Text>
      </View>

      <TouchableOpacity style={styles.demoButton} onPress={() => router.push("/")}>
        <Text style={styles.demoButtonText}>Run customer demo</Text>
      </TouchableOpacity>

      <View style={styles.links}>
        <Link href="/merchant" style={styles.linkButton}>
          Merchant view
        </Link>
        <Link href="/redeem" style={styles.linkButton}>
          Redeem view
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 18, gap: 12, paddingBottom: 30 },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  subtitle: { color: colors.muted, marginTop: -2 },
  optionCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  optionCardSelected: {
    borderColor: colors.accent,
    borderWidth: 1.5,
    backgroundColor: "#FBEED9",
  },
  optionTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  optionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  optionTitle: { color: colors.text, fontWeight: "700", flexShrink: 1 },
  optionDescription: { color: colors.muted, lineHeight: 20 },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 4,
  },
  summaryTitle: { color: colors.text, fontWeight: "800", fontSize: 16, marginBottom: 4 },
  summaryText: { color: colors.muted },
  demoButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
  },
  demoButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  links: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  linkButton: {
    backgroundColor: colors.white,
    color: colors.accent,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    overflow: "hidden",
    fontWeight: "700",
  },
});
