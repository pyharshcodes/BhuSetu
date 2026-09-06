"""
BhuSetu Landslide Early Warning System - Model Evaluation Script.
SIH26001 (MDoNER).

Loads the serialized model and preprocessor artifacts, runs independent validation,
and prints complete statistical and calibration metrics.
"""
import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_auc_score,
    average_precision_score, brier_score_loss, log_loss
)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

MODEL_PATH = os.path.join(SCRIPT_DIR, 'models', 'landslide_model.joblib')
PREPROC_PATH = os.path.join(SCRIPT_DIR, 'preprocessing', 'preprocessor.joblib')
DATA_PATH = os.path.join(SCRIPT_DIR, 'data', 'unified_landslide_dataset.csv')
META_PATH = os.path.join(SCRIPT_DIR, 'models', 'metadata.json')


def evaluate():
    print("===============================================================")
    print("           BHUSETU ML MODEL EVALUATION & VALIDATION            ")
    print("===============================================================")
    if not os.path.exists(MODEL_PATH) or not os.path.exists(PREPROC_PATH):
        print(f"Error: Model or preprocessor not found at {MODEL_PATH}")
        sys.exit(1)

    print(f"Loading model: {MODEL_PATH}")
    model = joblib.load(MODEL_PATH)

    print(f"Loading preprocessor: {PREPROC_PATH}")
    preprocessor = joblib.load(PREPROC_PATH)

    print(f"Loading dataset: {DATA_PATH}")
    df = pd.read_csv(DATA_PATH)
    y_true = df['landslide'].values
    X_raw = df.drop(columns=['landslide'])

    print("Transforming features through preprocessor...")
    X_proc = preprocessor.transform(X_raw)

    print("Generating predictions...")
    y_pred = model.predict(X_proc)
    y_prob = model.predict_proba(X_proc)[:, 1]

    cm = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = cm.ravel()
    roc_auc = roc_auc_score(y_true, y_prob)
    pr_auc = average_precision_score(y_true, y_prob)
    brier = brier_score_loss(y_true, y_prob)
    loss = log_loss(y_true, y_prob)

    print("\\n--- CONFUSION MATRIX ---")
    print(f"True Negatives (Stable correctly identified):      {tn:>5}")
    print(f"False Positives (False Alarms):                     {fp:>5}")
    print(f"False Negatives (Missed Landslides - Critical):     {fn:>5}")
    print(f"True Positives (Landslides correctly predicted):   {tp:>5}")
    print(f"\\nTotal Records: {len(y_true)}")
    print(f"Overall Accuracy: {(tn+tp)/len(y_true)*100:.2f}%")
    print(f"ROC-AUC Score:    {roc_auc:.4f}")
    print(f"PR-AUC Score:     {pr_auc:.4f}")
    print(f"Brier Score:      {brier:.4f} (Calibrated probability error)")
    print(f"Log Loss:         {loss:.4f}")

    print("\\n--- CLASSIFICATION REPORT ---")
    print(classification_report(y_true, y_pred, target_names=['Stable (0)', 'Landslide (1)'], digits=4))

    if os.path.exists(META_PATH):
        with open(META_PATH, 'r', encoding='utf-8') as f:
            meta = json.load(f)
        print("--- REGISTERED MODEL METADATA ---")
        print(f"Model Type: {meta.get('model_type')}")
        print(f"Trained At: {meta.get('training_timestamp')}")
        print(f"Features ({meta['feature_schema']['feature_count']}): {', '.join(meta['feature_schema']['engineered_features'][:5])}...")

if __name__ == '__main__':
    evaluate()