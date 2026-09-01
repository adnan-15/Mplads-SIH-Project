import { useEffect, useMemo, useState } from "react";

import {
  calculateRisk,
  detectAnomalies,
  getAnomaly,
  getAnomalies,
  getAnomalySummary,
  getDatasetQualityReport,
  getDatasets,
  getRiskAssessments,
  getRiskSummary,
} from "../lib/api";

const RISK_LEVELS = ["Low", "Medium", "High", "Critical"];

const RISK_COLORS = {
  Low: "#6b9476",
  Medium: "#5f86a7",
  High: "#b97842",
  Critical: "#a9584d",
};

const percentageFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

function formatPercentage(value) {
  return `${percentageFormatter.format(Number(value || 0))}%`;
}

function formatScore(value) {
  return Number(value || 0).toFixed(3);
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function RiskBadge({ level }) {
  return (
    <span
      className={`risk-badge risk-${String(level || "low").toLowerCase()}`}
    >
      {level || "Unassigned"}
    </span>
  );
}

function MetricCard({ detail, label, value }) {
  return (
    <article className="analytics-metric-card">
      <p className="panel-kicker">{label}</p>
      <div className="analytics-metric-value">{value}</div>
      <p className="analytics-metric-detail">{detail}</p>
    </article>
  );
}

function Panel({ children, className = "", kicker, title }) {
  return (
    <article className={`dashboard-panel ${className}`}>
      <div className="dashboard-panel-header">
        <div>
          <p className="panel-kicker">{kicker}</p>
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </article>
  );
}

function RiskDistributionChart({ distribution, label = "Risk level distribution" }) {
  const counts = RISK_LEVELS.map((level) => ({
    count: Number(distribution?.[level] || 0),
    level,
  }));
  const total = counts.reduce((sum, item) => sum + item.count, 0);
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="risk-distribution">
      <div className="risk-donut-wrap">
        <svg
          aria-label={label}
          className="risk-donut-chart"
          role="img"
          viewBox="0 0 120 120"
        >
          <circle
            className="donut-track"
            cx="60"
            cy="60"
            fill="none"
            r={radius}
            strokeWidth="14"
          />
          {total > 0 &&
            counts.map((item) => {
              const segment = (item.count / total) * circumference;
              const circle = (
                <circle
                  className="donut-segment"
                  cx="60"
                  cy="60"
                  fill="none"
                  key={item.level}
                  r={radius}
                  stroke={RISK_COLORS[item.level]}
                  strokeDasharray={`${segment} ${circumference - segment}`}
                  strokeDashoffset={-offset}
                  strokeWidth="14"
                />
              );
              offset += segment;
              return circle;
            })}
        </svg>
        <div className="donut-center">
          <strong>{total}</strong>
          <span>records</span>
        </div>
      </div>
      <div className="chart-legend risk-legend">
        {counts.map((item) => (
          <div className="legend-item" key={item.level}>
            <span
              className="legend-swatch"
              style={{ backgroundColor: RISK_COLORS[item.level] }}
            />
            <span>{item.level}</span>
            <strong>{item.count}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskAssessmentTable({
  isLoading,
  onPageChange,
  page,
  pageSize,
  results,
  total,
  totalPages,
}) {
  if (isLoading) {
    return (
      <div className="table-loading" aria-busy="true">
        <span className="processing-spinner" />
        Loading stored risk assessments…
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="table-empty risk-table-empty">
        <strong>No risk assessments are available</strong>
        <span>
          Calculate risk for this dataset to create interpretable review
          indicators.
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="table-wrap">
        <table className="analytics-table risk-assessment-table">
          <thead>
            <tr>
              <th>Row identifier</th>
              <th>Overall risk score</th>
              <th>Risk level</th>
              <th>Top contributing factors</th>
              <th>Assessment time</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result.id}>
                <td>
                  <strong>{result.row_identifier}</strong>
                </td>
                <td>
                  <strong>{Number(result.overall_risk_score).toFixed(1)} / 100</strong>
                </td>
                <td>
                  <RiskBadge level={result.risk_level} />
                </td>
                <td>
                  <div className="contributor-chips">
                    {(result.contributing_factors || [])
                      .slice(0, 3)
                      .map((factor) => (
                        <span key={factor.signal}>{factor.label}</span>
                      ))}
                    {(!result.contributing_factors ||
                      result.contributing_factors.length === 0) && <span>—</span>}
                  </div>
                </td>
                <td>{formatDate(result.assessed_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination-bar">
        <span>
          Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}{" "}
          of {total}
        </span>
        <div className="pagination-controls">
          <button
            className="secondary-button compact-button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            type="button"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            className="secondary-button compact-button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}

function DatasetSelector({
  datasets,
  isLoading,
  onChange,
  selectedId,
}) {
  return (
    <label className="form-field">
      <span>Processed dataset</span>
      <select
        disabled={isLoading || datasets.length === 0}
        onChange={(event) => onChange(event.target.value)}
        value={selectedId || ""}
      >
        <option value="">
          {isLoading ? "Checking processed datasets…" : "Select a dataset"}
        </option>
        {datasets.map((dataset) => (
          <option key={dataset.id} value={dataset.id}>
            {dataset.dataset_name} · {dataset.original_filename}
          </option>
        ))}
      </select>
    </label>
  );
}

function DetectionControls({
  contamination,
  datasets,
  detectionError,
  isDetecting,
  isLoading,
  onContaminationChange,
  onRun,
  onSelect,
  selectedId,
}) {
  return (
    <section className="risk-controls-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">DETECTION CONTROLS</p>
          <h2>Run a review pass</h2>
        </div>
        <span className="panel-meta">
          {datasets.length} processed {datasets.length === 1 ? "dataset" : "datasets"}
        </span>
      </div>
      <div className="risk-controls-grid">
        <DatasetSelector
          datasets={datasets}
          isLoading={isLoading}
          onChange={onSelect}
          selectedId={selectedId}
        />
        <label className="form-field">
          <span>Contamination setting (optional)</span>
          <input
            aria-describedby="contamination-note"
            inputMode="decimal"
            max="0.5"
            min="0.01"
            onChange={(event) => onContaminationChange(event.target.value)}
            placeholder="Backend default"
            step="0.01"
            type="number"
            value={contamination}
          />
          <small id="contamination-note" className="field-note">
            Leave blank for the backend default, or enter a value from 0.01
            through 0.50 for this run.
          </small>
        </label>
        <div className="risk-control-action">
          <button
            className="primary-button"
            disabled={!selectedId || isDetecting}
            onClick={onRun}
            type="button"
          >
            {isDetecting ? "Analyzing…" : "Run anomaly detection"}
          </button>
        </div>
      </div>
      {isDetecting && (
        <div className="processing-state risk-processing" aria-busy="true">
          <span className="processing-spinner" />
          <span>
            Preparing features, fitting Isolation Forest, and storing review
            results…
          </span>
        </div>
      )}
      {detectionError && (
        <div className="list-error risk-inline-error" role="alert">
          <strong>Anomaly detection could not be completed</strong>
          <span>{detectionError}</span>
        </div>
      )}
    </section>
  );
}

function AnomalyTable({
  isLoading,
  onPageChange,
  onSelect,
  page,
  pageSize,
  results,
  selectedId,
  total,
  totalPages,
}) {
  if (isLoading) {
    return (
      <div className="table-loading" aria-busy="true">
        <span className="processing-spinner" />
        Loading stored anomaly results…
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="table-empty risk-table-empty">
        <strong>No anomaly results match this view</strong>
        <span>
          Run detection for this dataset, or adjust the selected filters.
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="table-wrap">
        <table className="analytics-table anomaly-table">
          <thead>
            <tr>
              <th>Row identifier</th>
              <th>Anomaly score</th>
              <th>Risk level</th>
              <th>Detected</th>
              <th>Top contributing features</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr
                className={selectedId === result.id ? "selected-result-row" : ""}
                key={result.id}
                onClick={() => onSelect(result)}
              >
                <td>
                  <button className="table-row-button" type="button">
                    {result.row_identifier}
                  </button>
                </td>
                <td>
                  <strong>{formatScore(result.anomaly_score)}</strong>
                </td>
                <td>
                  <RiskBadge level={result.risk_level} />
                </td>
                <td>
                  <span
                    className={`detection-flag ${
                      result.anomaly_detected
                        ? "detection-flag-yes"
                        : "detection-flag-no"
                    }`}
                  >
                    {result.anomaly_detected ? "Review" : "Normal"}
                  </span>
                </td>
                <td>
                  <div className="contributor-chips">
                    {(result.contributing_features || [])
                      .slice(0, 3)
                      .map((feature) => (
                        <span key={feature.feature}>{feature.feature}</span>
                      ))}
                    {(!result.contributing_features ||
                      result.contributing_features.length === 0) && <span>—</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination-bar">
        <span>
          Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}{" "}
          of {total}
        </span>
        <div className="pagination-controls">
          <button
            className="secondary-button compact-button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            type="button"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            className="secondary-button compact-button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}

function AnomalyDetail({ error, isLoading, result }) {
  if (isLoading) {
    return (
      <div className="detail-empty" aria-busy="true">
        <span className="processing-spinner" />
        Loading the selected anomaly detail…
      </div>
    );
  }

  if (error) {
    return (
      <div className="detail-empty" role="alert">
        <strong>Detail unavailable</strong>
        <span>{error}</span>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="detail-empty">
        <strong>Select a result to inspect it</strong>
        <span>
          Review the observed feature values and statistical explanation
          before deciding what requires follow-up.
        </span>
      </div>
    );
  }

  return (
    <div className="anomaly-detail-content">
      <div className="detail-result-heading">
        <div>
          <p className="panel-kicker">SELECTED RESULT</p>
          <h3>{result.row_identifier}</h3>
        </div>
        <RiskBadge level={result.risk_level} />
      </div>
      <div className="detail-metadata">
        <span>
          <small>Anomaly score</small>
          <strong>{formatScore(result.anomaly_score)}</strong>
        </span>
        <span>
          <small>Detection status</small>
          <strong>{result.anomaly_detected ? "Potential anomaly" : "Normal"}</strong>
        </span>
        <span>
          <small>Detected at</small>
          <strong>{formatDate(result.detected_at)}</strong>
        </span>
      </div>
      <div className="detail-explanation">
        <p className="panel-kicker">EXPLANATION</p>
        <p>
          {result.explanation ||
            "No anomaly explanation was generated for this record."}
        </p>
      </div>
      <div className="detail-features">
        <div className="features-heading">
          <div>
            <p className="panel-kicker">STATISTICAL CONTRIBUTORS</p>
            <h3>Feature values for review</h3>
          </div>
          <span className="panel-meta">
            {result.contributing_features?.length || 0} contributors
          </span>
        </div>
        {result.contributing_features?.length ? (
          <div className="contributor-detail-list">
            {result.contributing_features.map((feature) => (
              <div className="contributor-detail-row" key={feature.feature}>
                <div>
                  <strong>{feature.feature}</strong>
                  <span>
                    {feature.deviation_direction} dataset mean · z-score{" "}
                    {Number(feature.z_score || 0).toFixed(2)}
                  </span>
                </div>
                <div className="contributor-values">
                  <span>
                    Value <strong>{Number(feature.value).toLocaleString("en-IN")}</strong>
                  </span>
                  <span>
                    Mean <strong>{Number(feature.mean).toLocaleString("en-IN")}</strong>
                  </span>
                  <span>
                    SD{" "}
                    <strong>
                      {Number(feature.standard_deviation).toLocaleString("en-IN")}
                    </strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="detail-empty compact-detail-empty">
            No contributing feature detail was stored for this result.
          </div>
        )}
      </div>
    </div>
  );
}

export function AIRiskAnalysis() {
  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [isDatasetsLoading, setIsDatasetsLoading] = useState(true);
  const [datasetError, setDatasetError] = useState("");
  const [contamination, setContamination] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionError, setDetectionError] = useState("");
  const [detectionSummary, setDetectionSummary] = useState(null);
  const [anomalySummary, setAnomalySummary] = useState(null);
  const [results, setResults] = useState([]);
  const [resultsTotal, setResultsTotal] = useState(0);
  const [selectedResult, setSelectedResult] = useState(null);
  const [isResultsLoading, setIsResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [riskSummary, setRiskSummary] = useState(null);
  const [riskResults, setRiskResults] = useState([]);
  const [riskResultsTotal, setRiskResultsTotal] = useState(0);
  const [riskPage, setRiskPage] = useState(1);
  const [assessmentRiskFilter, setAssessmentRiskFilter] = useState("");
  const [isRiskLoading, setIsRiskLoading] = useState(false);
  const [isCalculatingRisk, setIsCalculatingRisk] = useState(false);
  const [riskError, setRiskError] = useState("");
  const [riskSuccess, setRiskSuccess] = useState("");
  const [page, setPage] = useState(1);
  const [anomalyFilter, setAnomalyFilter] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const selectedDataset = useMemo(
    () => datasets.find((dataset) => String(dataset.id) === selectedDatasetId),
    [datasets, selectedDatasetId],
  );

  const pageSize = 10;
  const riskPageSize = 10;

  async function loadProcessedDatasets() {
    setIsDatasetsLoading(true);
    setDatasetError("");
    try {
      const allDatasets = await getDatasets();
      const readinessChecks = await Promise.allSettled(
        allDatasets.map(async (dataset) => {
          const report = await getDatasetQualityReport(dataset.id);
          return report.processing_status === "Processed" ? dataset : null;
        }),
      );
      const processedDatasets = readinessChecks
        .filter((check) => check.status === "fulfilled" && check.value)
        .map((check) => check.value);
      setDatasets(processedDatasets);
      setSelectedDatasetId((current) => {
        if (current && processedDatasets.some((dataset) => String(dataset.id) === current)) {
          return current;
        }
        return processedDatasets[0] ? String(processedDatasets[0].id) : "";
      });
    } catch (requestError) {
      setDatasetError(requestError.message);
    } finally {
      setIsDatasetsLoading(false);
    }
  }

  async function loadAnomalyData(datasetId) {
    if (!datasetId) {
      setAnomalySummary(null);
      setResults([]);
      setResultsTotal(0);
      return;
    }
    setIsResultsLoading(true);
    setResultsError("");
    try {
      const [nextResults, nextSummary] = await Promise.all([
        getAnomalies(datasetId, {
          anomalyDetected: anomalyFilter,
          page,
          pageSize,
          riskLevel: riskFilter,
        }),
        getAnomalySummary(datasetId),
      ]);
      setResults(nextResults.items);
      setResultsTotal(nextResults.total);
      setAnomalySummary(nextSummary);
      setSelectedResult((current) =>
        nextResults.items.some((result) => result.id === current?.id) ? current : null,
      );
    } catch (requestError) {
      setResultsError(requestError.message);
    } finally {
      setIsResultsLoading(false);
    }
  }

  async function loadRiskData(datasetId) {
    if (!datasetId) {
      setRiskSummary(null);
      setRiskResults([]);
      setRiskResultsTotal(0);
      return;
    }
    setIsRiskLoading(true);
    setRiskError("");
    try {
      const [nextResults, nextSummary] = await Promise.all([
        getRiskAssessments(datasetId, {
          page: riskPage,
          pageSize: riskPageSize,
          riskLevel: assessmentRiskFilter,
        }),
        getRiskSummary(datasetId),
      ]);
      setRiskResults(nextResults.items);
      setRiskResultsTotal(nextResults.total);
      setRiskSummary(nextSummary);
    } catch (requestError) {
      setRiskError(requestError.message);
    } finally {
      setIsRiskLoading(false);
    }
  }

  useEffect(() => {
    loadProcessedDatasets();
  }, []);

  useEffect(() => {
    loadAnomalyData(selectedDatasetId);
  }, [selectedDatasetId, page, riskFilter, anomalyFilter, refreshKey]);

  useEffect(() => {
    loadRiskData(selectedDatasetId);
  }, [selectedDatasetId, riskPage, assessmentRiskFilter, refreshKey]);

  function handleDatasetChange(value) {
    setSelectedDatasetId(value);
    setPage(1);
    setRiskFilter("");
    setAnomalyFilter("");
    setDetectionSummary(null);
    setSelectedResult(null);
    setRiskSummary(null);
    setRiskResults([]);
    setRiskResultsTotal(0);
    setRiskPage(1);
    setAssessmentRiskFilter("");
    setRiskError("");
    setRiskSuccess("");
    setDetectionError("");
    setDetailError("");
  }

  async function handleRunDetection() {
    if (!selectedDatasetId) {
      return;
    }
    setIsDetecting(true);
    setDetectionError("");
    setSelectedResult(null);
    try {
      const summary = await detectAnomalies(selectedDatasetId, contamination);
      setDetectionSummary(summary);
      setPage(1);
      setRiskFilter("");
      setAnomalyFilter("");
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setDetectionError(requestError.message);
    } finally {
      setIsDetecting(false);
    }
  }

  async function handleCalculateRisk() {
    if (!selectedDatasetId) {
      return;
    }
    setIsCalculatingRisk(true);
    setRiskError("");
    setRiskSuccess("");
    try {
      const summary = await calculateRisk(selectedDatasetId);
      setRiskSummary(summary);
      setRiskPage(1);
      setAssessmentRiskFilter("");
      setRiskSuccess(
        `${summary.total_records_assessed} records assessed with available project and anomaly signals.`,
      );
      setRefreshKey((current) => current + 1);
    } catch (requestError) {
      setRiskError(requestError.message);
    } finally {
      setIsCalculatingRisk(false);
    }
  }

  function handlePageChange(nextPage) {
    setPage(nextPage);
    setSelectedResult(null);
  }

  async function handleResultSelect(result) {
    setSelectedResult(result);
    setDetailError("");
    setIsDetailLoading(true);
    try {
      setSelectedResult(await getAnomaly(selectedDatasetId, result.id));
    } catch (requestError) {
      setDetailError(requestError.message);
    } finally {
      setIsDetailLoading(false);
    }
  }

  const displayedSummary =
    detectionSummary?.dataset_id === Number(selectedDatasetId)
      ? detectionSummary
      : null;
  const recordsAnalyzed =
    displayedSummary?.total_records_analyzed ??
    anomalySummary?.total_records_analyzed ??
    0;
  const anomaliesDetected =
    displayedSummary?.total_anomalies_detected ??
    anomalySummary?.total_anomalies ??
    0;
  const anomalyPercentage =
    displayedSummary?.anomaly_percentage ?? anomalySummary?.anomaly_percentage ?? 0;
  const totalPages = resultsTotal
    ? Math.max(1, Math.ceil(resultsTotal / pageSize))
    : 0;
  const riskTotalPages = riskResultsTotal
    ? Math.max(1, Math.ceil(riskResultsTotal / riskPageSize))
    : 0;

  return (
    <section className="page-section" aria-labelledby="risk-analysis-title">
      <div className="page-heading">
        <div>
          <p className="section-kicker">EXPLAINABLE REVIEW WORKFLOW</p>
          <h1 id="risk-analysis-title">AI Risk Analysis</h1>
          <p className="page-description">
            Inspect potential statistical anomalies in processed datasets.
            Results support manual review and do not establish fraud.
          </p>
        </div>
         <span className="phase-badge">Phase 7</span>
      </div>

      {datasetError && (
        <div className="list-error risk-page-error" role="alert">
          <strong>Processed datasets unavailable</strong>
          <span>{datasetError}</span>
          <button className="text-button" onClick={loadProcessedDatasets} type="button">
            Retry
          </button>
        </div>
      )}

      {!isDatasetsLoading && !datasetError && datasets.length === 0 && (
        <div className="empty-panel risk-empty-panel">
          <div className="empty-panel-icon" aria-hidden="true">
            R
          </div>
          <h2>No processed datasets available</h2>
          <p>
            Complete preprocessing in Dataset Management before running
            anomaly detection.
          </p>
        </div>
      )}

      {(isDatasetsLoading || datasets.length > 0) && (
        <>
          <DetectionControls
            contamination={contamination}
            datasets={datasets}
            detectionError={detectionError}
            isDetecting={isDetecting}
            isLoading={isDatasetsLoading}
            onContaminationChange={setContamination}
            onRun={handleRunDetection}
            onSelect={handleDatasetChange}
            selectedId={selectedDatasetId}
          />

          {selectedDataset && (
            <div className="risk-context-strip">
              <span>
                <strong>{selectedDataset.dataset_name}</strong>
                <small>{selectedDataset.original_filename}</small>
              </span>
              <span>
                Preprocessing required · results are stored for manual review
              </span>
            </div>
          )}

          <div className="analytics-metrics-grid risk-metrics-grid">
            <MetricCard
              detail="Processed rows included in the latest run"
              label="Records Analyzed"
              value={recordsAnalyzed}
            />
            <MetricCard
              detail="Rows requiring closer review"
              label="Anomalies Detected"
              value={anomaliesDetected}
            />
            <MetricCard
              detail="Share of analyzed records"
              label="Anomaly Percentage"
              value={formatPercentage(anomalyPercentage)}
            />
            <MetricCard
              detail={
                displayedSummary
                  ? `${displayedSummary.features_used.length} numeric features`
                  : "Available after a detection run"
              }
              label="Features Used"
              value={displayedSummary ? displayedSummary.features_used.length : "—"}
            />
          </div>

          <div className="risk-chart-grid">
            <Panel kicker="RISK DISTRIBUTION" title="Potential review levels">
              <RiskDistributionChart distribution={anomalySummary?.risk_level_distribution} />
            </Panel>
            <Panel kicker="MODEL CONFIGURATION" title="Run context">
              {displayedSummary ? (
                <div className="model-context">
                  <div>
                    <span>Contamination</span>
                    <strong>{displayedSummary.model_configuration.contamination}</strong>
                  </div>
                  <div>
                    <span>Estimators</span>
                    <strong>{displayedSummary.model_configuration.n_estimators}</strong>
                  </div>
                  <div>
                    <span>Random state</span>
                    <strong>{displayedSummary.model_configuration.random_state}</strong>
                  </div>
                  <div>
                    <span>Interpretation</span>
                    <strong>Potential anomaly</strong>
                  </div>
                </div>
              ) : (
                <div className="chart-empty">
                  Run detection to load the backend model configuration.
                </div>
              )}
              <div className="manual-review-note">
                <strong>Manual review required</strong>
                <span>
                  Risk levels prioritize records for inspection; they are not
                  fraud predictions.
                </span>
              </div>
            </Panel>
          </div>

          <Panel kicker="ANOMALY REGISTER" title="Stored anomaly results">
            <div className="anomaly-filter-bar">
              <label className="form-field compact-filter">
                <span>Risk level</span>
                <select
                  onChange={(event) => {
                    setAssessmentRiskFilter(event.target.value);
                    setPage(1);
                    setSelectedResult(null);
                  }}
                  value={assessmentRiskFilter}
                >
                  <option value="">All risk levels</option>
                  {RISK_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field compact-filter">
                <span>Detection status</span>
                <select
                  onChange={(event) => {
                    setAnomalyFilter(event.target.value);
                    setPage(1);
                    setSelectedResult(null);
                  }}
                  value={anomalyFilter}
                >
                  <option value="">All records</option>
                  <option value="true">Potential anomalies</option>
                  <option value="false">Normal records</option>
                </select>
              </label>
              {resultsError && (
                <span className="filter-error" role="alert">
                  {resultsError}
                </span>
              )}
            </div>
            <AnomalyTable
              isLoading={isResultsLoading}
              onPageChange={handlePageChange}
              onSelect={handleResultSelect}
              page={page}
              pageSize={pageSize}
              results={results}
              selectedId={selectedResult?.id}
              total={resultsTotal}
              totalPages={totalPages}
            />
          </Panel>

          <Panel kicker="ANOMALY DETAIL" title="Review record">
            <AnomalyDetail
              error={detailError}
              isLoading={isDetailLoading}
              result={selectedResult}
            />
          </Panel>

          <Panel kicker="RISK ASSESSMENT" title="Interpretable overall risk">
            <div className="risk-assessment-action-bar">
              <div>
                <strong>Convert available signals into a review score</strong>
                <span>
                  Scores combine only the signals present in this processed
                  dataset and are recalculated for the latest data.
                </span>
              </div>
              <button
                className="primary-button"
                disabled={isCalculatingRisk}
                onClick={handleCalculateRisk}
                type="button"
              >
                {isCalculatingRisk ? "Calculating…" : "Calculate risk"}
              </button>
            </div>
            {isCalculatingRisk && (
              <div className="processing-state risk-processing" aria-busy="true">
                <span className="processing-spinner" />
                Calculating weighted risk signals and storing assessments…
              </div>
            )}
            {riskSuccess && (
              <div className="success-state risk-inline-success" role="status">
                {riskSuccess}
              </div>
            )}
            {riskError && (
              <div className="list-error risk-inline-error" role="alert">
                <strong>Risk assessment could not be completed</strong>
                <span>{riskError}</span>
              </div>
            )}

            <div className="analytics-metrics-grid risk-assessment-metrics">
              <MetricCard
                detail="Rows with a calculated score"
                label="Records Assessed"
                value={riskSummary?.total_records_assessed ?? 0}
              />
              <MetricCard
                detail="Average across assessed rows"
                label="Average Risk Score"
                value={Number(riskSummary?.average_risk_score || 0).toFixed(1)}
              />
              <MetricCard
                detail="Scores from 51 through 75"
                label="High Risk"
                value={riskSummary?.high_risk_count ?? 0}
              />
              <MetricCard
                detail="Scores from 76 through 100"
                label="Critical Risk"
                value={riskSummary?.critical_risk_count ?? 0}
              />
            </div>

            <div className="risk-assessment-chart">
              <RiskDistributionChart
                distribution={riskSummary?.risk_level_distribution}
                label="Overall risk level distribution"
              />
              <div className="risk-formula-note">
                <p className="panel-kicker">SCORING CONTEXT</p>
                <h3>Available signals only</h3>
                <p>
                  Default group weights are anomaly 35%, financial
                  irregularity 25%, project delay 20%, and
                  progress-expenditure mismatch 20%. Missing groups are
                  excluded and the remaining weights are rebalanced.
                </p>
                <p>
                  {riskSummary?.available_signals?.length
                    ? `Signals used: ${riskSummary.available_signals.join(", ")}.`
                    : "Calculate risk to load the signals used for this dataset."}
                </p>
              </div>
            </div>

            <div className="risk-assessment-table-header">
              <div>
                <p className="panel-kicker">ASSESSMENT REGISTER</p>
                <h3>Stored risk assessments</h3>
              </div>
              <label className="form-field compact-filter">
                <span>Risk level</span>
                <select
                  onChange={(event) => {
                    setAssessmentRiskFilter(event.target.value);
                    setRiskPage(1);
                  }}
                  value={assessmentRiskFilter}
                >
                  <option value="">All risk levels</option>
                  {RISK_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <RiskAssessmentTable
              isLoading={isRiskLoading}
              onPageChange={setRiskPage}
              page={riskPage}
              pageSize={riskPageSize}
              results={riskResults}
              total={riskResultsTotal}
              totalPages={riskTotalPages}
            />
            <div className="manual-review-note risk-manual-review-note">
              <strong>Risk scores are decision-support indicators and require manual review.</strong>
              <span>
                They prioritize records for inspection and do not establish
                fraud.
              </span>
            </div>
          </Panel>
        </>
      )}
    </section>
  );
}