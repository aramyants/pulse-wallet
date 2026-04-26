import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Bell,
  BellOff,
  Check,
  CircleDot,
  Eye,
  LayoutDashboard,
  Lock,
  MonitorSmartphone,
} from "lucide-react-native";
import type { GeneratedOffer } from "../logic/offerEngine";
import { palette, radius, spacing, type } from "../theme";

type Channel = "push" | "lock" | "home" | "in-app";

export type ChannelStatus =
  | "idle"
  | "scheduled"
  | "delivered"
  | "opened"
  | "blocked"
  | "suppressed"
  | "preview-only"
  | "live";

const CHANNEL_META: Record<
  Channel,
  { label: string; icon: typeof Bell; helper: string }
> = {
  push: {
    label: "Push",
    icon: Bell,
    helper: "First-3-second message — banner attention rules.",
  },
  lock: {
    label: "Lock-screen",
    icon: Lock,
    helper: "Glance-only widget — nothing requires unlock.",
  },
  home: {
    label: "Home banner",
    icon: LayoutDashboard,
    helper: "Persistent surface — discount + tap-to-open.",
  },
  "in-app": {
    label: "In-app",
    icon: MonitorSmartphone,
    helper: "Full card — preview, accept, redeem.",
  },
};

const ORDER: Channel[] = ["push", "lock", "home", "in-app"];

export function ChannelPreview({
  offer,
  merchantName,
  city,
  pushStatus,
  inAppStatus,
}: {
  offer: GeneratedOffer;
  merchantName: string;
  city: string;
  pushStatus: ChannelStatus;
  inAppStatus: ChannelStatus;
}) {
  const [active, setActive] = useState<Channel>("push");
  const { width } = useWindowDimensions();
  const meta = CHANNEL_META[active];
  const frameWidth = Math.max(220, Math.min(width - spacing.lg * 2, 360));

  const statusByChannel: Record<Channel, ChannelStatus> = {
    push: pushStatus,
    "in-app": inAppStatus,
    lock: "preview-only",
    home: "preview-only",
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.tabsRow}>
        <Text style={styles.eyebrow}>Where this surfaces</Text>
      </View>
      <View style={styles.tabs}>
        {ORDER.map((channel) => {
          const Icon = CHANNEL_META[channel].icon;
          const selected = channel === active;
          return (
            <Pressable
              key={channel}
              onPress={() => setActive(channel)}
              hitSlop={6}
              style={[styles.tab, selected && styles.tabActive]}
              accessibilityRole="button"
              accessibilityLabel={CHANNEL_META[channel].label}
            >
              <Icon
                size={12}
                color={selected ? palette.inkOnDark : palette.mutedStrong}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: selected ? palette.inkOnDark : palette.mutedStrong },
                ]}
                numberOfLines={1}
              >
                {CHANNEL_META[channel].label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SurfaceFrame
        channel={active}
        offer={offer}
        merchant={merchantName}
        city={city}
        width={frameWidth}
      />

      <View style={styles.statusRow}>
        <StatusBadge status={statusByChannel[active]} />
        <Text style={styles.helper}>{meta.helper}</Text>
      </View>
    </View>
  );
}

function StatusBadge({ status }: { status: ChannelStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
      <Icon size={11} color={meta.color} />
      <Text style={[styles.statusText, { color: meta.color }]} numberOfLines={1}>
        {meta.label}
      </Text>
    </View>
  );
}

const STATUS_META: Record<
  ChannelStatus,
  { label: string; color: string; bg: string; icon: typeof Bell }
> = {
  idle: {
    label: "Ready",
    color: palette.mutedStrong,
    bg: palette.surfaceAlt,
    icon: CircleDot,
  },
  scheduled: {
    label: "Push sent",
    color: palette.success,
    bg: palette.successSoft,
    icon: Bell,
  },
  delivered: {
    label: "Delivered",
    color: palette.success,
    bg: palette.successSoft,
    icon: Check,
  },
  opened: {
    label: "Opened",
    color: palette.success,
    bg: palette.successSoft,
    icon: Check,
  },
  blocked: {
    label: "Permission needed",
    color: palette.warning,
    bg: palette.warningSoft,
    icon: Bell,
  },
  suppressed: {
    label: "Suppressed by rules",
    color: palette.muted,
    bg: palette.surfaceAlt,
    icon: BellOff,
  },
  "preview-only": {
    label: "Preview only",
    color: palette.muted,
    bg: palette.surfaceAlt,
    icon: Eye,
  },
  live: {
    label: "Showing now",
    color: palette.success,
    bg: palette.successSoft,
    icon: CircleDot,
  },
};

function SurfaceFrame({
  channel,
  offer,
  merchant,
  city,
  width,
}: {
  channel: Channel;
  offer: GeneratedOffer;
  merchant: string;
  city: string;
  width: number;
}) {
  if (channel === "push") {
    return (
      <View style={[styles.pushFrame, { width }]}>
        <View style={styles.pushIcon}>
          <Text style={styles.pushIconText}>CW</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.pushHeaderRow}>
            <Text style={styles.pushApp}>City Wallet</Text>
            <Text style={styles.pushTime}>now</Text>
          </View>
          <Text style={styles.pushTitle} numberOfLines={2}>
            {offer.title}
          </Text>
          <Text style={styles.pushBody} numberOfLines={2}>
            {offer.subtitle}
          </Text>
        </View>
      </View>
    );
  }

  if (channel === "lock") {
    return (
      <View style={[styles.lockFrame, { width }]}>
        <Text style={styles.lockMicro}>CITY WALLET · NEARBY</Text>
        <Text style={styles.lockTitle} numberOfLines={2}>
          {offer.title}
        </Text>
        <View style={styles.lockRow}>
          <Text style={styles.lockDiscount}>{offer.discount}%</Text>
          <Text style={styles.lockMerchant} numberOfLines={1}>
            {merchant}
          </Text>
        </View>
      </View>
    );
  }

  if (channel === "home") {
    return (
      <View style={[styles.homeFrame, { width }]}>
        <View style={styles.homeStripe}>
          <Text style={styles.homeDiscount}>{offer.discount}%</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.homeMerchant} numberOfLines={1}>
            {merchant} · {city}
          </Text>
          <Text style={styles.homeTitle} numberOfLines={2}>
            {offer.title}
          </Text>
        </View>
        <Text style={styles.homeCta}>Open</Text>
      </View>
    );
  }

  return (
    <View style={[styles.inAppFrame, { width }]}>
      <Text style={styles.inAppMicro}>IN-APP CARD</Text>
      <Text style={styles.inAppTitle} numberOfLines={2}>
        {offer.title}
      </Text>
      <Text style={styles.inAppMeta} numberOfLines={1}>
        {offer.discount}% off · {offer.targetProduct}
      </Text>
      <Text style={styles.inAppCopy} numberOfLines={2}>
        {offer.subtitle}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  tabsRow: { flexDirection: "row" },
  eyebrow: {
    ...type.micro,
    color: palette.muted,
    textTransform: "uppercase",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.pill,
    padding: 3,
    alignSelf: "stretch",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  tabActive: { backgroundColor: palette.ink },
  tabLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  pushFrame: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  pushIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: palette.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  pushIconText: {
    color: palette.inkOnDark,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  pushHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  pushApp: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  pushTime: { color: palette.muted, fontSize: 11 },
  pushTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  pushBody: { color: palette.mutedStrong, fontSize: 12, lineHeight: 17 },

  lockFrame: {
    backgroundColor: palette.ink,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
  },
  lockMicro: {
    color: palette.inkOnDarkSoft,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  lockTitle: {
    color: palette.inkOnDark,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    lineHeight: 21,
  },
  lockRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
    marginTop: 4,
  },
  lockDiscount: {
    color: palette.accent,
    fontSize: 22,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  lockMerchant: {
    color: palette.inkOnDarkSoft,
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },

  homeFrame: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  homeStripe: {
    backgroundColor: palette.accent,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  homeDiscount: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  homeMerchant: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  homeTitle: { color: palette.ink, fontSize: 13, fontWeight: "700" },
  homeCta: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },

  inAppFrame: {
    backgroundColor: palette.surfaceAlt,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
  },
  inAppMicro: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  inAppTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
    lineHeight: 21,
  },
  inAppMeta: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  inAppCopy: { color: palette.mutedStrong, fontSize: 12, lineHeight: 17 },

  helper: {
    ...type.small,
    color: palette.muted,
    paddingHorizontal: 2,
    flexShrink: 1,
  },
});
