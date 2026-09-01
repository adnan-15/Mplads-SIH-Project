from dataclasses import dataclass
from typing import Sequence

import numpy as np
import pandas as pd

DEFAULT_CANDIDATE_FEATURES: tuple[str, ...] = (
    "sanctioned_amount",
    "estimated_cost",
    "actual_expenditure",
    "utilized_amount",
    "work_progress_percentage",
    "cost_variance",
    "cost_variance_percentage",
    "fund_utilization_percentage",
    "project_delay_days",
    "progress_expenditure_gap",
    "estimated_cost_ratio",
    "project_duration_days",
)


class InsufficientFeaturesError(ValueError):
    """Raised when fewer than two usable numeric features are available."""

    def __init__(
        self,
        available_features: Sequence[str],
        *,
        minimum_features: int = 2,
    ) -> None:
        self.available_features = list(available_features)
        self.minimum_features = minimum_features
        super().__init__(
            "Anomaly detection requires at least "
            f"{minimum_features} valid numeric features; found "
            f"{len(self.available_features)} "
            f"({', '.join(self.available_features) or 'none'})."
        )


@dataclass(frozen=True)
class FeatureSelectionResult:
    selected_features: list[str]
    unavailable_features: list[str]
    insufficient_features: list[str]
    valid_value_counts: dict[str, int]


def select_numeric_features(
    dataframe: pd.DataFrame,
    *,
    candidate_features: Sequence[str] = DEFAULT_CANDIDATE_FEATURES,
    minimum_valid_values: int = 2,
    minimum_features: int = 2,
) -> FeatureSelectionResult:
    """Select candidate columns with enough finite numeric values.

    Values are inspected after safe numeric conversion. Original data is not
    modified by this function. Infinite values are treated as invalid.
    """
    if minimum_valid_values < 1:
        raise ValueError("minimum_valid_values must be at least 1.")
    if minimum_features < 1:
        raise ValueError("minimum_features must be at least 1.")

    selected: list[str] = []
    unavailable: list[str] = []
    insufficient: list[str] = []
    valid_value_counts: dict[str, int] = {}

    for feature in candidate_features:
        if feature not in dataframe.columns:
            unavailable.append(feature)
            continue

        numeric_values = pd.to_numeric(dataframe[feature], errors="coerce")
        finite_values = numeric_values.notna() & np.isfinite(
            numeric_values.to_numpy(dtype=float)
        )
        valid_count = int(finite_values.sum())
        valid_value_counts[feature] = valid_count
        if valid_count >= minimum_valid_values:
            selected.append(feature)
        else:
            insufficient.append(feature)

    if len(selected) < minimum_features:
        raise InsufficientFeaturesError(
            selected,
            minimum_features=minimum_features,
        )

    return FeatureSelectionResult(
        selected_features=selected,
        unavailable_features=unavailable,
        insufficient_features=insufficient,
        valid_value_counts=valid_value_counts,
    )