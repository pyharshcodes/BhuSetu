"""
BhuSetu Landslide Early Warning System - ML Feature Definitions & Validation.
SIH26001 (MDoNER).

Defines canonical feature schemas, boundary validations, domain constraints,
and feature engineering transformations.
"""
import math
import numpy as np

RAW_NUMERICAL_FEATURES = [
    'elevation',
    'slope',
    'aspect',
    'curvature',
    'rainfall_1h',
    'rainfall_24h',
    'rainfall_72h',
    'temperature',
    'humidity',
    'soil_moisture',
    'insar_velocity_mm_yr',
    'sar_deformation_flag'
]

CATEGORICAL_FEATURES = ['geology']

KNOWN_GEOLOGIES = [
    'LHS Daling',
    'GHS paro',
    'MCT zone',
    'Lingtse',
    'LHS',
    'Sedimentary/Alluvium',
    'Other'
]

ENGINEERED_FEATURE_NAMES = [
    'elevation',
    'slope',
    'aspect_sin',
    'aspect_cos',
    'curvature',
    'rainfall_1h',
    'rainfall_24h',
    'rainfall_72h',
    'rainfall_intensity',
    'temperature',
    'humidity',
    'soil_moisture',
    'insar_velocity_mm_yr',
    'sar_deformation_flag',
    'geology_score'
]

FEATURE_BOUNDS = {
    'latitude': (-90.0, 90.0),
    'longitude': (-180.0, 180.0),
    'elevation': (-100.0, 9000.0),
    'slope': (0.0, 89.9),
    'aspect': (0.0, 360.0),
    'curvature': (-50.0, 50.0),
    'rainfall_1h': (0.0, 500.0),
    'rainfall_24h': (0.0, 2000.0),
    'rainfall_72h': (0.0, 5000.0),
    'temperature': (-50.0, 60.0),
    'humidity': (0.0, 100.0),
    'soil_moisture': (0.0, 100.0),
    'insar_velocity_mm_yr': (-300.0, 300.0),
    'sar_deformation_flag': (0, 1)
}

GEOLOGY_SUSCEPTIBILITY_WEIGHTS = {
    'LHS Daling': 0.85,
    'MCT zone': 0.90,
    'Lingtse': 0.70,
    'GHS paro': 0.55,
    'LHS': 0.65,
    'Sedimentary/Alluvium': 0.30,
    'Other': 0.50
}


def validate_feature_vector(features: dict) -> tuple:
    """
    Validates physical plausibility of the input feature vector.
    Returns (is_valid: bool, warnings: list).
    """
    warnings = []
    is_valid = True

    for feat, (low, high) in FEATURE_BOUNDS.items():
        if feat in features and features[feat] is not None:
            try:
                val = float(features[feat])
                if val < low or val > high:
                    warnings.append(f"{feat} value {val} is outside physical bounds [{low}, {high}].")
                    is_valid = False
            except (ValueError, TypeError):
                warnings.append(f"{feat} must be numeric, got {type(features[feat])}.")
                is_valid = False

    r1h = features.get('rainfall_1h')
    r24h = features.get('rainfall_24h')
    r72h = features.get('rainfall_72h')
    if r1h is not None and r24h is not None:
        if float(r1h) > float(r24h) + 1e-4:
            warnings.append(f"rainfall_1h ({r1h}) cannot exceed rainfall_24h ({r24h}).")

    if r24h is not None and r72h is not None:
        if float(r24h) > float(r72h) + 1e-4:
            warnings.append(f"rainfall_24h ({r24h}) cannot exceed rainfall_72h ({r72h}).")

    return is_valid, warnings


def engineer_features(row_or_dict: dict) -> dict:
    """
    Transforms raw telemetry into ML-ready engineered features:
    - Cyclic aspect encoding (sin & cos)
    - Rainfall intensity ratio
    - Geology susceptibility index
    """
    d = dict(row_or_dict)
    
    aspect = float(d.get('aspect', 180.0) or 180.0)
    aspect_rad = math.radians(aspect)
    d['aspect_sin'] = round(math.sin(aspect_rad), 5)
    d['aspect_cos'] = round(math.cos(aspect_rad), 5)

    r1h = float(d.get('rainfall_1h', 0.0) or 0.0)
    r24h = float(d.get('rainfall_24h', 0.0) or 0.0)
    d['rainfall_intensity'] = round(r1h / max(0.1, r24h), 4)

    geology = str(d.get('geology', 'Other') or 'Other').strip()
    d['geology_score'] = GEOLOGY_SUSCEPTIBILITY_WEIGHTS.get(geology, 0.50)

    return d