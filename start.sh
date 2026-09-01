#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON="${PYTHON:-$ROOT_DIR/.venv/bin/python}"

if [[ ! -x "$PYTHON" ]]; then
  PYTHON="${PYTHON_FALLBACK:-python3}"
fi

export DATABASE_URL="${DATABASE_URL:-${REPLIT_DB_URL:-}}"
local_postgres_data=""
local_postgres_port=""
local_postgres_socket=""

if [[ "$DATABASE_URL" != postgres://* &&
  "$DATABASE_URL" != postgresql://* &&
  "$DATABASE_URL" != postgresql+psycopg://* ]]; then
  local_postgres_data="${PGDATA:-$ROOT_DIR/.postgres-data}"
  local_postgres_port="${PGPORT:-55432}"
  local_postgres_socket="${PGSOCKET:-$ROOT_DIR/.postgres-socket}"
  export DATABASE_URL="postgresql://postgres@127.0.0.1:${local_postgres_port}/mplads_sentinel"

  if [[ ! -f "$local_postgres_data/PG_VERSION" ]]; then
    initdb -D "$local_postgres_data" -U postgres --auth=trust >/dev/null
  fi
  mkdir -p "$local_postgres_socket"
  pg_ctl -D "$local_postgres_data" \
    -o "-p ${local_postgres_port} -h 127.0.0.1 -k ${local_postgres_socket}" \
    -l "$ROOT_DIR/.postgres.log" \
    -w start >/dev/null
  if ! psql "$DATABASE_URL" -Atqc "SELECT 1" >/dev/null 2>&1; then
    createdb -h 127.0.0.1 -p "$local_postgres_port" -U postgres mplads_sentinel
  fi
fi

export BACKEND_HOST="${BACKEND_HOST:-0.0.0.0}"
export BACKEND_PORT="${BACKEND_PORT:-8000}"
export CORS_ORIGINS="${CORS_ORIGINS:-http://localhost:5173,http://127.0.0.1:5173}"
export UPLOADS_DIR="${UPLOADS_DIR:-$ROOT_DIR/uploads}"
export PROCESSED_UPLOADS_DIR="${PROCESSED_UPLOADS_DIR:-$ROOT_DIR/processed_uploads}"

mkdir -p "$UPLOADS_DIR" "$PROCESSED_UPLOADS_DIR"

cleanup() {
  kill "$backend_pid" "$frontend_pid" 2>/dev/null || true
  wait "$backend_pid" "$frontend_pid" 2>/dev/null || true
  if [[ -n "$local_postgres_data" ]]; then
    pg_ctl -D "$local_postgres_data" -m fast -w stop >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

(
  cd "$ROOT_DIR"
  exec "$PYTHON" -m uvicorn backend.app.main:app \
    --host "$BACKEND_HOST" \
    --port "$BACKEND_PORT"
) &
backend_pid=$!

(
  cd "$ROOT_DIR/frontend"
  export VITE_API_BASE_URL="${VITE_API_BASE_URL:-/api}"
  exec npm run dev -- --host 0.0.0.0 --port "${FRONTEND_PORT:-5173}"
) &
frontend_pid=$!

wait -n "$backend_pid" "$frontend_pid"
exit $?