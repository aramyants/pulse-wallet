const http = require("http");

const port = Number(process.env.REDEEM_API_PORT || 8787);
const ollamaBaseUrl = String(process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
const usedTokens = new Set();

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function callOllamaGenerate(payload) {
  const response = await fetch(`${ollamaBaseUrl}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  return { ok: response.ok, status: response.status, parsed, text };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, { ok: true, service: "pulsewallet-redeem-api" });
    return;
  }

  if (req.method === "POST" && req.url === "/api/redeem") {
    try {
      const raw = await readBody(req);
      const payload = raw ? JSON.parse(raw) : {};
      const token = String(payload.token || "").trim();
      const merchantId = String(payload.merchantId || "").trim();

      if (!token || !merchantId) {
        sendJson(res, 400, { ok: false, code: "INVALID_REQUEST", message: "token and merchantId are required." });
        return;
      }

      if (!token.startsWith("PW-")) {
        sendJson(res, 422, { ok: false, code: "INVALID_TOKEN", message: "Token format is invalid." });
        return;
      }

      if (usedTokens.has(token)) {
        sendJson(res, 409, { ok: false, code: "TOKEN_ALREADY_USED", message: "Token already redeemed." });
        return;
      }

      usedTokens.add(token);
      sendJson(res, 200, {
        ok: true,
        code: "REDEEMED",
        token,
        merchantId,
        redeemedAt: new Date().toISOString(),
      });
      return;
    } catch {
      sendJson(res, 500, { ok: false, code: "SERVER_ERROR", message: "Could not validate token." });
      return;
    }
  }

  if (req.method === "POST" && req.url === "/api/offer") {
    try {
      const raw = await readBody(req);
      const payload = raw ? JSON.parse(raw) : {};
      const model = String(payload.model || "").trim();
      const prompt = String(payload.prompt || "").trim();

      if (!model || !prompt) {
        sendJson(res, 400, { ok: false, code: "INVALID_REQUEST", message: "model and prompt are required." });
        return;
      }

      const ollamaResult = await callOllamaGenerate({
        model,
        stream: false,
        format: "json",
        options: payload.options || { temperature: 0.7 },
        prompt,
      });

      if (!ollamaResult.ok) {
        sendJson(res, 502, {
          ok: false,
          code: "OLLAMA_UPSTREAM_ERROR",
          message: `Ollama returned status ${ollamaResult.status}.`,
          details: ollamaResult.parsed || ollamaResult.text || null,
        });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        response: ollamaResult.parsed?.response || "",
      });
      return;
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        code: "OFFER_GENERATION_FAILED",
        message: "Could not generate offer via backend.",
        details: error instanceof Error ? error.message : "Unknown error",
      });
      return;
    }
  }

  sendJson(res, 404, { ok: false, message: "Not found." });
});

server.listen(port, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`[backend-api] listening on http://0.0.0.0:${port} (ollama: ${ollamaBaseUrl})`);
});
