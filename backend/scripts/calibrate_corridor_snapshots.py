"""
Calibrates all corridor risk snapshots and sensor readings using the trained
XGBoost susceptibility & trigger models and Sentinel-1 InSAR telemetry.
"""
import sys
import os
import json
import datetime as dt

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "..")
sys.path.insert(0, BACKEND_DIR)

from services import db as dbm
from services import risk_engine, insar_service

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def calibrate():
    print("========================================================")
    print("Calibrating All 22 NER Corridors with Trained ML Models")
    print("========================================================")
    assert risk_engine.USING_TRAINED_MODELS, "Trained models not loaded!"

    conn = dbm.get_conn()
    corridors = conn.execute("SELECT * FROM corridors").fetchall()

    base_time = dt.datetime.utcnow()

    summary_counts = {"RED": 0, "ORANGE": 0, "YELLOW": 0, "GREEN": 0}

    for c_row in corridors:
        c = dict(c_row)
        cid = c["id"]
        cname = c["name"]

        # 1. Stage 1: XGBoost Susceptibility
        susc_score = risk_engine.compute_susceptibility(c)

        # 2. InSAR telemetry
        insar = insar_service.get_insar_for_corridor(cid)
        sar_flag = 1 if insar.get("active_deformation") else 0

        # 3. Reading baseline based on recent sensor reading or geomorphic profile
        latest_r = conn.execute(
            "SELECT * FROM sensor_readings WHERE corridor_id=? ORDER BY timestamp DESC LIMIT 1",
            (cid,)
        ).fetchone()

        if latest_r:
            r = dict(latest_r)
            r["sar_deformation_flag"] = sar_flag
        else:
            r = {
                "rainfall_mm_1h": 2.0,
                "rainfall_mm_24h": 25.0,
                "rainfall_mm_72h": 45.0,
                "soil_moisture_pct": 35.0,
                "sar_deformation_flag": sar_flag,
                "sensor_offline": 0,
                "is_simulated": 0
            }

        # 4. Stage 2: XGBoost Trigger
        trig_score = risk_engine.compute_trigger(r)

        # 5. Fusion
        fused = risk_engine.fuse(susc_score, trig_score, r)
        level = fused["alert_level"]
        score = fused["fused_risk_score"]
        summary_counts[level] += 1

        print(f"[{level:6s}] Corridor {cid:2d} ({cname:30s}): Susc={susc_score:4.1f}%, Trig={trig_score:4.1f}%, Fused={score:4.1f}%, InSAR={insar['los_velocity_mm_yr']:+5.1f} mm/yr")

        # 6. Update latest risk snapshot in DB
        now_ts = dbm.now_iso()
        conn.execute(
            """INSERT INTO risk_snapshots
               (corridor_id, timestamp, susceptibility_score, trigger_score, fused_risk_score,
                confidence_pct, alert_level, degradation_reason, top_reasons)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (
                cid, now_ts, susc_score, trig_score, score,
                fused["confidence_pct"], level, fused["degradation_reason"],
                json.dumps(fused["top_reasons"])
            )
        )

        # 7. Update latest sensor reading with InSAR deformation flag
        conn.execute(
            """UPDATE sensor_readings
               SET sar_deformation_flag=?
               WHERE id=(SELECT id FROM sensor_readings WHERE corridor_id=? ORDER BY timestamp DESC LIMIT 1)""",
            (sar_flag, cid)
        )

    conn.commit()
    conn.close()

    print("\n========================================================")
    print("Regional Risk Distribution (XGBoost ML Output):")
    print(f"  • RED (Very High) : {summary_counts['RED']} corridors")
    print(f"  • ORANGE (High)   : {summary_counts['ORANGE']} corridors")
    print(f"  • YELLOW (Moderate): {summary_counts['YELLOW']} corridors")
    print(f"  • GREEN (Low)     : {summary_counts['GREEN']} corridors")
    print("========================================================")


if __name__ == "__main__":
    calibrate()
