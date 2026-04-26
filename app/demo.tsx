import type { ReactElement } from "react";
import { Link, router } from "expo-router";
import {
  ArrowRight,
  Check,
  CloudRain,
  CloudSun,
  Compass,
  Theater,
} from "lucide-react-native";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChannelPreview,
  type ChannelStatus,
} from "../src/components/ChannelPreview";
import { Section } from "../src/components/Section";
import { ScenarioName, useWalletStore } from "../src/store/walletStore";
import { palette, radius, spacing, type, withAlpha } from "../src/theme";

type ScenarioOption = {
  name: ScenarioName;
  label: string;
  description: string;
  icon: ReactElement;
};

const ICON_PROPS = { size: 18, color: palette.accent } as const;

const OPTIONS: ScenarioOption[] = [
  {
    name: "rainCafe",
    label: "Rainy lunch - Cafe Muller",
    description: "Quiet cafe in rain -> high-discount coffee alert",
    icon: <CloudRain {...ICON_PROPS} />,
  },
  {
    name: "sunnyNormal",
    label: "Sunny commute - Bakery Schmidt",
    description: "Steady demand, on-the-go pastry nudge",
    icon: <CloudSun {...ICON_PROPS} />,
  },
  {
    name: "eventDinner",
    label: "Pre-event - Noodle House",
    description: "Empty tables before the venue fills up",
    icon: <Theater {...ICON_PROPS} />,
  },
];

export default function DemoScreen() {
  const {
    scenarioName,
    scenarioEnabled,
    setScenario,
    setScenarioEnabled,
    offer,
    context,
    locationCity,
    notificationSupport,
    pushChannelStatus,
  } = useWalletStore();
  const insets = useSafeAreaInsets();

  const liveSelected = !scenarioEnabled;
  const activeLabel = liveSelected
    ? "Live - real GPS, weather, and merchants"
    : OPTIONS.find((option) => option.name === scenarioName)?.label ?? "Scenario";

  const cityLabel = liveSelected ? (locationCity ?? context.city) : context.city;
  const isPending = offer.token === "PENDING";
  const pushStatus: ChannelStatus =
    notificationSupport === "denied" || notificationSupport === "unsupported"
      ? "blocked"
      : pushChannelStatus === "blocked"
        ? "blocked"
        : pushChannelStatus === "idle"
          ? notificationSupport === "ready"
            ? "idle"
            : "blocked"
          : pushChannelStatus;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: spacing.xxxl + insets.bottom },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Scenarios</Text>
        <Text style={styles.title}>Pick what to demo</Text>
        <Text style={styles.subtitle}>
          Live mode pulls real merchants near you. Scenarios run deterministic stories.
        </Text>
      </View>

      <Section eyebrow="Active" title={activeLabel}>
        <Pressable
          style={[styles.optionCard, liveSelected && styles.optionCardSelected]}
          onPress={() => setScenarioEnabled(false)}
        >
          <View style={styles.optionLeft}>
            <View style={styles.optionIcon}>
              <Compass size={18} color={palette.accent} />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>Live context</Text>
              <Text style={styles.optionDescription}>
                Device GPS - weather - events - merchants - demand signal
              </Text>
            </View>
          </View>
          {liveSelected ? <Check size={18} color={palette.accent} /> : null}
        </Pressable>
      </Section>

      <Section eyebrow="Storyboards" title="Pre-built scenarios">
        {OPTIONS.map((option) => {
          const selected = scenarioEnabled && scenarioName === option.name;
          return (
            <Pressable
              key={option.name}
              style={[styles.optionCard, selected && styles.optionCardSelected]}
              onPress={() => setScenario(option.name)}
            >
              <View style={styles.optionLeft}>
                <View style={styles.optionIcon}>{option.icon}</View>
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>{option.label}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
              </View>
              {selected ? <Check size={18} color={palette.accent} /> : null}
            </Pressable>
          );
        })}
      </Section>

      <Section eyebrow="Surfaces" title="How the offer shows up">
        <ChannelPreview
          offer={offer}
          merchantName={context.merchant.name}
          city={cityLabel}
          pushStatus={pushStatus}
          inAppStatus={isPending ? "idle" : "live"}
        />
        <Text style={styles.surfacesHint}>
          Push alerts work in the installed app. Banner previews live here.
        </Text>
      </Section>

      <Pressable style={styles.primaryButton} onPress={() => router.push("/")}>
        <Text style={styles.primaryButtonText}>Open customer wallet</Text>
        <ArrowRight size={14} color={palette.inkOnDark} />
      </Pressable>

      <View style={styles.footer}>
        <Link href="/merchant" style={styles.footerLink}>
          Merchant
        </Link>
        <Text style={styles.footerDivider}>-</Text>
        <Link href="/redeem" style={styles.footerLink}>
          Redeem
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },

  header: { gap: 4 },
  eyebrow: {
    ...type.micro,
    color: palette.muted,
    textTransform: "uppercase",
  },
  title: { ...type.title, color: palette.ink },
  subtitle: { ...type.small, color: palette.muted, lineHeight: 18 },

  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  optionCardSelected: {
    borderColor: palette.accent,
    backgroundColor: withAlpha(palette.accent, "0F"),
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: palette.surfaceAlt,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTextWrap: { flex: 1, gap: 2 },
  optionTitle: { ...type.bodyStrong, color: palette.ink },
  optionDescription: { ...type.small, color: palette.muted, lineHeight: 16 },

  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: palette.ink,
    borderRadius: radius.md,
    paddingVertical: 14,
    minHeight: 50,
  },
  primaryButtonText: {
    color: palette.inkOnDark,
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.2,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  footerLink: { color: palette.muted, fontSize: 12, fontWeight: "600" },
  footerDivider: { color: palette.border, fontSize: 12 },

  surfacesHint: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "500",
    marginTop: spacing.xs,
  },
});
