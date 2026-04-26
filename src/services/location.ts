import * as Location from "expo-location";
import type { LatLng } from "../data/merchantCatalog";

export type LiveLocationSignal = {
  city: string | null;
  userCoords: LatLng;
};

export async function fetchLiveLocationSignal(): Promise<LiveLocationSignal> {
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
      setTimeout(
        () => reject(new Error("Location request timed out.")),
        12000,
      );
    }),
  ]);

  const userCoords: LatLng = {
    latitude: current.coords.latitude,
    longitude: current.coords.longitude,
  };

  let city: string | null = null;
  try {
    const reverse = await Location.reverseGeocodeAsync(userCoords);
    city =
      reverse[0]?.city ??
      reverse[0]?.subregion ??
      reverse[0]?.region ??
      null;
  } catch {
    city = null;
  }

  return { city, userCoords };
}
