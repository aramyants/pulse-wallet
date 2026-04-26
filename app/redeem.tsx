import { Link } from "expo-router";
import { useState } from "react";
import { CheckCircle2, CircleSlash2, Clock3, QrCode, Wallet } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { validateTokenViaApi } from "../src/services/redeemApi";
import { useWalletStore } from "../src/store/walletStore";

const colors = {
  bg: "#F7F1E8",
  card: "#FFF8EF",
  white: "#FFFFFF",
  text: "#1F1A17",
  accent: "#8A4E2F",
  border: "#E7D8C4",
  muted: "#6D5B4C",
  success: "#2F6B4F",
  danger: "#A33A2A",
};

export default function RedeemScreen() {
  const { accepted, redeemed, expired, context, offer, redeemOffer, expireOffer } = useWalletStore();
  const [apiStatus, setApiStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [apiMessage, setApiMessage] = useState<string | null>(null);

  const cashbackValue = `€${(offer.discount * 0.22).toFixed(2)}`;

  const status = expired
    ? "expired"
    : redeemed
      ? "redeemed"
      : accepted
        ? "accepted"
        : "waiting";

  const statusColor =
    status === "redeemed" ? colors.success : status === "expired" ? colors.danger : colors.accent;

  const handleValidate = async () => {
    setApiStatus("loading");
    setApiMessage("Validating token via API...");

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
      setApiMessage(`API validation successful (${result.code}).`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not reach redemption API.";
      setApiStatus("error");
      setApiMessage(message);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <QrCode size={20} color={colors.accent} />
          <Text style={styles.title}>Token Validation</Text>
        </View>

        <Text style={styles.line}>Merchant: {context.merchant.name}</Text>
        <Text style={styles.line}>Token ID: {offer.token}</Text>
        <Text style={styles.line}>Cashback amount: {offer.discount}% ({cashbackValue})</Text>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text style={[styles.statusValue, { color: statusColor }]}>{status}</Text>
        </View>

        <View style={styles.statusLegend}>
          <View style={styles.legendItem}>
            <Clock3 size={14} color={colors.accent} />
            <Text style={styles.legendText}>waiting</Text>
          </View>
          <View style={styles.legendItem}>
            <Wallet size={14} color={colors.accent} />
            <Text style={styles.legendText}>accepted</Text>
          </View>
          <View style={styles.legendItem}>
            <CheckCircle2 size={14} color={colors.success} />
            <Text style={styles.legendText}>redeemed</Text>
          </View>
          <View style={styles.legendItem}>
            <CircleSlash2 size={14} color={colors.danger} />
            <Text style={styles.legendText}>expired</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, (!accepted || redeemed || expired || apiStatus === "loading") && styles.disabledButton]}
          onPress={() => void handleValidate()}
          disabled={!accepted || redeemed || expired || apiStatus === "loading"}
        >
          <Text style={styles.primaryButtonText}>
            {apiStatus === "loading" ? "Simulating checkout..." : "Simulate checkout & validate token"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, (redeemed || expired) && styles.disabledSoft]}
          onPress={expireOffer}
          disabled={redeemed || expired}
        >
          <Text style={styles.secondaryButtonText}>Mark expired</Text>
        </TouchableOpacity>

        {apiMessage ? (
          <Text style={[styles.apiMessage, apiStatus === "error" ? styles.apiError : styles.apiOk]}>
            {apiMessage}
          </Text>
        ) : null}
      </View>

      <View style={styles.links}>
        <Link href="/" style={styles.linkButton}>
          Back to wallet
        </Link>
        <Link href="/merchant" style={styles.linkButton}>
          Merchant dashboard
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 18,
    gap: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { color: colors.text, fontSize: 20, fontWeight: "800" },
  line: { color: colors.muted, lineHeight: 20 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  statusLabel: { color: colors.text, fontWeight: "700" },
  statusValue: { textTransform: "uppercase", fontWeight: "800" },
  statusLegend: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendText: { color: colors.muted, fontSize: 12 },
  primaryButton: {
    backgroundColor: colors.success,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "700" },
  secondaryButton: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: { color: colors.text, fontWeight: "700" },
  apiMessage: { marginTop: 4, fontSize: 12 },
  apiOk: { color: colors.success },
  apiError: { color: colors.danger },
  disabledButton: { opacity: 0.5 },
  disabledSoft: { opacity: 0.6 },
  links: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
