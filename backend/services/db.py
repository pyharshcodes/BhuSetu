"""
Persistence layer using Python's stdlib sqlite3 (no ORM dependency needed).
Keeps schema + queries in one place so the rest of the app deals in plain
dicts, which keeps the JSON API layer trivial.
"""
import os
import sqlite3
import datetime as dt

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "landslide.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


SCHEMA = """
CREATE TABLE IF NOT EXISTS corridors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    state TEXT NOT NULL,
    description TEXT DEFAULT '',
    center_lat REAL NOT NULL,
    center_lon REAL NOT NULL,
    slope_index REAL DEFAULT 0.5,
    geology_index REAL DEFAULT 0.5,
    land_cover_index REAL DEFAULT 0.5,
    drainage_index REAL DEFAULT 0.5,
    historical_density_index REAL DEFAULT 0.5,
    human_modification_index REAL DEFAULT 0.5
);

CREATE TABLE IF NOT EXISTS road_segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    corridor_id INTEGER NOT NULL REFERENCES corridors(id),
    name TEXT NOT NULL,
    criticality TEXT DEFAULT 'district_road',
    lat REAL,
    lon REAL
);

CREATE TABLE IF NOT EXISTS villages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    corridor_id INTEGER NOT NULL REFERENCES corridors(id),
    name TEXT NOT NULL,
    population_estimate INTEGER DEFAULT 0,
    lat REAL,
    lon REAL,
    alternate_route_available INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sensor_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    corridor_id INTEGER NOT NULL REFERENCES corridors(id),
    timestamp TEXT NOT NULL,
    rainfall_mm_1h REAL DEFAULT 0,
    rainfall_mm_24h REAL DEFAULT 0,
    rainfall_mm_72h REAL DEFAULT 0,
    soil_moisture_pct REAL DEFAULT 0,
    sar_deformation_flag INTEGER DEFAULT 0,
    sensor_offline INTEGER DEFAULT 0,
    is_simulated INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_readings_corridor_ts ON sensor_readings(corridor_id, timestamp);

CREATE TABLE IF NOT EXISTS risk_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    corridor_id INTEGER NOT NULL REFERENCES corridors(id),
    timestamp TEXT NOT NULL,
    susceptibility_score REAL,
    trigger_score REAL,
    fused_risk_score REAL,
    confidence_pct REAL,
    alert_level TEXT DEFAULT 'GREEN',
    degradation_reason TEXT DEFAULT '',
    top_reasons TEXT DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_risk_corridor_ts ON risk_snapshots(corridor_id, timestamp);

CREATE TABLE IF NOT EXISTS citizen_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    corridor_id INTEGER NOT NULL REFERENCES corridors(id),
    reporter_name TEXT DEFAULT 'Anonymous',
    lat REAL,
    lon REAL,
    description TEXT DEFAULT '',
    photo_filename TEXT,
    evidence_category TEXT DEFAULT 'unclassified',
    evidence_confidence_pct REAL DEFAULT 0,
    status TEXT DEFAULT 'PENDING',
    created_at TEXT NOT NULL
);
"""


def init_db():
    conn = get_conn()
    conn.executescript(SCHEMA)
    conn.commit()
    conn.close()


def seed_if_empty():
    conn = get_conn()
    cur = conn.execute("SELECT COUNT(*) AS c FROM corridors")
    count = cur.fetchone()["c"]
    if count >= 21:
        conn.close()
        return

    # If old minimal seed exists, clear and reseed full 21 NER districts dataset
    if 0 < count < 21:
        conn.execute("DELETE FROM citizen_reports")
        conn.execute("DELETE FROM risk_snapshots")
        conn.execute("DELETE FROM sensor_readings")
        conn.execute("DELETE FROM villages")
        conn.execute("DELETE FROM road_segments")
        conn.execute("DELETE FROM corridors")
        conn.commit()

    corridors = [
        # --- ASSAM (10 key districts matching map) ---
        (
            "Dima Hasao District", "Assam",
            "Critical hill district in Assam connecting Brahmaputra and Barak valleys; severe monsoon slope failures along Lumding-Badarpur railway and NH-27.",
            25.18, 93.03, 0.85, 0.78, 0.35, 0.75, 0.88, 0.70,
        ),
        (
            "West Karbi Anglong", "Assam",
            "Hilly terrain with fractured sedimentary strata and steep slope cuttings near Hamren and Baithalangso.",
            25.85, 92.55, 0.76, 0.70, 0.42, 0.65, 0.75, 0.60,
        ),
        (
            "Cachar District", "Assam",
            "Southern Barak Valley border zone with foothill settlements and steep hill bypass corridors along NH-37.",
            24.83, 92.80, 0.58, 0.62, 0.50, 0.55, 0.60, 0.52,
        ),
        (
            "Hailakandi District", "Assam",
            "Low-to-moderate slope hill fringe bordering Mizoram with localized slope instability during continuous rainfall.",
            24.68, 92.56, 0.48, 0.52, 0.55, 0.50, 0.45, 0.42,
        ),
        (
            "Karimganj District", "Assam",
            "Border hill tracts with alluvial clay overlays prone to shallow translational slides.",
            24.87, 92.36, 0.46, 0.50, 0.54, 0.48, 0.44, 0.40,
        ),
        (
            "Nagaon District", "Assam",
            "Foothill transition zone along central Assam plateau with isolated cutting instabilities.",
            26.35, 92.68, 0.40, 0.45, 0.60, 0.45, 0.38, 0.35,
        ),
        (
            "Golaghat District", "Assam",
            "Undulating foothill terrain bordering Karbi hills with localized erosion zones.",
            26.52, 93.97, 0.38, 0.42, 0.62, 0.42, 0.35, 0.32,
        ),
        (
            "Jorhat District", "Assam",
            "Piedmont plains with low gradient and stable river terraces.",
            26.75, 94.22, 0.32, 0.38, 0.68, 0.38, 0.28, 0.25,
        ),
        (
            "Sivasagar District", "Assam",
            "Lowland terrain with minor slope gradients along south-bank tributaries.",
            26.98, 94.63, 0.30, 0.35, 0.70, 0.35, 0.25, 0.22,
        ),
        (
            "Dibrugarh District", "Assam",
            "Alluvial valley with stable flat terrain and negligible slope inclination.",
            27.47, 94.91, 0.26, 0.32, 0.72, 0.32, 0.20, 0.18,
        ),
        (
            "Tinsukia District", "Assam",
            "Easternmost district bordering Arunachal foothills with stable lowlands.",
            27.50, 95.36, 0.24, 0.30, 0.74, 0.30, 0.18, 0.16,
        ),
        # --- SIKKIM ---
        (
            "Sikkim NH-10 Corridor", "Sikkim",
            "Critical hill highway corridor connecting Siliguri to Gangtok along steep Teesta slopes.",
            27.15, 88.42, 0.82, 0.75, 0.40, 0.72, 0.85, 0.68,
        ),
        (
            "East Sikkim Corridor", "Sikkim",
            "High altitude mountain pass corridor with frequent permafrost thaw and debris flows.",
            27.32, 88.62, 0.84, 0.77, 0.38, 0.74, 0.82, 0.65,
        ),
        (
            "South Sikkim Namchi", "Sikkim",
            "Steep ridge corridor prone to seismic-triggered rockfalls and slope slips.",
            27.17, 88.35, 0.80, 0.72, 0.42, 0.70, 0.78, 0.62,
        ),
        # --- MEGHALAYA ---
        (
            "Meghalaya Shillong-Dawki Road", "Meghalaya",
            "High-rainfall limestone plateau edge connecting Shillong to Dawki border post.",
            25.35, 91.85, 0.54, 0.60, 0.50, 0.52, 0.58, 0.48,
        ),
        (
            "East Khasi Hills Cherrapunji", "Meghalaya",
            "Extreme rainfall belt with deep canyon gorges and sheer sandstone escarpments.",
            25.28, 91.73, 0.74, 0.68, 0.44, 0.62, 0.72, 0.55,
        ),
        (
            "West Khasi Hills Nongstoin", "Meghalaya",
            "Hilly interior with weathered granite slopes subject to rotational slips.",
            25.52, 91.26, 0.70, 0.65, 0.46, 0.58, 0.68, 0.52,
        ),
        (
            "Ri-Bhoi Hill Corridor", "Meghalaya",
            "Highway corridor connecting Guwahati to Shillong through fragile metamorphic hills.",
            25.90, 91.88, 0.68, 0.64, 0.48, 0.56, 0.65, 0.50,
        ),
        # --- NAGALAND, MANIPUR, MIZORAM, ARUNACHAL ---
        (
            "Kohima-Dimapur Hill Sector", "Nagaland",
            "NH-29 sinking zone with deep-seated active slope movement and heavy mudflows.",
            25.67, 94.11, 0.76, 0.71, 0.40, 0.66, 0.75, 0.62,
        ),
        (
            "Tamenglong Hill Corridor", "Manipur",
            "High-risk hill corridor with steep dip slopes in Barail series shales.",
            24.98, 93.49, 0.83, 0.76, 0.36, 0.73, 0.84, 0.66,
        ),
        (
            "Champhai Hill Highway", "Mizoram",
            "North-south anticlinal ridges with severe translational slides during cyclones.",
            23.47, 93.33, 0.72, 0.66, 0.44, 0.60, 0.70, 0.56,
        ),
        (
            "Papum Pare Itanagar Route", "Arunachal Pradesh",
            "Sub-Himalayan Siwalik belt with fragile mudstones and rapid road cutting slides.",
            27.10, 93.62, 0.69, 0.63, 0.48, 0.58, 0.66, 0.54,
        ),
    ]

    cur = conn.cursor()
    corridor_map = {}
    for c in corridors:
        cur.execute(
            """INSERT INTO corridors
               (name, state, description, center_lat, center_lon, slope_index, geology_index,
                land_cover_index, drainage_index, historical_density_index, human_modification_index)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            c,
        )
        corridor_map[c[0]] = cur.lastrowid

    # Roads
    roads = [
        (corridor_map["Dima Hasao District"], "NH-27 Lumding-Haflong Highway", "national_highway", 25.19, 93.04),
        (corridor_map["Dima Hasao District"], "Haflong-Jatinga Hill Link", "state_road", 25.17, 93.02),
        (corridor_map["Dima Hasao District"], "Maibang-Mahur Railway Road", "district_road", 25.28, 93.12),
        (corridor_map["West Karbi Anglong"], "Hamren-Baithalangso Road", "state_road", 25.86, 92.56),
        (corridor_map["West Karbi Anglong"], "Kheroni District Link", "district_road", 25.82, 92.51),
        (corridor_map["Cachar District"], "NH-37 Silchar-Badarpur Expressway", "national_highway", 24.84, 92.81),
        (corridor_map["Cachar District"], "Lakhipur Foothill Road", "district_road", 24.79, 92.85),
        (corridor_map["Hailakandi District"], "Hailakandi-Katlicherra Road", "state_road", 24.69, 92.57),
        (corridor_map["Karimganj District"], "Karimganj-Patharkandi Border Road", "national_highway", 24.88, 92.37),
        (corridor_map["Nagaon District"], "NH-127B Kaliabor-Samaguri Link", "national_highway", 26.36, 92.69),
        (corridor_map["Golaghat District"], "Numaligarh-Golaghat Road", "state_road", 26.53, 93.98),
        (corridor_map["Jorhat District"], "Jorhat-Mariani Highway", "state_road", 26.76, 94.23),
        (corridor_map["Sivasagar District"], "Sivasagar-Nazira Connector", "district_road", 26.99, 94.64),
        (corridor_map["Dibrugarh District"], "Dibrugarh-Chabua Highway", "national_highway", 27.48, 94.92),
        (corridor_map["Tinsukia District"], "Tinsukia-Makum Bypass", "national_highway", 27.51, 95.37),
        (corridor_map["Sikkim NH-10 Corridor"], "NH-10 Km 42-46 (Rangpo)", "national_highway", 27.16, 88.43),
        (corridor_map["Sikkim NH-10 Corridor"], "Link Road to Rorathang", "district_road", 27.14, 88.41),
        (corridor_map["Meghalaya Shillong-Dawki Road"], "SH-5 Shillong-Dawki", "state_road", 25.36, 91.86),
    ]
    cur.executemany(
        "INSERT INTO road_segments (corridor_id, name, criticality, lat, lon) VALUES (?,?,?,?,?)",
        roads,
    )

    # Villages
    villages = [
        (corridor_map["Dima Hasao District"], "Jatinga Valley", 4800, 25.16, 93.03, 0),
        (corridor_map["Dima Hasao District"], "Haflong Hill Town", 12500, 25.18, 93.02, 1),
        (corridor_map["Dima Hasao District"], "Mahur Basti", 3100, 25.21, 93.07, 0),
        (corridor_map["Dima Hasao District"], "Harangajao", 2900, 25.11, 92.95, 0),
        (corridor_map["West Karbi Anglong"], "Hamren Sub-Division", 6200, 25.85, 92.55, 0),
        (corridor_map["West Karbi Anglong"], "Baithalangso", 3400, 25.88, 92.58, 1),
        (corridor_map["Cachar District"], "Badarpur Ghat", 8500, 24.86, 92.78, 1),
        (corridor_map["Cachar District"], "Udarbond Hillside", 4100, 24.87, 92.89, 0),
        (corridor_map["Hailakandi District"], "Katlicherra", 5200, 24.65, 92.54, 1),
        (corridor_map["Karimganj District"], "Patharkandi", 6800, 24.80, 92.35, 1),
        (corridor_map["Nagaon District"], "Samaguri", 7200, 26.34, 92.67, 1),
        (corridor_map["Golaghat District"], "Bokakhat Border", 6100, 26.55, 93.99, 1),
        (corridor_map["Jorhat District"], "Mariani", 8900, 26.74, 94.21, 1),
        (corridor_map["Sivasagar District"], "Nazira", 7600, 26.97, 94.62, 1),
        (corridor_map["Dibrugarh District"], "Chabua", 11200, 27.46, 94.90, 1),
        (corridor_map["Tinsukia District"], "Makum", 9800, 27.49, 95.35, 1),
        (corridor_map["Sikkim NH-10 Corridor"], "Rangpo Bazaar", 3200, 27.155, 88.425, 0),
        (corridor_map["Sikkim NH-10 Corridor"], "Rorathang", 1400, 27.145, 88.415, 1),
        (corridor_map["Meghalaya Shillong-Dawki Road"], "Pynursla", 2100, 25.355, 91.855, 0),
    ]
    cur.executemany(
        """INSERT INTO villages (corridor_id, name, population_estimate, lat, lon, alternate_route_available)
           VALUES (?,?,?,?,?,?)""",
        villages,
    )

    # Seed baseline sensor reading and risk snapshot calibrated to each district's profile
    target_profiles = {
        "Dima Hasao District": {
            "r1": 18.5, "r24": 145.0, "r72": 240.0, "moist": 78.5, "sar": 1,
            "fused": 82.0, "susc": 78.0, "trig": 84.5, "conf": 92.0, "level": "RED",
            "reasons": [
                "24h rainfall is high (145.0 mm).",
                "Sustained 72h rainfall (240.0 mm) has saturated hill slope soil.",
                "Soil moisture is elevated (78.5%).",
                "Satellite (SAR) evidence indicates active ground deformation.",
                "High static susceptibility (steep slope 38°, fragile tertiary shale)."
            ]
        },
        "West Karbi Anglong": {
            "r1": 12.0, "r24": 118.0, "r72": 195.0, "moist": 72.0, "sar": 0,
            "fused": 72.0, "susc": 70.0, "trig": 73.0, "conf": 88.0, "level": "ORANGE",
            "reasons": [
                "24h rainfall is high (118.0 mm).",
                "Soil moisture is elevated (72.0%).",
                "Steep road cuttings along Hamren sector."
            ]
        },
        "Cachar District": {
            "r1": 6.5, "r24": 75.0, "r72": 130.0, "moist": 58.0, "sar": 0,
            "fused": 48.0, "susc": 56.0, "trig": 42.0, "conf": 86.0, "level": "YELLOW",
            "reasons": [
                "Moderate 24h rainfall (75.0 mm).",
                "Antecedent moisture near 58.0%."
            ]
        },
        "Hailakandi District": {
            "r1": 4.0, "r24": 52.0, "r72": 95.0, "moist": 48.0, "sar": 0,
            "fused": 36.0, "susc": 48.0, "trig": 28.0, "conf": 85.0, "level": "YELLOW",
            "reasons": ["Moderate rainfall in southern foothills."]
        },
        "Karimganj District": {
            "r1": 3.8, "r24": 48.0, "r72": 88.0, "moist": 45.0, "sar": 0,
            "fused": 34.0, "susc": 46.0, "trig": 26.0, "conf": 85.0, "level": "YELLOW",
            "reasons": ["Localized soil dampening along border ridges."]
        },
        "Nagaon District": {
            "r1": 2.5, "r24": 38.0, "r72": 65.0, "moist": 40.0, "sar": 0,
            "fused": 28.0, "susc": 40.0, "trig": 20.0, "conf": 84.0, "level": "YELLOW",
            "reasons": ["Rainfall within acceptable operational margin."]
        },
        "Golaghat District": {
            "r1": 2.2, "r24": 35.0, "r72": 58.0, "moist": 38.0, "sar": 0,
            "fused": 26.0, "susc": 38.0, "trig": 18.0, "conf": 84.0, "level": "YELLOW",
            "reasons": ["Low-to-moderate moisture levels."]
        },
        "Jorhat District": {
            "r1": 1.5, "r24": 25.0, "r72": 42.0, "moist": 32.0, "sar": 0,
            "fused": 22.0, "susc": 32.0, "trig": 15.0, "conf": 90.0, "level": "GREEN",
            "reasons": ["Conditions are within normal range for this district."]
        },
        "Sivasagar District": {
            "r1": 1.2, "r24": 20.0, "r72": 35.0, "moist": 30.0, "sar": 0,
            "fused": 20.0, "susc": 30.0, "trig": 12.0, "conf": 90.0, "level": "GREEN",
            "reasons": ["Conditions are within normal range for this district."]
        },
        "Dibrugarh District": {
            "r1": 0.8, "r24": 15.0, "r72": 28.0, "moist": 28.0, "sar": 0,
            "fused": 18.0, "susc": 26.0, "trig": 10.0, "conf": 90.0, "level": "GREEN",
            "reasons": ["Conditions are within normal range for this district."]
        },
        "Tinsukia District": {
            "r1": 0.5, "r24": 12.0, "r72": 22.0, "moist": 26.0, "sar": 0,
            "fused": 16.0, "susc": 24.0, "trig": 8.0, "conf": 90.0, "level": "GREEN",
            "reasons": ["Conditions are within normal range for this district."]
        },
        "Sikkim NH-10 Corridor": {
            "r1": 15.0, "r24": 130.0, "r72": 210.0, "moist": 76.0, "sar": 1,
            "fused": 80.0, "susc": 78.0, "trig": 82.0, "conf": 91.0, "level": "RED",
            "reasons": [
                "24h rainfall is high (130.0 mm).",
                "SAR deformation detected along Teesta slope.",
                "High static susceptibility (steep gradient)."
            ]
        },
        "East Sikkim Corridor": {
            "r1": 14.5, "r24": 125.0, "r72": 205.0, "moist": 75.0, "sar": 1,
            "fused": 78.0, "susc": 80.0, "trig": 78.0, "conf": 90.0, "level": "RED",
            "reasons": [
                "Continuous rainfall in mountain pass section.",
                "Permafrost thaw and debris slope instability."
            ]
        },
        "South Sikkim Namchi": {
            "r1": 13.5, "r24": 120.0, "r72": 198.0, "moist": 74.0, "sar": 1,
            "fused": 76.0, "susc": 77.0, "trig": 76.0, "conf": 89.0, "level": "RED",
            "reasons": [
                "High antecedent soil moisture and slope tension cracks."
            ]
        },
        "Tamenglong Hill Corridor": {
            "r1": 14.0, "r24": 128.0, "r72": 215.0, "moist": 77.0, "sar": 1,
            "fused": 77.0, "susc": 79.0, "trig": 77.0, "conf": 90.0, "level": "RED",
            "reasons": [
                "Severe dip-slope sliding along Barail shale cuttings."
            ]
        },
        "Kohima-Dimapur Hill Sector": {
            "r1": 11.5, "r24": 112.0, "r72": 185.0, "moist": 71.0, "sar": 0,
            "fused": 70.0, "susc": 72.0, "trig": 70.0, "conf": 88.0, "level": "ORANGE",
            "reasons": [
                "Active sinking zone on NH-29; soil saturation threshold reached."
            ]
        },
        "East Khasi Hills Cherrapunji": {
            "r1": 11.0, "r24": 108.0, "r72": 180.0, "moist": 70.0, "sar": 0,
            "fused": 68.0, "susc": 71.0, "trig": 67.0, "conf": 88.0, "level": "ORANGE",
            "reasons": [
                "Heavy orographic monsoon downpour along gorge rims."
            ]
        },
        "Champhai Hill Highway": {
            "r1": 10.5, "r24": 102.0, "r72": 172.0, "moist": 68.0, "sar": 0,
            "fused": 66.0, "susc": 69.0, "trig": 65.0, "conf": 87.0, "level": "ORANGE",
            "reasons": [
                "Translational ridge slips observed after 48h continuous rain."
            ]
        },
        "West Khasi Hills Nongstoin": {
            "r1": 10.0, "r24": 98.0, "r72": 165.0, "moist": 66.0, "sar": 0,
            "fused": 64.0, "susc": 67.0, "trig": 63.0, "conf": 87.0, "level": "ORANGE",
            "reasons": [
                "Weathered granite hill cuttings showing soil creep."
            ]
        },
        "Papum Pare Itanagar Route": {
            "r1": 9.5, "r24": 94.0, "r72": 158.0, "moist": 65.0, "sar": 0,
            "fused": 62.0, "susc": 66.0, "trig": 60.0, "conf": 86.0, "level": "ORANGE",
            "reasons": [
                "Siwalik mudstone degradation near highway cuttings."
            ]
        },
        "Ri-Bhoi Hill Corridor": {
            "r1": 8.5, "r24": 86.0, "r72": 145.0, "moist": 62.0, "sar": 0,
            "fused": 58.0, "susc": 63.0, "trig": 55.0, "conf": 86.0, "level": "ORANGE",
            "reasons": [
                "Elevated soil wetness along four-lane highway cuts."
            ]
        },
        "Meghalaya Shillong-Dawki Road": {
            "r1": 6.8, "r24": 72.0, "r72": 125.0, "moist": 56.0, "sar": 0,
            "fused": 46.0, "susc": 54.0, "trig": 41.0, "conf": 86.0, "level": "YELLOW",
            "reasons": [
                "Moderate rainfall along limestone road cuttings."
            ]
        },
    }

    import json
    now = now_iso()
    base_time = dt.datetime.utcnow()

    for name, cid in corridor_map.items():
        p = target_profiles.get(name, {
            "r1": 5.0, "r24": 40.0, "r72": 80.0, "moist": 45.0, "sar": 0,
            "fused": 35.0, "susc": 40.0, "trig": 30.0, "conf": 85.0, "level": "YELLOW",
            "reasons": ["Conditions within normal range."]
        })

        # Insert 7 days of historical risk snapshots for trend visualization (e.g. 25 May to 31 May)
        for day_offset in range(6, -1, -1):
            ts = (base_time - dt.timedelta(days=day_offset)).isoformat()
            # progression leading up to current fused score
            prog_factor = (7 - day_offset) / 7.0
            day_fused = round(max(10.0, p["fused"] * (0.42 + 0.58 * prog_factor)), 1)
            day_susc = p["susc"]
            day_trig = round(max(5.0, p["trig"] * (0.35 + 0.65 * prog_factor)), 1)
            day_level = "RED" if day_fused >= 75 else ("ORANGE" if day_fused >= 50 else ("YELLOW" if day_fused >= 25 else "GREEN"))
            
            cur.execute(
                """INSERT INTO risk_snapshots
                   (corridor_id, timestamp, susceptibility_score, trigger_score, fused_risk_score,
                    confidence_pct, alert_level, degradation_reason, top_reasons)
                   VALUES (?,?,?,?,?,?,?,?,?)""",
                (
                    cid, ts, day_susc, day_trig, day_fused,
                    p["conf"], day_level, "", json.dumps(p["reasons"]),
                ),
            )

            # Corresponding sensor reading
            cur.execute(
                """INSERT INTO sensor_readings
                   (corridor_id, timestamp, rainfall_mm_1h, rainfall_mm_24h, rainfall_mm_72h,
                    soil_moisture_pct, sar_deformation_flag, sensor_offline, is_simulated)
                   VALUES (?,?,?,?,?,?,?,?,?)""",
                (
                    cid, ts, round(p["r1"] * prog_factor, 1), round(p["r24"] * prog_factor, 1),
                    round(p["r72"] * prog_factor, 1), round(max(20.0, p["moist"] * (0.6 + 0.4 * prog_factor)), 1),
                    p["sar"] if day_offset == 0 else 0, 0, 1
                ),
            )

    # Seed 51 Community Reports matching reference counts:
    # 23 Landslide, 15 Road Blocked, 8 Cracks, 5 Others
    report_specs = [
        # 23 Landslide
        (corridor_map["Dima Hasao District"], "Sub-Inspector Baruah", 25.17, 93.03, "Major debris flow and mudslide across NH-27 Km 36 near Jatinga bypass. Hill slope collapsed.", "debris", 95.0, "VERIFIED", 1),
        (corridor_map["Dima Hasao District"], "Haflong PWD Patrol", 25.19, 93.02, "Landslide with continuous earth slip near Circuit House ridge.", "debris", 92.0, "VERIFIED", 2),
        (corridor_map["Dima Hasao District"], "Resident Pranjal Nath", 25.12, 92.96, "Hill failure behind Harangajao market; mud slurry entering roadside drainage.", "debris", 88.0, "VERIFIED", 3),
        (corridor_map["West Karbi Anglong"], "Forest Beat Guard", 25.86, 92.56, "Translational rockslide on Hamren hill slope after overnight downpour.", "debris", 90.0, "VERIFIED", 1),
        (corridor_map["West Karbi Anglong"], "Hamren Admin Van", 25.84, 92.53, "Fresh landslide debris sliding down toward valley cutting.", "debris", 89.0, "VERIFIED", 2),
        (corridor_map["Cachar District"], "NHIDCL Field Eng.", 24.85, 92.81, "Active debris slide at Lakhipur hill cutting. Slope unstable.", "debris", 87.0, "VERIFIED", 1),
        (corridor_map["Sikkim NH-10 Corridor"], "BRO Highway Team", 27.16, 88.43, "Severe landslide at 29th Mile NH-10; Teesta river cutting base.", "debris", 96.0, "VERIFIED", 1),
        (corridor_map["Meghalaya Shillong-Dawki Road"], "Pynursla SDRF Volunteer", 25.36, 91.86, "Limestone rockfall and debris accumulation on sharp hairpin bend.", "debris", 91.0, "VERIFIED", 2),
    ]

    # Fill remaining landslide reports to hit 23
    for i in range(15):
        cid = corridor_map["Dima Hasao District"] if i % 2 == 0 else corridor_map["West Karbi Anglong"]
        report_specs.append(
            (cid, f"Field Scout #{i+9}", 25.15 + (i * 0.01), 93.01 + (i * 0.01), f"Slope landslide debris observed along hill tract {i+1}.", "debris", 85.0 + (i % 8), "VERIFIED", (i % 6) + 1)
        )

    # 15 Road Blocked
    road_block_specs = [
        (corridor_map["Dima Hasao District"], "Traffic Police Haflong", 25.18, 93.04, "NH-27 completely blocked by large boulders and fallen trees. Traffic halted.", "blockage", 96.0, "VERIFIED", 1),
        (corridor_map["Dima Hasao District"], "Assam Rifles Escort", 25.20, 93.06, "Road blocked between Mahur and Maibang; 30+ freight vehicles stranded.", "blockage", 94.0, "VERIFIED", 1),
        (corridor_map["West Karbi Anglong"], "State Transport Driver", 25.87, 92.57, "Baithalangso road blocked by fallen earth bank. Excavator dispatched.", "blockage", 91.0, "VERIFIED", 2),
        (corridor_map["Cachar District"], "Silchar Bus Operator", 24.84, 92.79, "Badarpur hill pass road obstructed by debris mound.", "blockage", 88.0, "VERIFIED", 3),
        (corridor_map["Sikkim NH-10 Corridor"], "Sikkim Police Rangpo", 27.15, 88.42, "NH-10 blocked for heavy vehicles at Rangpo border due to mud accumulation.", "blockage", 95.0, "VERIFIED", 1),
    ]
    for i in range(10):
        cid = corridor_map["Dima Hasao District"] if i % 3 == 0 else corridor_map["West Karbi Anglong"]
        road_block_specs.append(
            (cid, f"Highway Patrol #{i+6}", 25.18 + (i * 0.02), 93.02 + (i * 0.02), f"Road blocked by slope slip near culvert {i+12}.", "blockage", 86.0 + (i % 7), "VERIFIED", (i % 5) + 1)
        )

    # 8 Cracks
    crack_specs = [
        (corridor_map["Dima Hasao District"], "Village Headman Jatinga", 25.16, 93.02, "Wide longitudinal cracks opening across hill road shoulder (15m long, 8cm wide).", "crack", 94.0, "VERIFIED", 1),
        (corridor_map["Dima Hasao District"], "PWD Junior Engineer", 25.19, 93.05, "Tension crack detected on retaining wall behind Haflong polytechnic.", "crack", 91.0, "VERIFIED", 2),
        (corridor_map["West Karbi Anglong"], "School Teacher Hamren", 25.85, 92.54, "Ground fissure running through school playground and roadside embankment.", "crack", 89.0, "VERIFIED", 3),
        (corridor_map["Cachar District"], "Resident Abdul Karim", 24.86, 92.80, "Pavement cracks widening after continuous rain near foothill culvert.", "crack", 84.0, "VERIFIED", 4),
        (corridor_map["Sikkim NH-10 Corridor"], "Border Road Worker", 27.14, 88.41, "Surface shear cracks on link road shoulder above Rorathang.", "crack", 93.0, "VERIFIED", 1),
        (corridor_map["Meghalaya Shillong-Dawki Road"], "Tourist Driver", 25.35, 91.85, "Multiple transverse cracks across tarmac on Pynursla descent.", "crack", 86.0, "VERIFIED", 2),
        (corridor_map["Dima Hasao District"], "Farmer Maibang", 25.22, 93.08, "Soil step and ground cracks forming on terraced slope.", "crack", 88.0, "VERIFIED", 3),
        (corridor_map["West Karbi Anglong"], "Youth Volunteer", 25.88, 92.59, "Cracks along masonry drainage channel on hillside.", "crack", 83.0, "PENDING", 4),
    ]

    # 5 Others (rockfall / water seepage / minor slip)
    other_specs = [
        (corridor_map["Dima Hasao District"], "Citizen Report", 25.17, 93.04, "Water shooting out from slope weep holes with brownish sediment.", "unclassified", 65.0, "VERIFIED", 2),
        (corridor_map["West Karbi Anglong"], "Biker", 25.86, 92.55, "Small gravel rolling onto carriageway, trees tilted at 15 degrees.", "unclassified", 58.0, "VERIFIED", 3),
        (corridor_map["Cachar District"], "Auto Driver", 24.83, 92.78, "Heavy mud runoff making hill road slippery near turning.", "unclassified", 52.0, "VERIFIED", 4),
        (corridor_map["Hailakandi District"], "Panchayat Member", 24.68, 92.56, "Drainage culvert overflowing into roadside slope.", "unclassified", 45.0, "PENDING", 5),
        (corridor_map["Karimganj District"], "Border Guard", 24.87, 92.36, "Loose boulders precariously perched above border patrol track.", "unclassified", 62.0, "VERIFIED", 6),
    ]

    all_reports = report_specs + road_block_specs + crack_specs + other_specs

    for r in all_reports:
        cid, name, lat, lon, desc, cat, conf, status, days_ago = r
        r_time = (base_time - dt.timedelta(days=days_ago, hours=(cid % 12))).isoformat()
        cur.execute(
            """INSERT INTO citizen_reports
               (corridor_id, reporter_name, lat, lon, description, photo_filename,
                evidence_category, evidence_confidence_pct, status, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (cid, name, lat, lon, desc, None, cat, conf, status, r_time),
        )

    conn.commit()
    conn.close()


def now_iso() -> str:
    return dt.datetime.utcnow().isoformat()

