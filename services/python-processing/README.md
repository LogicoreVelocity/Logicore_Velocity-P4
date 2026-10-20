# Logicore Python Processing Service

This bounded service handles file parsing and validation that benefits from Python. It does not receive user JWTs, connect to PostgreSQL, decide permissions, or commit business records.

The Node API remains responsible for authentication, RBAC, tenant resolution, audit, import-job storage, and database writes.

## Supported workflow

- CSV/XLSX driver onboarding preview
- UTF-8 CSV parsing and safe XLSX parsing
- formula-cell rejection
- file, row, and column limits
- normalized dates, emails, visa types, and contact fields
- duplicate-phone detection inside a file

## Run

```powershell
python -m pip install -r requirements.txt
$env:PROCESSING_SERVICE_TOKEN = "replace-with-a-long-random-secret"
python -m uvicorn logicore_processing.main:app --host 127.0.0.1 --port 8000
```

The health endpoint is public at `GET /health`. Processing endpoints require `X-Service-Token`.

## Test core processing

```powershell
python -m unittest discover -s tests -v
```
