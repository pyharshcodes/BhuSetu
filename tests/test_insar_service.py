import unittest
import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "..", "backend")
sys.path.insert(0, BACKEND_DIR)

from services import insar_service


class TestInSARService(unittest.TestCase):
    def test_corridor_lookup(self):
        insar = insar_service.get_insar_for_corridor(16)
        self.assertEqual(insar["corridor_id"], 16)
        self.assertEqual(insar["corridor_name"], "Dima Hasao District")
        self.assertTrue(insar["active_deformation"])
        self.assertLess(insar["los_velocity_mm_yr"], -10.0)
        self.assertGreater(insar["coherence"], 0.5)

    def test_all_22_corridors(self):
        for cid in range(16, 38):
            insar = insar_service.get_insar_for_corridor(cid)
            self.assertIn("los_velocity_mm_yr", insar)
            self.assertIn("active_deformation", insar)
            self.assertIn("coherence", insar)
            self.assertIn("frame_id", insar)
            self.assertEqual(insar["data_status"], "LIVE")

    def test_coordinate_lookup(self):
        # Coordinates near Haflong / Dima Hasao
        insar = insar_service.get_insar_for_coords(25.18, 93.03)
        self.assertIsNotNone(insar)
        self.assertIn("los_velocity_mm_yr", insar)


if __name__ == "__main__":
    unittest.main()
