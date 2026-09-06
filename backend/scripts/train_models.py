"""
BhuSetu Machine Learning Landslide Model Training Pipeline.

Trains:
1. Stage 1: Susceptibility Classifier (XGBoost) -> backend/models/susceptibility_model.joblib
   Features: slope_index, geology_index, land_cover_index, drainage_index, historical_density_index, human_modification_index
2. Stage 2: Dynamic Trigger Predictor (XGBoost) -> backend/models/trigger_model.joblib
   Features: rainfall_mm_1h, rainfall_mm_24h, rainfall_mm_72h, soil_moisture_pct, sar_deformation_flag

Evaluates with 5-Fold Stratified Cross-Validation, ROC-AUC, and feature importances.
"""
import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.metrics import roc_auc_score, average_precision_score, classification_report, confusion_matrix

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "data")
MODEL_DIR = os.path.join(BASE_DIR, "..", "models")
os.makedirs(MODEL_DIR, exist_ok=True)

SUSCEPTIBILITY_CSV = os.path.join(DATA_DIR, "ner_landslide_susceptibility_dataset.csv")
TRIGGER_CSV = os.path.join(DATA_DIR, "ner_landslide_trigger_dataset.csv")

SUSCEPTIBILITY_MODEL_OUT = os.path.join(MODEL_DIR, "susceptibility_model.joblib")
TRIGGER_MODEL_OUT = os.path.join(MODEL_DIR, "trigger_model.joblib")
METRICS_OUT = os.path.join(MODEL_DIR, "model_training_metrics.json")

SUSCEPTIBILITY_FEATURES = [
    "slope_index", "geology_index", "land_cover_index",
    "drainage_index", "historical_density_index", "human_modification_index",
]
TRIGGER_FEATURES = [
    "rainfall_mm_1h", "rainfall_mm_24h", "rainfall_mm_72h",
    "soil_moisture_pct", "sar_deformation_flag",
]


def train_susceptibility_model():
    print("\n========================================================")
    print("STAGE 1: Training Landslide Susceptibility Model (XGBoost)")
    print("========================================================")
    df = pd.read_csv(SUSCEPTIBILITY_CSV)
    X = df[SUSCEPTIBILITY_FEATURES]
    y = df["landslide_susceptible"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    model = XGBClassifier(
        n_estimators=120,
        max_depth=4,
        learning_rate=0.06,
        subsample=0.85,
        colsample_bytree=0.85,
        reg_alpha=0.1,
        reg_lambda=1.0,
        eval_metric="logloss",
        random_state=42
    )

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring="roc_auc")
    print(f"5-Fold CV ROC-AUC: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

    model.fit(X_train, y_train)

    y_proba = model.predict_proba(X_test)[:, 1]
    y_pred = (y_proba >= 0.50).astype(int)

    auc = roc_auc_score(y_test, y_proba)
    ap = average_precision_score(y_test, y_proba)
    print(f"Test Set ROC-AUC: {auc:.4f} | PR-AUC: {ap:.4f}")
    print("\nClassification Report (Test Set):")
    print(classification_report(y_test, y_pred, digits=3))

    importances = dict(zip(SUSCEPTIBILITY_FEATURES, [round(float(v), 4) for v in model.feature_importances_]))
    print("Feature Importances:")
    for feat, imp in sorted(importances.items(), key=lambda x: x[1], reverse=True):
        print(f"  • {feat:28s}: {imp*100:5.2f}%")

    joblib.dump(model, SUSCEPTIBILITY_MODEL_OUT, compress=3)
    print(f"\n[OK] Model successfully serialized to: {SUSCEPTIBILITY_MODEL_OUT}")

    return {
        "model": "susceptibility_model",
        "algorithm": "XGBClassifier",
        "cv_roc_auc_mean": round(float(cv_scores.mean()), 4),
        "test_roc_auc": round(float(auc), 4),
        "test_pr_auc": round(float(ap), 4),
        "feature_importances": importances
    }


def train_trigger_model():
    print("\n========================================================")
    print("STAGE 2: Training Dynamic Monsoon Trigger Model (XGBoost)")
    print("========================================================")
    df = pd.read_csv(TRIGGER_CSV)
    X = df[TRIGGER_FEATURES]
    y = df["landslide_triggered"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # Moderate positive class weighting to avoid excessive upward baseline bias
    neg_count = (y_train == 0).sum()
    pos_count = (y_train == 1).sum()
    scale_pos = np.sqrt(neg_count / max(1, pos_count))

    model = XGBClassifier(
        n_estimators=150,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.85,
        colsample_bytree=0.85,
        scale_pos_weight=scale_pos,
        eval_metric="logloss",
        random_state=42
    )

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring="roc_auc")
    print(f"5-Fold CV ROC-AUC: {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")

    model.fit(X_train, y_train)

    y_proba = model.predict_proba(X_test)[:, 1]
    y_pred = (y_proba >= 0.50).astype(int)

    auc = roc_auc_score(y_test, y_proba)
    ap = average_precision_score(y_test, y_proba)
    print(f"Test Set ROC-AUC: {auc:.4f} | PR-AUC: {ap:.4f}")
    print("\nClassification Report (Test Set):")
    print(classification_report(y_test, y_pred, digits=3))

    importances = dict(zip(TRIGGER_FEATURES, [round(float(v), 4) for v in model.feature_importances_]))
    print("Feature Importances:")
    for feat, imp in sorted(importances.items(), key=lambda x: x[1], reverse=True):
        print(f"  • {feat:28s}: {imp*100:5.2f}%")

    joblib.dump(model, TRIGGER_MODEL_OUT, compress=3)
    print(f"\n[OK] Model successfully serialized to: {TRIGGER_MODEL_OUT}")

    return {
        "model": "trigger_model",
        "algorithm": "XGBClassifier",
        "cv_roc_auc_mean": round(float(cv_scores.mean()), 4),
        "test_roc_auc": round(float(auc), 4),
        "test_pr_auc": round(float(ap), 4),
        "feature_importances": importances
    }


def verify_trained_models():
    print("\n========================================================")
    print("STAGE 3: Verifying Loaded Model Inferences")
    print("========================================================")
    m_susc = joblib.load(SUSCEPTIBILITY_MODEL_OUT)
    m_trig = joblib.load(TRIGGER_MODEL_OUT)

    # Test sample 1: Extreme high risk (Dima Hasao monsoon cloudburst scenario)
    sample_susc_high = [[0.85, 0.75, 0.65, 0.70, 0.80, 0.60]]
    sample_trig_high = [[45.0, 180.0, 320.0, 88.0, 1]]

    p_susc = m_susc.predict_proba(np.array(sample_susc_high))[0, 1]
    p_trig = m_trig.predict_proba(np.array(sample_trig_high))[0, 1]
    print(f"High Risk Scenario -> Susceptibility: {p_susc*100:.1f}% | Trigger: {p_trig*100:.1f}%")

    # Test sample 2: Low risk dry valley (Jorhat / Nagaon dry day)
    sample_susc_low = [[0.10, 0.15, 0.20, 0.15, 0.05, 0.05]]
    sample_trig_low = [[0.0, 0.0, 5.0, 25.0, 0]]

    p_susc_l = m_susc.predict_proba(np.array(sample_susc_low))[0, 1]
    p_trig_l = m_trig.predict_proba(np.array(sample_trig_low))[0, 1]
    print(f"Low Risk Scenario  -> Susceptibility: {p_susc_l*100:.1f}% | Trigger: {p_trig_l*100:.1f}%")

    assert p_susc > 0.70, "Susceptibility high scenario failed"
    assert p_trig > 0.70, "Trigger high scenario failed"
    assert p_susc_l < 0.30, "Susceptibility low scenario failed"
    assert p_trig_l < 0.25, "Trigger low scenario failed"

    print("\n[ALL MODEL VERIFICATION TESTS PASSED]")


if __name__ == "__main__":
    m1 = train_susceptibility_model()
    m2 = train_trigger_model()
    verify_trained_models()

    with open(METRICS_OUT, "w", encoding="utf-8") as f:
        json.dump({"susceptibility": m1, "trigger": m2}, f, indent=2)
    print(f"[OK] Training metrics exported to: {METRICS_OUT}")
