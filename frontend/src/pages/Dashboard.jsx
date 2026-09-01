import { useEffect, useState } from "react";

import { getDashboardAnalytics } from "../lib/api";

const amountFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

function formatAmount(amount) {
  return `₹${amountFormatter.format(Number(amount || 0))}`;
}

function formatDate(value) {
  if (!value) {
    return "Not specified";
  }
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function MetricCard({ label, value, detail }) {
  return (
    <article className="analytics-metric-card">
      <p className="panel-kicker">{label}</p>
      <div className="analytics-metric-value">{value}</div>
      <p className="analytics-metric-detail">{detail}</p>
    </article>
  );
}

function DashboardSkeleton() {
  return (
    <section className="page-section" aria-busy="true">
      <div className="page-heading">
        <div>
          <div className="skeleton skeleton-kicker" />
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-description" />
        </div>
      </div>
      <div className="analytics-metrics-grid">
        {Array.from({ length: 7 }, (_, index) => (
          <div className="analytics-metric-card" key={index}>
            <div className="skeleton skeleton-kicker" />
            <div className="skeleton skeleton-value" />
            <div className="skeleton skeleton-line" />
          </div>
        ))}
      </div>
      <div className="dashboard-chart-grid">
        <div className="chart-panel skeleton-panel" />
        <div className="chart-panel skeleton-panel" />
      </div>
    </section>
  );
}

function StatusDistributionChart({ items }) {
  const colors = {
    Planned: "#72879b",
    Ongoing: "#3f739c",
    Completed: "#5b8a6b",
    Delayed: "#b97842",
  };
  const total = items.reduce((sum, item) => sum + item.project_count, 0);
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="status-chart">
      <div className="donut-wrap">
        <svg
          aria-label="Project status distribution"
          className="donut-chart"
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
            items.map((item) => {
              const segment = (item.project_count / total) * circumference;
              const circle = (
                <circle
                  className="donut-segment"
                  cx="60"
                  cy="60"
                  fill="none"
                  key={item.status}
                  r={radius}
                  stroke={colors[item.status]}
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
          <span>projects</span>
        </div>
      </div>
      <div className="chart-legend">
        {items.map((item) => (
          <div className="legend-item" key={item.status}>
            <span
              className="legend-swatch"
              style={{ backgroundColor: colors[item.status] }}
            />
            <span>{item.status}</span>
            <strong>{item.project_count}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function StateProjectChart({ items }) {
  const maxCount = Math.max(...items.map((item) => item.project_count), 1);

  if (items.length === 0) {
    return <div className="chart-empty">No state distribution available.</div>;
  }

  return (
    <div className="horizontal-bars">
      {items.map((item) => (
        <div className="horizontal-bar-row" key={item.state}>
          <div className="horizontal-bar-label">
            <span>{item.state}</span>
            <strong>{item.project_count}</strong>
          </div>
          <div className="horizontal-bar-track">
            <span
              className="horizontal-bar-fill"
              style={{
                width: `${(item.project_count / maxCount) * 100}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function FinancialDistributionChart({ items }) {
  const maxAmount = Math.max(
    ...items.map((item) => Number(item.total_sanctioned_amount)),
    1,
  );

  if (items.length === 0) {
    return <div className="chart-empty">No financial distribution available.</div>;
  }

  return (
    <div className="financial-bars">
      <div className="financial-key">
        <span>
          <i className="financial-dot sanctioned-dot" />
          Sanctioned
        </span>
        <span>
          <i className="financial-dot utilized-dot" />
          Utilized
        </span>
      </div>
      {items.map((item) => {
        const sanctioned = Number(item.total_sanctioned_amount);
        const utilized = Number(item.total_utilized_amount);
        return (
          <div className="financial-state-row" key={item.state}>
            <div className="financial-state-heading">
              <strong>{item.state}</strong>
              <span>{item.fund_utilization_percentage}% utilized</span>
            </div>
            <div className="financial-bar-line">
              <span className="financial-bar-label">S</span>
              <div className="financial-bar-track">
                <span
                  className="financial-bar-fill sanctioned-fill"
                  style={{ width: `${(sanctioned / maxAmount) * 100}%` }}
                />
              </div>
              <span className="financial-bar-value">{formatAmount(sanctioned)}</span>
            </div>
            <div className="financial-bar-line">
              <span className="financial-bar-label">U</span>
              <div className="financial-bar-track">
                <span
                  className="financial-bar-fill utilized-fill"
                  style={{ width: `${(utilized / maxAmount) * 100}%` }}
                />
              </div>
              <span className="financial-bar-value">{formatAmount(utilized)}</span>
            </div>
          </div>
        );
      })}
    </div>
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

export function Dashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    getDashboardAnalytics()
      .then((data) => {
        if (isMounted) {
          setAnalytics(data);
        }
      })
      .catch((requestError) => {
        if (isMounted) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <section className="page-section">
        <div className="page-heading">
          <div>
            <p className="section-kicker">PROGRAMME OVERVIEW</p>
            <h1>Dashboard</h1>
            <p className="page-description">
              Live programme metrics could not be loaded.
            </p>
          </div>
        </div>
        <div className="dashboard-error" role="alert">
          <strong>Analytics unavailable</strong>
          <span>{error}</span>
        </div>
      </section>
    );
  }

  const { project_metrics: projectMetrics, financial_metrics: financialMetrics } =
    analytics;
  const hasProjects = projectMetrics.total_projects > 0;

  return (
    <section className="page-section" aria-labelledby="dashboard-title">
      <div className="page-heading dashboard-heading">
        <div>
          <p className="section-kicker">PROGRAMME OVERVIEW</p>
          <h1 id="dashboard-title">Dashboard</h1>
          <p className="page-description">
            Live monitoring of project records and financial utilization from
            the PostgreSQL project register.
          </p>
        </div>
        <span className="phase-badge">Phase 4</span>
      </div>

      {!hasProjects && (
        <div className="dashboard-empty-notice">
          <strong>No project data available</strong>
          <span>
            Metrics are zero because no projects have been recorded yet. Add
            projects from the Projects module to populate the dashboard.
          </span>
        </div>
      )}

      <div className="analytics-metrics-grid">
        <MetricCard
          detail="All registered projects"
          label="Total Projects"
          value={projectMetrics.total_projects}
        />
        <MetricCard
          detail="Currently in progress"
          label="Ongoing Projects"
          value={projectMetrics.ongoing_projects}
        />
        <MetricCard
          detail="Marked complete"
          label="Completed Projects"
          value={projectMetrics.completed_projects}
        />
        <MetricCard
          detail="Require monitoring"
          label="Delayed Projects"
          value={projectMetrics.delayed_projects}
        />
        <MetricCard
          detail="Recorded sanction value"
          label="Total Sanctioned Amount"
          value={formatAmount(financialMetrics.total_sanctioned_amount)}
        />
        <MetricCard
          detail="Recorded utilization"
          label="Total Utilized Amount"
          value={formatAmount(financialMetrics.total_utilized_amount)}
        />
        <MetricCard
          detail={`${formatAmount(financialMetrics.remaining_amount)} remaining`}
          label="Fund Utilization"
          value={`${financialMetrics.fund_utilization_percentage}%`}
        />
      </div>

      <div className="dashboard-chart-grid">
        <Panel kicker="PROJECT MIX" title="Project status distribution">
          <StatusDistributionChart items={analytics.status_distribution} />
        </Panel>
        <Panel kicker="GEOGRAPHIC DISTRIBUTION" title="Projects by state">
          <StateProjectChart items={analytics.state_project_distribution} />
        </Panel>
        <Panel
          className="dashboard-panel-wide"
          kicker="FINANCIAL OVERVIEW"
          title="Sanctioned versus utilized by state"
        >
          <FinancialDistributionChart
            items={analytics.state_financial_distribution}
          />
        </Panel>
      </div>

      <div className="dashboard-table-grid">
        <Panel kicker="LATEST RECORDS" title="Recent projects">
          {analytics.recent_projects.length === 0 ? (
            <div className="table-empty">No recent projects available.</div>
          ) : (
            <div className="table-wrap">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>State</th>
                    <th>Status</th>
                    <th>Sanctioned</th>
                    <th>Utilized</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recent_projects.map((project) => (
                    <tr key={project.id}>
                      <td>
                        <strong>{project.project_name}</strong>
                      </td>
                      <td>{project.state}</td>
                      <td>
                        <span
                          className={`project-status status-${project.project_status.toLowerCase()}`}
                        >
                          {project.project_status}
                        </span>
                      </td>
                      <td>{formatAmount(project.sanctioned_amount)}</td>
                      <td>{formatAmount(project.utilized_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel kicker="MONITORING QUEUE" title="Delayed projects">
          {analytics.delayed_projects.projects.length === 0 ? (
            <div className="table-empty">No delayed projects recorded.</div>
          ) : (
            <div className="table-wrap">
              <table className="analytics-table delayed-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>State</th>
                    <th>Expected completion</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.delayed_projects.projects.map((project) => (
                    <tr key={project.id}>
                      <td>
                        <strong>{project.project_name}</strong>
                      </td>
                      <td>{project.state}</td>
                      <td>{formatDate(project.expected_completion_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </section>
  );
}