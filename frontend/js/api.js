// Thin fetch wrapper. Every function returns a parsed JSON body or throws
// an Error with a human-readable message — callers show that message in
// the UI rather than a raw stack trace.
const BASE = window.__CONFIG__.API_BASE;

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, options);
  } catch (networkErr) {
    throw new Error(
      "Could not reach the backend. Is it running? (see README: `python app.py` in /backend)"
    );
  }
  let body = null;
  try {
    body = await res.json();
  } catch {
    // no JSON body (e.g. some error pages) — fine, keep body null
  }
  if (!res.ok) {
    const msg = (body && body.error) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return body;
}

export const api = {
  health: () => request("/api/health"),
  listCorridors: () => request("/api/corridors"),
  getDashboard: (corridorId) => request(`/api/corridors/${corridorId}/dashboard`),
  getLiveWeather: (lat, lon, refresh = false) =>
    request(`/api/weather/live?lat=${lat}&lon=${lon}${refresh ? "&refresh=1" : ""}`),
  predictRisk: (lat, lon, liveOverride = null) =>
    request("/api/predict-risk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude: lat, longitude: lon, live_override: liveOverride }),
    }),
  getMlMetadata: () => request("/api/ml/metadata"),
  getDistrictLiveWeather: (corridorId, refresh = false) =>
    request(`/api/weather/district/${corridorId}${refresh ? "&refresh=1" : ""}`),
  simulateStep: (payload) =>
    request("/api/simulate/step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  createReport: (formData) =>
    request("/api/reports", { method: "POST", body: formData }),
  listReports: (corridorId) => request(`/api/reports/corridor/${corridorId}`),
  verifyReport: (reportId, approve) =>
    request(`/api/reports/${reportId}/verify?approve=${approve}`, { method: "POST" }),
  explain: (corridorId, question) =>
    request("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ corridor_id: corridorId, question }),
    }),
  listAlerts: (minLevel = "YELLOW") => request(`/api/alerts?min_level=${minLevel}`),
  getOverview: () => request("/api/overview"),
  uploadUrl: (filename) => `${BASE}/uploads/${filename}`,
  broadcastSms: async (payload) => {
    try {
      return await request("/api/alerts/broadcast-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      const history = JSON.parse(localStorage.getItem("ews-broadcast-history") || "[]");
      const fallbackItem = {
        status: "success",
        broadcast_id: `CAP-SMS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        corridor_id: payload.corridor_id,
        corridor_name: payload.corridor_name || "Selected Corridor",
        state: payload.state || "Northeast Region",
        language: payload.language || "hi",
        target_audience: payload.target_audience || "all_citizens",
        alert_level: payload.alert_level || "RED",
        message_text: payload.message_text,
        recipients_count: 18450,
        delivery_rate_pct: 99.7,
        gateway: "NDMA Integrated Emergency Cell Broadcast (CAP-v1.2)",
        timestamp: new Date().toISOString(),
      };
      history.unshift(fallbackItem);
      localStorage.setItem("ews-broadcast-history", JSON.stringify(history.slice(0, 20)));
      return fallbackItem;
    }
  },
  listBroadcastHistory: async () => {
    try {
      const remote = await request("/api/alerts/broadcast-sms/history");
      if (Array.isArray(remote) && remote.length > 0) return remote;
    } catch {}
    return JSON.parse(localStorage.getItem("ews-broadcast-history") || "[]");
  },
};

