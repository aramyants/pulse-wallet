import type { DemoContext } from "../data/demoData";

type OWMWeather = { id: number; main: string; description?: string };
type OWMMain = { temp: number; feels_like?: number };

type OWCurrentResponse = {
  weather?: OWMWeather[];
  main?: OWMMain;
  name?: string;
  cod?: number | string;
  message?: string;
};

const RAIN_MAINS = new Set(["Thunderstorm", "Drizzle", "Rain", "Snow"]);

export function mapOpenWeatherMainToCondition(main: string): DemoContext["weather"]["condition"] {
  const key = main.trim();
  if (RAIN_MAINS.has(key)) return "Rain";
  if (key === "Clear") return "Sunny";
  return "Cloudy";
}

export type LiveWeather = {
  condition: DemoContext["weather"]["condition"];
  temperatureC: number;
  description: string;
  cityLabel: string;
};

export async function fetchOpenWeatherCurrent(
  city: string,
  apiKey: string,
  countryCode = "DE",
): Promise<LiveWeather> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new Error("OpenWeather API key is missing.");
  }

  const query = `${encodeURIComponent(city)},${countryCode}`;
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${query}&appid=${trimmedKey}&units=metric`;

  const res = await fetch(url);
  const data = (await res.json()) as OWCurrentResponse;

  if (!res.ok) {
    const msg =
      typeof data.message === "string"
        ? data.message
        : `OpenWeather request failed (${res.status})`;
    throw new Error(msg);
  }

  const mainBlock = data.main;
  const w0 = data.weather?.[0];
  if (!mainBlock || typeof mainBlock.temp !== "number" || !w0?.main) {
    throw new Error("Unexpected OpenWeather response shape.");
  }

  const condition = mapOpenWeatherMainToCondition(w0.main);
  const description = (w0.description ?? w0.main).replace(/\b\w/g, (c) => c.toUpperCase());
  const cityLabel = data.name ?? city;

  return {
    condition,
    temperatureC: Math.round(mainBlock.temp),
    description,
    cityLabel,
  };
}

export async function fetchOpenWeatherCurrentByCoords(
  coords: { latitude: number; longitude: number },
  apiKey: string,
): Promise<LiveWeather> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new Error("OpenWeather API key is missing.");
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${coords.latitude}&lon=${coords.longitude}&appid=${trimmedKey}&units=metric`;

  const res = await fetch(url);
  const data = (await res.json()) as OWCurrentResponse;

  if (!res.ok) {
    const msg =
      typeof data.message === "string"
        ? data.message
        : `OpenWeather request failed (${res.status})`;
    throw new Error(msg);
  }

  const mainBlock = data.main;
  const w0 = data.weather?.[0];
  if (!mainBlock || typeof mainBlock.temp !== "number" || !w0?.main) {
    throw new Error("Unexpected OpenWeather response shape.");
  }

  const condition = mapOpenWeatherMainToCondition(w0.main);
  const description = (w0.description ?? w0.main).replace(/\b\w/g, (c) => c.toUpperCase());
  const cityLabel = data.name ?? "Current location";

  return {
    condition,
    temperatureC: Math.round(mainBlock.temp),
    description,
    cityLabel,
  };
}
