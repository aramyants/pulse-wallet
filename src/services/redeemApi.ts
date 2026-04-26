import Constants from "expo-constants";
import { Platform } from "react-native";

type RedeemResponse = {
  ok: boolean;
  code?: string;
  message?: string;
  redeemedAt?: string;
};

export type RedeemResult = {
  ok: boolean;
  code: string;
  message: string;
  redeemedAt?: string;
};

function defaultBaseUrl() {
  if (Platform.OS === "android") return "http://10.0.2.2:8787";
  return "http://localhost:8787";
}

export function getRedeemApiBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_REDEEM_API_BASE_URL?.trim();
  return envUrl || defaultBaseUrl();
}

function inferLanBaseUrl() {
  const anyConstants = Constants as unknown as {
    expoConfig?: { hostUri?: string };
    expoGoConfig?: { debuggerHost?: string };
    manifest2?: { extra?: { expoClient?: { hostUri?: string } } };
  };

  const hostLike =
    anyConstants.expoConfig?.hostUri ||
    anyConstants.expoGoConfig?.debuggerHost ||
    anyConstants.manifest2?.extra?.expoClient?.hostUri;

  if (!hostLike) return null;

  const host = hostLike.split(":")[0];
  if (!host) return null;
  return `http://${host}:8787`;
}

function buildCandidateBaseUrls() {
  const urls: string[] = [];
  const envUrl = process.env.EXPO_PUBLIC_REDEEM_API_BASE_URL?.trim();
  const lanUrl = inferLanBaseUrl();

  if (envUrl) urls.push(envUrl);
  if (Platform.OS === "android") urls.push("http://10.0.2.2:8787");
  urls.push("http://localhost:8787");
  if (lanUrl) urls.push(lanUrl);

  return [...new Set(urls)];
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 7000) {
  return await Promise.race([
    fetch(url, init),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

export async function validateTokenViaApi(params: {
  token: string;
  merchantId: string;
}): Promise<RedeemResult> {
  const candidates = buildCandidateBaseUrls();
  let lastNetworkError: string | null = null;

  for (const baseUrl of candidates) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}/api/redeem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: params.token,
          merchantId: params.merchantId,
        }),
      });

      const data = (await response.json()) as RedeemResponse;
      if (!response.ok || !data.ok) {
        return {
          ok: false,
          code: data.code || "REDEEM_FAILED",
          message: data.message || `Token validation failed (${response.status}).`,
        };
      }

      return {
        ok: true,
        code: data.code || "REDEEMED",
        message: "Token validated and redeemed.",
        redeemedAt: data.redeemedAt,
      };
    } catch (err) {
      lastNetworkError = err instanceof Error ? err.message : "Network request failed.";
    }
  }

  return {
    ok: false,
    code: "NETWORK_UNREACHABLE",
    message:
      `Could not reach redemption API (${lastNetworkError || "Network request failed"}). ` +
      `If testing on a physical phone, set EXPO_PUBLIC_REDEEM_API_BASE_URL=http://<YOUR_PC_LAN_IP>:8787`,
  };
}
