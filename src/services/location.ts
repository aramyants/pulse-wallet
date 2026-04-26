import * as Location from "expo-location";

type LatLng = { latitude: number; longitude: number };

export type LiveLocationSignal = {
  city: string | null;
  distanceToMerchantMeters: number;
  userCoords: LatLng;
};

const merchantCoordinates: Record<string, LatLng> = {
  "cafe-mueller": { latitude: 48.7756, longitude: 9.1829 },
  "bakery-schmidt": { latitude: 48.7792, longitude: 9.1803 },
  "noodle-house": { latitude: 48.7774, longitude: 9.1757 },
  "yerevan-lavash-house": { latitude: 40.1773, longitude: 44.5126 },
};

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function haversineMeters(a: LatLng, b: LatLng) {
  const earthRadius = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Math.round(earthRadius * c);
}

export async function fetchLiveLocationSignal(merchantId: string): Promise<LiveLocationSignal> {
  const merchant = merchantCoordinates[merchantId];
  if (!merchant) {
    throw new Error(`Missing merchant coordinates for ${merchantId}.`);
  }

  const existingPermission = await Location.getForegroundPermissionsAsync();
  const permission =
    existingPermission.status === "undetermined"
      ? await Location.requestForegroundPermissionsAsync()
      : existingPermission;

  if (permission.status !== "granted") {
    throw new Error("Location permission denied.");
  }

  const current = await Promise.race([
    Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Location request timed out.")), 12000);
    }),
  ]);

  const userCoords: LatLng = {
    latitude: current.coords.latitude,
    longitude: current.coords.longitude,
  };

  let distanceToMerchantMeters = haversineMeters(userCoords, merchant);
  distanceToMerchantMeters = Math.max(5, Math.min(25000, distanceToMerchantMeters));

  let city: string | null = null;
  try {
    const reverse = await Location.reverseGeocodeAsync(userCoords);
    city = reverse[0]?.city ?? reverse[0]?.subregion ?? reverse[0]?.region ?? null;
  } catch {
    city = null;
  }

  return {
    city,
    distanceToMerchantMeters,
    userCoords,
  };
}
