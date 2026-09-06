"""
Two-stage risk engine.

Stage 1 (static, slow-changing): Susceptibility — "where can it fail?"
    Weighted combination of terrain/geology/land-cover/drainage/history/
    human-modification indices stored on the corridor row. This stands in
    for the XGBoost/LightGBM susceptibility classifier described in the
    source documents; the interface (0-1 indices in, 0-100 score out) is
    kept identical so a real trained model can be dropped in later.

Stage 2 (dynamic, fast-changing): Trigger — "when might it fail?"
    Rule-based function of rainfall (1h/24h/72h), antecedent soil moisture,
    and SAR deformation flag. Stands in for the LSTM/TFT dynamic trigger
    model in the source docs.

Stage 3: Confidence-weighted fusion, with visible degradation when a sensor
is offline ("degradation must be visible, not hidden").

Every threshold/weight here is a PROPOSED demo default, not a validated
operational parameter — flagged throughout the source reports too.

---------------------------------------------------------------------------
PLUGGING IN YOUR TRAINED MODEL (read this once you have a trained model)
---------------------------------------------------------------------------
Drop two files into backend/models/ :
    backend/models/susceptibility_model.joblib
    backend/models/trigger_model.joblib
(joblib-dumped scikit-learn estimators — XGBoost/LightGBM/sklearn all work
as long as they expose .predict_proba or .predict). Full instructions,
expected feature order and a training-script skeleton are in
backend/models/README.md.

That's it — no other file needs to change. On the next `python app.py`
start, this module tries to load those two files once; if both load, every
request automatically calls your trained models instead of the formulas
below, `USING_TRAINED_MODELS` becomes True, and `/api/health` reports
"model_mode": "trained". If a file is missing or fails to load for any
reason, this falls back to the rule-based formulas below and logs why —
the app never crashes because a model file is absent or malformed.
"""
import json
import logging
import os

RISK_THRESHOLD_YELLOW = float(os.environ.get("RISK_THRESHOLD_YELLOW", 25))
RISK_THRESHOLD_ORANGE = float(os.environ.get("RISK_THRESHOLD_ORANGE", 50))
RISK_THRESHOLD_RED = float(os.environ.get("RISK_THRESHOLD_RED", 75))

_log = logging.getLogger(__name__)

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
SUSCEPTIBILITY_MODEL_PATH = os.path.join(MODEL_DIR, "susceptibility_model.joblib")
TRIGGER_MODEL_PATH = os.path.join(MODEL_DIR, "trigger_model.joblib")

# Feature order a trained model must expect — keep this in sync with
# backend/models/README.md if you change it.
SUSCEPTIBILITY_FEATURES = [
    "slope_index", "geology_index", "land_cover_index",
    "drainage_index", "historical_density_index", "human_modification_index",
]
TRIGGER_FEATURES = [
    "rainfall_mm_1h", "rainfall_mm_24h", "rainfall_mm_72h",
    "soil_moisture_pct", "sar_deformation_flag",
]

_susceptibility_model = None
_trigger_model = None
USING_TRAINED_MODELS = False


def _try_load_models():
    global _susceptibility_model, _trigger_model, USING_TRAINED_MODELS
    try:
        import joblib
    except ImportError:
        _log.info("joblib not installed — running rule-based (see requirements.txt to add it).")
        return

    if os.path.exists(SUSCEPTIBILITY_MODEL_PATH):
        try:
            _susceptibility_model = joblib.load(SUSCEPTIBILITY_MODEL_PATH)
            _log.info("Loaded trained susceptibility model from %s", SUSCEPTIBILITY_MODEL_PATH)
        except Exception as exc:  # noqa: BLE001 — any load failure must degrade, never crash
            _log.warning("Could not load susceptibility_model.joblib (%s) — using rule-based fallback.", exc)
            _susceptibility_model = None

    if os.path.exists(TRIGGER_MODEL_PATH):
        try:
            _trigger_model = joblib.load(TRIGGER_MODEL_PATH)
            _log.info("Loaded trained trigger model from %s", TRIGGER_MODEL_PATH)
        except Exception as exc:  # noqa: BLE001
            _log.warning("Could not load trigger_model.joblib (%s) — using rule-based fallback.", exc)
            _trigger_model = None

    USING_TRAINED_MODELS = _susceptibility_model is not None or _trigger_model is not None


_try_load_models()


def _model_predict_pct(model, feature_row: list) -> float | None:
    """Runs a loaded model and returns a 0-100 score, or None on any failure
    (caller falls back to the rule-based path — a bad/incompatible model
    file must never take the whole app down)."""
    try:
        import numpy as np

        x = np.array([feature_row])
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(x)[0]
            score = proba[1] if len(proba) > 1 else proba[0]
        else:
            score = model.predict(x)[0]
        return round(float(max(0.0, min(1.0, score))) * 100, 1)
    except Exception as exc:  # noqa: BLE001
        _log.warning("Trained model prediction failed (%s) — using rule-based fallback for this request.", exc)
        return None


def compute_susceptibility(corridor: dict) -> float:
    if _susceptibility_model is not None:
        row = [corridor[key] for key in SUSCEPTIBILITY_FEATURES]
        result = _model_predict_pct(_susceptibility_model, row)
        if result is not None:
            return result

    weights = {
        "slope_index": 0.28,
        "geology_index": 0.18,
        "land_cover_index": 0.12,
        "drainage_index": 0.12,
        "historical_density_index": 0.20,
        "human_modification_index": 0.10,
    }
    score = sum(corridor[key] * w for key, w in weights.items())
    return round(min(1.0, max(0.0, score)) * 100, 1)


def compute_trigger(reading: dict) -> float:
    if _trigger_model is not None:
        row = [reading[key] for key in TRIGGER_FEATURES]
        result = _model_predict_pct(_trigger_model, row)
        if result is not None:
            return result

    r1 = min(1.0, reading["rainfall_mm_1h"] / 25.0)
    r24 = min(1.0, reading["rainfall_mm_24h"] / 150.0)
    r72 = min(1.0, reading["rainfall_mm_72h"] / 300.0)
    moisture = min(1.0, max(0.0, (reading["soil_moisture_pct"] - 20) / 60))

    trigger = 0.15 * r1 + 0.30 * r24 + 0.25 * r72 + 0.30 * moisture

    if reading["sar_deformation_flag"]:
        trigger = min(1.0, trigger + 0.35)

    return round(min(1.0, trigger) * 100, 1)


def fuse(susceptibility: float, trigger: float, reading: dict) -> dict:
    fused = (0.45 * susceptibility) + (0.55 * trigger) + (
        0.15 * (susceptibility / 100) * (trigger / 100) * 100
    )
    fused = round(min(100.0, fused), 1)

    confidence = 90.0
    degradation_reason = ""
    reasons = []

    if reading["sensor_offline"]:
        confidence -= 35
        degradation_reason = (
            "Soil-moisture sensor offline — falling back to rainfall-derived "
            "wetness proxy (secondary evidence tier). Confidence reduced."
        )
    if reading["is_simulated"]:
        reasons.append("Reading is SIMULATED demo data, not a live feed.")

    confidence = round(max(15.0, min(99.0, confidence)), 1)

    if reading["rainfall_mm_24h"] > 100:
        reasons.append(f"24h rainfall is high ({reading['rainfall_mm_24h']} mm).")
    if reading["rainfall_mm_72h"] > 200:
        reasons.append(f"Sustained 72h rainfall ({reading['rainfall_mm_72h']} mm) has likely saturated soil.")
    if reading["soil_moisture_pct"] > 70:
        reasons.append(f"Soil moisture is elevated ({reading['soil_moisture_pct']}%).")
    if reading["sar_deformation_flag"]:
        reasons.append("Satellite (SAR) evidence indicates possible ground deformation.")
    if susceptibility > 65:
        reasons.append("This corridor has high static susceptibility (steep slope / fragile geology / dense hill-cutting).")
    if not reasons:
        reasons.append("Conditions are within normal range for this corridor.")

    if fused >= RISK_THRESHOLD_RED:
        level = "RED"
    elif fused >= RISK_THRESHOLD_ORANGE:
        level = "ORANGE"
    elif fused >= RISK_THRESHOLD_YELLOW:
        level = "YELLOW"
    else:
        level = "GREEN"

    return {
        "susceptibility_score": susceptibility,
        "trigger_score": trigger,
        "fused_risk_score": fused,
        "confidence_pct": confidence,
        "alert_level": level,
        "degradation_reason": degradation_reason,
        "top_reasons": reasons,
    }


ALERT_ACTIONS = {
    "GREEN": ["Routine monitoring — no action required."],
    "YELLOW": [
        "Issue advisory to district authority.",
        "Increase monitoring frequency for this corridor.",
    ],
    "ORANGE": [
        "Dispatch field team for slope inspection.",
        "Notify disaster-management authority.",
        "Check alternate-route readiness for exposed villages.",
    ],
    "RED": [
        "Immediate escalation to all authorities.",
        "Consider road closure / diversion for the affected segment.",
        "Notify and prepare affected villages for possible evacuation.",
        "Activate alternate route where available.",
    ],
}


def reasons_to_json(reasons) -> str:
    return json.dumps(reasons)


def reasons_from_json(raw) -> list:
    """Accepts either a JSON string (raw DB column) or an already-parsed
    list (e.g. when called on data that went through this function once
    already) — idempotent so double-conversion never silently empties it."""
    if isinstance(raw, list):
        return raw
    try:
        return json.loads(raw) if raw else []
    except (json.JSONDecodeError, TypeError):
        return []
