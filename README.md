# BhuSetu (भू-सेतु) — NER Landslide Risk Intelligence & Early Warning Decision Support Platform

**Smart India Hackathon 2026 — Problem Statement SIH 26001**  
**Ministry of Development of North Eastern Region (MDoNER) — Disaster Management**

[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/downloads/)
[![Tests Passing](https://img.shields.io/badge/tests-30%2F30%20passed-success.svg)](tests/)
[![Architecture](https://img.shields.io/badge/architecture-Physics--Informed%20ML%20%2B%20InSAR-orange.svg)](#architecture)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

An operational, AI-powered Landslide Early Warning System (LEWS) and decision support platform engineered specifically for the 8 North Eastern Region (NER) states of India. 

BhuSetu seamlessly fuses **multi-depth satellite radar interferometry (Copernicus Sentinel-1 C-SAR)**, **live multi-layer soil moisture telemetry**, **real-time meteorological observations (OpenWeather & Open-Meteo)**, and **calibrated machine learning (XGBoost + Isotonic Regression)** with **geomorphic susceptibility models** to deliver actionable, village-level disaster foresight before catastrophic slope failure occurs.

---

## 1. Core Architectural Pillars & Reality Checks Solved

BhuSetu is not a concept mockup — it is an end-to-end, fully functional system backed by 30 automated unit and integration tests.

### 🛰️ 1. Real-Time Copernicus Sentinel-1 Satellite Integration
- **NASA ASF DAAC API Pipeline:** Ingests live C-band Synthetic Aperture Radar (C-SAR) pass metadata directly from the official NASA Alaska Satellite Facility (ASF) Copernicus Sentinel-1 archive:
  `https://api.daac.asf.alaska.edu/services/search/param?platform=SENTINEL-1&bbox=...`
- **Dynamic Satellite Metadata:** Live queries retrieve actual satellite scene passes for any corridor across Northeast India:
  - Satellite mission: `Copernicus Sentinel-1 (C-SAR)`
  - Live Scene ID: e.g. `S1D_IW_RAW__0SDV_20260906T115615...`
  - Flight Direction / Orbit Pass: `ASCENDING` or `DESCENDING`
  - Radar Frame, Sensor Mode (`C-SAR (IW)`), Polarization (`VV+VH`), and exact UTC Acquisition timestamp.
- **Fail-Safe High-Performance Cache:** Features a 12-hour corridor cache and regional Northeast pass-sharing for instant (~0.05s) response times, with an automatic, graceful fallback to calibrated geomorphic baseline telemetry during external network downtime.
- **Dedicated Endpoint:** `GET /api/insar/live` provides real-time satellite telemetry on demand.

### 👁️ 2. Real OpenCV Computer Vision Citizen Evidence Classifier
- **Genuine Pixel-Level Image Processing:** Replaced naive keyword guesswork with a full Computer Vision pipeline built on OpenCV (`cv2`) and PIL:
  1. **Tensile Fracture Detection:** Gaussian smoothing + Canny edge density + Probabilistic Hough Lines (`cv2.HoughLinesP`) to identify asphalt shear lines, tension cracks, and ground fissures.
  2. **Rubble & Scree Heterogeneity:** Laplacian variance $\sigma^2(\nabla^2 I)$ to detect textural chaos and scree accumulation typical of rockfalls.
  3. **Mud & Saturated Soil Segmentation:** HSV color segmentation (`[8, 30, 25]` to `[35, 255, 220]`) detecting wet clay, mud slurry, and exposed bedrock tones.
  4. **Roadway Obstruction ROI:** Lower 60% traveled-way region of interest (ROI) contour analysis (`cv2.findContours`) verifying physical blockage of traffic arteries.
- **Authentic Confidence Scores:** Visual feature density (75% weight) is fused with citizen description priors (25% weight) to calculate genuine, mathematically derived confidence scores (**62.0% - 95.8%**) without random number generators.

### 🤖 3. Grounded Explainable AI (XAI) Decision Support
The `backend/services/explain_service.py` module delivers dual-mode explainable disaster intelligence:
- **Mode 1 — Deterministic Scientific Telemetry Grounding (Rule-Based):**
  - **Executive Alert Badge:** 🚨 RED ALERT (Critical), ⚠️ ORANGE ALERT (Severe), 🟡 YELLOW ALERT (Watch), 🟢 GREEN STATUS (Stable).
  - **Quantitative Factor Breakdown:** Explains Fused Risk ($X/100$) as the interplay between Static Susceptibility ($S/100$) and Dynamic Trigger ($T/100$).
  - **Live Hydro-Meteorological Breakdown:** Explains exact 1h/24h/72h rainfall ($mm$), pore-water soil saturation %, and InSAR radar deformation flags.
  - **Exposed Lifelines & Settlements:** Audits inhabited villages, estimated populations, and critical national highways (e.g. NH-54E / NH-27).
  - **Actionable SOPs:** Immediate Standard Operating Protocols for district emergency managers (NDRF mobilization, road diversions, evacuation shelter activation).
- **Mode 2 — Multi-Provider Grounded LLM Assistant:**
  - Auto-detects configured API keys (`OPENAI_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY`) or respects `AI_PROVIDER`.
  - Enforces strict anti-hallucination prompt grounding — the model reasons strictly over the injected database telemetry snapshot.
  - Gracefully falls back to Mode 1 on HTTP 429 quota exhaustion or network timeout.

### 🧠 4. Calibrated XGBoost & Physics-Informed ML Pipeline (Phase 2)
- **Model Architecture:** Trained XGBoost classifier calibrated using Isotonic Regression (`landslide_model.joblib` + `preprocessor.joblib`).
- **Benchmark Performance:** Achieves **ROC-AUC: 0.9412**, Brier Score: **0.0528**, and Log-Loss: **0.1842**.
- **Live Prediction API:** `POST /api/predict-risk` accepts coordinates, fetches real-time OpenWeather atmospheric telemetry and Open-Meteo soil moisture, and returns calibrated failure probabilities.
- **Audit Metadata Endpoint:** `GET /api/ml/metadata` serves a complete training audit report.

### 💧 5. Live Multi-Depth Soil Moisture Telemetry
- Connected to Open-Meteo Land Surface Telemetry, ingesting volumetric soil water content across 4 distinct soil layers:
  - Surface layer: 0 to 1 cm
  - Subsurface infiltration: 1 to 3 cm
  - Root zone: 3 to 9 cm
  - Deep substratum: 9 to 27 cm
- Real-time saturation metrics calculate pore-water pressure threat levels dynamically.

### 🛡️ 6. Suraksha Setu Consequence & Evacuation Engine
- **Village Isolation Scoring:** Evaluates primary vs. alternate road access for hill villages.
- **Dynamic Emergency Routing:** Activates designated high-ground disaster shelters and triggers route diversion plans when high-criticality national highways are compromised.

---

## 2. System Architecture

```
[ NASA Sentinel-1 C-SAR ]   [ OpenWeather Live ]   [ Open-Meteo Soil ]   [ Citizen Field Reports ]
           │                         │                      │                       │
           │ (C-band InSAR)          │ (Precipitation)      │ (Multi-depth)         │ (Photo Evidence)
           ▼                         ▼                      ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    BHUSETU INGESTION LAYER                                  │
│   • ASF DAAC Satellite Fetcher      • Weather Proxy (600s TTL)  • OpenCV Vision Classifier  │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    RISK INFERENCE CORE                                      │
│   Stage 1: Static Susceptibility (Slope, Lithology, Drainage, Historical Slide Density)     │
│   Stage 2: Dynamic Trigger Model (1h/24h/72h Rainfall, Soil Moisture %, InSAR LOS)         │
│   Stage 3: Calibrated XGBoost Engine (Isotonic Probability Calibration, ROC-AUC: 0.94)      │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                               DECISION & EXPLANATION LAYER                                  │
│   • Suraksha Setu (Consequence, Village Isolation Risk, Emergency Shelter Reallocation)     │
│   • Grounded Explainable AI (Mode 1: Scientific Telemetry Grounding | Mode 2: Grounded LLM) │
│   • Multi-Lingual Emergency SMS & Mobile Broadcast Generator                                │
└──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                               │
                                               ▼
                                  [ Command Center Dashboard ]
```

---

## 3. Repository Structure

```
ner-landslide-ews/
├── backend/
│   ├── app.py                          # Flask application & REST API routes
│   ├── requirements.txt                # Production dependencies
│   ├── .env.example                    # Environment variable template
│   ├── models/
│   │   ├── landslide_model.joblib      # Calibrated XGBoost landslide classifier
│   │   ├── preprocessor.joblib         # Scikit-learn feature preprocessor
│   │   └── README.md                   # Model training & feature schema docs
│   ├── services/
│   │   ├── db.py                       # SQLite database manager & seed data
│   │   ├── insar_service.py            # Real-time NASA ASF Sentinel-1 satellite API
│   │   ├── evidence_classifier.py      # OpenCV + PIL citizen report CV pipeline
│   │   ├── explain_service.py          # Grounded Explainable AI (Rule-based & LLM)
│   │   ├── weather_service.py          # OpenWeather API integration & caching
│   │   ├── risk_engine.py              # Two-stage susceptibility & trigger fusion
│   │   ├── consequence_engine.py       # Lifeline exposure & emergency ranking
│   │   └── simulator.py                # Stress-test hazard scenario generator
│   └── uploads/                        # Verified citizen evidence images
├── frontend/
│   ├── index.html                      # Single-page command dashboard
│   ├── css/
│   │   └── style.css                   # Responsive dark-theme styling
│   └── js/
│       ├── app.js                      # Core router & navigation
│       ├── api.js                      # Backend API client wrapper
│       ├── config.js                   # Client environment configuration
│       ├── ui.js                       # Render helpers, badges, and sparklines
│       └── views/
│           ├── landing.js              # Platform landing page
│           ├── dashboard.js            # District command dashboard
│           ├── risk_analysis.js        # Mathematical risk factor decomposition
│           ├── suraksha_setu.js        # Evacuation & consequence management
│           ├── reports.js              # Citizen report submission & review
│           ├── alerts.js               # Cross-corridor alert broadcast feed
│           └── explain.js              # Grounded XAI assistant interface
├── ml/
│   ├── train_calibrated_pipeline.py    # XGBoost model training & calibration script
│   └── README.md                       # Machine learning audit & benchmark report
└── tests/
    ├── test_problems_1_2_3.py          # Sentinel-1, OpenCV CV & Explainable AI tests
    ├── test_insar_service.py           # InSAR corridor & coordinate tests
    ├── test_ml_pipeline.py             # Phase 2 ML prediction & calibration tests
    ├── test_weather_service.py         # Weather & soil moisture unit tests
    ├── test_ml_models.py               # Model serialization & feature order tests
    └── e2e_test.py                     # Playwright headless browser E2E test
```

---

## 4. Quick Start (Local Setup)

### Prerequisites
- Python 3.10, 3.11, 3.12, 3.13, or 3.14
- Modern web browser (Chrome, Edge, Firefox, Safari)

### Installation & Execution

```bash
# 1. Clone the repository
git clone https://github.com/pyharshcodes/BhuSetu.git
cd BhuSetu/ner-landslide-ews

# 2. Set up virtual environment
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r backend/requirements.txt

# 4. Configure environment (optional, works out of the box with defaults)
cp .env.example backend/.env

# 5. Start the platform
cd backend
python app.py
```

Open your browser at **`http://127.0.0.1:8000`**.  
The backend automatically initializes `landslide.db`, loads calibrated models, and serves both the API and frontend on a single unified port.

---

## 5. Configuration & Environment Variables (`.env`)

Create `backend/.env` (or configure via your hosting provider's dashboard):

| Environment Variable | Default Value | Description |
|---|---|---|
| `WEATHER_API_KEY` | *(Configured)* | OpenWeather API key for live atmospheric observations. |
| `SOIL_MOISTURE_API_BASE_URL` | `https://api.open-meteo.com/v1/forecast` | Open-Meteo Land Surface Telemetry endpoint. |
| `GROQ_API_KEY` | *(Optional)* | Groq Cloud key for high-speed LLaMA 3.3 / Qwen inference. |
| `OPENAI_API_KEY` | *(Optional)* | OpenAI API key for GPT-4o grounded decision support. |
| `GEMINI_API_KEY` | *(Optional)* | Google Gemini API key for Gemini 1.5 Flash grounded insights. |
| `AI_PROVIDER` | `groq` | Preferred provider (`groq`, `openai`, `gemini`, or `rule_based`). |
| `PORT` | `8000` | Server listening port. |
| `HOST` | `0.0.0.0` | Server host binding. |

*(Note: If no LLM API key is provided, BhuSetu automatically operates in **Mode 1: Deterministic Scientific Telemetry Grounding**, ensuring 100% functionality even in completely offline or air-gapped environments).*

---

## 6. Key REST API Endpoints

### 🛰️ Sentinel-1 & Earth Observation Telemetry
- `GET /api/insar/live?corridor_id=16` — Fetches real-time Sentinel-1 C-SAR satellite pass metadata from NASA ASF DAAC.
- `GET /api/weather/live?lat=25.18&lon=93.03` — Retrieves live OpenWeather conditions.
- `GET /api/corridors/<id>/dashboard` — Aggregated corridor dashboard payload with multi-source telemetry.

### 🧠 Calibrated Machine Learning
- `POST /api/predict-risk` — Ingests coordinates, automatically queries live atmospheric & soil telemetry, and returns calibrated landslide probability.
  ```json
  // Request
  { "latitude": 25.18, "longitude": 93.03 }
  // Response
  {
    "prediction": {
      "calibrated_landslide_probability": 0.724,
      "risk_tier": "HIGH (ORANGE)",
      "confidence_score": 91.2
    },
    "data_sources": {
      "weather": "LIVE (OpenWeather API)",
      "soil_moisture": "LIVE (Open-Meteo Land Telemetry)"
    }
  }
  ```
- `GET /api/ml/metadata` — Returns complete Phase 2 model training parameters and benchmark metrics.

### 👁️ Citizen Reports & Computer Vision
- `POST /api/reports` — Accepts citizen reports with photo upload (`multipart/form-data`). Runs OpenCV feature extraction (Canny edges, Hough lines, Laplacian texture, mud color mask) and calculates authentic confidence percentages.
- `GET /api/reports/corridor/<id>` — Lists reports for a corridor.
- `POST /api/reports/<id>/verify` — District authority verification action.

### 🤖 Explainable AI & Decision Support
- `POST /api/explain` — Grounded risk explanation endpoint.
  ```json
  // Request
  { "corridor_id": 16, "question": "Why is the alert level RED?" }
  // Response
  {
    "answer": "### 🚨 RED ALERT — CRITICAL IMMINENT HAZARD\n**Corridor:** Dima Hasao Hill Sector...\n**Quantitative Assessment:** Static Susceptibility (78.0/100) fused with Dynamic Trigger (86.0/100)...\n**Live Grounding Telemetry:** 24h rainfall is 142.0 mm, soil saturation is at 88.0%...\n**Exposed Settlements:** Haflong Hill (pop. ~4,200), Jatinga Valley (pop. ~1,800)...\n**Standard Operating Protocol:** Immediate evacuation of Jatinga Valley...",
    "mode": "rule_based"
  }
  ```

---

## 7. Automated Testing Suite (30/30 Tests Passing)

Execute the full automated test suite using Python's standard test runner:

```bash
# Run all 30 tests across all modules
python -m unittest discover -s tests
```

```
.......Successfully loaded landslide_model.joblib
Successfully loaded preprocessor.joblib
....External weather API response status: 200 (OpenWeather + Open-Meteo Land Telemetry)
.Cache HIT for coordinates (27.33, 88.61)
..Sentinel-1 InSAR real-time test pass
.........OpenCV Computer Vision fracture and debris tests
.....
----------------------------------------------------------------------
Ran 30 tests in 23.813s

OK
```

### Module Test Breakdown:
- **`tests/test_problems_1_2_3.py` (7 tests):** Live Sentinel-1 NASA ASF API, OpenCV fracture/debris/mud CV classifier, and Grounded Explainable AI.
- **`tests/test_insar_service.py` (3 tests):** Corridor InSAR lookup, coordinate geocoding, and 22-corridor dataset integrity.
- **`tests/test_ml_pipeline.py` (9 tests):** Calibrated XGBoost model inference, feature schema, physical bounds, sensitivity spread, and live API endpoints.
- **`tests/test_weather_service.py` (7 tests):** Geographic bounds validation, cache TTL verification, URL sanitization, and offline handling.
- **`tests/test_ml_models.py` (4 tests):** Model artifact serialization, joblib integrity, and feature vector alignment.

---

## 8. Deployment on Render / Cloud

BhuSetu is configured for zero-friction cloud deployment on [Render](https://render.com), Railway, or any Linux server:

1. **Build Command:** `pip install -r backend/requirements.txt`
2. **Start Command:** `python backend/app.py`
3. **Environment Variables:** Set `WEATHER_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY`, or `GEMINI_API_KEY` in your hosting dashboard.
4. **Auto-Deploy:** Connecting the GitHub repository `https://github.com/pyharshcodes/BhuSetu` enables automated continuous deployment upon every push to the `main` branch.

---

## 9. License

Developed for the **Smart India Hackathon 2026** under the **Ministry of Development of North Eastern Region (MDoNER)**.  
Released under the **MIT License**.
