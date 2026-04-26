import { Link } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowRight,
  Clock,
  Cloud,
  CloudRain,
  Compass,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun,
  Wifi,
  WifiOff,
} from "lucide-react-native";
import { useWalletStore } from "../src/store/walletStore";
import {
  ensureReadableOfferColors,
  palette,
  radius,
  readableTextOn,
  shadow,
  spacing,
  type,
  withAlpha,
} from "../src/theme";

function formatRemaining(seconds: number) {
  if (seconds <= 0) return "expired";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
}

function periodGreeting(period: string, name: string) {
  const p = period.toLowerCase();
  if (name && name !== "You") return `Hi, ${name}`;
  if (p.includes("morning")) return "Good morning";
  if (p.includes("lunch")) return "Lunch break";
  if (p.includes("afternoon")) return "Good afternoon";
  if (p.includes("evening")) return "Good evening";
  if (p.includes("night")) return "Quiet hours";
  return "Hi there";
}

function WeatherIcon({ condition }: { condition: string }) {
  if (condition === "Rain") return <CloudRain size={14} color={palette.muted} />;
  if (condition === "Sunny") return <Sun size={14} color={palette.muted} />;
  return <Cloud size={14} color={palette.muted} />;
}

export default function CustomerWallet() {
  const {
    context,
    offer,
    offerGeneratedAt,
    accepted,
    dismissed,
    redeemed,
    expired,
    scenarioName,
    scenarioEnabled,
    locationCity,
    merchantSearchStatus,
    merchantSearchError,
    triggerComposition,
    refreshAll,
    acceptOffer,
    dismissOffer,
    expireOffer,
    setScenarioEnabled,
  } = useWalletStore();

  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = width < 360;

  const isPending = offer.token === "PENDING";
  const isLive = !scenarioEnabled;
  const noMerchant = isLive && context.merchant.id === "no-merchant";

  const expiresAt = useMemo(() => {
    if (!offerGeneratedAt || isPending || offer.expiresInMinutes <= 0) return null;
    return offerGeneratedAt + offer.expiresInMinutes * 60_000;
  }, [offerGeneratedAt, offer.expiresInMinutes, isPending]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const remainingSeconds = expiresAt
    ? Math.max(0, Math.round((expiresAt - now) / 1000))
    : null;

  useEffect(() => {
    if (remainingSeconds === 0 && !expired && !redeemed) {
      expireOffer();
    }
  }, [remainingSeconds, expired, redeemed, expireOffer]);

  const greeting = periodGreeting(context.time.period, context.user.name);
  const cityLabel = isLive ? (locationCity ?? context.city) : context.city;

  const safeColors = isPending
    ? { background: palette.surface, accent: palette.accent }
    : ensureReadableOfferColors(
        offer.widgetStyle.background,
        offer.widgetStyle.accent,
      );
  const offerBg = safeColors.background;
  const offerAccent = safeColors.accent;
  const onBg = readableTextOn(offerBg);
  const isDark = onBg === palette.inkOnDark;

  const discountFontSize = isCompact ? 44 : 56;
  const discountLineHeight = isCompact ? 46 : 58;
  const titleFontSize = isCompact ? 22 : 26;
  const titleLineHeight = isCompact ? 28 : 32;

  // One-line "why now" — prefer the composite trigger summary; fallback to
  // the first reason from the offer; final fallback is a generic line.
  const whyNow =
    triggerComposition.summary?.trim() ||
    offer.reasons[0] ||
    "Tailored to your context right now.";

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: spacing.xxxl + insets.bottom },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting} numberOfLines={1}>
            {greeting}
          </Text>
          <Text style={styles.greetingSub} numberOfLines={1}>
            {isLive ? "Real-time city wallet" : `Scenario · ${scenarioName ?? ""}`}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh"
          onPress={() => void refreshAll()}
          hitSlop={8}
          style={styles.refreshButton}
        >
          <RefreshCw size={14} color={palette.ink} />
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>

      <View style={styles.contextStrip}>
        <View style={styles.contextItem}>
          <MapPin size={14} color={palette.muted} />
          <Text style={styles.contextText} numberOfLines={1}>
            {cityLabel}
          </Text>
        </View>
        <View style={styles.dotSep} />
        <View style={styles.contextItem}>
          <WeatherIcon condition={context.weather.condition} />
          <Text style={styles.contextText} numberOfLines={1}>
            {context.weather.condition} · {context.weather.temperature}°C
          </Text>
        </View>
        <View style={styles.dotSep} />
        <View style={styles.contextItem}>
          <Clock size={14} color={palette.muted} />
          <Text style={styles.contextText}>
            {context.time.day} · {context.time.hour}
          </Text>
        </View>
      </View>

      {/* Primary surface: the offer or the empty state */}
      {noMerchant ? (
        <NoMerchantCard
          status={merchantSearchStatus}
          error={merchantSearchError}
          city={cityLabel}
          isCompact={isCompact}
          onTryScenario={() => setScenarioEnabled(true)}
          onRetry={() => void refreshAll()}
        />
      ) : (
        <View
          style={[
            styles.offerCard,
            { backgroundColor: offerBg, borderColor: withAlpha(offerAccent, "33") },
            shadow.hero,
          ]}
        >
          <View style={styles.offerHead}>
            <Text
              style={[
                styles.offerMerchant,
                { color: isDark ? palette.inkOnDarkSoft : palette.muted },
              ]}
              numberOfLines={1}
            >
              {context.merchant.name}
            </Text>
            {!isPending ? (
              <Text
                style={[
                  styles.toneBadge,
                  {
                    color: offerAccent,
                    backgroundColor: withAlpha(offerAccent, "1A"),
                  },
                ]}
              >
                {offer.tone === "emotional" ? "Emotional" : "Factual"}
              </Text>
            ) : null}
          </View>

          <Text
            style={[
              styles.offerTitle,
              { color: onBg, fontSize: titleFontSize, lineHeight: titleLineHeight },
            ]}
            numberOfLines={3}
          >
            {offer.title}
          </Text>

          <View style={styles.discountRow}>
            <Text
              style={[
                styles.discountValue,
                {
                  color: offerAccent,
                  fontSize: discountFontSize,
                  lineHeight: discountLineHeight,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {isPending ? "—" : `${offer.discount}%`}
            </Text>
            <View style={styles.discountMeta}>
              <Text
                style={[
                  styles.discountLabel,
                  {
                    color: isDark ? palette.inkOnDarkSoft : palette.mutedStrong,
                  },
                ]}
                numberOfLines={2}
              >
                cashback on {offer.targetProduct}
              </Text>
              <Text
                style={[
                  styles.discountSubtle,
                  { color: isDark ? palette.inkOnDarkSoft : palette.muted },
                ]}
                numberOfLines={1}
              >
                {context.user.distanceToMerchantMeters > 0
                  ? `${context.user.distanceToMerchantMeters} m away`
                  : "Nearby"}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.offerSubtitle,
              { color: isDark ? palette.inkOnDarkSoft : palette.mutedStrong },
            ]}
          >
            {offer.subtitle}
          </Text>

          {/* Single-line "why now" — the actual relation that triggered the offer. */}
          {!isPending ? (
            <View style={styles.whyRow}>
              <Sparkles
                size={12}
                color={isDark ? palette.inkOnDarkSoft : palette.muted}
              />
              <Text
                style={[
                  styles.whyText,
                  { color: isDark ? palette.inkOnDarkSoft : palette.mutedStrong },
                ]}
                numberOfLines={2}
              >
                {whyNow}
              </Text>
            </View>
          ) : null}

          <View style={[styles.offerFoot, { borderTopColor: withAlpha(offerAccent, "22") }]}>
            <View style={styles.offerFootItem}>
              <Clock size={12} color={isDark ? palette.inkOnDarkSoft : palette.muted} />
              <Text
                style={[
                  styles.offerFootText,
                  { color: isDark ? palette.inkOnDarkSoft : palette.muted },
                ]}
              >
                {expired
                  ? "Expired"
                  : remainingSeconds !== null
                    ? `Expires in ${formatRemaining(remainingSeconds)}`
                    : `${offer.expiresInMinutes} min window`}
              </Text>
            </View>
          </View>

          {!accepted && !expired && !dismissed ? (
            <View style={[styles.actionsRow, isCompact && styles.actionsRowStacked]}>
              <Pressable
                style={[
                  styles.primaryAction,
                  isCompact && styles.fullPrimary,
                  { backgroundColor: offerAccent },
                ]}
                onPress={acceptOffer}
                disabled={isPending}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel="Accept offer"
              >
                <Text
                  style={[
                    styles.primaryActionText,
                    {
                      color:
                        readableTextOn(offerAccent) === palette.inkOnDark
                          ? "#FFFFFF"
                          : palette.ink,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {isPending ? "Composing…" : "Accept offer"}
                </Text>
                <ArrowRight
                  size={14}
                  color={
                    readableTextOn(offerAccent) === palette.inkOnDark
                      ? "#FFFFFF"
                      : palette.ink
                  }
                />
              </Pressable>
              <Pressable
                style={[
                  styles.secondaryAction,
                  isCompact && styles.fullSecondary,
                  { borderColor: withAlpha(offerAccent, "33") },
                ]}
                onPress={dismissOffer}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel="Dismiss offer"
              >
                <Text
                  style={[
                    styles.secondaryActionText,
                    { color: isDark ? palette.inkOnDark : palette.ink },
                  ]}
                  numberOfLines={1}
                >
                  Not now
                </Text>
              </Pressable>
            </View>
          ) : null}

          {accepted && !redeemed ? (
            <Link href="/redeem" asChild>
              <Pressable
                style={[styles.primaryAction, styles.fullPrimary, { backgroundColor: offerAccent }]}
                accessibilityRole="link"
                accessibilityLabel="Open redemption screen"
              >
                <Text
                  style={[
                    styles.primaryActionText,
                    {
                      color:
                        readableTextOn(offerAccent) === palette.inkOnDark
                          ? "#FFFFFF"
                          : palette.ink,
                    },
                  ]}
                >
                  Open redemption
                </Text>
                <ArrowRight
                  size={14}
                  color={
                    readableTextOn(offerAccent) === palette.inkOnDark
                      ? "#FFFFFF"
                      : palette.ink
                  }
                />
              </Pressable>
            </Link>
          ) : null}

          {(expired || dismissed) && !accepted ? (
            <Pressable
              style={[styles.primaryAction, styles.fullPrimary, { backgroundColor: palette.ink }]}
              onPress={() => void refreshAll()}
              accessibilityRole="button"
              accessibilityLabel="Generate a new offer"
            >
              <Text style={[styles.primaryActionText, { color: palette.inkOnDark }]}>
                Generate new offer
              </Text>
              <RefreshCw size={14} color={palette.inkOnDark} />
            </Pressable>
          ) : null}
        </View>
      )}

      {/* Privacy line — short, reassuring, never a lecture. */}
      <View style={styles.privacyCard}>
        <ShieldCheck size={14} color={palette.success} />
        <Text style={styles.privacyBody} numberOfLines={2}>
          Only your abstract intent leaves this device. Taste is learned locally.
        </Text>
      </View>

      <View style={styles.navRow}>
        <Link href="/merchant" asChild>
          <Pressable style={styles.navTile}>
            <Compass size={14} color={palette.ink} />
            <Text style={styles.navTileText}>Merchant</Text>
          </Pressable>
        </Link>
        <Link href="/demo" asChild>
          <Pressable style={styles.navTile}>
            <Sparkles size={14} color={palette.ink} />
            <Text style={styles.navTileText}>Scenarios</Text>
          </Pressable>
        </Link>
      </View>
    </ScrollView>
  );
}

function NoMerchantCard({
  status,
  error,
  city,
  isCompact,
  onTryScenario,
  onRetry,
}: {
  status: string;
  error: string | null;
  city: string;
  isCompact: boolean;
  onTryScenario: () => void;
  onRetry: () => void;
}) {
  const loading = status === "loading" || status === "idle";
  return (
    <View style={[styles.emptyCard, shadow.card]}>
      <View style={styles.emptyIconWrap}>
        {loading ? (
          <Wifi size={20} color={palette.muted} />
        ) : (
          <WifiOff size={20} color={palette.muted} />
        )}
      </View>
      <Text style={styles.emptyTitle}>
        {loading ? "Looking for nearby partners…" : "No partner merchants nearby"}
      </Text>
      <Text style={styles.emptyBody}>
        {loading
          ? `Scanning cafés, restaurants, museums, shops and more around ${city}…`
          : error
            ? error
            : `Couldn't find a real merchant within ~10 km of ${city}. Try a demo scenario, or move to a denser area.`}
      </Text>
      {!loading ? (
        <View style={[styles.emptyActions, isCompact && styles.actionsRowStacked]}>
          <Pressable
            style={[
              styles.primaryAction,
              isCompact && styles.fullPrimary,
              { backgroundColor: palette.ink },
            ]}
            onPress={onRetry}
            hitSlop={4}
          >
            <Text
              style={[styles.primaryActionText, { color: palette.inkOnDark }]}
              numberOfLines={1}
            >
              Try again
            </Text>
            <RefreshCw size={14} color={palette.inkOnDark} />
          </Pressable>
          <Pressable
            style={[
              styles.secondaryAction,
              isCompact && styles.fullSecondary,
              { borderColor: palette.border },
            ]}
            onPress={onTryScenario}
            hitSlop={4}
          >
            <Text
              style={[styles.secondaryActionText, { color: palette.ink }]}
              numberOfLines={1}
            >
              Open scenario
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },

  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerLeft: { flex: 1, minWidth: 0 },
  greeting: { ...type.title, color: palette.ink },
  greetingSub: { ...type.small, color: palette.muted, marginTop: 2 },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  refreshText: { ...type.smallStrong, color: palette.ink },

  contextStrip: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingVertical: 4,
  },
  contextItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  contextText: { ...type.small, color: palette.mutedStrong },
  dotSep: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: palette.borderStrong,
  },

  offerCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
  },
  offerHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  offerMerchant: {
    ...type.micro,
    textTransform: "uppercase",
    flexShrink: 1,
  },
  toneBadge: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  offerTitle: {
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  discountRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  discountValue: {
    fontSize: 56,
    fontWeight: "900",
    lineHeight: 56,
    letterSpacing: -1.5,
    fontVariant: ["tabular-nums"],
  },
  discountMeta: { flex: 1, gap: 2, paddingBottom: 8 },
  discountLabel: { fontSize: 13, fontWeight: "700", letterSpacing: 0.1 },
  discountSubtle: { fontSize: 11, fontWeight: "500" },

  offerSubtitle: { fontSize: 14, lineHeight: 20, fontWeight: "500" },

  whyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  whyText: { flex: 1, fontSize: 12, lineHeight: 16, fontWeight: "500" },

  offerFoot: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  offerFootItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  offerFootText: { fontSize: 11, fontWeight: "600", letterSpacing: 0.2 },

  actionsRow: { flexDirection: "row", gap: spacing.sm },
  actionsRowStacked: { flexDirection: "column" },
  primaryAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    borderRadius: radius.md,
    flex: 2,
    minHeight: 46,
  },
  fullPrimary: { flex: 0, width: "100%" },
  primaryActionText: { fontSize: 14, fontWeight: "800", letterSpacing: 0.2 },
  secondaryAction: {
    flex: 1,
    paddingVertical: 13,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },
  fullSecondary: { flex: 0, width: "100%" },
  secondaryActionText: { fontSize: 13, fontWeight: "700" },

  privacyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: palette.successSoft,
    borderColor: withAlpha(palette.success, "33"),
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  privacyBody: { flex: 1, ...type.small, color: palette.mutedStrong, lineHeight: 16 },

  navRow: { flexDirection: "row", gap: spacing.sm },
  navTile: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingVertical: 13,
  },
  navTileText: { ...type.bodyStrong, color: palette.ink },

  emptyCard: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
    alignItems: "center",
  },
  emptyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.surfaceSunk,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  emptyTitle: { ...type.heading, color: palette.ink, textAlign: "center" },
  emptyBody: {
    ...type.body,
    color: palette.muted,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
    width: "100%",
  },
});
