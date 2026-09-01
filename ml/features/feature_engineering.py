from dataclasses import dataclass
from datetime import date
from typing import Any

import numpy as np
import pandas as pd

FEATURE_DESCRIPTIONS: dict[str, str] = {
    "cost_variance": "Actual expenditure minus estimated cost.",
    "cost_variance_percentage": "Cost variance expressed as a percentage of estimated cost.",
    "fund_utilization_percentage": "Utilized amount expressed as a percentage of sanctioned amount.",
    "project_delay_days": "Days between actual or current date and expected completion date.",
    "progress_expenditure_gap": "Fund utilization percentage minus work progress percentage.",
    "estimated_cost_ratio": "Estimated cost divided by sanctioned amount.",
    "project_duration_days": "Days between project start and actual or current completion date.",
}


@dataclass(frozen=True)
class FeatureEngineeringResult:
    dataframe: pd.DataFrame
    generated_feature_names: list[str]
    feature_availability: list[dict[str, Any]]


def _safe_divide(
    numerator: pd.Series,
    denominator: pd.Series,
) -> pd.Series:
    result = pd.Series(np.nan, index=numerator.index, dtype="float64")
    valid = numerator.notna() & denominator.notna()
    if valid.any():
        numerator_values = numerator.loc[valid].to_numpy(dtype=float)
        denominator_values = denominator.loc[valid].to_numpy(dtype=float)
        result.loc[valid] = np.divide(
            numerator_values,
            denominator_values,
            out=np.zeros_like(numerator_values, dtype=float),
            where=denominator_values != 0,
        )
    return result


def _status_is_incomplete(series: pd.Series) -> pd.Series:
    normalized = series.astype("string").str.strip().str.lower()
    return ~normalized.isin({"completed", "complete"})


def generate_features(
    dataframe: pd.DataFrame,
    column_map: dict[str, str | None],
    *,
    current_date: date | None = None,
) -> FeatureEngineeringResult:
    result = dataframe.copy()
    today = pd.Timestamp(current_date or date.today())
    availability: list[dict[str, Any]] = []
    generated: list[str] = []

    def add_feature(
        name: str,
        source_columns: list[str],
        available: bool,
        values: pd.Series | None = None,
    ) -> None:
        availability.append(
            {
                "name": name,
                "description": FEATURE_DESCRIPTIONS[name],
                "available": available,
                "source_columns": source_columns,
            }
        )
        if available and values is not None:
            result[name] = values
            generated.append(name)

    estimated = column_map.get("estimated_cost")
    actual = column_map.get("actual_expenditure")
    sanctioned = column_map.get("sanctioned_amount")
    utilized = column_map.get("utilized_amount")
    progress = column_map.get("work_progress_percentage")
    start = column_map.get("start_date")
    expected = column_map.get("expected_completion_date")
    completed = column_map.get("actual_completion_date")
    status = column_map.get("project_status")

    cost_available = estimated is not None and actual is not None
    cost_sources = [source for source in [actual, estimated] if source is not None]
    cost_variance = (
        result[actual] - result[estimated] if cost_available else None
    )
    add_feature("cost_variance", cost_sources, cost_available, cost_variance)
    add_feature(
        "cost_variance_percentage",
        cost_sources,
        cost_available,
        _safe_divide(cost_variance, result[estimated]) * 100
        if cost_available
        else None,
    )

    fund_available = sanctioned is not None and utilized is not None
    fund_sources = [
        source for source in [utilized, sanctioned] if source is not None
    ]
    fund_percentage = (
        _safe_divide(result[utilized], result[sanctioned]) * 100
        if fund_available
        else None
    )
    add_feature(
        "fund_utilization_percentage",
        fund_sources,
        fund_available,
        fund_percentage,
    )

    delay_available = expected is not None
    delay_sources = [source for source in [expected, completed, status] if source]
    delay_values: pd.Series | None = None
    if delay_available:
        completion_values = (
            result[completed]
            if completed is not None
            else pd.Series(pd.NaT, index=result.index)
        )
        delay_end = completion_values.copy()
        missing_completion = delay_end.isna()
        if status is None:
            incomplete = pd.Series(True, index=result.index)
        else:
            incomplete = _status_is_incomplete(result[status])
        delay_end.loc[missing_completion & incomplete] = today
        delay_values = (delay_end - result[expected]).dt.days
    add_feature(
        "project_delay_days",
        delay_sources,
        delay_available,
        delay_values,
    )

    gap_available = fund_available and progress is not None
    gap_sources = [
        source for source in [utilized, sanctioned, progress] if source is not None
    ]
    add_feature(
        "progress_expenditure_gap",
        gap_sources,
        gap_available,
        fund_percentage - result[progress] if gap_available else None,
    )

    ratio_available = estimated is not None and sanctioned is not None
    ratio_sources = [
        source for source in [estimated, sanctioned] if source is not None
    ]
    add_feature(
        "estimated_cost_ratio",
        ratio_sources,
        ratio_available,
        _safe_divide(result[estimated], result[sanctioned])
        if ratio_available
        else None,
    )

    duration_available = start is not None and (
        completed is not None or status is not None
    )
    duration_sources = [
        source for source in [start, completed, status] if source is not None
    ]
    duration_values: pd.Series | None = None
    if duration_available:
        duration_end = (
            result[completed].copy()
            if completed is not None
            else pd.Series(pd.NaT, index=result.index)
        )
        if status is not None:
            ongoing = _status_is_incomplete(result[status])
            duration_end.loc[duration_end.isna() & ongoing] = today
        duration_values = (duration_end - result[start]).dt.days
    add_feature(
        "project_duration_days",
        duration_sources,
        duration_available,
        duration_values,
    )

    return FeatureEngineeringResult(
        dataframe=result,
        generated_feature_names=generated,
        feature_availability=availability,
    )