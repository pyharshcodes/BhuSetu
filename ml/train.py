"""
BhuSetu Landslide Early Warning System - Model Training & Benchmarking Pipeline.
SIH26001 (MDoNER).

Trains and benchmarks:
1. Logistic Regression (L2 regularized, class-balanced)
2. Random Forest Classifier
3. XGBoost Classifier

Performs probability calibration (CalibratedClassifierCV), extracts physics-based
feature importances, and serializes the best model artifact with metadata.json.
"""
import os
import sys
import json
import time
from datetime import datetime, timezone
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    precision_score, recall_score, f1_score, roc_auc_score,
    average_precision_score, confusion_matrix, brier_score_loss, classification_report
)
import xgboost as xgb
import joblib

# Ensure local ml module can be imported
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.preprocessing import LandslidePreprocessor
from ml.features import ENGINEERED_FEATURE_NAMES

DATA_PATH = os.path.join(SCRIPT_DIR, 'data', 'unified_landslide_dataset.csv')
MODELS_DIR = os.path.join(SCRIPT_DIR, 'models')
PREPROC_DIR = os.path.join(SCRIPT_DIR, 'preprocessing')
BACKEND_MODELS_DIR = os.path.join(PROJECT_ROOT, 'backend', 'models')


def evaluate_model(name, model, X_test, y_test):
    """Calculates full performance metrics on holdout test data."""
    preds = model.predict(X_test)
    probs = model.predict_proba(X_test)[:, 1]

    cm = confusion_matrix(y_test, preds)
    tn, fp, fn, tp = cm.ravel()

    prec = precision_score(y_test, preds, zero_division=0)
    rec = recall_score(y_test, preds, zero_division=0)
    f1 = f1_score(y_test, preds, zero_division=0)
    roc_auc = roc_auc_score(y_test, probs)
    pr_auc = average_precision_score(y_test, probs)
    brier = brier_score_loss(y_test, probs)

    return {
        'model_name': name,
        'precision': round(float(prec), 4),
        'recall': round(float(rec), 4),
        'f1_score': round(float(f1), 4),
        'roc_auc': round(float(roc_auc), 4),
        'pr_auc': round(float(pr_auc), 4),
        'brier_score': round(float(brier), 4),
        'confusion_matrix': {
            'true_negatives': int(tn),
            'false_positives': int(fp),
            'false_negatives': int(fn),
            'true_positives': int(tp)
        },
        'false_negative_rate': round(float(fn / max(1, fn + tp)), 4),
        'false_positive_rate': round(float(fp / max(1, fp + tn)), 4)
    }


def main():
    print("===============================================================")
    print("   BHUSETU ML PIPELINE: MODEL TRAINING & BENCHMARKING (PHASE 2)")
    print("===============================================================")
    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(PREPROC_DIR, exist_ok=True)
    os.makedirs(BACKEND_MODELS_DIR, exist_ok=True)

    print(f"Loading unified dataset from {DATA_PATH}...")
    df = pd.read_csv(DATA_PATH)
    print(f"Dataset Shape: {df.shape} (Rows: {df.shape[0]}, Columns: {df.shape[1]})")

    target_col = 'landslide'
    y = df[target_col].values
    X_raw = df.drop(columns=[target_col])

    pos_count = int(np.sum(y == 1))
    neg_count = int(np.sum(y == 0))
    imbalance_ratio = neg_count / max(1, pos_count)
    print(f"Class Distribution: Negative={neg_count} ({neg_count/len(y)*100:.1f}%), Positive={pos_count} ({pos_count/len(y)*100:.1f}%)")
    print(f"Imbalance Ratio (Neg:Pos): {imbalance_ratio:.2f}:1")

    # Stratified Train/Test split (80% train, 20% holdout test)
    X_train, X_test, y_train, y_test = train_test_split(
        X_raw, y, test_size=0.20, stratify=y, random_state=42
    )
    print(f"Split sizes: Train={len(X_train)}, Test={len(X_test)}")

    # Fit preprocessor on training data strictly
    print("Fitting LandslidePreprocessor on training fold...")
    preprocessor = LandslidePreprocessor()
    X_train_proc = preprocessor.fit_transform(X_train)
    X_test_proc = preprocessor.transform(X_test)

    # Save fitted preprocessor
    preproc_path = os.path.join(PREPROC_DIR, 'preprocessor.joblib')
    preprocessor.save(preproc_path)
    joblib.dump(preprocessor, os.path.join(BACKEND_MODELS_DIR, 'preprocessor.joblib'))
    print(f"Saved preprocessor to {preproc_path}")

    # 1. Logistic Regression Baseline
    print("\\n--- [1/3] Training Logistic Regression (L2, Balanced) ---")
    lr = LogisticRegression(
        C=1.0,
        class_weight='balanced',
        max_iter=1000,
        random_state=42
    )
    lr.fit(X_train_proc, y_train)
    lr_metrics = evaluate_model('Logistic Regression', lr, X_test_proc, y_test)

    # 2. Random Forest Classifier
    print("--- [2/3] Training Random Forest Classifier ---")
    rf = RandomForestClassifier(
        n_estimators=150,
        max_depth=6,
        class_weight='balanced',
        min_samples_split=5,
        random_state=42,
        n_jobs=-1
    )
    rf.fit(X_train_proc, y_train)
    rf_metrics = evaluate_model('Random Forest', rf, X_test_proc, y_test)

    # 3. XGBoost Classifier
    print("--- [3/3] Training XGBoost Classifier (with scale_pos_weight) ---")
    scale_pos = imbalance_ratio
    xgb_model = xgb.XGBClassifier(
        n_estimators=150,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.85,
        colsample_bytree=0.85,
        scale_pos_weight=scale_pos,
        eval_metric='logloss',
        random_state=42
    )
    xgb_model.fit(X_train_proc, y_train)
    xgb_metrics = evaluate_model('XGBoost Classifier', xgb_model, X_test_proc, y_test)

    # Compare models
    comparison = [lr_metrics, rf_metrics, xgb_metrics]
    comp_df = pd.DataFrame(comparison)
    print("\\n=================== MODEL BENCHMARK COMPARISON ===================")
    print(comp_df[['model_name', 'roc_auc', 'pr_auc', 'recall', 'precision', 'f1_score', 'brier_score', 'false_negative_rate']].to_string(index=False))

    # Probability Calibration on the top model (XGBoost)
    print("\\nApplying Probability Calibration (CalibratedClassifierCV, sigmoid, cv=5)...")
    calibrated_xgb = CalibratedClassifierCV(
        estimator=xgb.XGBClassifier(
            n_estimators=150,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.85,
            colsample_bytree=0.85,
            scale_pos_weight=scale_pos,
            eval_metric='logloss',
            random_state=42
        ),
        method='sigmoid',
        cv=5
    )
    calibrated_xgb.fit(X_train_proc, y_train)

    calib_metrics = evaluate_model('Calibrated XGBoost (Final Model)', calibrated_xgb, X_test_proc, y_test)
    print(f"Calibrated XGBoost - ROC-AUC: {calib_metrics['roc_auc']}, PR-AUC: {calib_metrics['pr_auc']}, Recall: {calib_metrics['recall']}, Brier Score: {calib_metrics['brier_score']}")
    print(f"Confusion Matrix: {calib_metrics['confusion_matrix']}")

    # Extract Feature Importances from XGBoost
    importances = xgb_model.feature_importances_
    feat_imp = [
        {'feature': feat, 'importance': round(float(imp), 4)}
        for feat, imp in sorted(zip(ENGINEERED_FEATURE_NAMES, importances), key=lambda x: x[1], reverse=True)
    ]
    print("\\nTop 7 Contributing Physical Features (XGBoost Gini / Gain):\\n")
    for fi in feat_imp[:7]:
        print(f"  * {fi['feature']:<25}: {fi['importance']*100:.2f}%")

    # Save Final Trained & Calibrated Model Artifact
    final_model_path = os.path.join(MODELS_DIR, 'landslide_model.joblib')
    joblib.dump(calibrated_xgb, final_model_path)
    joblib.dump(calibrated_xgb, os.path.join(BACKEND_MODELS_DIR, 'landslide_model.joblib'))
    print(f"\\nSaved final calibrated model to {final_model_path}")

    # Save comprehensive metadata.json
    metadata = {
        'model_name': 'BhuSetu Landslide Risk Prediction Engine',
        'model_version': '2.0.0',
        'model_type': 'CalibratedClassifierCV(XGBoostClassifier, method=sigmoid)',
        'base_estimator': 'xgboost.XGBClassifier(n_estimators=150, max_depth=4, learning_rate=0.05, subsample=0.85, scale_pos_weight=3.78)',
        'training_timestamp': datetime.now(timezone.utc).isoformat(),
        'dataset': {
            'name': 'BhuSetu Unified Landslide Dataset',
            'version': '1.0.0',
            'records_total': int(len(df)),
            'train_records': int(len(X_train)),
            'calibration_method': '5-fold Stratified Cross-Validation on Training Fold',
            'test_records': int(len(X_test)),
            'positive_rate_pct': round(float(pos_count / len(y) * 100), 2),
            'sources': [
                'Google Earth Sikkim Landslide Points (185 events)',
                'Google Earth Sikkim Landslide Polygons (255 scars)',
                'GSI National Landslide Susceptibility Mapping (NLSM) NER',
                'Sentinel-1 InSAR Corridor Telemetry (22 NER corridors)',
                'Open-Meteo Land Surface & Copernicus DEM Telemetry'
            ]
        },
        'feature_schema': {
            'engineered_features': ENGINEERED_FEATURE_NAMES,
            'feature_count': len(ENGINEERED_FEATURE_NAMES)
        },
        'risk_thresholds': {
            'LOW': [0.0, 0.25],
            'MODERATE': [0.25, 0.50],
            'HIGH': [0.50, 0.75],
            'CRITICAL': [0.75, 1.00]
        },
        'benchmarks': {
            'logistic_regression': lr_metrics,
            'random_forest': rf_metrics,
            'xgboost_uncalibrated': xgb_metrics,
            'final_calibrated_model': calib_metrics
        },
        'feature_importances': feat_imp
    }

    meta_path = os.path.join(MODELS_DIR, 'metadata.json')
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
    with open(os.path.join(BACKEND_MODELS_DIR, 'metadata.json'), 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)

    print(f"Saved versioned metadata to {meta_path}")
    print("\\n=== PHASE 2 MODEL TRAINING COMPLETED SUCCESSFULLY ===")


if __name__ == '__main__':
    main()