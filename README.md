# MPLADS Sentinel AI

MPLADS Sentinel AI is a full-stack foundation for a government analytics platform focused on MPLADS project and financial data.

This repository currently contains the incremental MPLADS Sentinel AI platform
through **Phase 13: Authentication and Role-Based Access Control**:

- React frontend with connected Projects and Dataset Management modules
- FastAPI backend with health, Project CRUD, Dataset Management, Analytics, and
  preprocessing APIs
- SQLAlchemy ORM and PostgreSQL session foundation for projects, datasets, and
  preprocessing results
- Pandas/NumPy preprocessing and feature engineering modules
- Real PostgreSQL-backed Analytics Dashboard integration
- Explainable anomaly detection and weighted risk scoring with manual-review
  indicators
- PostgreSQL-backed anomaly and risk assessment APIs
- JWT authentication with secure password hashing and role-based access control
- Protected React routes with persistent sessions and admin user management

Duplicate detection, delay prediction, and automatic fraud declarations are not
implemented. Risk and insight features remain decision-support tools and do not
make fraud or wrongdoing claims.

## Problem statement

MPLADS project information can be spread across project registers, financial
records, and uploaded datasets. Sentinel AI provides one review workspace for
organizing those records, checking data quality, surfacing explainable anomaly
and risk signals, and preparing reports for human follow-up.

## Key features

- Project register with create, read, update, and delete operations
- CSV upload, preview, validation, preprocessing, and feature engineering
- Programme and financial analytics backed by PostgreSQL data
- Explainable Isolation Forest anomaly detection
- Weighted risk scoring with contributing signals and manual-review indicators
- Alerts and recommendations projected from stored risk assessments
- Executive reports and JSON export with project, anomaly, risk, and alert data
- Smart Insights that prioritize review actions from existing application data
- JWT authentication, Argon2 password hashing, protected routes, and role-based
  access control

## Technology stack

- **Frontend:** React 19, React Router, Vite
- **Backend:** Python 3.12, FastAPI, Pydantic, SQLAlchemy
- **Data and ML:** PostgreSQL, Pandas, NumPy, and scikit-learn
- **Authentication:** JWT bearer tokens and Argon2 password hashing
- **Storage:** PostgreSQL metadata plus local original and processed CSV directories

## System architecture

The browser loads the React/Vite single-page application on port 5000. Vite
proxies `/api` requests to the FastAPI service on port 8000. FastAPI validates
requests, applies authentication and role checks, reads and writes PostgreSQL
records through SQLAlchemy, and coordinates CSV processing in the `ml/` package.
Original uploads and generated processed files remain in separate filesystem
directories. Analytics, anomaly results, risk assessments, alerts, reports, and
Smart Insights are derived from those stored records rather than fabricated
statistics.

## Repository structure

```text
.
├── backend/
│   └── app/
│       ├── api/
│       ├── core/
│       ├── db/
│       ├── models/
│       ├── services/
│       ├── schemas/
│       └── main.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   └── pages/
│   └── package.json
├── ml/
│   ├── preprocessing/
│   │   └── data_preprocessor.py
│   ├── features/
│   │   └── feature_engineering.py
│   └── README.md
├── uploads/
│   └── .gitkeep
├── processed_uploads/
│   └── .gitkeep
├── .env.example
├── requirements.txt
└── README.md
```

## Backend setup

### Run on Replit

The existing `Start application` workflow starts both services and uses the
Replit PostgreSQL connection when available:

```bash
FRONTEND_PORT=5000 bash start.sh
```

The preview is served on port 5000, the API is served on port 8000, and the
launcher starts a local PostgreSQL fallback only when no PostgreSQL URL is
available.

### Run locally

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend endpoints:

- `GET /` — API running message
- `GET /health` — health status
- `POST /projects` — create a project
- `GET /projects` — list projects
- `GET /projects/{project_id}` — retrieve one project
- `PUT /projects/{project_id}` — update one project
- `DELETE /projects/{project_id}` — delete one project
- `POST /datasets/upload` — upload and register a CSV dataset
- `GET /datasets` — list datasets
- `GET /datasets/{dataset_id}` — retrieve dataset metadata
- `GET /datasets/{dataset_id}/preview` — preview columns and first rows
- `DELETE /datasets/{dataset_id}` — delete dataset metadata and file
- `GET /analytics/dashboard` — retrieve real project and financial analytics
- `POST /datasets/{dataset_id}/preprocess` — validate, preprocess, and engineer
  features for a dataset
- `GET /datasets/{dataset_id}/quality-report` — retrieve the latest quality
  report
- `GET /datasets/{dataset_id}/features` — retrieve feature availability and
  descriptions
- `POST /datasets/{dataset_id}/detect-anomalies` — store anomaly detection
  results
- `GET /datasets/{dataset_id}/anomalies` — list stored anomaly results
- `GET /datasets/{dataset_id}/anomaly-summary` — summarize anomaly results
- `GET /datasets/{dataset_id}/anomalies/{result_id}` — retrieve one anomaly
  result
- `POST /datasets/{dataset_id}/calculate-risk` — calculate and store weighted
  risk assessments
- `GET /datasets/{dataset_id}/risk-assessments` — list risk assessments with
  pagination and risk-level filtering
- `GET /datasets/{dataset_id}/risk-summary` — summarize stored risk assessments
- `POST /auth/register` — register a user and receive a JWT session
- `POST /auth/login` — authenticate a user and receive a JWT session
- `GET /auth/me` — retrieve the authenticated user
- `GET /users` — list users (Admin only)
- `POST /users` — create a managed user (Admin only)
- `PATCH /users/{user_id}/role` — change a user role (Admin only)
- `GET /docs` — FastAPI-generated API documentation

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The frontend environment uses `VITE_API_BASE_URL` for the backend connection.
The Projects page uses the Project CRUD API, the Dashboard uses the Analytics
API, Dataset Management uses the Dataset and preprocessing APIs, and AI Risk
Analysis uses the anomaly and risk scoring APIs.

## AI and monitoring components

### Anomaly detection

Preprocessing identifies supported columns, reports missing and invalid values,
removes duplicate rows by default, imputes missing values, and writes a
processed copy without changing the original upload. Feature engineering adds
derived financial, progress, and delay signals where the source columns allow
it. The anomaly service selects available numeric features and uses an
Isolation Forest model to produce an anomaly score, anomaly status, risk level,
and contributing feature explanation for each processed row.

### Risk scoring

Risk scoring combines available anomaly, financial-irregularity, project-delay,
and progress/expenditure-mismatch signal groups. Missing groups are omitted and
the remaining weights are rebalanced for that row. Scores are normalized to
0–100 and mapped to Low, Medium, High, or Critical. High and Critical results
include explanations and require manual review; they never declare fraud.

### Alerts and recommendations

The Alerts API projects a review queue from stored risk assessments. Critical
assessments become urgent alerts, High assessments become high-priority alerts,
and lower levels retain corresponding monitoring priorities. Each alert includes
the source row, risk score, contributing factors, and a human-review
recommendation. Alerts are decision-support records, not enforcement decisions.

### Smart Insights

Smart Insights combines project status and utilization signals with stored risk
assessments, anomaly results, dataset-quality signals, and alerts. It returns
prioritized insights with a category, relevance score, contributing factors,
related signals, and a recommended action. The service is deterministic and
only reports signals derived from available application data.

### Predictive monitoring and early warning

The current repository has no separate predictive forecasting or early-warning
model. Its anomaly, risk, alert, and Smart Insights outputs provide
explainable, rule-based monitoring signals for human review. Predictive delay
estimation and a dedicated early-warning model remain future work.

## Major API groups

- **System:** health and API status
- **Authentication and users:** registration, login, current user, and
  administrator-managed roles
- **Projects and datasets:** project CRUD, CSV upload, listing, preview, and
  deletion
- **Analytics:** programme, financial, status, state, recent-project, and delay
  summaries
- **Processing and analysis:** preprocessing, quality reports, feature
  availability, anomaly detection, and risk assessments
- **Monitoring and reporting:** alerts, recommendations, executive reports, JSON
  export, and Smart Insights

## Environment variables

See `.env.example` and `frontend/.env.example` for the available settings.
`DATABASE_URL` configures the SQLAlchemy PostgreSQL engine, `UPLOADS_DIR`
configures original file storage, and `PROCESSED_UPLOADS_DIR` configures
separate processed-file storage. `SESSION_SECRET` signs JWTs and must be a
random value of at least 32 characters outside development. Tokens expire after
`ACCESS_TOKEN_EXPIRE_MINUTES`.

When running on Replit, keep `SESSION_SECRET` in Replit Secrets and do not
commit it. `DATABASE_URL` is supplied by the managed PostgreSQL environment when
available; the launcher has a local fallback for development.

## Development scope

Implementation should remain incremental. Preprocessing records every detected
quality issue and transformation summary without changing the original upload.
Risk results remain explainable decision-support indicators and never
automatically declare fraud.

## Phase 13 authentication and roles

Authentication is implemented with JWT bearer tokens and Argon2 password
hashing. Registration is public, but newly registered accounts receive the
Viewer role after the initial bootstrap account. The first registered account
receives the Admin role so an empty installation can be administered; Admins
can create users and assign roles from the User Management page.

Role permissions are intentionally conservative:

- **Admin:** full access, including user management and destructive actions
- **Government Officer:** manage projects and datasets, run analysis, and
  review all monitoring output
- **Analyst:** upload and process datasets, run anomaly/risk analysis, and
  review monitoring output
- **Viewer:** read-only access to permitted dashboards, projects, alerts,
  reports, and Smart Insights

Health and authentication registration/login endpoints remain public. Existing
application data endpoints require authentication, while write operations
enforce the role policy above.

## Phase 7 risk scoring

Risk scoring uses only signals available in the processed dataset and stored
anomaly results. Individual signals are normalized within the dataset before
combining:

- **Anomaly signal — 35%:** anomaly score and anomaly-detected status
- **Financial irregularity — 25%:** absolute cost variance percentage and
  distance of fund utilization from 100%
- **Project delay — 20%:** positive project delay days and incomplete/ongoing
  project status
- **Progress-expenditure mismatch — 20%:** absolute progress-expenditure gap

Unavailable signal groups are omitted and the remaining group weights are
rebalanced for that row. The resulting weighted score is converted to a
0–100 score. Risk levels are Low for 0–25, Medium for 26–50, High for 51–75,
and Critical for 76–100. High and Critical results include rule-based
explanations from their actual contributing signals and require manual review.

## Known limitations and future improvements

- Duplicate detection, delay prediction, and automatic fraud declarations are
  not implemented.
- Uploaded datasets are not currently linked to project records, so dataset
  alerts identify source rows rather than a project-register ID.
- Predictive forecasting and a dedicated early-warning model are not implemented.
- Future improvements may add project-dataset linkage, richer validation
  feedback, and predictive monitoring after the current decision-support
  workflow is validated.