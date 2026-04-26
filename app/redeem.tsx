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
  CheckCircle2,
  CircleSlash2,
  Clock3,
  ShieldCheck,
} from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { validateTokenViaApi } from "../src/services/redeemApi";
import { useWalletStore } from "../src/store/walletStore";
import { palette, radius, shadow, spacing, type, withAlpha } from "../src/theme";

type Status = "ready" | "redeemed" | "expired" | "waiting";

const STATUS_LABEL: Record<Status, string> = {
  ready: "Ready",
  redeemed: "Redeemed",
  expired: "Expired",
  waiting: "Awaiting accept",
};

const STATUS_COLOR: Record<Status, string> = {
  ready: palette.accent,
  redeemed: palette.success,
  expired: palette.danger,
  waiting: palette.muted,
};

export default function RedeemScreen() {
  const {
    accepted,
    redeemed,
    expired,
    context,
    offer,
    offerGeneratedAt,
    redeemOffer,
    expireOffer,
  } = useWalletStore();

  const [apiStatus, setApiStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [apiMessage, setApiMessage] = useState<string | null>(null);

  const isPending = offer.token === "PENDING";

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (isPending || !offerGeneratedAt || redeemed || expired) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isPending, offerGeneratedAt, redeemed, expired]);

  const remainingSeconds = useMemo(() => {
    if (isPending || !offerGeneratedAt) return null;
    const total = offer.expiresInMinutes * 60;
    const elapsed = Math.floor((now - offerGeneratedAt) / 1000);
    return Math.max(0, total - elapsed);
  }, [isPending, offer.expiresInMinutes, offerGeneratedAt, now]);

  useEffect(() => {
    if (
      remainingSeconds === 0 &&
      accepted &&
      !redeemed &&
      !expired &&
      !isPending
    ) {
      expireOffer();
    }
  }, [remainingSeconds, accepted, redeemed, expired, isPending, expireOffer]);

  const status: Status = expired
    ? "expired"
    : redeemed
      ? "redeemed"
      : accepted
        ? "ready"
        : "waiting";

  const canRedeem = accepted && !redeemed && !expired && !isPending;
  const cashbackEur = (offer.discount * 0.22).toFixed(2);

  const countdownText =
    remainingSeconds === null
      ? null
      : remainingSeconds === 0
        ? "Expired"
        : remainingSeconds >= 60
          ? `${Math.floor(remainingSeconds / 60)}m ${String(remainingSeconds % 60).padStart(2, "0")}s`
          : `${remainingSeconds}s`;

  const handleValidate = async () => {
    setApiStatus("loading");
    setApiMessage(null);
    try {
      const result = await validateTokenViaApi({
        token: offer.token,
        merchantId: context.merchant.id,
      });
      if (!result.ok) {
        setApiStatus("error");
        setApiMessage(result.message);
        return;
      }
      redeemOffer();
      setApiStatus("ok");
      setApiMessage(null);
    } catch (err) {
      setApiStatus("error");
      setApiMessage(err instanceof Error ? err.message : "Could not reach validation API.");
    }
  };

  const StatusIcon =
    status === "redeemed" ? CheckCircle2 : status === "expired" ? CircleSlash2 : Clock3;

  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const qrSize = Math.max(160, Math.min(width - spacing.lg * 2 - spacing.lg * 2, 220));

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xxxl + insets.bottom }]}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Redeem</Text>
        <Text style={styles.title}>
          {status === "redeemed"
            ? "Validated."
            : status === "expired"
              ? "This offer expired."
              : status === "waiting"
                ? "Accept an offer first."
                : "Show this at checkout."}
        </Text>
      </View>

      <View style={[styles.card, shadow.card]}>
        <View style={styles.cardHead}>
          <Text style={styles.cardEyebrow}>{offer.merchantName}</Text>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: withAlpha(STATUS_COLOR[status], "1A"),
              },
            ]}
          >
            <StatusIcon size={12} color={STATUS_COLOR[status]} />
            <Text style={[styles.statusPillText, { color: STATUS_COLOR[status] }]}>
              {STATUS_LABEL[status]}
            </Text>
          </View>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>
          {isPending ? "Composing offer…" : offer.title}
        </Text>

        {!isPending ? (
          <View style={styles.amountRow}>
            <Text style={styles.amountValue}>{offer.discount}%</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.amountLabel}>off · {offer.targetProduct}</Text>
              <Text style={styles.cashback}>~ €{cashbackEur} cashback</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.qrWrap}>
          {!isPending ? (
            <QRCode value={offer.token} size={qrSize} backgroundColor="#FFFFFF" color={palette.ink} />
          ) : (
            <View style={[styles.qrPlaceholder, { width: qrSize, height: qrSize }]}>
              <Text style={styles.qrPlaceholderText}>Pending</Text>
            </View>
          )}
        </View>

        {!isPending ? (
          <Text style={styles.tokenValue}>{offer.token}</Text>
        ) : null}

        {!isPending && countdownText && status !== "redeemed" ? (
          <View style={styles.countdownRow}>
            <Clock3 size={12} color={palette.muted} />
            <Text style={styles.countdownText}>
              {status === "expired" ? "Expired" : `Expires in ${countdownText}`}
            </Text>
          </View>
        ) : null}
      </View>

      <Pressable
        style={[
          styles.primaryButton,
          (!canRedeem || apiStatus === "loading") && styles.buttonDisabled,
          redeemed && styles.primaryButtonSuccess,
        ]}
        onPress={() => void handleValidate()}
        disabled={!canRedeem || apiStatus === "loading"}
      >
        <Text style={styles.primaryButtonText}>
          {redeemed
            ? "Redeemed"
            : apiStatus === "loading"
              ? "Validating…"
              : "Validate at checkout"}
        </Text>
      </Pressable>

      {!redeemed && !expired && accepted ? (
        <Pressable style={styles.secondaryButton} onPress={expireOffer}>
          <Text style={styles.secondaryButtonText}>Mark expired</Text>
        </Pressable>
      ) : null}

      {apiStatus === "error" && apiMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{apiMessage}</Text>
        </View>
      ) : null}

      <View style={styles.privacyRow}>
        <ShieldCheck size={14} color={palette.success} />
        <Text style={styles.privacyText}>
          Token is single-use. No personal data is sent to the merchant terminal.
        </Text>
      </View>

      <View style={styles.footer}>
        <Link href="/" style={styles.footerLink}>Wallet</Link>
        <Text style={styles.footerDivider}>·</Text>
        <Link href="/merchant" style={styles.footerLink}>Merchant</Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },

  header: { gap: 4 },
  eyebrow: {
    ...type.micro,
    color: palette.muted,
    textTransform: "uppercase",
  },
  title: { ...type.title, color: palette.ink },

  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  cardHead: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardEyebrow: {
    ...type.micro,
    color: palette.muted,
    textTransform: "uppercase",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: palette.ink,
    textAlign: "center",
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    width: "100%",
    paddingVertical: 4,
  },
  amountValue: {
    fontSize: 44,
    fontWeight: "900",
    color: palette.accent,
    fontVariant: ["tabular-nums"],
    letterSpacing: -1,
  },
  amountLabel: { ...type.bodyStrong, color: palette.ink },
  cashback: { ...type.small, color: palette.muted },

  qrWrap: {
    backgroundColor: "#FFFFFF",
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    marginTop: spacing.xs,
  },
  qrPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.surfaceAlt,
    borderRadius: radius.md,
  },
  qrPlaceholderText: { color: palette.muted, fontSize: 12 },
  tokenValue: {
    fontSize: 11,
    color: palette.muted,
    fontWeight: "700",
    letterSpacing: 1,
  },
  countdownRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  countdownText: { color: palette.muted, fontSize: 12, fontWeight: "700" },

  primaryButton: {
    backgroundColor: palette.ink,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: "center",
    minHeight: 50,
    justifyContent: "center",
  },
  primaryButtonSuccess: { backgroundColor: palette.success },
  primaryButtonText: {
    color: palette.inkOnDark,
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.3,
  },
  buttonDisabled: { opacity: 0.45 },

  secondaryButton: {
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.border,
    minHeight: 46,
    justifyContent: "center",
  },
  secondaryButtonText: { color: palette.ink, fontWeight: "700", fontSize: 13 },

  errorBox: {
    backgroundColor: palette.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: withAlpha(palette.danger, "33"),
  },
  errorText: { color: palette.danger, fontSize: 12, lineHeight: 18 },

  privacyRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
  },
  privacyText: { ...type.small, color: palette.muted },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  footerLink: { color: palette.muted, fontSize: 12, fontWeight: "600" },
  footerDivider: { color: palette.border, fontSize: 12 },
});
