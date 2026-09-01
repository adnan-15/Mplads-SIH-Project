import { useEffect, useRef, useState } from "react";

import {
  deleteDataset,
  getDatasetFeatures,
  getDatasetPreview,
  getDatasetQualityReport,
  getDatasets,
  preprocessDataset,
  uploadDataset,
} from "../lib/api";

const fileSizeFormatter = new Intl.NumberFormat("en-IN");

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function DatasetUpload({ onUploaded }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  function selectFile(event) {
    const nextFile = event.target.files?.[0] || null;
    setError("");
    if (nextFile && !nextFile.name.toLowerCase().endsWith(".csv")) {
      setFile(null);
      setError("Only CSV files can be uploaded.");
      return;
    }
    setFile(nextFile);
  }

  async function handleUpload(event) {
    event.preventDefault();
    if (!file) {
      setError("Choose a CSV file before uploading.");
      return;
    }

    setError("");
    setIsUploading(true);
    try {
      await onUploaded(file);
      setFile(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form className="dataset-upload-panel" onSubmit={handleUpload}>
      <div className="panel-header">
        <div>
          <p className="panel-kicker">DATA INGESTION</p>
          <h2>Upload dataset</h2>
        </div>
        <span className="panel-meta">CSV files only</span>
      </div>
      <div className="upload-controls">
        <label className="file-picker">
          <span>Choose CSV file</span>
          <input
            accept=".csv,text/csv"
            onChange={selectFile}
            ref={inputRef}
            type="file"
          />
        </label>
        <span className="selected-file">
          {file ? file.name : "No file selected"}
        </span>
        <button
          className="primary-button"
          disabled={isUploading || !file}
          type="submit"
        >
          {isUploading ? "Uploading…" : "Upload"}
        </button>
      </div>
      {error && (
        <p className="dataset-inline-error" role="alert">
          {error}
        </p>
      )}
      <p className="upload-note">
        Original uploads are kept unchanged. Use the preprocessing controls
        below to create a separate processed dataset and quality report.
      </p>
    </form>
  );
}

function DatasetList({
  datasets,
  isLoading,
  onDelete,
  onPreprocess,
  onSelect,
  onViewFeatures,
  onViewReport,
  processingIds,
  selectedId,
}) {
  return (
    <div className="dataset-list-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">DATASET REGISTER</p>
          <h2>Datasets</h2>
        </div>
        <span className="panel-meta">
          {isLoading ? "Loading…" : `${datasets.length} records`}
        </span>
      </div>

      {isLoading && <div className="list-state">Loading datasets…</div>}
      {!isLoading && datasets.length === 0 && (
        <div className="list-state">
          <strong>No datasets uploaded</strong>
          <span>Upload a CSV file to begin the dataset register.</span>
        </div>
      )}
      {!isLoading && datasets.length > 0 && (
        <div className="table-wrap">
          <table className="datasets-table datasets-table-wide">
            <thead>
              <tr>
                <th>Dataset</th>
                <th>Type</th>
                <th>File size</th>
                <th>Rows</th>
                <th>Columns</th>
                <th>Status</th>
                <th>Uploaded</th>
                <th>Processing actions</th>
                <th aria-label="Delete" />
              </tr>
            </thead>
            <tbody>
              {datasets.map((dataset) => {
                const isProcessing = processingIds.has(dataset.id);
                return (
                  <tr
                    className={selectedId === dataset.id ? "selected-row" : ""}
                    key={dataset.id}
                    onClick={() => onSelect(dataset)}
                  >
                    <td>
                      <strong>{dataset.dataset_name}</strong>
                      <span>{dataset.original_filename}</span>
                    </td>
                    <td>{dataset.file_type}</td>
                    <td>{formatFileSize(dataset.file_size)}</td>
                    <td>{fileSizeFormatter.format(dataset.total_rows)}</td>
                    <td>{dataset.total_columns}</td>
                    <td>
                      <span
                        className={`dataset-status status-${dataset.upload_status.toLowerCase()}`}
                      >
                        {dataset.upload_status}
                      </span>
                    </td>
                    <td>{formatDate(dataset.uploaded_at)}</td>
                    <td>
                      <div className="dataset-actions">
                        <button
                          className="secondary-button compact-button"
                          disabled={isProcessing}
                          onClick={(event) => {
                            event.stopPropagation();
                            onPreprocess(dataset);
                          }}
                          type="button"
                        >
                          {isProcessing ? "Processing…" : "Preprocess"}
                        </button>
                        <button
                          className="text-button compact-text-button"
                          disabled={isProcessing}
                          onClick={(event) => {
                            event.stopPropagation();
                            onViewReport(dataset);
                          }}
                          type="button"
                        >
                          Quality report
                        </button>
                        <button
                          className="text-button compact-text-button"
                          disabled={isProcessing}
                          onClick={(event) => {
                            event.stopPropagation();
                            onViewFeatures(dataset);
                          }}
                          type="button"
                        >
                          Features
                        </button>
                      </div>
                    </td>
                    <td>
                      <button
                        className="delete-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(dataset);
                        }}
                        type="button"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DatasetPreview({ dataset, preview, isLoading, error }) {
  if (!dataset) {
    return (
      <div className="dataset-preview-panel preview-empty">
        <p className="panel-kicker">DATASET PREVIEW</p>
        <h2>Select a dataset</h2>
        <p>Select a dataset from the register to inspect its columns and first rows.</p>
      </div>
    );
  }

  return (
    <div className="dataset-preview-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">DATASET PREVIEW</p>
          <h2>{dataset.dataset_name}</h2>
        </div>
        <span className="panel-meta">{dataset.original_filename}</span>
      </div>
      {isLoading && <div className="list-state">Loading preview…</div>}
      {error && (
        <div className="list-error" role="alert">
          {error}
        </div>
      )}
      {!isLoading && !error && preview && (
        <>
          <div className="preview-metadata">
            <span>
              <strong>{preview.columns.length}</strong> columns
            </span>
            <span>
              <strong>{preview.rows.length}</strong> preview rows
            </span>
          </div>
          <div className="column-list">
            {preview.columns.map((column) => (
              <span key={column}>{column}</span>
            ))}
          </div>
          <div className="table-wrap">
            <table className="preview-table">
              <thead>
                <tr>
                  {preview.columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {preview.columns.map((column) => (
                      <td key={column}>{row[column]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function ValueMap({ emptyMessage, values }) {
  const entries = Object.entries(values || {}).filter(([, value]) => value > 0);
  if (entries.length === 0) {
    return <span className="report-muted">{emptyMessage}</span>;
  }
  return (
    <div className="report-value-list">
      {entries.map(([key, value]) => (
        <div className="report-value-row" key={key}>
          <span>{key}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function DatasetProcessingPanel({
  dataset,
  error,
  features,
  isProcessing,
  qualityReport,
  successMessage,
}) {
  if (!dataset) {
    return (
      <div className="dataset-processing-panel processing-empty">
        <p className="panel-kicker">PREPROCESSING</p>
        <h2>Select a dataset</h2>
        <p>Run preprocessing to produce a quality report and feature inventory.</p>
      </div>
    );
  }

  const report = qualityReport?.quality_report;
  const featureItems = features?.features || qualityReport?.generated_features || [];

  return (
    <div className="dataset-processing-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">PREPROCESSING OUTPUT</p>
          <h2>{dataset.dataset_name}</h2>
        </div>
        {qualityReport && (
          <span className="dataset-status status-processed">
            {qualityReport.processing_status}
          </span>
        )}
      </div>

      {isProcessing && (
        <div className="processing-state" aria-busy="true">
          <span className="processing-spinner" />
          <span>Validating, converting, and generating features…</span>
        </div>
      )}
      {successMessage && !isProcessing && (
        <div className="processing-success" role="status">
          {successMessage}
        </div>
      )}
      {error && (
        <div className="list-error" role="alert">
          {error}
        </div>
      )}
      {!isProcessing && !report && !features && !error && (
        <div className="list-state">
          <strong>No preprocessing output yet</strong>
          <span>Use Preprocess, Quality report, or Features from the dataset register.</span>
        </div>
      )}

      {report && (
        <div className="quality-report-content">
          <div className="processing-meta">
            <span>
              <strong>{report.total_rows}</strong> total rows
            </span>
            <span>
              <strong>{report.total_columns}</strong> total columns
            </span>
            <span>
              <strong>{report.duplicate_rows}</strong> duplicate rows
            </span>
            <span>
              <strong>{report.invalid_row_count}</strong> invalid rows
            </span>
          </div>
          <p className="processing-timestamp">
            Processed {formatDate(qualityReport.processed_at)}
          </p>
          <div className="report-detail-grid">
            <div className="report-detail">
              <p className="panel-kicker">MISSING VALUES</p>
              <ValueMap
                emptyMessage="No missing values detected."
                values={report.missing_values_by_column}
              />
            </div>
            <div className="report-detail">
              <p className="panel-kicker">INVALID NUMERIC VALUES</p>
              <ValueMap
                emptyMessage="No invalid numeric values detected."
                values={report.invalid_numeric_values}
              />
            </div>
            <div className="report-detail">
              <p className="panel-kicker">INVALID DATE VALUES</p>
              <ValueMap
                emptyMessage="No invalid date values detected."
                values={report.invalid_date_values}
              />
            </div>
            <div className="report-detail">
              <p className="panel-kicker">IMPUTATIONS RECORDED</p>
              <ValueMap
                emptyMessage="No values were imputed."
                values={{
                  ...report.numeric_imputations,
                  ...report.categorical_imputations,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {featureItems.length > 0 && (
        <div className="features-content">
          <div className="features-heading">
            <div>
              <p className="panel-kicker">FEATURE INVENTORY</p>
              <h3>Generated features</h3>
            </div>
            <span className="panel-meta">{featureItems.length} definitions</span>
          </div>
          <div className="features-list">
            {featureItems.map((feature) => (
              <div className="feature-row" key={feature.name}>
                <div>
                  <strong>{feature.name}</strong>
                  <span>{feature.description}</span>
                </div>
                <span
                  className={`feature-availability ${
                    feature.available ? "feature-available" : "feature-unavailable"
                  }`}
                >
                  {feature.available ? "Available" : "Unavailable"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function DatasetManagement() {
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [preview, setPreview] = useState(null);
  const [qualityReport, setQualityReport] = useState(null);
  const [features, setFeatures] = useState(null);
  const [processingIds, setProcessingIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [processingError, setProcessingError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadDatasets() {
    setIsLoading(true);
    setError("");
    try {
      setDatasets(await getDatasets());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDatasets();
  }, []);

  async function loadPreview(dataset) {
    setSelectedDataset(dataset);
    setPreview(null);
    setPreviewError("");
    setQualityReport(null);
    setFeatures(null);
    setProcessingError("");
    setSuccessMessage("");
    setIsPreviewLoading(true);
    try {
      setPreview(await getDatasetPreview(dataset.id));
    } catch (requestError) {
      setPreviewError(requestError.message);
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function handleUploaded(file) {
    const dataset = await uploadDataset(file);
    setDatasets((current) => [dataset, ...current]);
    await loadPreview(dataset);
  }

  async function handlePreprocess(dataset) {
    setSelectedDataset(dataset);
    setProcessingError("");
    setSuccessMessage("");
    setIsProcessing(true);
    setProcessingIds((current) => new Set(current).add(dataset.id));
    try {
      const result = await preprocessDataset(dataset.id);
      setQualityReport(result);
      setFeatures({ features: result.generated_features });
      setSuccessMessage("Dataset preprocessing completed. Original CSV remains unchanged.");
    } catch (requestError) {
      setProcessingError(requestError.message);
    } finally {
      setIsProcessing(false);
      setProcessingIds((current) => {
        const next = new Set(current);
        next.delete(dataset.id);
        return next;
      });
    }
  }

  async function handleViewReport(dataset) {
    setSelectedDataset(dataset);
    setProcessingError("");
    setSuccessMessage("");
    try {
      setQualityReport(await getDatasetQualityReport(dataset.id));
    } catch (requestError) {
      setQualityReport(null);
      setProcessingError(requestError.message);
    }
  }

  async function handleViewFeatures(dataset) {
    setSelectedDataset(dataset);
    setProcessingError("");
    setSuccessMessage("");
    try {
      setFeatures(await getDatasetFeatures(dataset.id));
    } catch (requestError) {
      setFeatures(null);
      setProcessingError(requestError.message);
    }
  }

  async function handleDelete(dataset) {
    if (
      !window.confirm(
        `Delete ${dataset.dataset_name}? This removes its metadata, uploaded file, and processed output.`,
      )
    ) {
      return;
    }
    try {
      await deleteDataset(dataset.id);
      setDatasets((current) =>
        current.filter((item) => item.id !== dataset.id),
      );
      if (selectedDataset?.id === dataset.id) {
        setSelectedDataset(null);
        setPreview(null);
        setQualityReport(null);
        setFeatures(null);
      }
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section className="page-section" aria-labelledby="datasets-title">
      <div className="page-heading">
        <div>
          <p className="section-kicker">DATA GOVERNANCE</p>
          <h1 id="datasets-title">Dataset Management</h1>
          <p className="page-description">
            Register CSV sources, inspect their structure, and prepare
            reproducible data outputs for future analytics workflows.
          </p>
        </div>
        <span className="phase-badge">Phase 5</span>
      </div>

      <DatasetUpload onUploaded={handleUploaded} />

      {error && (
        <div className="list-error" role="alert">
          <strong>Dataset request failed</strong>
          <span>{error}</span>
          <button className="text-button" onClick={loadDatasets} type="button">
            Retry
          </button>
        </div>
      )}

      <DatasetList
        datasets={datasets}
        isLoading={isLoading}
        onDelete={handleDelete}
        onPreprocess={handlePreprocess}
        onSelect={loadPreview}
        onViewFeatures={handleViewFeatures}
        onViewReport={handleViewReport}
        processingIds={processingIds}
        selectedId={selectedDataset?.id}
      />
      <DatasetPreview
        dataset={selectedDataset}
        error={previewError}
        isLoading={isPreviewLoading}
        preview={preview}
      />
      <DatasetProcessingPanel
        dataset={selectedDataset}
        error={processingError}
        features={features}
        isProcessing={isProcessing}
        qualityReport={qualityReport}
        successMessage={successMessage}
      />
    </section>
  );
}