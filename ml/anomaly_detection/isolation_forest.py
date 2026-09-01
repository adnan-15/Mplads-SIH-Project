from dataclasses import dataclass
from typing import Any, Sequence

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from ml.anomaly_detection.feature_selector import (
    DEFAULT_CANDIDATE_FEATURES,
    FeatureSelectionResult,
    select_numeric_features,
)


@dataclass(frozen=True)
class IsolationForestConfig:
    contamination: float | str = 0.1
    random_state: int = 42
    n_estimators: int = 100

    def validate(self) -> None:
        if isinstance(self.contamination, str):
            if self.contamination != "auto":
                raise ValueError("contamination must be a float or 'auto'.")
        elif not 0 < self.contamination <= 0.5:
            raise ValueError("contamination must be greater than 0 and at most 0.5.")
        if self.n_estimators < 1:
            raise ValueError("n_estimators must be at least 1.")


@dataclass(frozen=True)
class PreparedFeatureMatrix:
    feature_names: list[str]
    numeric_values: pd.DataFrame
    scaled_values: np.ndarray
    scaler: StandardScaler
    imputation_values: dict[str, float]
    selection: FeatureSelectionResult


@dataclass(frozen=True)
class AnomalyDetectionResult:
    results: pd.DataFrame
    feature_names: list[str]
    selection: FeatureSelectionResult
    prepared_features: PreparedFeatureMatrix
    model: IsolationForest


def prepare_feature_matrix(
    dataframe: pd.DataFrame,
    *,
    selected_features: Sequence[str] | None = None,
    candidate_features: Sequence[str] = DEFAULT_CANDIDATE_FEATURES,
    minimum_valid_values: int = 2,
) -> PreparedFeatureMatrix:
    """Convert, impute, and standardize reusable anomaly features."""
    selection = select_numeric_features(
        dataframe,
        candidate_features=(
            selected_features
            if selected_features is not None
            else candidate_features
        ),
        minimum_valid_values=minimum_valid_values,
    )
    numeric_values = pd.DataFrame(index=dataframe.index)
    imputation_values: dict[str, float] = {}

    for feature in selection.selected_features:
        values = pd.to_numeric(dataframe[feature], errors="coerce")
        values = values.replace([np.inf, -np.inf], np.nan)
        median = values.median()
        fill_value = 0.0 if pd.isna(median) or not np.isfinite(median) else float(median)
        numeric_values[feature] = values.fillna(fill_value).astype(float)
        imputation_values[feature] = fill_value

    if not np.isfinite(numeric_values.to_numpy(dtype=float)).all():
        raise ValueError("Feature preparation produced non-finite values.")

    scaler = StandardScaler()
    scaled_values = scaler.fit_transform(numeric_values)
    if not np.isfinite(scaled_values).all():
        raise ValueError("Feature scaling produced non-finite values.")

    return PreparedFeatureMatrix(
        feature_names=selection.selected_features,
        numeric_values=numeric_values,
        scaled_values=scaled_values,
        scaler=scaler,
        imputation_values=imputation_values,
        selection=selection,
    )


def _normalize_anomaly_scores(decision_values: np.ndarray) -> np.ndarray:
    """Convert sklearn's normality score into 0..1 unusualness scores.

    IsolationForest.decision_function is larger for normal observations and
    smaller for unusual observations. We negate it and min-max normalize the
    batch so that higher anomaly_score consistently means more unusual.
    """
    unusualness = -np.asarray(decision_values, dtype=float)
    minimum = float(np.min(unusualness))
    maximum = float(np.max(unusualness))
    spread = maximum - minimum
    if spread == 0:
        return np.zeros_like(unusualness)
    return (unusualness - minimum) / spread


def _feature_contributions(
    values: pd.Series,
    reference_values: pd.DataFrame,
    *,
    top_n: int,
) -> list[dict[str, Any]]:
    contributions: list[dict[str, Any]] = []
    for feature in reference_values.columns:
        feature_values = reference_values[feature]
        mean = float(feature_values.mean())
        standard_deviation = float(feature_values.std(ddof=0))
        actual_value = float(values[feature])
        z_score = (
            0.0
            if standard_deviation == 0
            else (actual_value - mean) / standard_deviation
        )
        contributions.append(
            {
                "feature": feature,
                "value": actual_value,
                "mean": mean,
                "standard_deviation": standard_deviation,
                "z_score": round(float(z_score), 6),
                "deviation_direction": (
                    "above"
                    if actual_value > mean
                    else "below"
                    if actual_value < mean
                    else "at"
                ),
            }
        )

    contributions.sort(key=lambda item: abs(item["z_score"]), reverse=True)
    return contributions[:top_n]


def _explanation(contributions: list[dict[str, Any]]) -> str:
    if not contributions:
        return "Anomaly detected and requires manual review."
    strongest = contributions[0]
    return (
        "Anomaly detected and requires manual review. "
        f"Strongest statistical deviation: {strongest['feature']} is "
        f"{abs(strongest['z_score']):.2f} standard deviations "
        f"{strongest['deviation_direction']} the dataset mean."
    )


def detect_anomalies(
    dataframe: pd.DataFrame,
    *,
    config: IsolationForestConfig | None = None,
    selected_features: Sequence[str] | None = None,
    candidate_features: Sequence[str] = DEFAULT_CANDIDATE_FEATURES,
    minimum_valid_values: int = 2,
    top_n_contributors: int = 3,
) -> AnomalyDetectionResult:
    """Fit Isolation Forest and return row-level anomaly observations.

    The model prediction follows sklearn's convention: -1 is an anomaly and
    1 is a normal observation. anomaly_score is a batch-normalized unusualness
    score from 0 to 1, where higher means more unusual.
    """
    if top_n_contributors < 1:
        raise ValueError("top_n_contributors must be at least 1.")
    detection_config = config or IsolationForestConfig()
    detection_config.validate()
    prepared = prepare_feature_matrix(
        dataframe,
        selected_features=selected_features,
        candidate_features=candidate_features,
        minimum_valid_values=minimum_valid_values,
    )
    model = IsolationForest(
        contamination=detection_config.contamination,
        random_state=detection_config.random_state,
        n_estimators=detection_config.n_estimators,
    )
    predictions = model.fit_predict(prepared.scaled_values)
    decision_values = model.decision_function(prepared.scaled_values)
    anomaly_scores = _normalize_anomaly_scores(decision_values)
    anomaly_detected = predictions == -1

    row_results = pd.DataFrame(index=dataframe.index)
    row_results["anomaly_prediction"] = predictions.astype(int)
    row_results["anomaly_score"] = anomaly_scores.astype(float)
    row_results["anomaly_detected"] = anomaly_detected.astype(bool)
    row_results["top_contributing_features"] = None
    row_results["anomaly_explanation"] = None

    for index in row_results.index[anomaly_detected]:
        contributions = _feature_contributions(
            prepared.numeric_values.loc[index],
            prepared.numeric_values,
            top_n=top_n_contributors,
        )
        row_results.at[index, "top_contributing_features"] = contributions
        row_results.at[index, "anomaly_explanation"] = _explanation(contributions)

    return AnomalyDetectionResult(
        results=row_results,
        feature_names=prepared.feature_names,
        selection=prepared.selection,
        prepared_features=prepared,
        model=model,
    )