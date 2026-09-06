"""
BhuSetu Landslide Early Warning System - Live ML Inference Engine.
SIH26001 (MDoNER).

Provides real-time landslide risk prediction by integrating:
1. Live OpenWeather atmospheric telemetry (rainfall 1h, 24h, 72h, temp, humidity)
2. Live Open-Meteo land surface telemetry (volumetric soil moisture 0-1cm, 1-3cm)
3. Live SRTM / Copernicus satellite DEM (elevation, slope, aspect, curvature via finite differences)
4. Live Copernicus Sentinel-1 InSAR line-of-sight ground deformation telemetry
5. Calibrated XGBoost Machine Learning Model with physics-grounded explainability
"""
import os
import sys
import math
import json
import urllib.request
import logging
from datetime import datetime, timezone
import numpy as np
import joblib

_log = logging.getLogger('bhusetu.ml.predict')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.features import validate_feature_vector, engineer_features, ENGINEERED_FEATURE_NAMES
from ml.preprocessing import LandslidePreprocessor

# Model and Preprocessor paths
MODEL_PATH = os.path.join(SCRIPT_DIR, 'models', 'landslide_model.joblib')
PREPROC_PATH = os.path.join(SCRIPT_DIR, 'preprocessing', 'preprocessor.joblib')
META_PATH = os.path.join(SCRIPT_DIR, 'models', 'metadata.json')

_model_cache = None
_preproc_cache = None
_meta_cache = None


def _load_artifacts():
    global _model_cache, _preproc_cache, _meta_cache
    if _model_cache is None and os.path.exists(MODEL_PATH):
        try:
            _model_cache = joblib.load(MODEL_PATH)
            _log.info('Successfully loaded landslide_model.joblib')
        except Exception as e:
            _log.error('Failed to load landslide model: %s', e)

    if _preproc_cache is None and os.path.exists(PREPROC_PATH):
        try:
            _preproc_cache = joblib.load(PREPROC_PATH)
            _log.info('Successfully loaded preprocessor.joblib')
        except Exception as e:
            _log.error('Failed to load preprocessor: %s', e)

    if _meta_cache is None and os.path.exists(META_PATH):
        try:
            with open(META_PATH, 'r', encoding='utf-8') as f:
                _meta_cache = json.load(f)
        except Exception as e:
            _log.warning('Could not load metadata: %s', e)

    return _model_cache, _preproc_cache, _meta_cache


def compute_live_terrain_dem(lat: float, lon: float) -> dict:
    """
    Computes elevation, slope, aspect, and curvature for arbitrary coordinates
    using a 5-point finite difference stencil on Open-Meteo elevation API.
    """
    delta = 0.001  # ~100m spacing
    url = (
        f"https://api.open-meteo.com/v1/elevation?"
        f"latitude={lat},{lat+delta},{lat-delta},{lat},{lat}&"
        f"longitude={lon},{lon},{lon},{lon+delta},{lon-delta}"
    )
    req = urllib.request.Request(url, headers={'User-Agent': 'BhuSetu-DEM/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            elevations = data.get('elevation', [])
            if len(elevations) == 5:
                z0, zN, zS, zE, zW = elevations
                dy = delta * 111320.0
                dx = delta * 111320.0 * math.cos(math.radians(lat))

                dz_dx = (zE - zW) / (2.0 * max(1.0, dx))
                dz_dy = (zN - zS) / (2.0 * max(1.0, dy))

                slope_rad = math.atan(math.sqrt(dz_dx**2 + dz_dy**2))
                slope_deg = math.degrees(slope_rad)
                aspect_deg = (math.degrees(math.atan2(-dz_dx, dz_dy)) + 360.0) % 360.0
                curvature = ((zE + zW - 2.0 * z0) / (dx**2)) + ((zN + zS - 2.0 * z0) / (dy**2))

                return {
                    'elevation': round(float(z0), 1),
                    'slope': round(float(slope_deg), 2),
                    'aspect': round(float(aspect_deg), 1),
                    'curvature': round(float(curvature), 6),
                    'status': 'LIVE DEM (Copernicus/SRTM 30m Grid)'
                }
    except Exception as e:
        _log.warning('Could not retrieve live DEM for (%.4f, %.4f): %s', lat, lon, e)

    # Fallback regional baseline if DEM query fails
    return {
        'elevation': 1200.0,
        'slope': 22.5,
        'aspect': 180.0,
        'curvature': 0.0,
        'status': 'STATIC (Regional Baseline Fallback)'
    }


def predict_risk(lat: float, lon: float, live_override: dict = None) -> dict:
    """
    End-to-end live machine learning prediction for any coordinates.
    """
    # Validate coordinates
    try:
        lat_f = float(lat)
        lon_f = float(lon)
    except (ValueError, TypeError):
        return {'error': 'INVALID_COORDINATES', 'message': 'Latitude and longitude must be numbers.'}

    if not (-90.0 <= lat_f <= 90.0) or not (-180.0 <= lon_f <= 180.0):
        return {'error': 'COORDINATES_OUT_OF_BOUNDS', 'message': f'({lat_f}, {lon_f}) outside valid range.'}

    # 1. Fetch live weather & soil moisture
    try:
        from backend.services import weather_service, insar_service
    except ImportError:
        try:
            from services import weather_service, insar_service
        except ImportError:
            weather_service = None
            insar_service = None

    weather_data = {}
    weather_source = 'STATIC (Fallback)'
    soil_source = 'STATIC (Fallback)'
    location_name = f'Location ({lat_f:.4f}, {lon_f:.4f})'

    if weather_service:
        try:
            w_res = weather_service.fetch_live_weather(lat_f, lon_f)
            if w_res and w_res.get('data_status') == 'LIVE':
                w_fields = w_res.get('weather', {})
                weather_data = {
                    'rainfall_1h': float(w_fields.get('rainfall_1h', 0.0) or 0.0),
                    'rainfall_24h': float(w_fields.get('rainfall_forecast_24h', 0.0) or 0.0),
                    'rainfall_72h': float(w_fields.get('rainfall_forecast_72h', 0.0) or 0.0),
                    'temperature': float(w_fields.get('temperature', 22.0) or 22.0),
                    'humidity': float(w_fields.get('humidity', 70.0) or 70.0),
                    'soil_moisture': float(w_fields.get('soil_moisture', 35.0) or 35.0),
                }
                weather_source = 'LIVE (OpenWeather API)'
                soil_source = 'LIVE (Open-Meteo Land Telemetry)'
                loc_obj = w_res.get('location', {})
                if loc_obj.get('name'):
                    location_name = loc_obj.get('name')
        except Exception as ex:
            _log.warning('Error fetching live weather: %s', ex)

    # Defaults if weather not fetched
    if not weather_data:
        weather_data = {
            'rainfall_1h': 0.0,
            'rainfall_24h': 5.0,
            'rainfall_72h': 12.0,
            'temperature': 20.0,
            'humidity': 75.0,
            'soil_moisture': 35.0
        }

    # 2. Fetch live DEM terrain
    dem_data = compute_live_terrain_dem(lat_f, lon_f)

    # 3. Fetch Sentinel-1 InSAR deformation
    insar_data = {}
    insar_source = 'STATIC (Fallback)'
    if insar_service:
        try:
            insar_res = insar_service.get_insar_for_coords(lat_f, lon_f)
            insar_data = {
                'insar_velocity_mm_yr': float(insar_res.get('los_velocity_mm_yr', -2.5)),
                'sar_deformation_flag': 1 if insar_res.get('active_deformation') else 0
            }
            insar_source = 'LIVE (Copernicus Sentinel-1 / LiCSAR)'
        except Exception as ex:
            _log.warning('Error querying InSAR: %s', ex)

    if not insar_data:
        insar_data = {
            'insar_velocity_mm_yr': -2.5,
            'sar_deformation_flag': 0
        }

    # 4. Regional Geology
    geology = 'LHS Daling' if (26.5 <= lat_f <= 28.5 and 88.0 <= lon_f <= 90.0) else 'Sedimentary/Alluvium'

    # Combine into raw feature dictionary
    raw_features = {
        'elevation': dem_data['elevation'],
        'slope': dem_data['slope'],
        'aspect': dem_data['aspect'],
        'curvature': dem_data['curvature'],
        'geology': geology,
        'rainfall_1h': weather_data['rainfall_1h'],
        'rainfall_24h': weather_data['rainfall_24h'],
        'rainfall_72h': weather_data['rainfall_72h'],
        'temperature': weather_data['temperature'],
        'humidity': weather_data['humidity'],
        'soil_moisture': weather_data['soil_moisture'],
        'insar_velocity_mm_yr': insar_data['insar_velocity_mm_yr'],
        'sar_deformation_flag': insar_data['sar_deformation_flag']
    }

    # Apply override if provided (e.g. for simulation)
    if live_override and isinstance(live_override, dict):
        key_alias_map = {
            'rainfall_1h_mm': 'rainfall_1h',
            'rainfall_24h_mm': 'rainfall_24h',
            'rainfall_72h_mm': 'rainfall_72h',
            'soil_moisture_pct': 'soil_moisture',
            'slope_deg': 'slope',
            'aspect_deg': 'aspect',
            'elevation_m': 'elevation',
            'temperature_c': 'temperature',
            'humidity_pct': 'humidity',
        }
        normalized_override = {}
        for k, v in live_override.items():
            std_k = key_alias_map.get(k, k)
            normalized_override[std_k] = v
        raw_features.update(normalized_override)

    # Ensure rainfall_24h >= rainfall_1h and rainfall_72h >= rainfall_24h
    raw_features['rainfall_24h'] = max(raw_features['rainfall_24h'], raw_features['rainfall_1h'])
    raw_features['rainfall_72h'] = max(raw_features['rainfall_72h'], raw_features['rainfall_24h'])

    # Validate feature bounds
    is_valid, warnings = validate_feature_vector(raw_features)

    # Load model and preprocessor
    model, preprocessor, meta = _load_artifacts()
    if model is None or preprocessor is None:
        return {
            'error': 'MODEL_NOT_READY',
            'message': 'ML prediction model or preprocessor artifacts are not loaded.'
        }

    # Transform through preprocessor
    X_proc = preprocessor.transform([raw_features])

    # Run ML inference
    probs = model.predict_proba(X_proc)[0]
    risk_probability = round(float(probs[1]), 4)

    # Determine risk level based on calibrated thresholds
    if risk_probability < 0.25:
        risk_level = 'LOW'
    elif risk_probability < 0.50:
        risk_level = 'MODERATE'
    elif risk_probability < 0.75:
        risk_level = 'HIGH'
    else:
        risk_level = 'CRITICAL'

    # Generate physics-grounded contributing factors
    contributing_factors = []
    if raw_features['rainfall_72h'] >= 80.0:
        contributing_factors.append(f"Sustained 72-hour cumulative storm rainfall ({raw_features['rainfall_72h']:.1f} mm) inducing high pore water pressure")
    if raw_features['rainfall_24h'] >= 40.0:
        contributing_factors.append(f"Heavy 24-hour precipitation ({raw_features['rainfall_24h']:.1f} mm) saturating soil overburden")
    if raw_features['soil_moisture'] >= 70.0:
        contributing_factors.append(f"High volumetric soil moisture ({raw_features['soil_moisture']:.1f}%) reducing effective shear strength")
    if raw_features['slope'] >= 32.0:
        contributing_factors.append(f"Steep topographic slope gradient ({raw_features['slope']:.1f} deg) creating gravitational shear stress")
    if raw_features['sar_deformation_flag'] == 1 or raw_features['insar_velocity_mm_yr'] <= -8.0:
        contributing_factors.append(f"Active Sentinel-1 InSAR line-of-sight ground displacement creep ({raw_features['insar_velocity_mm_yr']:.1f} mm/yr)")
    if raw_features['rainfall_1h'] >= 15.0:
        contributing_factors.append(f"Intense cloudburst rain intensity ({raw_features['rainfall_1h']:.1f} mm/h)")
    if raw_features['geology'] in ['LHS Daling', 'MCT zone']:
        contributing_factors.append(f"Fragile rock mass formation ({raw_features['geology']}) with sheared phyllite/quartzite bedrock")

    if not contributing_factors:
        contributing_factors.append("Mild slope gradient and normal hydrometeorological baseline")

    timestamp_iso = datetime.now(timezone.utc).isoformat()

    return {
        'location': {
            'latitude': lat_f,
            'longitude': lon_f,
            'name': location_name
        },
        'prediction': {
            'risk_probability': risk_probability,
            'risk_percentage': round(risk_probability * 100.0, 1),
            'risk_level': risk_level,
            'model_type': meta.get('model_type', 'Calibrated XGBoost Classifier') if meta else 'Calibrated XGBoost Classifier',
            'calibrated': True,
            'confidence_score': round(float(np.max(probs)), 3)
        },
        'features': {
            'rainfall_1h_mm': raw_features['rainfall_1h'],
            'rainfall_24h_mm': raw_features['rainfall_24h'],
            'rainfall_72h_mm': raw_features['rainfall_72h'],
            'rainfall_intensity': round(raw_features['rainfall_1h'] / max(0.1, raw_features['rainfall_24h']), 3),
            'temperature_c': raw_features['temperature'],
            'humidity_pct': raw_features['humidity'],
            'soil_moisture_pct': raw_features['soil_moisture'],
            'elevation_m': raw_features['elevation'],
            'slope_deg': raw_features['slope'],
            'aspect_deg': raw_features['aspect'],
            'curvature': raw_features['curvature'],
            'geology': raw_features['geology'],
            'insar_velocity_mm_yr': raw_features['insar_velocity_mm_yr'],
            'sar_deformation_flag': raw_features['sar_deformation_flag']
        },
        'contributing_factors': contributing_factors,
        'data_sources': {
            'weather': weather_source,
            'rainfall': weather_source,
            'soil_moisture': soil_source,
            'terrain': dem_data['status'],
            'insar': insar_source
        },
        'validation_warnings': warnings,
        'prediction_timestamp': timestamp_iso
    }


if __name__ == '__main__':
    print('Testing live prediction on Gangtok (27.33, 88.61)...')
    res = predict_risk(27.33, 88.61)
    print(json.dumps(res, indent=2))