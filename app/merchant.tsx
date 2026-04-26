import { Link } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Activity,
  Bell,
  BellOff,
  BellRing,
  CheckCircle2,
  Pencil,
  TrendingDown,
  TrendingUp,
} from "lucide-react-native";
import { Section } from "../src/components/Section";
import { dataSources } from "../src/config/dataSources";
import { useWalletStore } from "../src/store/walletStore";
import { palette, radius, shadow, spacing, type, withAlpha } from "../src/theme";

const DEMAND_LABELS: Record<"low" | "normal" | "high", string> = {
  low: "Quiet",
  normal: "Steady",
  high: "Busy",
};

export default function MerchantScreen() {
  const {
    context,
    offer,
    updateMerchantRules,
    generatedTotal,
    acceptedTotal,
    redeemedTotal,
    dismissedTotal,
    expiredTotal,
    demandStatus,
    demandSource,
    demandLastUpdated,
    quietRatio,
    pushSentTotal,
    pushOpenedTotal,
    pushSuppressedTotal,
    pushChannelStatus,
    lastPushReason,
    notificationSupport,
    pushAutoEnabled,
    enablePushChannel,
    setPushAutoEnabled,
    triggerTestPush,
  } = useWalletStore();

  const [goalInput, setGoalInput] = useState(context.merchant.goal);
  const [maxDiscountInput, setMaxDiscountInput] = useState(
    String(context.merchant.maxDiscount),
  );
  const [targetProductInput, setTargetProductInput] = useState(
    context.merchant.targetProduct,
  );
  const [normalDensityInput, setNormalDensityInput] = useState(
    String(context.merchant.normalTransactionDensity),
  );
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setGoalInput(context.merchant.goal);
    setMaxDiscountInput(String(context.merchant.maxDiscount));
    setTargetProductInput(context.merchant.targetProduct);
    setNormalDensityInput(String(context.merchant.normalTransactionDensity));
  }, [
    context.merchant.goal,
    context.merchant.maxDiscount,
    context.merchant.targetProduct,
    context.merchant.normalTransactionDensity,
  ]);

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    };
  }, []);

  const applyRules = () => {
    const parsedDiscount = Number.parseInt(maxDiscountInput, 10);
    const parsedNormal = Number.parseInt(normalDensityInput, 10);
    updateMerchantRules({
      goal: goalInput.trim() || context.merchant.goal,
      maxDiscount: Number.isFinite(parsedDiscount)
        ? Math.min(40, Math.max(1, parsedDiscount))
        : context.merchant.maxDiscount,
      targetProduct: targetProductInput.trim() || context.merchant.targetProduct,
      normalTransactionDensity: Number.isFinite(parsedNormal)
        ? Math.max(10, parsedNormal)
        : context.merchant.normalTransactionDensity,
    });
    setSavedAt(Date.now());
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    savedTimeoutRef.current = setTimeout(() => setSavedAt(null), 3500);
  };

  const demandKey = context.merchant.currentDemand;
  const demandLabel = DEMAND_LABELS[demandKey];
  const demandColor =
    demandKey === "low"
      ? palette.warning
      : demandKey === "high"
        ? palette.success
        : palette.muted;
  const demandTrend =
    demandKey === "low" ? (
      <TrendingDown size={16} color={palette.warning} />
    ) : demandKey === "high" ? (
      <TrendingUp size={16} color={palette.success} />
    ) : (
      <Activity size={16} color={palette.muted} />
    );

  const offerPending = offer.token === "PENDING";
  const acceptanceRate = useMemo(
    () => (generatedTotal > 0 ? Math.round((acceptedTotal / generatedTotal) * 100) : null),
    [generatedTotal, acceptedTotal],
  );
  const redemptionRate = useMemo(
    () => (acceptedTotal > 0 ? Math.round((redeemedTotal / acceptedTotal) * 100) : null),
    [acceptedTotal, redeemedTotal],
  );

  const demandSourceLabel =
    demandSource === "payone-live"
      ? "Source: Payone live feed"
      : demandSource === "payone-simulated"
        ? "Source: Payone simulator"
        : "Source: demo baseline";

  const demandSyncedLabel = demandLastUpdated
    ? `Synced ${new Date(demandLastUpdated).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : demandStatus === "loading"
      ? "Syncing..."
      : "Awaiting sync";

  const quietPct = Math.round(Math.max(0, quietRatio) * 100);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = width < 360;
  const demandFontSize = isCompact ? 38 : 48;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: spacing.xxxl + insets.bottom },
      ]}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Merchant</Text>
        <Text style={styles.title}>{context.merchant.name}</Text>
        <Text style={styles.subtitle}>
          {context.merchant.category} - {context.city}
        </Text>
      </View>

      <View style={[styles.demandCard, shadow.card]}>
        <View style={styles.demandHead}>
          <Text style={styles.cardEyebrow}>Live demand</Text>
          <View style={styles.demandTrendPill}>
            {demandTrend}
            <Text style={[styles.demandTrendText, { color: demandColor }]}>
              {demandLabel}
            </Text>
          </View>
        </View>

        <View style={styles.demandRow}>
          <Text
            style={[styles.demandValue, { fontSize: demandFontSize, lineHeight: demandFontSize }]}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {context.merchant.transactionDensity}
          </Text>
          <Text style={styles.demandSep}>/</Text>
          <Text style={styles.demandNormal} numberOfLines={1}>
            {context.merchant.normalTransactionDensity}
          </Text>
          <Text style={styles.demandUnit}>tx in the last hour</Text>
        </View>

        <Text style={styles.demandHint}>
          {quietPct > 0
            ? `${quietPct}% below normal - a good time to reach out.`
            : "At or above normal volume."}
        </Text>

        <View style={styles.demandFootRow}>
          <Text style={styles.demandFootText}>{demandSourceLabel}</Text>
          <Text style={styles.demandFootText}>{demandSyncedLabel}</Text>
        </View>
      </View>

      <Section eyebrow="Aggregate" title="This session">
        <View style={styles.statsRow}>
          <StatTile label="Generated" value={generatedTotal} />
          <StatTile label="Accepted" value={acceptedTotal} />
          <StatTile label="Redeemed" value={redeemedTotal} />
        </View>
        <View style={styles.statsRow}>
          <StatTile
            label="Accept rate"
            value={acceptanceRate !== null ? `${acceptanceRate}%` : "-"}
          />
          <StatTile
            label="Redeem rate"
            value={redemptionRate !== null ? `${redemptionRate}%` : "-"}
          />
          <StatTile
            label="Drop-off"
            value={dismissedTotal + expiredTotal}
            sub={`${dismissedTotal} dismissed - ${expiredTotal} expired`}
          />
        </View>
      </Section>

      <Section eyebrow="Alerts" title="Customer notifications">
        <View style={styles.statsRow}>
          <StatTile
            label="Sent"
            value={pushSentTotal}
            sub={pushChannelStatusLabel(pushChannelStatus, notificationSupport)}
          />
          <StatTile
            label="Opened"
            value={pushOpenedTotal}
            sub={
              pushSentTotal > 0
                ? `${Math.round((pushOpenedTotal / pushSentTotal) * 100)}% open`
                : "-"
            }
          />
          <StatTile
            label="Skipped"
            value={pushSuppressedTotal}
            sub="Held back by timing rules"
          />
        </View>

        <View style={styles.rulesCard}>
          <Text style={styles.rulesTitle}>When alerts go out</Text>
          <View style={styles.ruleLine}>
            <View style={styles.ruleDot} />
            <Text style={styles.ruleText}>
              Minimum gap: {dataSources.pushRules.cooldownMinutes} min
            </Text>
          </View>
          <View style={styles.ruleLine}>
            <View style={styles.ruleDot} />
            <Text style={styles.ruleText}>
              Nearby only: within {dataSources.pushRules.maxDistanceMeters} m
            </Text>
          </View>
          <View style={styles.ruleLine}>
            <View style={styles.ruleDot} />
            <Text style={styles.ruleText}>
              Strong timing only: quiet traffic or strong context
            </Text>
          </View>
          <View style={styles.ruleLine}>
            <View style={styles.ruleDot} />
            <Text style={styles.ruleText}>
              Night pause: {dataSources.pushRules.quietHours.startHour}:00 to{" "}
              {dataSources.pushRules.quietHours.endHour}:00
            </Text>
          </View>
          <Text style={styles.ruleVerdict} numberOfLines={3}>
            Last alert: {lastPushReason}
          </Text>
        </View>

        <PushControlRow
          support={notificationSupport}
          autoEnabled={pushAutoEnabled}
          isPending={offerPending}
          onEnable={() => void enablePushChannel()}
          onTest={() => void triggerTestPush()}
          onToggleAuto={(value) => setPushAutoEnabled(value)}
        />
      </Section>

      <Section eyebrow="Campaign rules" title="Adjust live">
        <View style={styles.formCard}>
          <Field
            label="Target product"
            value={targetProductInput}
            onChangeText={setTargetProductInput}
          />
          <View style={styles.formRow}>
            <Field
              label="Max discount %"
              value={maxDiscountInput}
              onChangeText={setMaxDiscountInput}
              keyboardType="number-pad"
              flex={1}
            />
            <Field
              label="Baseline tx/h"
              value={normalDensityInput}
              onChangeText={setNormalDensityInput}
              keyboardType="number-pad"
              flex={1}
            />
          </View>
          <Field label="Campaign goal" value={goalInput} onChangeText={setGoalInput} multiline />

          <Pressable style={styles.saveButton} onPress={applyRules}>
            <Pencil size={14} color={palette.inkOnDark} />
            <Text style={styles.saveButtonText}>Apply and preview</Text>
          </Pressable>
          {savedAt ? (
            <View style={styles.savedNote}>
              <CheckCircle2 size={14} color={palette.success} />
              <Text style={styles.savedNoteText}>
                Saved - the next offer uses these rules
              </Text>
            </View>
          ) : null}
        </View>
      </Section>

      <Section eyebrow="Preview" title="Next offer">
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle} numberOfLines={2}>
            {offerPending ? "Composing next offer..." : offer.title}
          </Text>
          {!offerPending ? (
            <Text style={styles.previewMeta}>
              {offer.discount}% on {offer.targetProduct} - {offer.tone}
            </Text>
          ) : (
            <Text style={styles.previewMeta}>Reading live signals...</Text>
          )}
        </View>
      </Section>

      <View style={styles.footer}>
        <Link href="/" style={styles.footerLink}>
          Customer view
        </Link>
        <Text style={styles.footerDivider}>-</Text>
        <Link href="/redeem" style={styles.footerLink}>
          Redeem
        </Link>
        <Text style={styles.footerDivider}>-</Text>
        <Link href="/demo" style={styles.footerLink}>
          Scenarios
        </Link>
      </View>

      <Text style={styles.privacyNote}>
        Merchant view shows only aggregate activity. No individual user data is exposed.
      </Text>
    </ScrollView>
  );
}

function pushChannelStatusLabel(
  status:
    | "idle"
    | "scheduled"
    | "delivered"
    | "opened"
    | "blocked"
    | "suppressed",
  support: "ready" | "denied" | "unsupported" | "unknown",
): string {
  switch (status) {
    case "scheduled":
      return "Last: sent";
    case "delivered":
      return "Last: delivered";
    case "opened":
      return "Last: opened";
    case "blocked":
      if (support === "unsupported") return "Unsupported runtime";
      if (support === "denied") return "Permission denied";
      return "Permission needed";
    case "suppressed":
      return "Last: skipped";
    case "idle":
    default:
      return "Waiting for an offer";
  }
}

function PushControlRow({
  support,
  autoEnabled,
  isPending,
  onEnable,
  onTest,
  onToggleAuto,
}: {
  support: "ready" | "denied" | "unsupported" | "unknown";
  autoEnabled: boolean;
  isPending: boolean;
  onEnable: () => void;
  onTest: () => void;
  onToggleAuto: (next: boolean) => void;
}) {
  const isReady = support === "ready";
  const isBlocked = support === "denied";
  const isUnsupported = support === "unsupported";
  const isUnknown = support === "unknown";

  let title = "Enable notifications";
  let body = "Turn on alerts so new local offers appear on the phone.";
  let Icon = Bell;
  if (isReady) {
    Icon = autoEnabled ? BellRing : BellOff;
    title = autoEnabled ? "Alerts are on" : "Alerts are paused";
    body = autoEnabled
      ? "New offers can appear automatically."
      : "Alerts are paused. Turn them back on anytime.";
  } else if (isBlocked) {
    title = "Notifications are off";
    body = "Notifications are blocked. Open app settings to allow alerts.";
  } else if (isUnsupported) {
    title = "Notifications unavailable here";
    body =
      "This runtime does not support push notifications. Use an Android/iOS development build.";
  } else if (isUnknown) {
    title = "Permission needed";
    body = "Tap Enable to request notification permission.";
  }

  return (
    <View style={styles.pushRow}>
      <View style={styles.pushRowIcon}>
        <Icon
          size={16}
          color={isReady && autoEnabled ? palette.success : palette.mutedStrong}
        />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.pushRowTitle}>{title}</Text>
        <Text style={styles.pushRowBody}>{body}</Text>
      </View>
      {!isReady && !isUnsupported ? (
        <Pressable
          style={styles.pushRowPrimary}
          onPress={() => {
            if (isBlocked) {
              void Linking.openSettings();
              return;
            }
            onEnable();
          }}
          accessibilityRole="button"
          accessibilityLabel={isBlocked ? "Open notification settings" : "Enable notifications"}
        >
          <Text style={styles.pushRowPrimaryText}>
            {isBlocked ? "Open settings" : "Enable"}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.pushRowActions}>
          <Pressable
            style={styles.pushRowGhost}
            onPress={() => onToggleAuto(!autoEnabled)}
            accessibilityRole="button"
            accessibilityLabel={autoEnabled ? "Pause alerts" : "Resume alerts"}
          >
            <Text style={styles.pushRowGhostText}>
              {autoEnabled ? "Pause" : "Resume"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.pushRowPrimary, isPending && styles.pushRowDisabled]}
            onPress={onTest}
            disabled={isPending}
            accessibilityRole="button"
            accessibilityLabel="Send a test alert"
          >
            <Text style={styles.pushRowPrimaryText}>Test alert</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>
        {value}
      </Text>
      {sub ? (
        <Text style={styles.statSub} numberOfLines={2}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  multiline,
  flex,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  keyboardType?: "default" | "number-pad";
  multiline?: boolean;
  flex?: number;
}) {
  return (
    <View style={[styles.field, flex ? { flex } : null]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline ? styles.inputMultiline : null]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? "default"}
        multiline={multiline}
        placeholderTextColor={palette.muted}
      />
    </View>
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
  subtitle: { ...type.small, color: palette.muted },

  demandCard: {
    backgroundColor: palette.ink,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  demandHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardEyebrow: {
    ...type.micro,
    color: palette.inkOnDarkSoft,
    textTransform: "uppercase",
  },
  demandTrendPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: withAlpha(palette.accent, "1A"),
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  demandTrendText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  demandRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    flexWrap: "wrap",
  },
  demandValue: {
    fontSize: 48,
    fontWeight: "900",
    color: palette.inkOnDark,
    fontVariant: ["tabular-nums"],
    letterSpacing: -1,
  },
  demandSep: { fontSize: 28, color: palette.inkOnDarkSoft },
  demandNormal: {
    fontSize: 22,
    fontWeight: "700",
    color: palette.inkOnDarkSoft,
    fontVariant: ["tabular-nums"],
  },
  demandUnit: {
    color: palette.inkOnDarkSoft,
    fontSize: 11,
    marginLeft: spacing.xs,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  demandHint: {
    color: palette.inkOnDark,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  demandFootRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: withAlpha(palette.inkOnDarkSoft, "33"),
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  demandFootText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    color: palette.inkOnDarkSoft,
    textTransform: "uppercase",
  },

  statsRow: { flexDirection: "row", gap: spacing.sm },
  statTile: {
    flex: 1,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 2,
  },
  statLabel: {
    ...type.micro,
    color: palette.muted,
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: palette.ink,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.4,
  },
  statSub: { ...type.small, color: palette.muted, fontSize: 10 },

  rulesCard: {
    backgroundColor: palette.surfaceAlt,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 6,
    marginTop: spacing.sm,
  },
  rulesTitle: {
    ...type.smallStrong,
    color: palette.ink,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  ruleLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  ruleDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.borderStrong,
  },
  ruleText: { color: palette.mutedStrong, fontSize: 12, fontWeight: "600" },
  ruleVerdict: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: palette.hairline,
  },

  pushRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  pushRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: palette.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  pushRowTitle: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.1,
  },
  pushRowBody: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 15,
  },
  pushRowActions: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    flexShrink: 0,
  },
  pushRowPrimary: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: palette.ink,
    borderRadius: radius.pill,
  },
  pushRowDisabled: { opacity: 0.5 },
  pushRowPrimaryText: {
    color: palette.inkOnDark,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  pushRowGhost: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
  },
  pushRowGhostText: {
    color: palette.ink,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },

  formCard: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  formRow: { flexDirection: "row", gap: spacing.sm },
  field: { gap: 4 },
  fieldLabel: {
    ...type.micro,
    color: palette.muted,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: palette.surfaceAlt,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    color: palette.ink,
    fontSize: 14,
    fontWeight: "500",
  },
  inputMultiline: { minHeight: 64, textAlignVertical: "top" },

  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: palette.ink,
    borderRadius: radius.md,
    paddingVertical: 13,
    marginTop: spacing.xs,
    minHeight: 46,
  },
  saveButtonText: {
    color: palette.inkOnDark,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  savedNote: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    backgroundColor: palette.successSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  savedNoteText: { color: palette.success, fontSize: 12, fontWeight: "700" },

  previewCard: {
    backgroundColor: palette.surfaceAlt,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: palette.ink,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  previewMeta: { color: palette.muted, fontSize: 12 },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  footerLink: { color: palette.muted, fontSize: 12, fontWeight: "600" },
  footerDivider: { color: palette.border, fontSize: 12 },
  privacyNote: {
    color: palette.muted,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "500",
  },
});
