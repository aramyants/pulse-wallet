type TicketmasterEvent = {
  id?: string;
  name?: string;
};

type TicketmasterResponse = {
  _embedded?: {
    events?: TicketmasterEvent[];
  };
  errors?: Array<{ code?: string; detail?: string }>;
};

export type LiveEventSignal = {
  count: number;
  nextEventName: string | null;
  sourceMode: "city-search";
};

export async function fetchEventbriteCityEvents(
  city: string,
  apiKey: string,
): Promise<LiveEventSignal> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new Error("Set EXPO_PUBLIC_TICKETMASTER_API_KEY in .env (see .env.example).");
  }

  const params = new URLSearchParams({
    city,
    sort: "date,asc",
    size: "20",
    apikey: trimmedKey,
  });
  const url = `https://app.ticketmaster.com/discovery/v2/events.json?${params.toString()}`;
  const response = await fetch(url);
  const data = (await response.json()) as TicketmasterResponse;

  if (!response.ok) {
    const apiMessage = data.errors?.[0]?.detail || data.errors?.[0]?.code || "Unknown provider error";
    throw new Error(
      `Ticketmaster city events fetch failed at ${url} -> ${response.status}: ${apiMessage}`,
    );
  }

  const events = data._embedded?.events ?? [];

  return {
    count: events.length,
    nextEventName: events[0]?.name ?? null,
    sourceMode: "city-search",
  };
}
