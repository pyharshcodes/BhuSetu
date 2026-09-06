
import os
import shutil
import math
import numpy as np
import pandas as pd

np.random.seed(42)

ML_DATA_DIR = os.path.abspath('ml/data')
BACKEND_DATA_DIR = os.path.abspath('backend/data')
DOWNLOADS_DIR = os.path.expanduser(r'~\Downloads')

PTS_CSV = os.path.join(DOWNLOADS_DIR, 'Google_Earth_landslides_point_21Dec2021.csv')
POLY_CSV = os.path.join(DOWNLOADS_DIR, 'Google_Earth_landslides_polygon_21Dec2021.csv')
SUSC_CSV = os.path.join(BACKEND_DATA_DIR, 'ner_landslide_susceptibility_dataset.csv')
TRIG_CSV = os.path.join(BACKEND_DATA_DIR, 'ner_landslide_trigger_dataset.csv')
INSAR_JSON = os.path.join(BACKEND_DATA_DIR, 'sentinel1_insar_corridors.json')

def main():
    print('=== COPYING SOURCE DATASETS TO ml/data/ ===')
    for src in [PTS_CSV, POLY_CSV, SUSC_CSV, TRIG_CSV, INSAR_JSON]:
        if os.path.exists(src):
            dst = os.path.join(ML_DATA_DIR, os.path.basename(src))
            shutil.copy2(src, dst)
            print(f'Copied {os.path.basename(src)} -> {dst}')
        else:
            print(f'Warning: Source not found: {src}')

    pts_df = pd.read_csv(os.path.join(ML_DATA_DIR, 'Google_Earth_landslides_point_21Dec2021.csv'))
    poly_df = pd.read_csv(os.path.join(ML_DATA_DIR, 'Google_Earth_landslides_polygon_21Dec2021.csv'))

    # Extract Sikkim terrain points
    # Normalize curvature by 1e8 to eliminate GIS integer scaling artifact
    pts_clean = pts_df[['Slope', 'Aspect', 'Curvature', 'Elevation', 'Geology']].copy()
    pts_clean['Curvature'] = pts_clean['Curvature'] / 1e8
    pts_clean['is_landslide_site'] = 1

    poly_clean = poly_df[['Slope', 'Aspect', 'Curvature', 'Elevation', 'Geology']].copy()
    poly_clean['Curvature'] = poly_clean['Curvature'] / 1e8
    poly_clean['is_landslide_site'] = 1

    # Combine Sikkim ground truth failure points
    sikkim_failures = pd.concat([pts_clean, poly_clean], ignore_index=True)
    n_failures = len(sikkim_failures)
    print(f'Total Sikkim ground truth failure terrain profiles: {n_failures}')

    # Build balanced non-landslide stable terrain units sampled across the same Himalayan basins
    n_stable = int(n_failures * 1.5)
    stable_slopes = np.random.uniform(5.0, 26.0, n_stable)
    stable_aspects = np.random.uniform(0.0, 360.0, n_stable)
    stable_curvatures = np.random.normal(0.0, 0.4, n_stable)
    stable_elevations = np.random.uniform(300.0, 3800.0, n_stable)
    stable_geologies = np.random.choice(['GHS paro', 'LHS Daling', 'MCT zone', 'Lingtse', 'Sedimentary/Alluvium'], size=n_stable, p=[0.25, 0.35, 0.15, 0.10, 0.15])

    sikkim_stable = pd.DataFrame({
        'Slope': stable_slopes,
        'Aspect': stable_aspects,
        'Curvature': stable_curvatures,
        'Elevation': stable_elevations,
        'Geology': stable_geologies,
        'is_landslide_site': 0
    })

    terrain_pool = pd.concat([sikkim_failures, sikkim_stable], ignore_index=True)
    
    # Synthesize multi-temporal meteorological observations paired with terrain
    N = 3500
    records = []

    for i in range(N):
        t_row = terrain_pool.sample(1).iloc[0]
        slope = float(t_row['Slope'])
        aspect = float(t_row['Aspect'])
        curvature = float(t_row['Curvature'])
        elevation = float(t_row['Elevation'])
        geology = str(t_row['Geology'])
        site_prone = int(t_row['is_landslide_site'])

        regime = np.random.choice(['dry', 'moderate', 'extreme'], p=[0.45, 0.35, 0.20])

        if regime == 'dry':
            rainfall_1h = max(0.0, float(np.random.exponential(0.5)))
            rainfall_24h = max(rainfall_1h, float(np.random.exponential(4.0)))
            rainfall_72h = max(rainfall_24h, float(np.random.exponential(10.0)))
            soil_moisture = float(np.random.uniform(15.0, 45.0))
            temp = float(np.random.uniform(18.0, 32.0) - (elevation / 1000.0) * 6.0)
            humidity = float(np.random.uniform(40.0, 75.0))
            sar_flag = 0 if np.random.random() > 0.05 else 1
            insar_vel = float(np.random.normal(-1.5, 1.0)) if sar_flag == 0 else float(np.random.normal(-7.0, 2.5))

        elif regime == 'moderate':
            rainfall_1h = max(0.0, float(np.random.gamma(2.0, 3.0)))
            rainfall_24h = max(rainfall_1h, float(rainfall_1h * 2.5 + np.random.gamma(3.0, 8.0)))
            rainfall_72h = max(rainfall_24h, float(rainfall_24h * 1.5 + np.random.gamma(4.0, 10.0)))
            soil_moisture = float(np.random.uniform(45.0, 75.0))
            temp = float(np.random.uniform(16.0, 28.0) - (elevation / 1000.0) * 6.0)
            humidity = float(np.random.uniform(70.0, 92.0))
            sar_flag = 0 if np.random.random() > 0.20 else 1
            insar_vel = float(np.random.normal(-3.0, 1.5)) if sar_flag == 0 else float(np.random.normal(-11.0, 3.0))

        else:
            rainfall_1h = max(5.0, float(np.random.gamma(4.0, 6.0)))
            rainfall_24h = max(rainfall_1h * 2.0, float(rainfall_1h * 3.0 + np.random.gamma(5.0, 20.0)))
            rainfall_72h = max(rainfall_24h * 1.3, float(rainfall_24h * 1.8 + np.random.gamma(6.0, 25.0)))
            soil_moisture = float(np.random.uniform(72.0, 98.0))
            temp = float(np.random.uniform(14.0, 24.0) - (elevation / 1000.0) * 6.0)
            humidity = float(np.random.uniform(85.0, 99.0))
            sar_flag = 1 if np.random.random() > 0.35 else 0
            insar_vel = float(np.random.normal(-18.0, 6.0)) if sar_flag == 1 else float(np.random.normal(-5.0, 2.0))

        rainfall_intensity = rainfall_1h / max(0.1, rainfall_24h)

        geology_weakness = {
            'LHS Daling': 0.85,
            'MCT zone': 0.90,
            'Lingtse': 0.70,
            'GHS paro': 0.55,
            'LHS': 0.65,
            'Sedimentary/Alluvium': 0.30
        }.get(geology, 0.50)

        # Geotechnical Factor of Safety proxy (Infinite Slope model with pore water pressure)
        driving_force = (
            (math.sin(math.radians(slope)) * 1.8) +
            (geology_weakness * 1.2) +
            ((rainfall_24h / 120.0) * 1.5) +
            ((rainfall_72h / 250.0) * 1.0) +
            ((soil_moisture / 100.0) * 1.4) +
            (sar_flag * 1.1) +
            (abs(insar_vel) / 20.0 * 0.8)
        )
        resisting_force = (
            (math.cos(math.radians(slope)) * 2.2) +
            ((1.0 - geology_weakness) * 1.5) +
            (0.8 if curvature > 0 else 0.2) +
            3.0
        )
        
        fos = resisting_force / max(0.01, driving_force)
        prob_failure = 1.0 / (1.0 + math.exp(6.0 * (fos - 1.05)))
        landslide_label = 1 if np.random.random() < prob_failure else 0

        records.append({
            'elevation': round(elevation, 1),
            'slope': round(slope, 2),
            'aspect': round(aspect, 1),
            'curvature': round(curvature, 5),
            'geology': geology,
            'rainfall_1h': round(rainfall_1h, 2),
            'rainfall_24h': round(rainfall_24h, 2),
            'rainfall_72h': round(rainfall_72h, 2),
            'rainfall_intensity': round(rainfall_intensity, 4),
            'temperature': round(temp, 1),
            'humidity': round(humidity, 1),
            'soil_moisture': round(soil_moisture, 1),
            'insar_velocity_mm_yr': round(insar_vel, 2),
            'sar_deformation_flag': sar_flag,
            'landslide': landslide_label
        })

    df = pd.DataFrame(records)
    out_csv = os.path.join(ML_DATA_DIR, 'unified_landslide_dataset.csv')
    df.to_csv(out_csv, index=False)
    print(f'Successfully generated {out_csv}')
    print(f'Shape: {df.shape}')
    print('Target distribution:', df['landslide'].value_counts(normalize=True).round(3).to_dict())

if __name__ == '__main__':
    main()
