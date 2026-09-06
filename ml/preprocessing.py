"""
BhuSetu Landslide Early Warning System - Preprocessing Pipeline.
SIH26001 (MDoNER).

Provides reproducible data preprocessing, feature engineering, missing value
imputation, and scaling. Ensures identical transformations during training and
live inference.
"""
import os
import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

try:
    from ml.features import ENGINEERED_FEATURE_NAMES, engineer_features, validate_feature_vector
except ImportError:
    from features import ENGINEERED_FEATURE_NAMES, engineer_features, validate_feature_vector


class LandslidePreprocessor:
    """
    Reusable and serializable preprocessor for landslide risk prediction.
    """
    def __init__(self):
        self.feature_names = list(ENGINEERED_FEATURE_NAMES)
        self.scaler = StandardScaler()
        self.medians = {}
        self.is_fitted = False

    def fit(self, X):
        """
        Fits imputers and scaler on training data.
        X can be a DataFrame or list of dicts.
        """
        if isinstance(X, list):
            X = pd.DataFrame(X)
        elif not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X)

        # Apply feature engineering
        engineered_rows = [engineer_features(row) for _, row in X.iterrows()]
        df_eng = pd.DataFrame(engineered_rows)

        # Compute medians for imputation
        for col in self.feature_names:
            if col in df_eng.columns:
                self.medians[col] = float(df_eng[col].median(skipna=True))
            else:
                self.medians[col] = 0.0

        # Fill missing values
        df_filled = df_eng[self.feature_names].fillna(self.medians)

        # Fit standard scaler
        self.scaler.fit(df_filled.values)
        self.is_fitted = True
        return self

    def transform(self, X):
        """
        Transforms input records into standardized feature matrix.
        X can be a single dict, list of dicts, or DataFrame.
        """
        if not self.is_fitted:
            raise RuntimeError("LandslidePreprocessor must be fitted before calling transform.")

        if isinstance(X, dict):
            X = [X]
        if isinstance(X, list):
            X = pd.DataFrame(X)
        elif not isinstance(X, pd.DataFrame):
            X = pd.DataFrame(X)

        engineered_rows = [engineer_features(row) for _, row in X.iterrows()]
        df_eng = pd.DataFrame(engineered_rows)

        # Ensure all required features are present
        for col in self.feature_names:
            if col not in df_eng.columns:
                df_eng[col] = self.medians.get(col, 0.0)

        # Impute missing with learned medians
        df_filled = df_eng[self.feature_names].fillna(self.medians)
        
        # Scale
        scaled_array = self.scaler.transform(df_filled.values)
        return scaled_array

    def fit_transform(self, X):
        return self.fit(X).transform(X)

    def save(self, filepath: str):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        joblib.dump(self, filepath)

    @classmethod
    def load(cls, filepath: str):
        return joblib.load(filepath)