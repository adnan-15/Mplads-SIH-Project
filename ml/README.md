# Machine Learning Module

This directory contains the reusable Phase 5 data preparation boundary.

Current modules:

- `preprocessing/data_preprocessor.py` — column identification, quality
  validation, missing-value handling, type conversion, and exact-duplicate
  removal
- `features/feature_engineering.py` — reusable derived project and financial
  features
- `anomaly_detection/feature_selector.py` — dynamic selection of usable
  numeric features
- `anomaly_detection/isolation_forest.py` — reusable feature preparation,
  StandardScaler processing, Isolation Forest detection, and statistical
  explanations

Phase 6A adds an anomaly-detection backend foundation, but does not add APIs,
database models, frontend UI, or saved trained models. It uses
`IsolationForest.predict()` with `-1` for an anomaly and `1` for a normal row.
The `anomaly_score` is derived from the negative
`IsolationForest.decision_function()` and min-max normalized within the
analyzed dataset, so higher values mean more unusual observations.

An anomalous row is described as requiring manual review. The explanation ranks
features by absolute z-score against the prepared dataset values; it does not
claim fraud or use SHAP.

Phase 6B stores these observations in the application database and assigns
review-oriented levels from the normalized anomaly score:

- `Low`: `0.00 <= score < 0.25`
- `Medium`: `0.25 <= score < 0.50`
- `High`: `0.50 <= score < 0.75`
- `Critical`: `0.75 <= score <= 1.00`

These thresholds describe potential risk requiring manual review. They are not
fraud determinations.