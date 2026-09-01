# Replit setup

This project runs as a combined FastAPI and React/Vite application through the
existing `start.sh` launcher.

## Run on Replit

Use the `Start application` workflow:

```bash
FRONTEND_PORT=5000 bash start.sh
```

The workflow serves the Vite frontend on port `5000` for the Replit preview and
the FastAPI backend on port `8000`. Frontend requests under `/api` are proxied
to the backend by the existing Vite configuration.

The launcher uses Replit's `DATABASE_URL` when available. If no PostgreSQL URL
is configured, it starts the local PostgreSQL fallback defined in `start.sh`.

## Useful checks

```bash
curl http://127.0.0.1:5000/
curl http://127.0.0.1:5000/api/health
curl http://127.0.0.1:8000/docs
```

Build the frontend with:

```bash
cd frontend && npm run build
```