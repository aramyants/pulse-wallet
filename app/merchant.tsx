import { Link } from "expo-router";
import { Activity, Gauge, ReceiptText, Settings2, Target, TrendingUp } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
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
};

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export default function MerchantScreen() {
  const { context, accepted, redeemed, offer } = useWalletStore();
  const generatedOffers = 1;
  const acceptedCount = accepted ? 1 : 0;
  const redeemedCount = redeemed ? 1 : 0;
  const acceptanceRate = `${Math.round((acceptedCount / generatedOffers) * 100)}%`;
  const quietThreshold = Math.round(context.merchant.normalTransactionDensity * 0.55);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{context.merchant.name}</Text>
        <Text style={styles.subtitle}>Local demand campaign dashboard</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Target size={18} color={colors.accent} />
          <Text style={styles.cardTitle}>Campaign Rules</Text>
        </View>
        <Text style={styles.itemText}>Goal: {context.merchant.goal}</Text>
        <Text style={styles.itemText}>Max discount: {context.merchant.maxDiscount}%</Text>
        <Text style={styles.itemText}>
          Trigger: low demand + bad weather + nearby browsing user
        </Text>
        <Text style={styles.itemText}>Quiet threshold: below {quietThreshold} transactions</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Gauge size={18} color={colors.accent} />
          <Text style={styles.cardTitle}>Demand Signal</Text>
        </View>
        <Text style={styles.itemText}>
          Current transaction density: {context.merchant.transactionDensity}
        </Text>
        <Text style={styles.itemText}>
          Normal transaction density: {context.merchant.normalTransactionDensity}
        </Text>
        <Text style={styles.itemText}>Current demand state: {context.merchant.currentDemand}</Text>
      </View>

      <View style={styles.metricsRow}>
        <MetricCard label="Generated offers" value={String(generatedOffers)} />
        <MetricCard label="Accepted" value={String(acceptedCount)} />
      </View>
      <View style={styles.metricsRow}>
        <MetricCard label="Redeemed" value={String(redeemedCount)} />
        <MetricCard label="Acceptance rate" value={acceptanceRate} />
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Settings2 size={18} color={colors.accent} />
          <Text style={styles.cardTitle}>Mock Rule Interface</Text>
        </View>
        <Text style={styles.fieldLabel}>Goal</Text>
        <TextInput editable={false} style={styles.input} value={context.merchant.goal} />
        <Text style={styles.fieldLabel}>Max discount</Text>
        <TextInput editable={false} style={styles.input} value={`${context.merchant.maxDiscount}%`} />
        <Text style={styles.fieldLabel}>Target product</Text>
        <TextInput editable={false} style={styles.input} value={context.merchant.targetProduct} />
        <Text style={styles.fieldLabel}>Quiet threshold</Text>
        <TextInput editable={false} style={styles.input} value={`${quietThreshold} transactions`} />
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <ReceiptText size={18} color={colors.success} />
          <Text style={styles.cardTitle}>Latest Generated Offer</Text>
        </View>
        <Text style={styles.itemText}>Message: {offer.title}</Text>
        <Text style={styles.itemText}>Product: {offer.targetProduct}</Text>
        <Text style={styles.itemText}>Discount: {offer.discount}% cashback</Text>
      </View>

      <View style={styles.links}>
        <Link href="/redeem" style={styles.linkButton}>
          Validate token
        </Link>
        <Link href="/" style={styles.linkButton}>
          Open wallet
        </Link>
        <Link href="/demo" style={styles.linkButton}>
          Scenario demo
        </Link>
      </View>

      <View style={styles.footer}>
        <Activity size={14} color={colors.muted} />
        <TrendingUp size={14} color={colors.muted} />
        <Text style={styles.footerText}>Merchant sees aggregate performance only.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 18, gap: 12, paddingBottom: 28 },
  header: { marginBottom: 4 },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 15, color: colors.muted },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  cardTitle: { color: colors.text, fontWeight: "700", fontSize: 16 },
  itemText: { color: colors.muted, lineHeight: 20 },
  metricsRow: { flexDirection: "row", gap: 10 },
  metricCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  metricLabel: { color: colors.muted, fontSize: 12 },
  metricValue: { color: colors.text, fontWeight: "800", fontSize: 26, marginTop: 2 },
  fieldLabel: { color: colors.text, fontWeight: "600", fontSize: 12, marginTop: 4 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.text,
  },
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
  footer: { flexDirection: "row", alignItems: "center", gap: 6 },
  footerText: { color: colors.muted, fontSize: 12 },
});
