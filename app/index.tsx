import { Link } from "expo-router";
import {
  CalendarDays,
  CloudRain,
  LocateFixed,
  MapPin,
  ScanSearch,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Store,
  Sun,
  Ticket,
  Timer,
  Umbrella,
} from "lucide-react-native";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useWalletStore } from "../src/store/walletStore";

const colors = {
  bg: "#F7F1E8",
  card: "#FFF8EF",
  white: "#FFFFFF",
  text: "#1F1A17",
  accent: "#8A4E2F",
  gold: "#E8C37D",
  success: "#2F6B4F",
  border: "#E7D8C4",
  muted: "#6D5B4C",
};

function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

export default function WalletScreen() {
  const {
    context,
    offer,
    accepted,
    dismissed,
    acceptOffer,
    dismissOffer,
    reset,
    weatherStatus,
    weatherError,
    weatherSource,
    refreshWeather,
    eventStatus,
    eventError,
    eventSource,
    upcomingEventCount,
    nextEventName,
    refreshEvents,
    locationStatus,
    locationError,
    locationSource,
    locationCity,
    scenarioEnabled,
    refreshLocation,
    demandStatus,
    demandError,
    demandSource,
    refreshDemand,
  } = useWalletStore();

  const weatherIcon =
    context.weather.condition === "Rain" ? (
      <CloudRain size={16} color={colors.accent} />
    ) : context.weather.condition === "Sunny" ? (
      <Sun size={16} color={colors.accent} />
    ) : (
      <Umbrella size={16} color={colors.accent} />
    );
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>PulseWallet</Text>
          <Text style={styles.subtitle}>Generated for {context.user.name}</Text>
        </View>
        <Sparkles size={24} color={colors.accent} />
      </View>

      <View style={styles.weatherBar}>
        <View style={styles.weatherBarLeft}>
          {weatherStatus === "loading" ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : null}
          <Text style={styles.weatherBarText}>
            {weatherStatus === "loading"
              ? "Loading live weather…"
              : weatherSource === "live"
                ? `Live weather · OpenWeatherMap · ${context.city}`
                : weatherStatus === "error"
                  ? "Weather: demo data (API error)"
                  : "Weather: demo data"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.weatherRefresh}
          onPress={() => void refreshWeather()}
          disabled={weatherStatus === "loading"}
        >
          <RefreshCw size={18} color={colors.accent} />
        </TouchableOpacity>
      </View>
      {weatherError && weatherStatus === "error" ? (
        <Text style={styles.weatherErrorText}>{weatherError}</Text>
      ) : null}

      <View style={styles.weatherBar}>
        <View style={styles.weatherBarLeft}>
          {eventStatus === "loading" ? <ActivityIndicator size="small" color={colors.accent} /> : null}
          <Text style={styles.weatherBarText}>
            {eventStatus === "loading"
              ? "Loading city events…"
              : eventSource === "live"
                ? `Live events · Ticketmaster · ${upcomingEventCount} found${nextEventName ? ` · Next: ${nextEventName}` : ""}`
                : eventStatus === "error"
                  ? "Events: demo fallback (API error)"
                  : "Events: demo fallback"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.weatherRefresh}
          onPress={() => void refreshEvents()}
          disabled={eventStatus === "loading"}
        >
          <CalendarDays size={18} color={colors.accent} />
        </TouchableOpacity>
      </View>
      {eventError && eventStatus === "error" ? (
        <Text style={styles.weatherErrorText}>{eventError}</Text>
      ) : null}

      <View style={styles.weatherBar}>
        <View style={styles.weatherBarLeft}>
          {locationStatus === "loading" ? <ActivityIndicator size="small" color={colors.accent} /> : null}
          <Text style={styles.weatherBarText}>
            {locationStatus === "loading"
              ? "Loading live location…"
              : scenarioEnabled
                ? `Scenario city locked · ${context.city}`
              : locationSource === "live"
                ? `Live location enabled${locationCity ? ` · ${locationCity}` : ""}`
                : locationStatus === "error"
                  ? "Location: demo fallback (permission/API error)"
                  : "Location: demo fallback"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.weatherRefresh}
          onPress={() => void refreshLocation()}
          disabled={locationStatus === "loading"}
        >
          <LocateFixed size={18} color={colors.accent} />
        </TouchableOpacity>
      </View>
      {locationError && locationStatus === "error" ? (
        <Text style={styles.weatherErrorText}>{locationError}</Text>
      ) : null}

      <View style={styles.weatherBar}>
        <View style={styles.weatherBarLeft}>
          {demandStatus === "loading" ? <ActivityIndicator size="small" color={colors.accent} /> : null}
          <Text style={styles.weatherBarText}>
            {demandStatus === "loading"
              ? "Loading Payone demand feed…"
              : demandSource === "payone-simulated"
                ? "Payone transaction density · simulated live feed"
                : "Demand: demo fallback"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.weatherRefresh}
          onPress={() => void refreshDemand()}
          disabled={demandStatus === "loading"}
        >
          <ScanSearch size={18} color={colors.accent} />
        </TouchableOpacity>
      </View>
      {demandError && demandStatus === "error" ? (
        <Text style={styles.weatherErrorText}>{demandError}</Text>
      ) : null}

      <View style={styles.chipsWrap}>
        <View style={styles.chipWithIcon}>
          {weatherIcon}
          <Chip label={`${context.weather.condition}, ${context.weather.temperature}°C`} />
        </View>
        <View style={styles.chipWithIcon}>
          <MapPin size={16} color={colors.accent} />
          <Chip label={`${context.user.distanceToMerchantMeters}m away`} />
        </View>
        <View style={styles.chipWithIcon}>
          <Timer size={16} color={colors.accent} />
          <Chip label={context.time.period} />
        </View>
        <View style={styles.chipWithIcon}>
          <Store size={16} color={colors.accent} />
          <Chip label={`${context.merchant.currentDemand} demand`} />
        </View>
      </View>

      <View style={[styles.offerCard, { backgroundColor: offer.widgetStyle.background }]}>
        <Text style={[styles.kicker, { color: offer.widgetStyle.accent }]}>
          {offer.tone === "emotional" ? "Emotional local moment" : "Informative local moment"} · {offer.widgetStyle.mood}
        </Text>
        <Text style={styles.offerHeadline}>{offer.title}</Text>
        <Text style={styles.offerSubHeadline}>{offer.subtitle}</Text>
        <Text style={[styles.discount, { color: offer.widgetStyle.accent }]}>{offer.discount}% discount</Text>
        <Text style={styles.metaLine}>
          {offer.merchantName} · {context.user.distanceToMerchantMeters}m away · expires in {offer.expiresInMinutes} min
        </Text>
        {offer.reasons.length > 0 ? (
          <View style={styles.reasonsWrap}>
            {offer.reasons.map((reason, index) => (
              <Text key={`${reason}-${index}`} style={styles.reasonText}>
                • {reason}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.ctaRow}>
        <TouchableOpacity style={[styles.acceptButton, { backgroundColor: offer.widgetStyle.accent }]} onPress={acceptOffer}>
          <Ticket size={18} color="#FFFFFF" />
          <Text style={styles.acceptText}>Accept offer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dismissButton} onPress={dismissOffer}>
          <Text style={styles.dismissText}>Dismiss</Text>
        </TouchableOpacity>
      </View>

      {dismissed && !accepted ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>Offer dismissed. You can generate a fresh one anytime.</Text>
          <TouchableOpacity
            onPress={() => {
              reset();
              void refreshDemand();
            }}
            style={styles.smallButton}
          >
            <Text style={styles.smallButtonText}>Regenerate offer</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {accepted ? (
        <View style={styles.qrCard}>
          <Text style={styles.qrTitle}>Accepted. Show this QR at checkout.</Text>
          <QRCode value={offer.token} size={160} />
          <Text style={styles.tokenLabel}>Token ID</Text>
          <Text style={styles.tokenValue}>{offer.token}</Text>
          <Text style={styles.qrHint}>Show this QR at merchant checkout</Text>
          <Link href="/redeem" style={styles.checkoutLink}>
            Simulate checkout now
          </Link>
        </View>
      ) : null}

      <View style={styles.privacyCard}>
        <View style={styles.privacyRow}>
          <ShieldCheck size={18} color={colors.success} />
          <Text style={styles.privacyTitle}>Privacy first</Text>
        </View>
        <Text style={styles.privacyText}>{offer.privacyNote}</Text>
      </View>

      <View style={styles.linksRow}>
        <Link href="/redeem" style={styles.linkButton}>
          Redeem token
        </Link>
        <Link href="/merchant" style={styles.linkButton}>
          Merchant dashboard
        </Link>
        <Link href="/demo" style={styles.linkButton}>
          Switch scenario
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 18, gap: 14, paddingBottom: 28 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  subtitle: { fontSize: 15, color: colors.muted, marginTop: 2 },
  weatherBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  weatherBarLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, paddingRight: 8 },
  weatherBarText: { color: colors.muted, fontSize: 13, flex: 1 },
  weatherRefresh: { padding: 6 },
  weatherErrorText: { color: "#A33A2A", fontSize: 12, marginTop: -6 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipWithIcon: { flexDirection: "row", alignItems: "center", gap: 4 },
  chip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: { color: colors.text, fontSize: 12, fontWeight: "600" },
  offerCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 6,
  },
  kicker: { color: colors.accent, fontWeight: "700", fontSize: 12, textTransform: "uppercase" },
  offerHeadline: { color: colors.text, fontSize: 28, fontWeight: "800", lineHeight: 32 },
  offerSubHeadline: { color: colors.text, fontSize: 19, fontWeight: "600", lineHeight: 24 },
  discount: { color: colors.accent, fontSize: 30, fontWeight: "800", marginTop: 6 },
  metaLine: { color: colors.muted, fontSize: 14, fontWeight: "500" },
  reasonsWrap: { marginTop: 4, gap: 3 },
  reasonText: { color: colors.text, fontSize: 13, lineHeight: 18 },
  ctaRow: { flexDirection: "row", gap: 10 },
  acceptButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  acceptText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  dismissButton: {
    minWidth: 110,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  dismissText: { color: colors.text, fontWeight: "700" },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
  },
  infoText: { color: colors.text },
  smallButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.gold,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  smallButtonText: { color: colors.text, fontWeight: "700" },
  qrCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    padding: 16,
    gap: 8,
  },
  qrTitle: { fontWeight: "700", color: colors.text, fontSize: 16 },
  tokenLabel: { color: colors.muted, marginTop: 4, fontSize: 12, textTransform: "uppercase" },
  tokenValue: { color: colors.text, fontWeight: "700", textAlign: "center" },
  qrHint: { color: colors.success, fontWeight: "600" },
  checkoutLink: {
    backgroundColor: colors.accent,
    color: "#FFFFFF",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    overflow: "hidden",
    fontWeight: "700",
  },
  privacyCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  privacyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  privacyTitle: { color: colors.text, fontWeight: "700", fontSize: 15 },
  privacyText: { color: colors.muted, lineHeight: 20 },
  linksRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
