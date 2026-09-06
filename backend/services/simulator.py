"""
SIMULATION MODE data generator.

No live IMD / Sentinel / IoT feeds are wired into this build (this sandbox
has no outbound network access, and no real API keys are provided). Instead
this module generates a physically-plausible synthetic rainfall / soil-
moisture / SAR signal so the full pipeline (ingest -> risk -> consequence ->
alert) can be demonstrated end-to-end. Every reading is flagged
`is_simulated = true`, and the API surfaces `simulation_mode: true` so the
UI never claims this is live government data.

To go live: replace `generate_reading()`'s body with real calls to the IMD
API / Sentinel Hub (using the IMD_API_KEY / SENTINEL_HUB_* env vars already
wired in config.py) and leave every other module untouched — the risk
engine only cares about the resulting dict shape, not where it came from.
"""
import math
import random

from services import db as dbm

_rng = random.Random(42)


def _baseline_rainfall(hour_of_day: int) -> float:
    diurnal = max(0.0, math.sin((hour_of_day - 14) / 24 * 2 * math.pi)) * 3.0
    noise = _rng.uniform(0, 2.5)
    monsoon_pulse = 2.0 if _rng.random() > 0.7 else 0.0
    return round(diurnal + noise + monsoon_pulse, 2)


def latest_reading(conn, corridor_id: int):
    row = conn.execute(
        "SELECT * FROM sensor_readings WHERE corridor_id=? ORDER BY timestamp DESC LIMIT 1",
        (corridor_id,),
    ).fetchone()
    return dict(row) if row else None


def generate_reading(
    conn,
    corridor_id: int,
    rainfall_spike_mm: float = 0.0,
    soil_saturation_boost_pct: float = 0.0,
    trigger_sar_deformation: bool = False,
    knock_out_sensor: bool = False,
):
    prev = latest_reading(conn, corridor_id)
    now = dbm.now_iso()
    hour = int(now[11:13])

    base_1h = _baseline_rainfall(hour) + rainfall_spike_mm
    prev_24h = prev["rainfall_mm_24h"] if prev else 0.0
    prev_72h = prev["rainfall_mm_72h"] if prev else 0.0
    rainfall_24h = round(prev_24h * 0.90 + base_1h, 2)
    rainfall_72h = round(prev_72h * 0.97 + base_1h, 2)

    prev_moisture = prev["soil_moisture_pct"] if prev else 35.0
    # Proportional drainage (soil dries toward a ~28% baseline) plus rain-driven
    # wetting, so moisture settles into a stable band instead of drifting to 100%.
    drained = prev_moisture - (prev_moisture - 28.0) * 0.08
    moisture = drained + (base_1h * 1.1) + soil_saturation_boost_pct
    moisture = max(5.0, min(100.0, moisture))

    reading = {
        "corridor_id": corridor_id,
        "timestamp": now,
        "rainfall_mm_1h": round(base_1h, 2),
        "rainfall_mm_24h": rainfall_24h,
        "rainfall_mm_72h": rainfall_72h,
        "soil_moisture_pct": round(moisture, 1) if not knock_out_sensor else prev_moisture,
        "sar_deformation_flag": 1 if trigger_sar_deformation else 0,
        "sensor_offline": 1 if knock_out_sensor else 0,
        "is_simulated": 1,
    }

    cur = conn.execute(
        """INSERT INTO sensor_readings
           (corridor_id, timestamp, rainfall_mm_1h, rainfall_mm_24h, rainfall_mm_72h,
            soil_moisture_pct, sar_deformation_flag, sensor_offline, is_simulated)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        (
            reading["corridor_id"], reading["timestamp"], reading["rainfall_mm_1h"],
            reading["rainfall_mm_24h"], reading["rainfall_mm_72h"], reading["soil_moisture_pct"],
            reading["sar_deformation_flag"], reading["sensor_offline"], reading["is_simulated"],
        ),
    )
    conn.commit()
    reading["id"] = cur.lastrowid
    return reading


def seed_history(conn, corridor_id: int, hours: int = 48):
    count = conn.execute(
        "SELECT COUNT(*) AS c FROM sensor_readings WHERE corridor_id=?", (corridor_id,)
    ).fetchone()["c"]
    if count > 0:
        return

    import datetime as dt
    start = dt.datetime.utcnow() - dt.timedelta(hours=hours)
    moisture = 30.0
    r24 = 0.0
    r72 = 0.0
    rows = []
    for i in range(hours):
        ts = start + dt.timedelta(hours=i)
        r1 = _baseline_rainfall(ts.hour)
        r24 = round(r24 * 0.90 + r1, 2)
        r72 = round(r72 * 0.97 + r1, 2)
        drained = moisture - (moisture - 28.0) * 0.08
        moisture = max(5.0, min(100.0, drained + (r1 * 1.1)))
        rows.append((corridor_id, ts.isoformat(), round(r1, 2), r24, r72, round(moisture, 1), 0, 0, 1))

    conn.executemany(
        """INSERT INTO sensor_readings
           (corridor_id, timestamp, rainfall_mm_1h, rainfall_mm_24h, rainfall_mm_72h,
            soil_moisture_pct, sar_deformation_flag, sensor_offline, is_simulated)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        rows,
    )
    conn.commit()
