/**
 * Demo-scenario seed merchants.
 *
 * These power the three preset scenarios on /demo so that hackathon judges
 * can see deterministic flows. They are NOT used in live mode — live mode
 * pulls real merchants from OpenStreetMap (see services/overpass.ts).
 */

export type LatLng = { latitude: number; longitude: number };

export type MerchantSeed = {
  id: string;
  name: string;
  category: string;
  city: string;
  coords: LatLng;
  goal: string;
  maxDiscount: number;
  targetProduct: string;
  normalTransactionDensity: number;
};

export const merchantCatalog: MerchantSeed[] = [
  {
    id: "cafe-mueller",
    name: "Café Müller",
    category: "Café",
    city: "Stuttgart",
    coords: { latitude: 48.7756, longitude: 9.1829 },
    goal: "Fill quiet lunch hours",
    maxDiscount: 20,
    targetProduct: "Cappuccino",
    normalTransactionDensity: 78,
  },
  {
    id: "bakery-schmidt",
    name: "Bakery Schmidt",
    category: "Bakery",
    city: "Stuttgart",
    coords: { latitude: 48.7792, longitude: 9.1803 },
    goal: "Promote fresh pastries",
    maxDiscount: 12,
    targetProduct: "Croissant",
    normalTransactionDensity: 70,
  },
  {
    id: "noodle-house",
    name: "Noodle House Mitte",
    category: "Restaurant",
    city: "Stuttgart",
    coords: { latitude: 48.7774, longitude: 9.1757 },
    goal: "Fill tables before event crowd arrives",
    maxDiscount: 18,
    targetProduct: "Dinner bowl",
    normalTransactionDensity: 90,
  },
];

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

export function haversineMeters(a: LatLng, b: LatLng): number {
  const earthRadius = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return Math.round(earthRadius * c);
}
