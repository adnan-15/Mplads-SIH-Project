import { useEffect, useState } from "react";

import { getAlertSummary, getAlerts } from "../lib/api";

const RISK_LEVELS = ["Low", "Medium", "High", "Critical"];
const ALERT_PRIORITIES = ["low", "medium", "high", "urgent"];

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
    <span className={`risk-badge risk-${String(level || "low").toLowerCase()}`}>
      {level || "Unassigned"}
    </span>
  );
}

function PriorityBadge({ priority }) {
  return (
    <span className={`alert-priority priority-${String(priority || "low")}`}>
      {priority || "Unassigned"}
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

function AlertTable({
  alerts,
  isLoading,
  onPageChange,
  page,
  pageSize,
  total,
  totalPages,
}) {
  if (isLoading) {
    return (
      <div className="table-loading" aria-busy="true">
        <span className="processing-spinner" />
        Loading risk alerts…
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="table-empty risk-table-empty">
        <strong>No risk alerts match this view</strong>
        <span>
          Alerts appear here after Phase 7 risk assessments have been calculated.
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="table-wrap">
        <table className="analytics-table risk-alert-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Risk score</th>
              <th>Risk level</th>
              <th>Priority</th>
              <th>Contributing factors</th>
              <th>Recommended action</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => (
              <tr
                className={`alert-row alert-row-${String(
                  alert.risk_level || "low",
                ).toLowerCase()}`}
                key={alert.id}
              >
                <td>
                  <strong>{alert.project_name || alert.project_identifier}</strong>
                  {alert.project_name && (
                    <span className="alert-project-identifier">
                      {alert.project_identifier}
                    </span>
                  )}
                </td>
                <td>
                  <strong>{Number(alert.risk_score || 0).toFixed(1)} / 100</strong>
                </td>
                <td>
                  <RiskBadge level={alert.risk_level} />
                </td>
                <td>
                  <PriorityBadge priority={alert.priority} />
                </td>
                <td>
                  <div className="contributor-chips">
                    {(alert.contributing_factors || [])
                      .slice(0, 3)
                      .map((factor) => (
                        <span key={factor.signal}>{factor.label}</span>
                      ))}
                    {(!alert.contributing_factors ||
                      alert.contributing_factors.length === 0) && <span>—</span>}
                  </div>
                </td>
                <td className="alert-recommendation">{alert.recommendation}</td>
                <td>{formatDate(alert.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination-bar">
        <span>
          Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of{" "}
          {total}
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

export function RiskAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [page, setPage] = useState(1);
  const [riskLevel, setRiskLevel] = useState("");
  const [priority, setPriority] = useState("");
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const pageSize = 10;

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setError("");

    Promise.all([
      getAlerts({ page, pageSize, priority, riskLevel }),
      getAlertSummary(),
    ])
      .then(([nextAlerts, nextSummary]) => {
        if (!isCurrent) {
          return;
        }
        setAlerts(nextAlerts.items);
        setTotal(nextAlerts.total);
        setSummary(nextSummary);
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
  }, [page, priority, refreshKey, riskLevel]);

  function handleFilterChange(setFilter) {
    return (event) => {
      setFilter(event.target.value);
      setPage(1);
    };
  }

  const totalPages = total ? Math.max(1, Math.ceil(total / pageSize)) : 0;

  return (
    <section className="page-section" aria-labelledby="risk-alerts-title">
      <div className="page-heading">
        <div>
          <p className="section-kicker">RISK ALERT &amp; RECOMMENDATION CENTER</p>
          <h1 id="risk-alerts-title">Risk Alerts</h1>
          <p className="page-description">
            Prioritized decision-support alerts generated from stored Phase 7
            risk assessments. Alerts guide manual review and do not establish
            fraud.
          </p>
        </div>
        <span className="phase-badge">Phase 8</span>
      </div>

      {error && (
        <div className="list-error risk-page-error" role="alert">
          <strong>Risk alerts unavailable</strong>
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

      <div className="analytics-metrics-grid alert-metrics-grid">
        <MetricCard
          detail="All stored risk assessments"
          label="Total Alerts"
          value={summary?.total_alerts ?? 0}
        />
        <MetricCard
          detail="Urgent manual review"
          label="Critical Alerts"
          value={summary?.critical_alerts ?? 0}
        />
        <MetricCard
          detail="Investigate contributing signals"
          label="High Priority"
          value={summary?.high_alerts ?? 0}
        />
        <MetricCard
          detail="Monitor and review changes"
          label="Medium Alerts"
          value={summary?.medium_alerts ?? 0}
        />
        <MetricCard
          detail="Continue regular monitoring"
          label="Low Alerts"
          value={summary?.low_alerts ?? 0}
        />
      </div>

      <article className="dashboard-panel risk-alerts-panel">
        <div className="dashboard-panel-header">
          <div>
            <p className="panel-kicker">PRIORITIZED ALERT REGISTER</p>
            <h2>Actionable review queue</h2>
          </div>
          <span className="panel-meta">
            {total} {total === 1 ? "alert" : "alerts"}
          </span>
        </div>
        <div className="anomaly-filter-bar alert-filter-bar">
          <label className="form-field compact-filter">
            <span>Risk level</span>
            <select onChange={handleFilterChange(setRiskLevel)} value={riskLevel}>
              <option value="">All risk levels</option>
              {RISK_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field compact-filter">
            <span>Alert priority</span>
            <select onChange={handleFilterChange(setPriority)} value={priority}>
              <option value="">All priorities</option>
              {ALERT_PRIORITIES.map((item) => (
                <option key={item} value={item}>
                  {item[0].toUpperCase() + item.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <span className="alert-source-note">
            Source: stored Phase 7 risk assessments
          </span>
        </div>
        <AlertTable
          alerts={alerts}
          isLoading={isLoading}
          onPageChange={setPage}
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
        />
        <div className="manual-review-note risk-manual-review-note">
          <strong>Alerts are decision-support indicators and require manual review.</strong>
          <span>
            Recommendations are rule-based guidance from the stored risk level
            and contributing signals.
          </span>
        </div>
      </article>
    </section>
  );
}