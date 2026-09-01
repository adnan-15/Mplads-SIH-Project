import { useEffect, useState } from "react";

import { getExecutiveReport, getReportExport } from "../lib/api";

const RISK_LEVELS = ["Low", "Medium", "High", "Critical"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

function formatAmount(amount) {
  return `₹${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(Number(amount || 0))}`;
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

function MetricCard({ detail, label, value }) {
  return (
    <article className="analytics-metric-card">
      <p className="panel-kicker">{label}</p>
      <div className="analytics-metric-value">{value}</div>
      <p className="analytics-metric-detail">{detail}</p>
    </article>
  );
}

function RiskDistribution({ distribution }) {
  return (
    <div className="report-distribution">
      {RISK_LEVELS.map((level) => (
        <div className="report-distribution-row" key={level}>
          <span className={`risk-badge risk-${level.toLowerCase()}`}>{level}</span>
          <strong>{distribution?.[level] ?? 0}</strong>
        </div>
      ))}
    </div>
  );
}

function OverviewPanel({ children, kicker, title }) {
  return (
    <article className="dashboard-panel report-overview-panel">
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

export function Reports() {
  const [report, setReport] = useState(null);
  const [projectId, setProjectId] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [priority, setPriority] = useState("");
  const [alertStatus, setAlertStatus] = useState("active");
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setError("");
    getExecutiveReport({ alertStatus, priority, projectId, riskLevel })
      .then((nextReport) => {
        if (isCurrent) {
          setReport(nextReport);
        }
      })
      .catch((requestError) => {
        if (isCurrent) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [alertStatus, priority, projectId, refreshKey, riskLevel]);

  async function handleExport() {
    setIsExporting(true);
    setError("");
    try {
      const exportData = await getReportExport({
        alertStatus,
        priority,
        projectId,
        riskLevel,
      });
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "mplads-executive-report.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsExporting(false);
    }
  }

  const projectStatistics = report?.project_statistics;
  const alertSummary = report?.alert_summary;
  const anomalySummary = report?.anomaly_summary;
  const riskSummary = report?.risk_summary;

  return (
    <section className="page-section" aria-labelledby="reports-title">
      <div className="page-heading report-heading">
        <div>
          <p className="section-kicker">EXECUTIVE REPORTS &amp; EXPORT CENTER</p>
          <h1 id="reports-title">Reports</h1>
          <p className="page-description">
            Structured summaries generated from available project, dataset,
            anomaly, risk, and alert records.
          </p>
        </div>
        <div className="report-heading-actions">
          <span className="phase-badge">Phase 10</span>
          <button
            className="primary-button"
            disabled={isExporting || isLoading}
            onClick={handleExport}
            type="button"
          >
            {isExporting ? "Preparing…" : "Export JSON"}
          </button>
        </div>
      </div>

      <div className="report-filter-bar" aria-label="Report filters">
        <label className="form-field compact-filter">
          <span>Project ID</span>
          <input
            inputMode="numeric"
            min="1"
            onChange={(event) => setProjectId(event.target.value)}
            placeholder="All projects"
            type="number"
            value={projectId}
          />
        </label>
        <label className="form-field compact-filter">
          <span>Risk level</span>
          <select onChange={(event) => setRiskLevel(event.target.value)} value={riskLevel}>
            <option value="">All risk levels</option>
            {RISK_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field compact-filter">
          <span>Priority</span>
          <select onChange={(event) => setPriority(event.target.value)} value={priority}>
            <option value="">All priorities</option>
            {PRIORITIES.map((item) => (
              <option key={item} value={item}>
                {item[0].toUpperCase() + item.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field compact-filter">
          <span>Alert status</span>
          <select
            onChange={(event) => setAlertStatus(event.target.value)}
            value={alertStatus}
          >
            <option value="active">Active</option>
            <option value="all">All available</option>
          </select>
        </label>
      </div>

      {error && (
        <div className="list-error report-error" role="alert">
          <strong>Report unavailable</strong>
          <span>{error}</span>
          <button
            className="text-button"
            onClick={() => setRefreshKey((current) => current + 1)}
            type="button"
          >
            Retry
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="table-loading report-loading" aria-busy="true">
          <span className="processing-spinner" />
          Preparing executive report…
        </div>
      ) : (
        <>
          <div className="analytics-metrics-grid report-metrics-grid">
            <MetricCard
              detail="Registered programme records"
              label="Total Projects"
              value={report?.executive_overview.total_projects ?? 0}
            />
            <MetricCard
              detail="Available datasets"
              label="Total Datasets"
              value={report?.executive_overview.total_datasets ?? 0}
            />
            <MetricCard
              detail="Detected from stored results"
              label="Total Anomalies"
              value={report?.executive_overview.total_anomalies ?? 0}
            />
            <MetricCard
              detail="Current review queue"
              label="Active Alerts"
              value={report?.executive_overview.active_alerts ?? 0}
            />
            <MetricCard
              detail="Delayed or high-risk records"
              label="Needs Attention"
              value={report?.executive_overview.projects_requiring_attention ?? 0}
            />
          </div>

          <div className="dashboard-chart-grid report-overview-grid">
            <OverviewPanel kicker="PROJECT OVERVIEW" title="Programme statistics">
              <div className="report-stat-list">
                <div><span>Projects</span><strong>{projectStatistics?.total_projects ?? 0}</strong></div>
                <div><span>Sanctioned</span><strong>{formatAmount(projectStatistics?.total_sanctioned_amount)}</strong></div>
                <div><span>Utilized</span><strong>{formatAmount(projectStatistics?.total_utilized_amount)}</strong></div>
                <div><span>Utilization</span><strong>{projectStatistics?.fund_utilization_percentage ?? 0}%</strong></div>
              </div>
              <p className="report-subheading">Status distribution</p>
              <div className="report-inline-list">
                {Object.entries(projectStatistics?.status_distribution || {}).map(
                  ([status, count]) => (
                    <span key={status}>{status}: <strong>{count}</strong></span>
                  ),
                )}
              </div>
            </OverviewPanel>

            <OverviewPanel kicker="RISK OVERVIEW" title="Risk distribution">
              <RiskDistribution distribution={riskSummary?.risk_level_distribution} />
              <div className="report-stat-list report-stat-list-single">
                <div><span>Assessments</span><strong>{riskSummary?.total_assessments ?? 0}</strong></div>
                <div><span>Average risk score</span><strong>{riskSummary?.average_risk_score ?? 0} / 100</strong></div>
              </div>
            </OverviewPanel>

            <OverviewPanel kicker="ALERT OVERVIEW" title="Review queue">
              <div className="report-stat-list">
                <div><span>Total alerts</span><strong>{alertSummary?.total_alerts ?? 0}</strong></div>
                <div><span>High priority</span><strong>{alertSummary?.high_priority_alerts ?? 0}</strong></div>
                <div><span>Active alerts</span><strong>{alertSummary?.active_alerts ?? 0}</strong></div>
              </div>
              <div className="report-inline-list">
                {Object.entries(alertSummary?.priority_distribution || {}).map(
                  ([item, count]) => (
                    <span key={item}>{item}: <strong>{count}</strong></span>
                  ),
                )}
              </div>
            </OverviewPanel>

            <OverviewPanel kicker="ANOMALY OVERVIEW" title="Available anomaly statistics">
              <div className="report-stat-list">
                <div><span>Analyzed results</span><strong>{anomalySummary?.total_results ?? 0}</strong></div>
                <div><span>Anomalies detected</span><strong>{anomalySummary?.total_anomalies ?? 0}</strong></div>
                <div><span>Anomaly percentage</span><strong>{anomalySummary?.anomaly_percentage ?? 0}%</strong></div>
              </div>
              <div className="report-inline-list">
                {Object.entries(anomalySummary?.risk_level_distribution || {}).map(
                  ([level, count]) => (
                    <span key={level}>{level}: <strong>{count}</strong></span>
                  ),
                )}
              </div>
            </OverviewPanel>
          </div>

          <div className="report-content-grid">
            <OverviewPanel kicker="ATTENTION REQUIRED" title="High-priority items">
              {report?.high_priority_items?.length ? (
                <div className="report-item-list">
                  {report.high_priority_items.map((item) => (
                    <div className="report-item" key={item.id}>
                      <div className="report-item-heading">
                        <strong>{item.project_name || item.project_identifier}</strong>
                        <span className={`alert-priority priority-${item.priority}`}>
                          {item.priority}
                        </span>
                      </div>
                      <span>
                        {item.risk_level} risk · score {Number(item.risk_score).toFixed(1)}
                      </span>
                      <small>{item.recommendation}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="table-empty">
                  No high-priority items are available for this report.
                </div>
              )}
            </OverviewPanel>

            <OverviewPanel kicker="RECOMMENDATIONS" title="Existing review guidance">
              {report?.recommendations?.length ? (
                <div className="report-item-list">
                  {report.recommendations.map((item) => (
                    <div className="report-item" key={item.alert_id}>
                      <div className="report-item-heading">
                        <strong>{item.project_identifier}</strong>
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                      <span>{item.risk_level} risk · {item.priority} priority</span>
                      <small>{item.recommendation}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="table-empty">
                  No recommendations are available because no alert records exist.
                </div>
              )}
            </OverviewPanel>
          </div>
        </>
      )}

      <p className="report-integrity-note">
        This report reflects available stored application data. It does not make
        fraud, corruption, or financial-wrongdoing claims.
      </p>
    </section>
  );
}