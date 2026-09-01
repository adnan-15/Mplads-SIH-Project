---
name: FastAPI test client compatibility
description: The imported Python environment needs httpx2 for Starlette TestClient-based API tests.
---

Starlette’s TestClient in this project raises an installation error unless the
`httpx2` compatibility package is available. This is a test-environment
requirement; the application itself does not need TestClient or httpx2 at
runtime.

**Why:** The project’s installed FastAPI/Starlette versions use the newer
httpx2 compatibility boundary rather than the conventional httpx package.

**How to apply:** Before running isolated FastAPI endpoint tests, install the
test dependency through the project’s Python package-management flow.