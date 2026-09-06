# Where your trained model goes

Short answer: save your trained model with `joblib`, and put the file
**right here, in this folder** (`backend/models/`), under one of these two
exact names:

```
backend/models/susceptibility_model.joblib   <- Stage 1: "where can it fail?"
backend/models/trigger_model.joblib          <- Stage 2: "when might it fail?"
```

You can add one, the other, or both — each is independent. You do **not**
need to change any other file. The next time you run `python app.py`, the
app tries to load these two files automatically, and:

- if a file loads successfully, every request uses your trained model for
  that stage
- if a file is missing, or fails to load for any reason (wrong format,
  wrong scikit-learn version, corrupted file, etc.), the app quietly falls
  back to the existing rule-based formula for that stage and keeps running
  — it will never crash because of a bad model file
- `GET /api/health` will report `"model_mode": "trained"` once at least one
  model is loaded, so you (and judges, if they check) can see it switched
  over

This lets you keep demoing the working rule-based version *today*, and
drop in the real model *later* with zero code changes and zero downtime.

---

## 1. What each model must accept as input

Both models are called with a single row of numbers, in this exact order
(this mirrors the columns already used by the rule-based version in
`backend/services/risk_engine.py` — keep your training data in the same
order):

**`susceptibility_model.joblib`** — one row per corridor:

| # | feature | example range |
|---|---|---|
| 1 | `slope_index` | 0.0 – 1.0 |
| 2 | `geology_index` | 0.0 – 1.0 |
| 3 | `land_cover_index` | 0.0 – 1.0 |
| 4 | `drainage_index` | 0.0 – 1.0 |
| 5 | `historical_density_index` | 0.0 – 1.0 |
| 6 | `human_modification_index` | 0.0 – 1.0 |

**`trigger_model.joblib`** — one row per sensor reading:

| # | feature | example range |
|---|---|---|
| 1 | `rainfall_mm_1h` | 0 – 60 |
| 2 | `rainfall_mm_24h` | 0 – 300 |
| 3 | `rainfall_mm_72h` | 0 – 500 |
| 4 | `soil_moisture_pct` | 0 – 100 |
| 5 | `sar_deformation_flag` | 0 or 1 |

## 2. What each model must output

A single probability between 0 and 1 (the app multiplies it by 100 for the
0–100 score shown on the dashboard). Concretely, your model needs **either**:

- `.predict_proba(X)` → the app reads column 1 (probability of the
  "landslide/high-risk" class), **or**
- `.predict(X)` → the app reads it directly, so make sure it outputs a
  probability/score, not a hard 0/1 label

This is standard for scikit-learn classifiers (`RandomForestClassifier`,
`XGBClassifier`, `LGBMClassifier`, etc.) — no extra wrapper code needed.

## 3. How to save your trained model correctly

```python
import joblib

# after training, e.g.:
# model = XGBClassifier(...).fit(X_train, y_train)

joblib.dump(model, "susceptibility_model.joblib")
# then copy/move that file into backend/models/
```

Do this on the same machine (or same library versions) you'll run the app
on — `joblib` needs the same package (scikit-learn / xgboost / lightgbm)
installed to load the file back. If you used XGBoost or LightGBM, uncomment
the matching line in `backend/requirements.txt` before running `pip
install -r requirements.txt` again.

## 4. Sanity-check it loads before your demo

```bash
cd backend
python3 -c "
import joblib
m = joblib.load('models/susceptibility_model.joblib')
print(type(m), hasattr(m, 'predict_proba'))
"
```

If that prints without an error, `python app.py` will pick it up
automatically on next start. Then check `/api/health` in a browser — it
should say `"model_mode": "trained"`.

## 5. If you only have a dataset so far, not a trained model yet

That's fine — leave this folder empty. The app runs perfectly well on the
rule-based formulas in `risk_engine.py` in the meantime (that's what it's
doing right now), and everything above still applies whenever your model
is ready — you don't need to touch this project again until then.
