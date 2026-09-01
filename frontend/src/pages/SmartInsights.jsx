import { useEffect, useState } from "react";

import { getInsightSummary, getInsights } from "../lib/api";

const CATEGORIES = [
  "Risk",
  "Alert",
  "Anomaly",
  "Financial",
  "Delay",
  "Progress",
  "Data Quality",
];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

function PriorityBadge({ priority }) {
  return (
    <span className={`insight-priority insight-priority-${priority.toLowerCase()}`}>
      {priority}
    </span>
  );
}

function InsightCard({ insight }) {
  const [isExplained, setIsExplained] = useState(false);
  const isPriorityInsight = ["High", "Critical"].includes(insight.priority);

  return (
    <article className={`insight-card insight-card-${insight.priority.toLowerCase()}`}>
      <div className="insight-card-header">
        <div className="insight-card-labels">
          <PriorityBadge priority={insight.priority} />
          <span className="insight-category">{insight.category}</span>
        </div>
        {isPriorityInsight && (
          <button
            className="text-button insight-explain-button"
            onClick={() => setIsExplained((current) => !current)}
            type="button"
          >
            {isExplained ? "Hide explanation" : "Explain"}
          </button>
        )}
      </div>
      <div className="insight-card-project">
        {insight.project_name || insight.project_id
          ? insight.project_name || `Project ${insight.project_id}`
          : "Platform monitoring signal"}
      </div>
      <h3>{insight.title}</h3>
      <p className="insight-description">{insight.description}</p>
      <div className="insight-action">
        <span>Recommended action</span>
        <strong>{insight.recommended_action}</strong>
      </div>
      {isExplained && (
        <div className="insight-explanation" aria-live="polite">
          <div>
            <span>Why this was generated</span>
            <p>{insight.description}</p>
          </div>
          <div>
            <span>Contributing factors</span>
            {insight.contributing_factors?.length ? (
              <ul>
                {insight.contributing_factors.map((factor, index) => (
                  <li key={`${factor.signal || factor.feature || "factor"}-${index}`}>
                    <strong>{factor.label || factor.signal || factor.feature}</strong>
                    {factor.value !== undefined && `: ${String(factor.value)}`}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No contributing factors were stored.</p>
            )}
          </div>
          {insight.related_risk_level && (
            <div>
              <span>Related risk level</span>
              <p>{insight.related_risk_level}</p>
            </div>
          )}
          {insight.related_alerts?.length > 0 && (
            <div>
              <span>Related alerts</span>
              <ul>
                {insight.related_alerts.map((signal) => (
                  <li key={`${signal.signal_type}-${signal.signal_id}`}>
                    {signal.description}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {insight.related_anomaly_signals?.length > 0 && (
            <div>
              <span>Related anomaly signals</span>
              <ul>
                {insight.related_anomaly_signals.map((signal) => (
                  <li key={`${signal.signal_type}-${signal.signal_id}`}>
                    {signal.description}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <div className="insight-card-footer">
        <span>Relevance {Number(insight.relevance_score).toFixed(1)} / 100</span>
        <span>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
          new Date(insight.created_at),
        )}</span>
      </div>
    </article>
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

export function SmartInsights() {
  const [insights, setInsights] = useState([]);
  const [summary, setSummary] = useState(null);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [projectId, setProjectId] = useState("");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    setError("");
    Promise.all([
      getInsights({ category, page, pageSize, priority, projectId }),
      getInsightSummary(),
    ])
      .then(([nextInsights, nextSummary]) => {
        if (!isCurrent) {
          return;
        }
        setInsights(nextInsights.items);
        setTotal(nextInsights.total);
        setTotalPages(nextInsights.total_pages);
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
  }, [category, page, priority, projectId, refreshKey]);

  function updateFilter(setFilter) {
    return (event) => {
      setFilter(event.target.value);
      setPage(1);
    };
  }

  return (
    <section className="page-section" aria-labelledby="smart-insights-title">
      <div className="page-heading smart-insights-heading">
        <div>
          <p className="section-kicker">AI DECISION INTELLIGENCE</p>
          <h1 id="smart-insights-title">Smart Insights</h1>
          <p className="page-description">
            Explainable decision-support signals derived from available project
            monitoring data. These insights do not claim fraud or wrongdoing.
          </p>
        </div>
        <span className="phase-badge">Phase 11</span>
      </div>

      {error && (
        <div className="list-error smart-insights-error" role="alert">
          <strong>Smart Insights unavailable</strong>
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

      <div className="analytics-metrics-grid insight-metrics-grid">
        <MetricCard
          detail="Generated from available signals"
          label="Total Insights"
          value={summary?.total_insights ?? 0}
        />
        <MetricCard
          detail="Immediate manual review"
          label="Critical Insights"
          value={summary?.critical_insights ?? 0}
        />
        <MetricCard
          detail="Priority review queue"
          label="High Priority"
          value={summary?.high_priority_insights ?? 0}
        />
        <MetricCard
          detail="Known project records with priority signals"
          label="Projects Requiring Attention"
          value={summary?.projects_requiring_attention ?? 0}
        />
      </div>

      <article className="dashboard-panel smart-insights-panel">
        <div className="dashboard-panel-header">
          <div>
            <p className="panel-kicker">PRIORITY INSIGHTS</p>
            <h2>Review what matters first</h2>
          </div>
          <span className="panel-meta">
            {total} {total === 1 ? "insight" : "insights"}
          </span>
        </div>
        <div className="insight-filter-bar">
          <label className="form-field compact-filter">
            <span>Category</span>
            <select onChange={updateFilter(setCategory)} value={category}>
              <option value="">All categories</option>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="form-field compact-filter">
            <span>Priority</span>
            <select onChange={updateFilter(setPriority)} value={priority}>
              <option value="">All priorities</option>
              {PRIORITIES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="form-field compact-filter">
            <span>Project ID</span>
            <input
              inputMode="numeric"
              min="1"
              onChange={updateFilter(setProjectId)}
              placeholder="All projects"
              type="number"
              value={projectId}
            />
          </label>
        </div>

        {isLoading ? (
          <div className="table-loading insight-loading" aria-busy="true">
            <span className="processing-spinner" />
            Preparing decision insights…
          </div>
        ) : insights.length === 0 ? (
          <div className="table-empty insight-empty">
            <strong>No decision insights are available yet.</strong>
            <span>Add project and monitoring data to generate insights.</span>
          </div>
        ) : (
          <>
            <div className="insight-card-list">
              {insights.map((insight) => (
                <InsightCard insight={insight} key={insight.insight_id} />
              ))}
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
                  onClick={() => setPage(page - 1)}
                  type="button"
                >
                  Previous
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                  className="secondary-button compact-button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
        <div className="manual-review-note insight-safety-note">
          <strong>Decision-support only.</strong>
          <span>
            Every insight is derived from stored application signals and should
            be reviewed by an administrator.
          </span>
        </div>
      </article>
    </section>
  );
}