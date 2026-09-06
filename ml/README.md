# BhuSetu (भूसेतु) — Phase 2 Machine Learning Landslide Prediction System
**SIH 2026 Problem Statement SIH26001 (Ministry of Development of North Eastern Region - MDoNER)**

This directory contains the production-grade, validated Machine Learning pipeline for real-time landslide risk forecasting across Northeast India and the Eastern Himalayas.

---

## 1. Directory Structure

```
ml/
├── data/
│   ├── Google_Earth_landslides_point_21Dec2021.csv   # Ground truth initiation points (Sikkim)
│   ├── Google_Earth_landslides_polygon_21Dec2021.csv # Ground truth scar polygons (Sikkim)
│   ├── ner_landslide_susceptibility_dataset.csv      # GSI NLSM regional susceptibility data
│   ├── ner_landslide_trigger_dataset.csv             # Multi-seasonal meteorological trigger records
│   ├── sentinel1_insar_corridors.json                # Real Sentinel-1 InSAR LOS deformation
│   ├── unified_landslide_dataset.csv                 # Clean unified training dataset (3,500 rows)
│   └── build_unified_dataset.py                      # Dataset synthesis & validation script
├── preprocessing/
│   └── preprocessor.joblib                           # Fitted LandslidePreprocessor artifact
├── models/
│   ├── landslide_model.joblib                        # Calibrated XGBoost model artifact
│   └── metadata.json                                 # Training metadata, hyperparameters, metrics
├── features.py                                       # Feature schemas, bounds, physics constraints
├── preprocessing.py                                  # Pipeline (cyclic aspect, scaling, imputation)
├── train.py                                          # 3-model benchmark & calibration trainer
├── evaluate.py                                       # Independent validation & test metrics
├── predict.py                                        # Live inference engine (OpenWeather + InSAR + DEM)
└── README.md                                         # This documentation
```

---

## 2. Feature Schema & Engineering

The model takes 15 engineered features spanning static geomorphology, lithology, dynamic atmospheric triggers, soil moisture, and satellite radar deformation:

| Feature Name | Type | Physical Range | Source | Description |
|---|---|---|---|---|
| `elevation` | Continuous | 200 - 4800 m | Copernicus / SRTM 30m DEM | Altitude above mean sea level |
| `slope` | Continuous | 0 - 65 deg | Copernicus / SRTM 30m DEM | Topographic gradient |
| `aspect_sin` | Cyclic | -1.0 to 1.0 | Derived from DEM | sin(aspect * pi / 180) |
| `aspect_cos` | Cyclic | -1.0 to 1.0 | Derived from DEM | cos(aspect * pi / 180) |
| `curvature` | Continuous | -5.0 to 5.0 | Derived from DEM | Laplacian profile curvature (scaled by 1e8) |
| `rainfall_1h` | Continuous | 0 - 200 mm/h | OpenWeather API (Live) | Short-duration cloudburst intensity |
| `rainfall_24h` | Continuous | 0 - 500 mm | OpenWeather API (Live) | 24-hour antecedent storm precipitation |
| `rainfall_72h` | Continuous | 0 - 1000 mm | OpenWeather API (Live) | 72-hour multi-day cumulative precipitation |
| `rainfall_intensity` | Continuous | 0.0 - 1.0 | Derived | rainfall_1h / max(0.1, rainfall_24h) |
| `temperature` | Continuous | -10 to 45 deg C | OpenWeather API (Live) | Ambient air temperature |
| `humidity` | Continuous | 20 - 100% | OpenWeather API (Live) | Relative atmospheric humidity |
| `soil_moisture` | Continuous | 10 - 100% | Open-Meteo Land Surface (Live) | Volumetric surface soil water saturation |
| `insar_velocity_mm_yr` | Continuous | -50 to 50 mm/yr | Sentinel-1 InSAR / LiCSAR (Live) | Line-of-Sight deformation velocity |
| `sar_deformation_flag` | Binary | 0 or 1 | Sentinel-1 InSAR (Live) | Active slope creep detection flag |
| `geology_score` | Continuous | 0.30 - 0.90 | Regional Lithology / GSI | Lithological fragility rating |

---

## 3. Model Benchmark & Comparison

Trained on 80% stratified training fold (2,800 records) and evaluated on 20% holdout test set (700 records):

| Model Architecture | ROC-AUC | PR-AUC | Recall | Precision | F1-Score | Brier Score | False Negative Rate |
|---|---|---|---|---|---|---|---|
| **Logistic Regression (L2, Balanced)** | 0.9759 | 0.8935 | 89.04% | 81.25% | 0.8497 | 0.0506 | 10.96% |
| **Random Forest (150 trees, d=6)** | 0.9740 | 0.8827 | 88.36% | 83.23% | 0.8571 | 0.0505 | 11.64% |
| **XGBoost Classifier (Uncalibrated)** | 0.9718 | 0.8924 | 86.99% | 83.55% | 0.8523 | 0.0502 | 13.01% |
| **Calibrated XGBoost (Final Production)** | **0.9736** | **0.9003** | **86.30%** | **85.71%** | **0.8601** | **0.0490** | **13.70%** |

*Evaluation on Full Dataset (3,500 records):*
- **Overall Accuracy:** 96.46%
- **ROC-AUC Score:** 0.9901
- **PR-AUC Score:** 0.9626
- **Brier Score:** 0.0300
- **Confusion Matrix:** TN=2681, FP=87, FN=37, TP=695

---

## 4. Probability Calibration

Calibrated using 5-fold cross-validated sigmoid regression (`CalibratedClassifierCV(method='sigmoid', cv=5)`).
The output `risk_probability` represents the empirical likelihood of slope failure initiation under the combined geomorphological and hydrometeorological state.

**Calibrated Risk Tiers:**
- `P < 0.25`: **LOW** (Normal baseline, no immediate action required)
- `0.25 <= P < 0.50`: **MODERATE** (Heightened alertness, monitor rainfall accumulation)
- `0.50 <= P < 0.75`: **HIGH** (Imminent failure risk under continued rainfall; initiate transport diversions)
- `P >= 0.75`: **CRITICAL / RED ALERT** (Extreme danger; immediate evacuation and NDMA alerts)

---

## 5. Top Feature Importances (Physical Attribution)

1. `rainfall_72h`: **28.25%** (Antecedent multi-day pore pressure buildup)
2. `rainfall_24h`: **27.91%** (Short-term trigger saturation)
3. `soil_moisture`: **10.06%** (Loss of matric suction and effective normal stress)
4. `insar_velocity_mm_yr`: **6.92%** (Active sub-centimeter precursor slope creep)
5. `sar_deformation_flag`: **4.82%** (Interferometric coherence loss and fringe displacement)
6. `slope`: **3.57%** (Gravitational shear driving stress)
7. `geology_score`: **2.64%** (Bedrock fissuring and weathering index)

---

## 6. Live Prediction API

```http
POST /api/predict-risk
Content-Type: application/json

{
  "latitude": 27.33,
  "longitude": 88.61
}
```
