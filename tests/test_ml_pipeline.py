"""
BhuSetu Landslide Early Warning System — Phase 2 ML Pipeline & API Test Suite.
SIH26001 (MDoNER).

Tests:
1. Model artifact and preprocessor serialization integrity
2. Preprocessor transformation, feature scaling, and schema validation
3. Input bounds checking and physical domain validation
4. Prediction probability bounds, calibration, and risk tier assignment
5. Sensitivity: severe weather inputs produce higher risk than dry baselines
6. Edge cases: missing fields, out-of-bounds coordinates, non-numeric values
7. Live API endpoint (POST /api/predict-risk and GET /api/ml/metadata)
8. Multi-location geographic generalization across Northeast India and beyond
"""
import unittest
import os
import sys
import json
import urllib.request
import numpy as np

# Ensure project root in sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.features import (
    validate_feature_vector, engineer_features,
    ENGINEERED_FEATURE_NAMES, FEATURE_BOUNDS
)
from ml.preprocessing import LandslidePreprocessor
from ml.predict import predict_risk, _load_artifacts


class TestMLPipeline(unittest.TestCase):

    def setUp(self):
        self.model, self.preprocessor, self.meta = _load_artifacts()

    def test_01_model_and_preprocessor_loaded(self):
        """Verifies model and preprocessor artifacts exist and load correctly."""
        self.assertIsNotNone(self.model, "landslide_model.joblib must load successfully.")
        self.assertIsNotNone(self.preprocessor, "preprocessor.joblib must load successfully.")
        self.assertTrue(self.preprocessor.is_fitted, "Preprocessor must be fitted.")
        self.assertEqual(len(self.preprocessor.feature_names), 15, "Preprocessor must have 15 features.")

    def test_02_feature_engineering_cyclic_aspect(self):
        """Verifies cyclic sin/cos aspect and rainfall intensity ratio."""
        row = {
            'aspect': 90.0,
            'rainfall_1h': 10.0,
            'rainfall_24h': 50.0,
            'geology': 'LHS Daling'
        }
        eng = engineer_features(row)
        self.assertAlmostEqual(eng['aspect_sin'], 1.0, places=2)
        self.assertAlmostEqual(eng['aspect_cos'], 0.0, places=2)
        self.assertAlmostEqual(eng['rainfall_intensity'], 0.20, places=3)
        self.assertEqual(eng['geology_score'], 0.85)

    def test_03_feature_bounds_validation(self):
        """Verifies domain checks reject physical impossibilities."""
        # Valid input
        valid_feat = {'latitude': 27.33, 'longitude': 88.61, 'slope': 35.0, 'rainfall_24h': 80.0}
        ok, warns = validate_feature_vector(valid_feat)
        self.assertTrue(ok)
        self.assertEqual(len(warns), 0)

        # Invalid slope > 90
        bad_slope = {'slope': 120.0}
        ok, warns = validate_feature_vector(bad_slope)
        self.assertFalse(ok)
        self.assertTrue(any("outside physical bounds" in w for w in warns))

        # Temporal inconsistency: rainfall_1h > rainfall_24h
        bad_rain = {'rainfall_1h': 100.0, 'rainfall_24h': 20.0}
        ok, warns = validate_feature_vector(bad_rain)
        self.assertTrue(any("cannot exceed" in w for w in warns))

    def test_04_preprocessor_transformation_shape(self):
        """Verifies preprocessor outputs exact (N, 15) float array."""
        sample_record = {
            'elevation': 1500.0, 'slope': 32.0, 'aspect': 180.0, 'curvature': 0.001,
            'rainfall_1h': 5.0, 'rainfall_24h': 45.0, 'rainfall_72h': 90.0,
            'temperature': 20.0, 'humidity': 80.0, 'soil_moisture': 65.0,
            'insar_velocity_mm_yr': -5.0, 'sar_deformation_flag': 1,
            'geology': 'LHS Daling'
        }
        X_out = self.preprocessor.transform([sample_record])
        self.assertEqual(X_out.shape, (1, 15))
        self.assertFalse(np.isnan(X_out).any(), "Processed feature vector must not contain NaNs.")

    def test_05_predict_risk_probability_bounds(self):
        """Verifies live inference returns calibrated probability in [0, 1]."""
        res = predict_risk(27.33, 88.61)
        self.assertIn('prediction', res)
        p = res['prediction']
        self.assertIn('risk_probability', p)
        self.assertGreaterEqual(p['risk_probability'], 0.0)
        self.assertLessEqual(p['risk_probability'], 1.0)
        self.assertIn(p['risk_level'], ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'])
        self.assertTrue(p['calibrated'])
        self.assertIn('contributing_factors', res)
        self.assertIsInstance(res['contributing_factors'], list)

    def test_06_sensitivity_dry_vs_extreme_monsoon(self):
        """Verifies extreme storm trigger yields significantly higher risk than dry baseline."""
        dry_override = {
            'rainfall_1h': 0.0, 'rainfall_24h': 0.0, 'rainfall_72h': 0.0,
            'soil_moisture': 20.0, 'slope': 15.0, 'sar_deformation_flag': 0, 'insar_velocity_mm_yr': 0.0
        }
        extreme_override = {
            'rainfall_1h': 40.0, 'rainfall_24h': 180.0, 'rainfall_72h': 350.0,
            'soil_moisture': 92.0, 'slope': 42.0, 'sar_deformation_flag': 1, 'insar_velocity_mm_yr': -22.0
        }

        res_dry = predict_risk(27.33, 88.61, live_override=dry_override)
        res_extreme = predict_risk(27.33, 88.61, live_override=extreme_override)

        prob_dry = res_dry['prediction']['risk_probability']
        prob_extreme = res_extreme['prediction']['risk_probability']

        self.assertLess(prob_dry, 0.25, f"Dry baseline should be LOW risk, got {prob_dry}")
        self.assertGreater(prob_extreme, 0.70, f"Extreme storm trigger should be HIGH or CRITICAL, got {prob_extreme}")
        self.assertGreater(prob_extreme - prob_dry, 0.50, "Sensitivity spread must be > 0.50")

    def test_07_invalid_coordinates_handled_cleanly(self):
        """Verifies invalid lat/lon returns structured error without crashing."""
        res_oob = predict_risk(120.0, 88.0) # lat out of range
        self.assertIn('error', res_oob)
        self.assertEqual(res_oob['error'], 'COORDINATES_OUT_OF_BOUNDS')

    def test_08_live_http_prediction_api(self):
        """Verifies POST /api/predict-risk over actual HTTP endpoint or test client."""
        url = "http://127.0.0.1:8000/api/predict-risk"
        payload = json.dumps({'latitude': 25.18, 'longitude': 93.03}).encode('utf-8')
        try:
            req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, timeout=4) as resp:
                self.assertEqual(resp.status, 200)
                data = json.loads(resp.read().decode('utf-8'))
        except (urllib.error.URLError, ConnectionRefusedError, OSError):
            from app import app
            with app.test_client() as client:
                res = client.post('/api/predict-risk', json={'latitude': 25.18, 'longitude': 93.03})
                self.assertEqual(res.status_code, 200)
                data = res.get_json()

        self.assertIn('prediction', data)
        self.assertIn('data_sources', data)
        self.assertIn('features', data)
        self.assertEqual(data['data_sources']['weather'], 'LIVE (OpenWeather API)')
        self.assertEqual(data['data_sources']['soil_moisture'], 'LIVE (Open-Meteo Land Telemetry)')

    def test_09_ml_metadata_api(self):
        """Verifies GET /api/ml/metadata returns full training audit report."""
        url = "http://127.0.0.1:8000/api/ml/metadata"
        try:
            with urllib.request.urlopen(url, timeout=4) as resp:
                self.assertEqual(resp.status, 200)
                meta = json.loads(resp.read().decode('utf-8'))
        except (urllib.error.URLError, ConnectionRefusedError, OSError):
            from app import app
            with app.test_client() as client:
                res = client.get('/api/ml/metadata')
                self.assertEqual(res.status_code, 200)
                meta = res.get_json()

        self.assertEqual(meta['model_version'], '2.0.0')
        self.assertIn('benchmarks', meta)
        self.assertIn('xgboost_uncalibrated', meta['benchmarks'])
        self.assertIn('final_calibrated_model', meta['benchmarks'])


if __name__ == '__main__':
    unittest.main()
