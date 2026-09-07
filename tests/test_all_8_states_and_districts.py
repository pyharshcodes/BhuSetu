"""
test_all_8_states_and_districts.py
Automated verification suite testing full 8-state and 132-district coverage.
"""
import unittest
import os
import sys
import json

BASE_DIR = r"c:\Users\harsh\Downloads\NER_Landslide_EWS_SIH26001 (1)\ner-landslide-ews"
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from services import db as dbm
from services import insar_service
from services import risk_engine
import app as flask_app_module

EXPECTED_8_STATES = sorted([
    "Arunachal Pradesh",
    "Assam",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Sikkim",
    "Tripura"
])

class TestAll8StatesAndDistricts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = flask_app_module.app.test_client()

    def test_eight_states_exist_in_database(self):
        """Verifies exactly the 8 Northeast states are present in SQLite corridors."""
        conn = dbm.get_conn()
        rows = conn.execute("SELECT DISTINCT state FROM corridors").fetchall()
        conn.close()
        states = sorted([r["state"] for r in rows])
        self.assertEqual(states, EXPECTED_8_STATES, f"States mismatch! Found: {states}")

    def test_total_corridors_count(self):
        """Verifies 132 monitored corridors across the 8 states."""
        conn = dbm.get_conn()
        count = conn.execute("SELECT COUNT(*) as c FROM corridors").fetchone()["c"]
        conn.close()
        self.assertEqual(count, 132, f"Expected 132 corridors, found {count}")

    def test_tripura_coverage(self):
        """Verifies Tripura is present with all 8 official districts."""
        conn = dbm.get_conn()
        rows = conn.execute("SELECT id, name FROM corridors WHERE state='Tripura'").fetchall()
        conn.close()
        self.assertEqual(len(rows), 8, f"Expected 8 Tripura districts, found {len(rows)}")
        tripura_names = [r["name"] for r in rows]
        self.assertTrue(any("West Tripura" in n for n in tripura_names))
        self.assertTrue(any("Dhalai" in n for n in tripura_names))
        self.assertTrue(any("Gomati" in n for n in tripura_names))
        self.assertTrue(any("Khowai" in n for n in tripura_names))
        self.assertTrue(any("North Tripura" in n for n in tripura_names))
        self.assertTrue(any("Sepahijala" in n for n in tripura_names))
        self.assertTrue(any("South Tripura" in n for n in tripura_names))
        self.assertTrue(any("Unakoti" in n for n in tripura_names))

    def test_guwahati_present_in_assam(self):
        """Verifies Kamrup Metropolitan (Guwahati) is present in Assam."""
        conn = dbm.get_conn()
        row = conn.execute("SELECT * FROM corridors WHERE name LIKE '%Guwahati%'").fetchone()
        conn.close()
        self.assertIsNotNone(row, "Guwahati corridor not found in database!")
        self.assertEqual(row["state"], "Assam")
        self.assertIn("Kamrup Metropolitan", row["name"])

    def test_dima_hasao_preserved_as_id_16(self):
        """Verifies Dima Hasao is preserved as ID 16 for backwards compatibility."""
        conn = dbm.get_conn()
        row = conn.execute("SELECT * FROM corridors WHERE id=16").fetchone()
        conn.close()
        self.assertIsNotNone(row)
        self.assertIn("Dima Hasao", row["name"])

    def test_every_corridor_has_valid_ml_risk_snapshot(self):
        """Verifies every single corridor has an ML-calculated risk snapshot and alert level."""
        conn = dbm.get_conn()
        rows = conn.execute("""
            SELECT c.id, c.name, r.fused_risk_score, r.alert_level, r.susceptibility_score, r.trigger_score
            FROM corridors c
            LEFT JOIN risk_snapshots r ON r.corridor_id = c.id
        """).fetchall()
        conn.close()
        self.assertEqual(len(rows), 132)
        for r in rows:
            self.assertIsNotNone(r["fused_risk_score"], f"Missing risk score for {r['name']}")
            self.assertIn(r["alert_level"], ["RED", "ORANGE", "YELLOW", "GREEN"])
            self.assertGreaterEqual(r["fused_risk_score"], 0.0)
            self.assertLessEqual(r["fused_risk_score"], 100.0)

    def test_insar_telemetry_for_new_states(self):
        """Verifies InSAR telemetry works for Tripura, Guwahati, Tawang, Aizawl, and Gangtok."""
        test_corridor_ids = [16, 38, 62, 63, 70, 119, 144]
        for cid in test_corridor_ids:
            insar = insar_service.get_insar_for_corridor(cid)
            self.assertIn("los_velocity_mm_yr", insar)
            self.assertIn("coherence", insar)
            self.assertEqual(insar["data_status"], "LIVE")

    def test_api_list_corridors_returns_all(self):
        """Verifies GET /api/corridors returns 132 corridors."""
        resp = self.client.get("/api/corridors")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(len(data), 132)
        states = sorted(list(set(c["state"] for c in data)))
        self.assertEqual(states, EXPECTED_8_STATES)

    def test_api_guwahati_and_tripura_dashboards(self):
        """Verifies GET /api/corridors/<id>/dashboard returns 200 for Guwahati and Tripura."""
        # 38: Guwahati, 62: Agartala (West Tripura), 63: Dhalai
        for cid in [38, 62, 63]:
            resp = self.client.get(f"/api/corridors/{cid}/dashboard")
            self.assertEqual(resp.status_code, 200)
            data = resp.get_json()
            self.assertIn("corridor", data)
            self.assertIn("latest_risk", data)
            self.assertIn("insar", data)
            self.assertIn("live_weather", data)
            self.assertIn("roads", data)
            self.assertIn("villages", data)

    def test_api_overview_aggregation(self):
        """Verifies GET /api/overview accurately aggregates all 132 districts."""
        resp = self.client.get("/api/overview")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertIn("districts", data)
        self.assertEqual(len(data["districts"]), 132)
        self.assertIn("level_counts", data)

if __name__ == "__main__":
    unittest.main()
