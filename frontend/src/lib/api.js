const API_BASE_URL = (
  import.meta.env?.VITE_API_BASE_URL || "/api"
).replace(/\/$/, "");

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: isFormData
      ? options.headers
      : {
          "Content-Type": "application/json",
          ...options.headers,
        },
    ...options,
  });

  if (!response.ok) {
    let detail = "The request could not be completed.";
    try {
      const body = await response.json();
      detail = body.detail || detail;
    } catch {
      // Keep the generic message when the response is not JSON.
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return null;
  }
  return response.json();
}

export function getProjects() {
  return request("/projects");
}

export function createProject(project) {
  return request("/projects", {
    method: "POST",
    body: JSON.stringify(project),
  });
}

export function getDatasets() {
  return request("/datasets");
}

export function uploadDataset(file) {
  const formData = new FormData();
  formData.append("file", file);
  return request("/datasets/upload", {
    method: "POST",
    body: formData,
  });
}

export function getDatasetPreview(datasetId) {
  return request(`/datasets/${datasetId}/preview`);
}

export function deleteDataset(datasetId) {
  return request(`/datasets/${datasetId}`, {
    method: "DELETE",
  });
}

export function preprocessDataset(datasetId) {
  return request(`/datasets/${datasetId}/preprocess`, {
    method: "POST",
  });
}

export function getDatasetQualityReport(datasetId) {
  return request(`/datasets/${datasetId}/quality-report`);
}

export function getDatasetFeatures(datasetId) {
  return request(`/datasets/${datasetId}/features`);
}

export function getDashboardAnalytics() {
  return request("/analytics/dashboard");
}

export function detectAnomalies(datasetId, contamination = "") {
  const body =
    contamination === "" ? undefined : JSON.stringify({ contamination: Number(contamination) });
  return request(`/datasets/${datasetId}/detect-anomalies`, {
    method: "POST",
    ...(body ? { body } : {}),
  });
}

export function getAnomaly(datasetId, resultId) {
  return request(`/datasets/${datasetId}/anomalies/${resultId}`);
}

export function getAnomalies(
  datasetId,
  { anomalyDetected = "", page = 1, pageSize = 20, riskLevel = "" } = {},
) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (anomalyDetected !== "") {
    params.set("anomaly_detected", anomalyDetected);
  }
  if (riskLevel) {
    params.set("risk_level", riskLevel);
  }
  return request(`/datasets/${datasetId}/anomalies?${params.toString()}`);
}

export function getAnomalySummary(datasetId) {
  return request(`/datasets/${datasetId}/anomaly-summary`);
}

export function calculateRisk(datasetId) {
  return request(`/datasets/${datasetId}/calculate-risk`, {
    method: "POST",
  });
}

export function getRiskAssessments(
  datasetId,
  { page = 1, pageSize = 20, riskLevel = "" } = {},
) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (riskLevel) {
    params.set("risk_level", riskLevel);
  }
  return request(`/datasets/${datasetId}/risk-assessments?${params.toString()}`);
}

export function getRiskSummary(datasetId) {
  return request(`/datasets/${datasetId}/risk-summary`);
}

export function getAlerts({
  page = 1,
  pageSize = 20,
  priority = "",
  riskLevel = "",
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (priority) {
    params.set("priority", priority);
  }
  if (riskLevel) {
    params.set("risk_level", riskLevel);
  }
  return request(`/alerts?${params.toString()}`);
}

export function getAlert(alertId) {
  return request(`/alerts/${alertId}`);
}

export function getAlertSummary() {
  return request("/alerts/summary");
}

function reportQuery({
  alertStatus = "",
  priority = "",
  projectId = "",
  riskLevel = "",
} = {}) {
  const params = new URLSearchParams();
  if (alertStatus) {
    params.set("alert_status", alertStatus);
  }
  if (priority) {
    params.set("priority", priority);
  }
  if (projectId) {
    params.set("project_id", projectId);
  }
  if (riskLevel) {
    params.set("risk_level", riskLevel);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function getReportSummary(filters = {}) {
  return request(`/reports/summary${reportQuery(filters)}`);
}

export function getExecutiveReport(filters = {}) {
  return request(`/reports/executive${reportQuery(filters)}`);
}

export function getReportExport(filters = {}) {
  return request(`/reports/export${reportQuery(filters)}`);
}

export function getInsights({
  category = "",
  page = 1,
  pageSize = 20,
  priority = "",
  projectId = "",
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (category) {
    params.set("category", category);
  }
  if (priority) {
    params.set("priority", priority);
  }
  if (projectId) {
    params.set("project_id", projectId);
  }
  return request(`/insights?${params.toString()}`);
}

export function getInsightSummary() {
  return request("/insights/summary");
}

export function getProjectInsights(projectId) {
  return request(`/projects/${projectId}/insights`);
}