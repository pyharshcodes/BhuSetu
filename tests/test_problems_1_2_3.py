import unittest
import os
import sys
import numpy as np

# Ensure backend in path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "..", "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services import insar_service
from services import evidence_classifier
from services import explain_service


class TestProblems123(unittest.TestCase):
    # ==================== Problem 1: Sentinel-1 InSAR ====================
    def test_insar_corridor_metadata(self):
        """Verifies Sentinel-1 InSAR telemetry returns valid satellite fields and live/calibrated status."""
        insar = insar_service.get_insar_for_corridor(16)
        self.assertIn("los_velocity_mm_yr", insar)
        self.assertIn("coherence", insar)
        self.assertIn("data_status", insar)
        self.assertEqual(insar["data_status"], "LIVE")
        self.assertIn("satellite_feed_status", insar)
        self.assertIn("source", insar)

    def test_insar_coordinates_lookup(self):
        """Verifies coordinate lookup augments with live Sentinel-1 pass data."""
        insar = insar_service.get_insar_for_coords(25.18, 93.03)
        self.assertIsNotNone(insar)
        self.assertIn("los_velocity_mm_yr", insar)
        self.assertIn("active_deformation", insar)

    # ==================== Problem 2: Computer Vision Classifier ====================
    def test_cv_classifier_synthetic_crack(self):
        """Generates a synthetic image with high-contrast linear fissure fractures."""
        import cv2
        test_img_path = os.path.join(BASE_DIR, "test_crack_sample.png")
        try:
            # Create a 480x640 image with distinct diagonal crack lines
            img = np.full((480, 640, 3), 120, dtype=np.uint8)
            cv2.line(img, (50, 400), (320, 240), (20, 20, 20), 4)
            cv2.line(img, (320, 240), (580, 100), (20, 20, 20), 5)
            cv2.line(img, (200, 310), (380, 390), (15, 15, 15), 3)
            cv2.imwrite(test_img_path, img)

            cat, conf = evidence_classifier.classify("noticeable ground fracture", has_photo=True, photo_path=test_img_path)
            self.assertEqual(cat, "crack")
            self.assertGreaterEqual(conf, 60.0)
            self.assertLessEqual(conf, 100.0)
        finally:
            if os.path.exists(test_img_path):
                os.remove(test_img_path)

    def test_cv_classifier_synthetic_debris(self):
        """Generates a synthetic image with chaotic rubble texture and earthy tones."""
        import cv2
        test_img_path = os.path.join(BASE_DIR, "test_debris_sample.png")
        try:
            # Create a noisy image simulating rock rubble and mud (brownish HSV)
            img = np.random.randint(60, 180, (480, 640, 3), dtype=np.uint8)
            # Add brown tint: lower B, medium G, higher R
            img[:, :, 0] = np.clip(img[:, :, 0] * 0.4, 0, 255).astype(np.uint8)
            img[:, :, 1] = np.clip(img[:, :, 1] * 0.7, 0, 255).astype(np.uint8)
            cv2.imwrite(test_img_path, img)

            cat, conf = evidence_classifier.classify("scree and mudflow", has_photo=True, photo_path=test_img_path)
            self.assertEqual(cat, "debris")
            self.assertGreaterEqual(conf, 60.0)
        finally:
            if os.path.exists(test_img_path):
                os.remove(test_img_path)

    def test_cv_classifier_text_fallback(self):
        """Verifies text fallback when no photo is attached."""
        cat, conf = evidence_classifier.classify("huge rockfall boulder blocking the route", has_photo=False)
        self.assertIn(cat, ["debris", "blockage"])
        self.assertGreaterEqual(conf, 55.0)

    # ==================== Problem 3: Explainable AI ====================
    def test_explain_rule_based_grounding(self):
        """Verifies Mode 1 deterministic scientific telemetry grounding."""
        corridor = {
            "id": 16,
            "name": "Dima Hasao Hill Sector",
            "state": "Assam",
            "district": "Dima Hasao",
            "length_km": 42.5,
            "slope_index": 0.82,
            "geology_index": 0.75,
            "drainage_index": 0.68,
            "historical_density_index": 0.85,
            "human_modification_index": 0.60,
        }
        snapshot = {
            "id": 101,
            "corridor_id": 16,
            "fused_risk_score": 82.4,
            "alert_level": "RED",
            "confidence_pct": 91.5,
            "susceptibility_score": 78.0,
            "trigger_score": 86.0,
            "top_reasons": ["24h rainfall 142mm exceeds critical geotechnical threshold", "Soil moisture at 88%"],
            "degradation_reason": "",
        }
        telemetry = {
            "sensor_reading": {
                "rainfall_mm_1h": 22.5,
                "rainfall_mm_24h": 142.0,
                "rainfall_mm_72h": 210.0,
                "soil_moisture_pct": 88.0,
                "sar_deformation_flag": True,
            },
            "villages": [
                {"name": "Haflong Hill", "population_estimate": 4200, "alternate_route_available": True},
                {"name": "Jatinga Valley", "population_estimate": 1800, "alternate_route_available": False},
            ],
            "roads": [
                {"name": "NH-54E / NH-27", "criticality": "national_highway"},
            ],
        }

        # 1. Pure deterministic rule-based test
        rule_explanation = explain_service._rule_based_explanation(corridor, snapshot, question="Why is the alert RED?", telemetry=telemetry)
        self.assertIn("RED ALERT", rule_explanation)
        self.assertIn("82.4", rule_explanation)
        self.assertIn("142.0 mm", rule_explanation)
        self.assertIn("88.0%", rule_explanation)
        self.assertIn("Haflong Hill", rule_explanation)
        self.assertIn("Standard Operating Protocol", rule_explanation)

        # 2. End-to-end explain test (auto-detects LLM if key configured, or falls back to rule-based)
        explanation, mode = explain_service.explain(corridor, snapshot, question="Why is the alert RED?", telemetry=telemetry)
        self.assertTrue("RED" in explanation)
        self.assertIn("82.4", explanation)
        self.assertTrue("142" in explanation)
        self.assertTrue("88" in explanation)
        self.assertTrue(any(p in mode for p in ["rule_based", "openai", "groq", "gemini"]))

    def test_explain_empty_snapshot(self):
        """Verifies clean response when snapshot is None."""
        corridor = {"name": "Empty Corridor"}
        explanation, mode = explain_service.explain(corridor, None)
        self.assertIn("No risk data is available yet", explanation)
        self.assertEqual(mode, "rule_based")


if __name__ == "__main__":
    unittest.main()
