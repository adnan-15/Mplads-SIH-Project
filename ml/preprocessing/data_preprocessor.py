from dataclasses import dataclass
from datetime import date
from typing import Any

import numpy as np
import pandas as pd

from ml.features.feature_engineering import (
    FeatureEngineeringResult,
    generate_features,
)

CANONICAL_ALIASES: dict[str, tuple[str, ...]] = {
    "sanctioned_amount": (
        "sanctioned_amount",
        "sanctioned amount",
        "sanction amount",
        "sanctioned",
    ),
    "estimated_cost": (
        "estimated_cost",
        "estimated cost",
        "estimated expenditure",
    ),
    "actual_expenditure": (
        "actual_expenditure",
        "actual expenditure",
        "actual cost",
        "expenditure",
    ),
    "utilized_amount": (
        "utilized_amount",
        "utilized amount",
        "utilized",
    ),
    "work_progress_percentage": (
        "work_progress_percentage",
        "work progress percentage",
        "progress percentage",
        "work progress",
        "progress",
    ),
    "start_date": (
        "start_date",
        "start date",
        "project start date",
    ),
    "expected_completion_date": (
        "expected_completion_date",
        "expected completion date",
        "completion date",
        "target completion date",
    ),
    "actual_completion_date": (
        "actual_completion_date",
        "actual completion date",
        "completed date",
    ),
    "project_status": (
        "project_status",
        "project status",
        "status",
    ),
}

NUMERIC_FIELDS = (
    "sanctioned_amount",
    "estimated_cost",
    "actual_expenditure",
    "utilized_amount",
    "work_progress_percentage",
)
DATE_FIELDS = (
    "start_date",
    "expected_completion_date",
    "actual_completion_date",
)


@dataclass(frozen=True)
class PreprocessingResult:
    dataframe: pd.DataFrame
    quality_report: dict[str, Any]
    feature_result: FeatureEngineeringResult


def normalize_column_name(column: object) -> str:
    return " ".join(
        str(column).strip().lower().replace("_", " ").replace("-", " ").split()
    )


def identify_columns(columns: list[object]) -> dict[str, str | None]:
    normalized_columns = {
        normalize_column_name(column): str(column) for column in columns
    }
    identified: dict[str, str | None] = {}
    for canonical, aliases in CANONICAL_ALIASES.items():
        identified[canonical] = next(
            (
                normalized_columns[normalize_column_name(alias)]
                for alias in aliases
                if normalize_column_name(alias) in normalized_columns
            ),
            None,
        )
    return identified


def _missing_mask(series: pd.Series) -> pd.Series:
    text_values = series.astype("string").str.strip()
    return series.isna() | text_values.eq("") | text_values.eq("nan")


def _convert_numeric(series: pd.Series) -> tuple[pd.Series, int, pd.Series]:
    missing = _missing_mask(series)
    cleaned = (
        series.astype("string")
        .str.replace(",", "", regex=False)
        .str.replace("₹", "", regex=False)
        .str.strip()
    )
    converted = pd.to_numeric(cleaned, errors="coerce")
    invalid = (~missing) & converted.isna()
    return converted, int(invalid.sum()), invalid


def _convert_date(series: pd.Series) -> tuple[pd.Series, int, pd.Series]:
    missing = _missing_mask(series)
    converted = pd.to_datetime(series, errors="coerce")
    invalid = (~missing) & converted.isna()
    return converted, int(invalid.sum()), invalid


def _fill_numeric_missing(
    dataframe: pd.DataFrame,
    column: str,
) -> int:
    missing = dataframe[column].isna()
    count = int(missing.sum())
    if count == 0:
        return 0
    median = dataframe[column].median()
    fill_value = 0.0 if pd.isna(median) else float(median)
    dataframe.loc[missing, column] = fill_value
    return count


def preprocess_dataframe(
    dataframe: pd.DataFrame,
    *,
    current_date: date | None = None,
    remove_duplicates: bool = True,
) -> PreprocessingResult:
    processed = dataframe.copy()
    original_columns = [str(column) for column in processed.columns]
    column_map = identify_columns(list(processed.columns))
    source_columns = {
        source for source in column_map.values() if source is not None
    }

    missing_values = {
        column: int(_missing_mask(processed[column]).sum())
        for column in original_columns
    }
    validation_frame = processed.copy()
    invalid_numeric_values: dict[str, int] = {}
    invalid_date_values: dict[str, int] = {}
    invalid_row_indices: set[int] = set()
    for canonical in NUMERIC_FIELDS:
        source = column_map.get(canonical)
        if source is None:
            continue
        _, invalid_count, invalid_mask = _convert_numeric(
            validation_frame[source]
        )
        invalid_numeric_values[source] = invalid_count
        invalid_row_indices.update(
            int(index) for index in validation_frame.index[invalid_mask]
        )
    for canonical in DATE_FIELDS:
        source = column_map.get(canonical)
        if source is None:
            continue
        _, invalid_count, invalid_mask = _convert_date(validation_frame[source])
        invalid_date_values[source] = invalid_count
        invalid_row_indices.update(
            int(index) for index in validation_frame.index[invalid_mask]
        )

    duplicate_count = int(processed.duplicated(keep="first").sum())
    duplicates_removed = duplicate_count if remove_duplicates else 0
    if remove_duplicates and duplicate_count:
        processed = processed.drop_duplicates(keep="first").reset_index(drop=True)

    numeric_imputations: dict[str, int] = {}
    categorical_imputations: dict[str, int] = {}

    for canonical in NUMERIC_FIELDS:
        source = column_map.get(canonical)
        if source is None:
            continue
        converted, invalid_count, invalid_mask = _convert_numeric(
            processed[source]
        )
        processed[source] = converted
        imputed_count = _fill_numeric_missing(processed, source)
        if imputed_count:
            numeric_imputations[source] = imputed_count

    for canonical in DATE_FIELDS:
        source = column_map.get(canonical)
        if source is None:
            continue
        converted, invalid_count, invalid_mask = _convert_date(processed[source])
        processed[source] = converted

    handled_columns = source_columns
    for column in original_columns:
        if column in handled_columns:
            continue
        missing = _missing_mask(processed[column])
        if not missing.any():
            continue
        processed[column] = processed[column].astype("object")
        processed.loc[missing, column] = "Unknown"
        categorical_imputations[column] = int(missing.sum())

    feature_result = generate_features(
        processed,
        column_map,
        current_date=current_date,
    )
    missing_after = {
        column: int(_missing_mask(processed[column]).sum())
        for column in [str(item) for item in processed.columns]
    }
    columns_unavailable = [
        canonical
        for canonical, source in column_map.items()
        if source is None
    ]
    quality_report = {
        "total_rows": int(len(dataframe)),
        "total_columns": int(len(original_columns)),
        "columns": original_columns,
        "required_columns": column_map,
        "columns_used": sorted(source_columns),
        "columns_unavailable": columns_unavailable,
        "missing_values_by_column": missing_values,
        "missing_values_after_preprocessing_by_column": missing_after,
        "duplicate_rows": duplicate_count,
        "duplicates_removed": duplicates_removed,
        "invalid_numeric_values": invalid_numeric_values,
        "invalid_date_values": invalid_date_values,
        "invalid_row_count": len(invalid_row_indices),
        "invalid_row_indices": sorted(invalid_row_indices),
        "numeric_imputations": numeric_imputations,
        "categorical_imputations": categorical_imputations,
        "successfully_generated_features": feature_result.generated_feature_names,
    }
    return PreprocessingResult(
        dataframe=feature_result.dataframe,
        quality_report=quality_report,
        feature_result=feature_result,
    )