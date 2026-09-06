# BhuSetu — NER Landslide Risk Intelligence & Decision Support Platform

**Smart India Hackathon 2026 — Problem Statement SIH 26001**
Ministry of Development of North Eastern Region (MDoNER) — Disaster Management

An AI-based early warning and landslide risk monitoring platform for the North
Eastern Region (NER). Fuses real-time meteorological observations, terrain susceptibility,
soil moisture, and satellite (SAR) evidence into a confidence-scored risk assessment, maps
which roads and villages are exposed, ranks emergency priorities, and accepts
verified citizen field reports — all through an operational district command dashboard.

---

## 1. What this actually is (read this first)

BhuSetu is a **working, end-to-end demonstrator and decision support system**, not a mockup.
Every button on every screen calls a real backend endpoint that does real computation and
persists to a real database.

### Real-Time Weather Integration (Phase 1)
In Phase 1, BhuSetu is **genuinely connected to live external environmental data** via the OpenWeather API:
- **Zero Mock Weather:** Live coordinates clicked on the map or selected districts query real-time weather feeds directly from OpenWeather via secure backend proxy.
- **Explicit Separation:** Clean operational distinction between **REAL-TIME MODE** (live OpenWeather feed) and **SIMULATION MODE** (synthetic hazard stress-testing).
- **Zero API Key Leakage:** OpenWeather credentials are strictly confined to backend `.env` variables and never exposed to the frontend JavaScript.
- **Strict Integrity ("No Fake Data"):** If the external weather API is unreachable or keys are missing, the system gracefully returns an explicit `UNAVAILABLE` state with actionable error codes — it **never** manufactures fake weather data.
- **Phase 2 ML Model Notice:** The landslide risk engine currently runs in rule-based prototype mode (`model_mode: "rule_based (Phase 1 prototype)"`). Final machine learning landslide prediction models and historical training datasets will be introduced in **Phase 2**.

### A note on the tech stack actually used

The original plan for this build was **React + TypeScript + Vite + Tailwind**
on the frontend and **FastAPI + SQLAlchemy** on the backend. That was changed
during development because the build environment had no network access to
install those packages. What's actually here — and what has been fully
tested — is:

- **Backend:** Python + **Flask** + stdlib `sqlite3` (no ORM). Functionally
  equivalent to the original FastAPI plan; swap is mechanical if you prefer
  FastAPI later.
- **Frontend:** **Vanilla HTML/CSS/JavaScript** (ES modules, no build step,
  no npm required). This is a deliberate reliability choice for a hackathon
  demo — there is no `npm install` step that can fail on a judge's machine.
  It uses `fetch`, native SVG (for the risk sparkline), and hash-based
  routing. No React/Tailwind/Vite are actually used, despite earlier
  intentions.

Everything below has been run and verified in this repository's actual
environment (backend endpoints tested with `curl`, full user flows tested
with a real headless-Chromium browser via Playwright — see §8).

---

## 2. Architecture

```
Rainfall + Soil Moisture + SAR (simulated or live)
                |
                v
   Stage 1: Static Susceptibility   <- terrain/geology/land-cover/drainage/
    (slow-changing, "where")           history/human-modification indices
                |
                v
   Stage 2: Dynamic Trigger         <- rainfall (1h/24h/72h), soil moisture,
    (fast-changing, "when")            SAR deformation flag
                |
                v
   Stage 3: Confidence-weighted     <- visible degradation if a sensor is
    Fusion -> Alert Level              offline; never hides missing data
                |
                v
   Consequence Engine               <- rule-based road/village exposure +
    (roads, villages, priority)         emergency priority ranking
                |
                v
        District Command Dashboard
     (risk, trend, exposure, actions,
      alerts feed, citizen reports,
      explain assistant)
```

Citizen/field reports run through a separate, explicitly human-verified
pipeline (`backend/services/evidence_classifier.py`) and **never
automatically influence the risk score** — matching the "AI recommends, the
authority decides" principle from the source problem statement.

---

## 3. Project structure

```
ner-landslide-ews/
├── backend/
│   ├── app.py                       # Flask app + all API routes
│   ├── services/
│   │   ├── db.py                    # sqlite3 schema, connection, seed data
│   │   ├── simulator.py             # synthetic rainfall/soil/SAR generator
│   │   ├── risk_engine.py           # two-stage susceptibility x trigger fusion
│   │   ├── consequence_engine.py    # road/village exposure + priority
│   │   ├── evidence_classifier.py   # citizen-report evidence categoriser
│   │   └── explain_service.py       # rule-based "explain this risk" assistant
│   ├── uploads/                     # citizen report photos land here
│   ├── requirements.txt
│   └── landslide.db                 # created automatically on first run
├── frontend/
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── config.js                # API_BASE URL - edit this if needed
│       ├── api.js                   # fetch wrapper for every endpoint
│       ├── ui.js                    # small render helpers (badges, sparkline...)
│       ├── app.js                   # router + nav + top-level state
│       └── views/
│           ├── landing.js
│           ├── dashboard.js         # main command view
│           ├── reports.js           # citizen/field report submission + list
│           ├── alerts.js            # cross-corridor alert feed
│           └── explain.js           # risk explanation chat
├── .env.example
└── README.md
```

---

## 4. Prerequisites

- Python 3.10+
- A modern browser

---

## 5. Running it

Just one command, one terminal, one port. The backend now serves the
frontend itself, so there's no second server to start and no port to
match up by hand.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Then open **http://127.0.0.1:8000** in your browser — that's it.

On first run it creates `landslide.db` and seeds two illustrative pilot
corridors (Sikkim NH-10, Meghalaya Shillong-Dawki) with roads, villages, and
48 hours of simulated sensor history.

Check the API alone if you want to:
```bash
curl http://127.0.0.1:8000/api/health
```

If you genuinely need the frontend and backend on separate servers/ports
(e.g. deploying them separately later), `frontend/js/config.js` auto-detects
same-origin already — only edit it if you deliberately split them apart.

---

## 6. Phase 1: Real-Time Weather & Environmental Integration

Phase 1 establishes real-time operational connectivity between BhuSetu and external meteorological services (OpenWeather API), replacing static mock weather values with genuine live atmospheric feeds across the North Eastern Region.

### 6.1 Configuration & Security (.env)
Weather API credentials and caching parameters are managed strictly in the backend `.env` file:

```ini
# OpenWeather API Configuration (Phase 1)
WEATHER_API_KEY=your_openweathermap_api_key
WEATHER_API_BASE_URL=https://api.openweathermap.org/data/2.5
WEATHER_CACHE_TTL_SECONDS=600
```

- **Backend Proxy Pattern:** All requests to OpenWeather are executed server-side via `backend/services/weather_service.py`. The API key is **never** sent to the client browser or exposed in frontend JavaScript bundles.
- **Log Sanitization:** All internal and server log statements sanitize queries by automatically replacing `appid` tokens with `[REDACTED]`.
- **Git Protection:** `.env` is registered in `.gitignore` to prevent credential exposure in version control. A safe template is provided in `.env.example`.

### 6.2 Backend Architecture & Caching
The integration is encapsulated in `backend/services/weather_service.py`:
- **Geographic Validation:** Rejects out-of-bounds coordinates with HTTP 400 (`-90 <= lat <= 90`, `-180 <= lon <= 180`).
- **In-Memory Caching:** Implements a coordinate-based cache with a default 600-second (10-minute) TTL. Coordinates are rounded to 2 decimal places (`~1.1 km` spatial resolution), eliminating redundant external API queries and respecting rate limits.
- **Manual Cache Bypass:** Adding `?refresh=true` invalidates the cached entry and forces an immediate fresh pull.
- **Fail-Safe Integrity:** In the event of network disruption, HTTP 429 rate limits, or invalid keys, the service returns explicit `UNAVAILABLE` status and human-readable diagnostic messages. **No fake or fabricated weather data is ever generated.**

### 6.3 API Endpoints

| Endpoint | Method | Params | Description |
|---|---|---|---|
| `/api/weather/live` | `GET` | `lat`, `lon`, `refresh` | Fetches live weather for exact arbitrary coordinates. |
| `/api/weather/district/<id>` | `GET` | `id` (corridor/district ID), `refresh` | Fetches live weather for a registered district's centroid. |
| `/api/corridors/<id>/dashboard` | `GET` | `id` | Standard dashboard payload augmented with live weather under the `live_weather` key. |
| `/api/health` | `GET` | — | System health status including `weather_api_configured`, `weather_api_mode`, and `model_mode`. |

#### Example Response (`/api/weather/live?lat=25.18&lon=93.03`)
```json
{
  "status": "ok",
  "data_status": "LIVE",
  "source": "OpenWeather API",
  "cached": false,
  "cache_age_seconds": 0,
  "location": {
    "name": "Hāflong",
    "country": "IN",
    "latitude": 25.18,
    "longitude": 93.03
  },
  "weather": {
    "temperature": 30.78,
    "humidity": 58,
    "rainfall_1h": 0.0,
    "rainfall_forecast_24h": 6.11,
    "condition": "Clouds",
    "wind_speed": 1.78,
    "pressure": 1008,
    "clouds": 94,
    "visibility": 10000
  },
  "field_status": {
    "temperature": "LIVE",
    "humidity": "LIVE",
    "rainfall_1h": "LIVE",
    "rainfall_forecast_24h": "DERIVED",
    "soil_moisture": "UNAVAILABLE",
    "elevation": "PLANNED",
    "ml_landslide_prediction": "NOT AVAILABLE YET"
  },
  "ml_feature_vector": {
    "temperature_c": 30.78,
    "humidity_pct": 58,
    "rainfall_1h_mm": 0.0,
    "rainfall_forecast_24h_mm": 6.11,
    "soil_moisture_pct": null,
    "elevation_m": null,
    "slope_deg": null
  }
}
```

### 6.4 Parameter Status & ML Readiness Matrix

Every environmental parameter is explicitly labelled with its source and operational status:

| Parameter | Type / Unit | Status | Notes |
|---|---|---|---|
| **Temperature** | °C | `LIVE` | Sourced directly from OpenWeather `/weather`. |
| **Humidity** | % | `LIVE` | Sourced directly from OpenWeather `/weather`. |
| **1h Rainfall** | mm | `LIVE` | Sourced from `rain.1h` field (`0.0 mm` if clear). |
| **24h Rainfall Forecast** | mm | `DERIVED` | Summed across next 8 three-hour intervals from OpenWeather `/forecast`. |
| **Wind & Clouds** | m/s, % | `LIVE` | Real-time wind speed, direction, and cloud coverage. |
| **Atmospheric Pressure** | hPa | `LIVE` | Real-time barometric surface pressure. |
| **Soil Moisture** | % | `UNAVAILABLE` | Ground IoT sensors / specialized ESA SMOS telemetry required. |
| **Elevation & Slope** | m, deg | `PLANNED` | Digital Elevation Models (SRTM DEM) planned for future terrain pipelines. |
| **ML Landslide Prediction** | Probability / Class | `NOT AVAILABLE YET` | **Phase 2 Milestone.** Dataset acquisition and model training will occur in Phase 2. |

### 6.5 Interactive Frontend Features
- **Operations Mode Banner:** The "Live Monitoring" view features a top banner distinguishing **REAL-TIME MODE (Live OpenWeather API)** from **SIMULATION MODE (Physical Stress Testing)**.
- **Interactive Map Click-to-Fetch:** In both the Dashboard and Map views, clicking any point on the Leaflet map queries `/api/weather/live` for those exact coordinates and displays real-time weather in an interactive popup.
- **Cache Refresh:** Users can manually force-refresh live atmospheric observations via the "Refresh Live Feed" button.

---

## 7. Plugging in your trained model (Phase 2 Roadmap)

You don't need to touch any app code for this. Once you have a trained
susceptibility and/or trigger model:

1. Save it with `joblib.dump(model, "susceptibility_model.joblib")` (or
   `trigger_model.joblib`).
2. Copy the file into `backend/models/`.
3. Restart `python app.py`.

Full details — exact feature order, expected output format, a
sanity-check snippet — are in **`backend/models/README.md`**. If a model
file is missing or fails to load for any reason, the app automatically
falls back to the existing rule-based formulas in
`backend/services/risk_engine.py` and keeps running; `/api/health` reports
`"model_mode": "trained"` once at least one model is actually loaded, so
you can confirm it switched over.

---

## 8. Simulation Mode vs. Live Mode

The platform supports two complementary modes:
- **LIVE WEATHER MODE:** Queries genuine atmospheric observations from OpenWeather API for any clicked map coordinate or district centroid.
- **SIMULATION / STRESS-TEST MODE:** Generates physically-plausible dynamic hazards (`backend/services/simulator.py`) to stress-test disaster response protocols under extreme monsoon, cloudburst, or SAR deformation scenarios without requiring a natural catastrophe to occur.

Both modes are explicitly tagged across the UI and API responses (`simulated: true` vs `data_status: "LIVE"`).

---

## 9. Demo Flow (Mirrors the Operational Workflow)

1. Open the app -> **landing page** -> "Open Command Dashboard".
2. View **Live Meteorological Data** in the top sensor strip.
3. Click any point on the **Interactive Leaflet Map** to query real-time OpenWeather data for those exact coordinates.
4. On the **Dashboard**, pick a corridor. Click **"Rainfall spike"** to simulate an extreme cloudburst event — observe the risk score move and emergency action plans update.
5. Click **"+ SAR deformation"** — risk escalates to Red / Very High, triggering evacuation recommendations and consequence assessments.
6. Click **"Knock out sensor"** — observe confidence visibly degrade and a degradation notice appear, demonstrating honest failure states.
7. Open **Live Monitoring** to inspect the 8 weather metric cards and Phase 2 ML parameter readiness matrix.
8. Go to **Alerts** — view ranked corridor alerts and draft multi-lingual broadcast SMS alerts.
9. Go to **Suraksha Setu** — review vulnerability ranking and automated shelter reallocation routes for high-risk villages.
10. Go to **Citizen / Field Reports** — submit a report ("large crack near road shoulder"), watch it auto-classify with confidence score, and perform human reviewer verification.
11. Go to **Explain / Ask** — ask "Why is the risk level what it is?" and receive transparent, explainable reasoning grounded in real data.

---

## 10. Automated Testing & Verification Suite

All modules have comprehensive automated test suites:
- **Unit & Mock Tests (`tests/test_weather_service.py`):** 7 comprehensive tests covering coordinate validation, URL sanitization, response normalization, field status tagging, ML feature vector structure, and offline error handling (100% mocked, runs without consuming API quota).
- **Live Multi-Location Verification (`tests/verify_live_locations.py`):** Directly queries the live backend API across 3 geographically distinct NER locations (Dima Hasao, Assam; Gangtok, Sikkim; Shillong, Meghalaya) and asserts genuine, distinct live data.
- **End-to-End Regression Suite (`tests/e2e_test.py`):** Drives a headless Chromium browser through the full user journey via Playwright, validating that zero console errors or uncaught exceptions occur.

To execute tests:
```bash
# 1. Run weather service unit tests
python tests/test_weather_service.py

# 2. Run multi-location live verification (requires backend running)
python tests/verify_live_locations.py

# 3. Run full headless browser E2E test
python tests/e2e_test.py
```

---

## 11. Known Limitations & Phase 2 Scope

- **Phase 1 Boundary:** Real-time OpenWeather data is fully operational. Machine learning models and training datasets for landslide susceptibility and trigger classification are strictly reserved for **Phase 2**.
- **Soil Moisture & Satellite Telemetry:** Soil moisture currently reports `UNAVAILABLE` because ground IoT telemetry or specialized microwave satellite products (e.g. SMAP / Sentinel-1 InSAR) require field hardware or agency credentials.
- **Explain Assistant:** The explain assistant operates on deterministic, grounded rule templates; LLM API keys (`ANTHROPIC_API_KEY` or `OPENAI_API_KEY`) can be added to `.env` to enable freeform conversational synthesis.
- **Database:** SQLite is used for prototype portability; high-throughput district deployments can transition to PostgreSQL/PostGIS.

## 12. Troubleshooting

| Symptom | Fix |
|---|---|
| Frontend shows "Cannot reach the backend" | Make sure `python app.py` is running in `backend/`, and that you're opening the URL it prints (http://127.0.0.1:8000) — not a separate frontend server. |
| `ModuleNotFoundError: No module named 'flask'` | Run `pip install -r requirements.txt` inside the activated virtualenv. |
| Port 8000 already in use | Stop whatever else is using it, or run `python app.py` with a different port (edit the `app.run(...)` call at the bottom of `backend/app.py`). |
| Citizen report photo upload rejected | Only JPG/PNG/WEBP under 8 MB are accepted — this is enforced server-side. |
| Database looks stale / want a clean slate | Stop the backend, delete `backend/landslide.db`, restart — it reseeds automatically. |
| `/api/health` shows `"model_mode": "rule_based"` after adding a model file | Check the terminal running `python app.py` for a warning line — it logs exactly why a model failed to load (wrong filename, wrong library installed, etc.). See `backend/models/README.md`. |
