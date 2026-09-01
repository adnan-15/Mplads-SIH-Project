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

## Environment variables

See `.env.example` and `frontend/.env.example` for the available settings.
`DATABASE_URL` configures the SQLAlchemy PostgreSQL engine, `UPLOADS_DIR`
configures original file storage, and `PROCESSED_UPLOADS_DIR` configures
separate processed-file storage. `SESSION_SECRET` signs JWTs and must be a
random value of at least 32 characters outside development. Tokens expire after
`ACCESS_TOKEN_EXPIRE_MINUTES`.

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