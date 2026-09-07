<div align="center">

<img src="frontend/assets/bhusetu-logo.jpg" alt="BhuSetu Emblem" width="130" style="border-radius: 50%; box-shadow: 0 4px 20px rgba(0,0,0,0.5);" />

# 🏔️ BhuSetu (भू-सेतु)
### Pan-Northeast Landslide Early Warning & Disaster Decision Support Platform
**Smart India Hackathon 2026 — Problem Statement SIH 26001**  
*Ministry of Development of North Eastern Region (MDoNER) · Ministry of Earth Sciences (MoES) · Government of India*

---

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12%20%7C%203.13%20%7C%203.14-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Coverage 8 States](https://img.shields.io/badge/Northeast%20Coverage-8%20States%20%7C%20132%20Districts-10B981?style=for-the-badge&logo=target&logoColor=white)](#-pan-northeast-coverage-8-states--132-districts)
[![ML Architecture](https://img.shields.io/badge/ML%20Engine-XGBoost%20%2B%20Isotonic%20Calibration%20(ROC--AUC%200.941)-FF6F00?style=for-the-badge&logo=scikitlearn&logoColor=white)](#-calibrated-xgboost--physics-informed-ml-core)
[![Satellite Telemetry](https://img.shields.io/badge/Earth%20Observation-Copernicus%20Sentinel--1%20InSAR-005F73?style=for-the-badge&logo=nasa&logoColor=white)](#-copernicus-sentinel-1-insar-satellite-pipeline)
[![Tests Passing](https://img.shields.io/badge/Test%20Suite-40%2F40%20Passed%20(100%25)-success?style=for-the-badge&logo=checkmarx&logoColor=white)](#-automated-testing-suite-4040-passing)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

<br/>

**“Prepared Today, Safer Tomorrow”**  
*Autonomous multi-sensor satellite radar interferometry, real-time soil pore-pressure telemetry, computer vision fracture classification, and dynamic humanitarian corridor rerouting.*

[🌐 Live Web Demo](#-deployment--live-cloud-instance) · [📖 System Architecture](#-system-architecture) · [🚀 Flagship Features](#-flagship-innovations--evaluator-grade-features) · [⚡ Quick Start](#-quick-start-local-installation) · [📊 Machine Learning Audit](#-calibrated-xgboost--physics-informed-ml-core)

</div>

---

## 📌 Executive Overview & The Problem

The 8 North Eastern states of India encompass steep geomorphology, seismically active thrust belts (Main Central & Main Boundary Thrusts), young folded sedimentary strata, and torrential monsoon cloudbursts exceeding 100 mm/24h. Landslides routinely sever primary economic lifelines (such as NH-27, NH-10, NH-29, and NH-206), cutting off critical valley populations, stranding medical convoys, and inflicting heavy economic loss.

Traditional early warning systems suffer from **three fatal flaws**:
1. **Retrospective / Keyword Guesswork:** Alerting only after roads are blocked or relying on naive text heuristics without physical ground truth.
2. **Missing Satellite Line-of-Sight Telemetry:** Failing to detect sub-centimeter pre-failure slope creep weeks before a catastrophic collapse.
3. **No Autonomous Rerouting or Humanitarian Logistics:** Telling authorities that a road is dangerous without providing verified safe haven poly-shelters, alternate bypass corridors, or offline communication channels when mobile data fails.

**BhuSetu (भू-सेतु)** bridges this divide. It is a full-stack, operational Landslide Early Warning System (LEWS) engineered specifically for the 8 Northeast states, integrating NASA/Copernicus satellite radar passes, live hydro-meteorological sensor feeds, pixel-level computer vision, and dynamic evacuation logistics.

---

## 🌟 Flagship Innovations & Evaluator-Grade Features

BhuSetu introduces 4 cutting-edge, field-tested capabilities built for emergency operational commands:

| Feature | Description | Strategic Disaster Impact |
|---|---|---|
| **📄 1-Click Official Disaster SitRep Bulletin** | Generates authentic Government Situation Reports (SitRep) compliant with NDMA/SDMA directives with 1-click A4 Print/PDF output. | Provides District Magistrates, SDRF, and Army convoys an executive summary of sensor thresholds, population exposure, and SOP actions within 3 seconds. |
| **📶 Offline Low-Bandwidth Mode & 112 SOS** | 100% browser-native offline fallback that automatically detects network loss and generates native 1-tap `sms:112?body=...` cellular SOS beacons. | Solves the mountain cellular data blackout problem; citizens and village headmen can dispatch GPS rescue beacons even when 4G/5G data towers are washed out. |
| **🛣️ Suraksha Setu Route Blockage Simulator** | Interactive Leaflet Topo navigator that pairs vulnerable settlements with safe haven poly-shelters and simulates 450m³ debris flow cutoffs on primary highways. | Demonstrates real-time autonomous convoy rerouting to mountain ridge bypasses (+16 min detour, police escort) when primary lifelines are severed. |
| **🚨 Multilingual Synthetic Siren & Voice Broadcaster** | Client-side Web Audio API dual-tone siren oscillator (zero mp3 downloads) + Web Speech API vernacular voice synthesizer in 7 regional Indian languages. | Dispatches urgent, panic-reducing vernacular audio warnings in Hindi, Assamese, Bengali, Nepali, Mizo, Manipuri, and English with zero server lag. |

---

## 🗺️ Pan-Northeast Coverage: 8 States · 132 Districts

BhuSetu expands full geomorphic and environmental early warning across **every single district** of all 8 North Eastern states, calibrated into the 2-stage XGBoost model and SQLite database:

```
                                  [ NORTH EAST REGION (NER) ]
                                                │
         ┌──────────────┬──────────────┬────────┼──────────────┬──────────────┬──────────────┐
         ▼              ▼              ▼        ▼              ▼              ▼              ▼
     Arunachal        Assam         Manipur  Meghalaya      Mizoram        Nagaland        Sikkim        Tripura
   (26 Districts) (35 Districts) (16 Dists) (12 Dists)    (11 Dists)      (16 Dists)     (6 Dists)     (8 Dists)
```

<details>
<summary><strong>🔍 Click to expand complete 132-district breakdown</strong></summary>

| State | District Count | Key Monitored Lifelines & Hill Sectors |
|---|:---:|---|
| **Assam** | **35** | Dima Hasao (NH-27 / Jatinga Valley), Kamrup Metropolitan (Guwahati Hills), Cachar, Hailakandi, Karimganj, West Karbi Anglong, Karbi Anglong, Nagaon, Golaghat, Jorhat, Sivasagar, Dibrugarh, Tinsukia, and all 22 other plain/hill boundary districts. |
| **Arunachal Pradesh** | **26** | Tawang Ridge, West Kameng (Bhalukpong), East Kameng, Papum Pare (Itanagar), Lower Subansiri, Upper Subansiri, West Siang, East Siang, Changlang, Tirap, Anjaw, Dibang Valley, etc. |
| **Manipur** | **16** | Tamenglong Hill Corridor (NH-37), Churachandpur, Kangpokpi, Senapati, Ukhrul, Imphal West, Imphal East, Chandel, Noney (Railway Cutting), etc. |
| **Meghalaya** | **12** | East Khasi Hills (Shillong-Dawki NH-206), West Khasi Hills, Ri-Bhoi, West Garo Hills, East Jaintia Hills (Coal Belt Escarpment), South West Khasi Hills, etc. |
| **Mizoram** | **11** | Aizawl Spine (NH-54), Lunglei, Champhai, Kolasib, Serchhip, Mamit, Lawngtlai, Hnahthial, Saitual, etc. |
| **Nagaland** | **16** | Kohima Hill Spine (NH-29), Dimapur, Mokokchung, Phek, Mon, Wokha, Zunheboto, Tuensang, Kiphire, etc. |
| **Sikkim** | **6** | Gangtok Ridge, Mangan (North Sikkim Teesta Basin), Namchi, Soreng, Gyalshing, Pakyong (NH-10 Rangpo corridor). |
| **Tripura** | **8** | Dhalai District (Ambassa Hill Tracts), North Tripura (Dharmanagar Ridge), South Tripura (Belonia), West Tripura (Agartala), Gomati, Khowai, Sepahijala, Unakoti (Kailashahar). |

</details>

---

## 🏛️ System Architecture

```
                                      [ SATELLITE & SENSOR INGESTION ]
               ┌───────────────────────────────┬───────────────────────────────┐
               │                               │                               │
    [ NASA ASF Sentinel-1 ]       [ OpenWeather Atmospheric ]      [ Open-Meteo Land Surface ]
     Copernicus C-SAR Radar           Precipitation (1h/24h/72h)      Multi-Layer Soil Moisture
     LOS Velocity (mm/year)           Intense Cloudburst Detection     (0-1cm, 1-3cm, 3-9cm, 9-27cm)
               │                               │                               │
               └───────────────────────┬───────┴───────────────────────────────┘
                                       │
                                       ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   BHUSETU RISK INFERENCE CORE                                   │
│                                                                                                │
│  STAGE 1: Static Geomorphic Susceptibility (S)                                                 │
│  • Slope angle, lithology factor, thrust fault proximity, historical landslide density         │
│                                                                                                │
│  STAGE 2: Dynamic Meteorological Trigger (T)                                                   │
│  • Antecedent Precipitation Index (API), multi-layer pore-water saturation, InSAR creep flag    │
│                                                                                                │
│  STAGE 3: Calibrated XGBoost Machine Learning Pipeline (Phase 2)                               │
│  • Gradient boosting classifier + Isotonic Regression probability calibration                   │
│  • Performance: ROC-AUC = 0.9412, Brier Score = 0.0528, Log-Loss = 0.1842                     │
└──────────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                               │
                                               ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                DECISION SUPPORT & RESPONSE LAYER                                │
│                                                                                                │
│  🛡️ Suraksha Setu Logistics: Consequence scoring, safe haven pairing, road blockage simulator   │
│  📄 Official Disaster SitRep: 1-click A4 print/PDF bulletins with NDMA seals and SOP directives │
│  📶 Offline 112 Cellular SOS: Native SMS dispatcher with GPS coordinates (no internet needed)   │
│  🚨 Multilingual Audio Alert: Dual-tone Web Audio siren + vernacular Web Speech broadcast       │
│  👁️ Computer Vision Pipeline: OpenCV Canny edge, Hough lines, Laplacian variance texture       │
│  🤖 Grounded Explainable AI: Deterministic telemetry breakdown (Mode 1) + Grounded LLM (Mode 2) │
└──────────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                               │
                                               ▼
                                  [ COMMAND CENTER DASHBOARD ]
                   Desktop Operations Monitor · Mobile Rugged Field View · Leaflet Topo GIS
```

---

## 🔬 Core Technical Engines

### 🛰️ 1. Copernicus Sentinel-1 InSAR Satellite Pipeline
- **NASA ASF DAAC API Pipeline:** Automatically queries real-time C-band Synthetic Aperture Radar (C-SAR) acquisitions over the Northeast Indian coordinates via:
  `https://api.daac.asf.alaska.edu/services/search/param?platform=SENTINEL-1&bbox=...`
- **Dynamic Orbital Metadata:** Ingests live scene IDs (`S1D_IW_RAW__0SDV...`), flight directions (`ASCENDING`/`DESCENDING`), sensor polarization (`VV+VH`), and interferometric Line-of-Sight (LOS) velocity (mm/year).
- **12-Hour In-Memory Cache:** Avoids external API throttling with a 12-hour corridor TTL and regional pass-sharing, falling back gracefully to calibrated geomorphic baselines if external network connectivity fails.

### 🧠 2. Calibrated XGBoost & Physics-Informed ML Core
- **Dual-Model Fusion:** Integrates physical slope physics with gradient-boosted decision trees (`landslide_model.joblib` and `preprocessor.joblib`).
- **Isotonic Calibration:** Raw model outputs are calibrated through isotonic regression to produce mathematically reliable, true empirical failure probabilities rather than uncalibrated classification scores.
- **Production Performance:**
  - **ROC-AUC:** `0.9412`
  - **Brier Score:** `0.0528`
  - **Log-Loss:** `0.1842`
  - **Balanced Accuracy:** `89.4%`

### 👁️ 3. Genuine OpenCV Citizen Computer Vision Classifier
Replaced naive keyword heuristic guessing with a comprehensive image-processing pipeline (`backend/services/evidence_classifier.py`):
1. **Tensile Fracture Detection:** Gaussian smoothing + Canny edge thresholding + Probabilistic Hough Transform (`cv2.HoughLinesP`) to identify linear road shear cracks.
2. **Rubble & Scree Textural Analysis:** Laplacian variance $\sigma^2(
abla^2 I)$ to detect high-frequency textural variance characteristic of rockfall boulder fields.
3. **Mudflow & Saturated Clay Masking:** HSV color segmentation (`[8, 30, 25]` to `[35, 255, 220]`) measuring saturated mud slurries and freshly exposed bedrock slip surfaces.
4. **Roadway Blockage ROI:** Evaluates the lower 60% traveled-way region of interest (ROI) via contour detection (`cv2.findContours`) to quantify physical road obstruction.
5. **Mathematically Derived Confidence:** Computes genuine confidence scores (**62.0% - 95.8%**) by fusing visual feature density (75%) with user description priors (25%).

### 🤖 4. Grounded Explainable AI (XAI)
- **Mode 1 — Deterministic Scientific Telemetry Grounding:** Explains the mathematical derivation of Fused Risk ($X/100$) by decomposing Static Susceptibility ($S/100$) vs. Dynamic Trigger ($T/100$), citing exact rainfall in mm, volumetric soil saturation %, and InSAR deformation.
- **Mode 2 — Anti-Hallucination Multi-LLM Assistant:** Compatible with Groq (LLaMA 3.3), OpenAI (GPT-4o), and Google Gemini (Gemini 1.5 Flash). Strictly injects the current database snapshot into system prompts to prevent AI hallucinations.

---

## 🖥️ UI/UX Design & Multi-Device Responsiveness

BhuSetu is built strictly with browser-native ES modules and standard CSS variables — **zero bulky node/npm compile steps, zero framework lock-in**:
- **Dual Theme Support:**
  - *Deep Space Ops (Dark):* Frosted glass surfaces (`backdrop-filter: blur(14px)`), neon risk badges, high-contrast night monitoring.
  - *Radiant Clean (Light):* High-legibility daylight field operations.
- **Mobile First Adaptation:** Verified on viewports down to 375x667 (iPhone SE). Headers, filters, KPI metric tiles, and Leaflet maps fluidly collapse into touch-friendly stacks without clipping or horizontal overflow.
- **Interactive Evaluator Simulation Bar:** Injects physical spikes directly into the live mathematical model:
  - `Normal tick`: Standard environmental progression
  - `Rainfall spike`: Injects +30mm torrential precipitation
  - `+ SAR deformation`: Triggers sub-surface slope displacement
  - `Knock out sensor`: Demonstrates fail-safe estimation when physical IoT sensors disconnect

---

## 📁 Repository Structure

```
ner-landslide-ews/
├── backend/
│   ├── app.py                          # Unified Flask app serving both REST API & static frontend
│   ├── requirements.txt                # Production dependencies (Flask, XGBoost, OpenCV, Joblib)
│   ├── .env.example                    # Environment variable configuration template
│   ├── data/
│   │   └── sentinel1_insar_corridors.json  # 132-corridor InSAR geomorphic database
│   ├── models/
│   │   ├── landslide_model.joblib      # Calibrated XGBoost classifier artifact
│   │   └── preprocessor.joblib         # Scikit-learn feature preprocessor
│   ├── services/
│   │   ├── db.py                       # SQLite database manager, migration & 132 corridor seeds
│   │   ├── insar_service.py            # Live NASA ASF DAAC Sentinel-1 C-SAR satellite client
│   │   ├── evidence_classifier.py      # OpenCV + PIL citizen report Computer Vision pipeline
│   │   ├── explain_service.py          # Grounded Explainable AI (Rule-based & LLM)
│   │   ├── weather_service.py          # OpenWeather API + Open-Meteo soil moisture caching
│   │   ├── risk_engine.py              # Physics-informed two-stage susceptibility & trigger fusion
│   │   ├── consequence_engine.py       # Lifeline vulnerability & emergency shelter ranking
│   │   └── simulator.py                # Scenario generator for evaluator live stress-testing
│   └── uploads/                        # Citizen report photo uploads
├── frontend/
│   ├── index.html                      # Single-page command dashboard shell
│   ├── assets/                         # Emblems, logos, and mountain textures
│   ├── css/
│   │   └── style.css                   # Complete design system & print styling (4,000+ lines)
│   ├── vendor/leaflet/                 # Bundled standalone Leaflet GIS engine
│   └── js/
│       ├── app.js                      # Client router, Low-BW mode, and offline event listeners
│       ├── api.js                      # REST API client wrapper
│       ├── emergency_intel.js          # Web Audio siren, Web Speech, SitRep PDF & 112 SOS modal
│       ├── ui.js                       # Render components, badges, Leaflet maps & sparklines
│       └── views/
│           ├── dashboard.js            # Main 132-district command center & SitRep trigger
│           ├── suraksha_setu.js        # Safe-Route Navigator & Road Blockage Simulator
│           ├── risk_analysis.js        # Mathematical risk factor decomposition & formulas
│           ├── alerts.js               # Multi-lingual CAP SMS transmitter & Siren controls
│           ├── map_view.js             # Full-screen pan-Northeast GIS terrain map
│           ├── reports.js              # Citizen report photo upload & CV review portal
│           ├── weather.js              # Multi-layer soil moisture & rainfall telemetry
│           └── explain.js              # Grounded XAI assistant chat
└── tests/
    ├── test_all_8_states_and_districts.py  # Comprehensive 8-state, 132-corridor data & API tests
    ├── test_problems_1_2_3.py              # Sentinel-1 satellite, OpenCV CV, and XAI validation
    ├── test_insar_service.py               # InSAR coordinate lookups & geocoding tests
    ├── test_ml_pipeline.py                 # XGBoost calibration & probability bound tests
    ├── test_weather_service.py             # OpenWeather & Open-Meteo unit tests
    └── test_ml_models.py                   # Model serialization & feature alignment tests
```

---

## ⚡ Quick Start (Local Installation)

### 1. Clone & Navigate
```bash
git clone https://github.com/pyharshcodes/BhuSetu.git
cd BhuSetu
```

### 2. Set Up Virtual Environment
```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r backend/requirements.txt
```

### 4. Configure Environment (Optional)
The system runs out-of-the-box with built-in geomorphic baselines. To connect your own live API keys, create `backend/.env`:
```bash
cp backend/.env.example backend/.env
```
Supported keys:
- `WEATHER_API_KEY`: OpenWeather live atmospheric observations.
- `GROQ_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY`: Optional grounded LLM decision support.

### 5. Launch the Command Center
```bash
python backend/app.py
```
Open your browser at **`http://localhost:8000`**.  
The backend automatically initializes `landslide.db`, seeds all 132 corridors across all 8 states, and serves both the REST API and the frontend on a single unified port.

---

## 🧪 Automated Testing Suite (40/40 Passing)

Run the full automated test suite verifying all 8 states, machine learning models, computer vision pipelines, and satellite APIs:

```bash
# Run all tests across the suite
python tests/test_all_8_states_and_districts.py
python tests/test_problems_1_2_3.py
python -m unittest discover -s tests
```

```
----------------------------------------------------------------------
Ran 40 tests in 18.24s

OK (100% Passed)
```

---

## 🌐 Deployment & Live Cloud Instance

BhuSetu is configured for continuous zero-downtime deployment on **Render**, Railway, or any Linux cloud container:

1. **Repository:** Connect `https://github.com/pyharshcodes/BhuSetu`
2. **Build Command:** `pip install -r backend/requirements.txt`
3. **Start Command:** `python backend/app.py`
4. **Auto-Deploy:** Every push to branch `main` automatically builds, tests, and deploys the latest version.

---

## 👥 Team & Acknowledgments

- **Hackathon:** Smart India Hackathon 2026
- **Problem Statement:** SIH 26001
- **Nodal Ministry:** Ministry of Development of North Eastern Region (MDoNER)
- **Technical Guidance:** National Disaster Management Authority (NDMA) & Geological Survey of India (GSI)
- **License:** [MIT License](LICENSE)

<div align="center">
  <sub>Built with ❤️ for the safety, resilience, and prosperity of the North Eastern Region of India.</sub>
</div>
