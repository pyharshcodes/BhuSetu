import unittest
import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "..", "backend")
sys.path.insert(0, BACKEND_DIR)

from services import risk_engine


class TestMLModels(unittest.TestCase):
    def test_models_loaded(self):
        self.assertTrue(risk_engine.USING_TRAINED_MODELS, "risk_engine should report USING_TRAINED_MODELS=True")
        self.assertIsNotNone(risk_engine._susceptibility_model, "Susceptibility model should be loaded")
        self.assertIsNotNone(risk_engine._trigger_model, "Trigger model should be loaded")

    def test_susceptibility_high_vs_low(self):
        high_slope_corridor = {
            "slope_index": 0.88,
            "geology_index": 0.82,
            "land_cover_index": 0.75,
            "drainage_index": 0.70,
            "historical_density_index": 0.80,
            "human_modification_index": 0.65
        }
        low_plain_corridor = {
            "slope_index": 0.08,
            "geology_index": 0.12,
            "land_cover_index": 0.15,
            "drainage_index": 0.10,
            "historical_density_index": 0.05,
            "human_modification_index": 0.05
        }

        s_high = risk_engine.compute_susceptibility(high_slope_corridor)
        s_low = risk_engine.compute_susceptibility(low_plain_corridor)

        self.assertGreater(s_high, 75.0, f"High slope susceptibility should exceed 75%, got {s_high}")
        self.assertLess(s_low, 30.0, f"Low plain susceptibility should be below 30%, got {s_low}")

    def test_trigger_monsoon_vs_dry(self):
        storm_reading = {
            "rainfall_mm_1h": 40.0,
            "rainfall_mm_24h": 160.0,
            "rainfall_mm_72h": 320.0,
            "soil_moisture_pct": 88.0,
            "sar_deformation_flag": 1
        }
        dry_reading = {
            "rainfall_mm_1h": 0.0,
            "rainfall_mm_24h": 0.0,
            "rainfall_mm_72h": 5.0,
            "soil_moisture_pct": 25.0,
            "sar_deformation_flag": 0
        }

        t_storm = risk_engine.compute_trigger(storm_reading)
        t_dry = risk_engine.compute_trigger(dry_reading)

        self.assertGreater(t_storm, 75.0, f"Storm trigger should exceed 75%, got {t_storm}")
        self.assertLess(t_dry, 25.0, f"Dry trigger should be below 25%, got {t_dry}")

    def test_risk_fusion(self):
        reading = {
            "rainfall_mm_1h": 25.0,
            "rainfall_mm_24h": 110.0,
            "rainfall_mm_72h": 210.0,
            "soil_moisture_pct": 75.0,
            "sar_deformation_flag": 1,
            "sensor_offline": False,
            "is_simulated": False
        }
        result = risk_engine.fuse(85.0, 80.0, reading)
        self.assertIn("fused_risk_score", result)
        self.assertIn("alert_level", result)
        self.assertEqual(result["alert_level"], "RED")
        self.assertGreaterEqual(result["fused_risk_score"], 75.0)


if __name__ == "__main__":
    unittest.main()
