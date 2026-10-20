# Python Service Selection and Completion Report

Date: 2026-08-05

## Decision

Keep `phase4_fullstack_patched` as the canonical Logicore Velocity application.

Do not promote `logicore_velocity_ai_essential` into the production system of record. That project is a useful static, encrypted browser workspace, but its own documentation correctly limits it to local import/export and explicitly excludes multi-user tenant governance, official payroll, identity records, and production audit requirements.

Do not promote the small `logicore_velocity_mvp` Flask folder into the canonical backend. It contains only three models, three routes, placeholder upload behavior, SQLite `create_all`, no templates, no authentication, no tenant isolation, no migrations, no audit, and debug startup. Rebuilding those controls would duplicate the stronger Phase 4 API.

Python is added as a bounded internal processing service for workloads where its ecosystem is useful. The existing Node API remains the only authority for JWT validation, role checks, tenant resolution, PostgreSQL writes, and audit.

## Completed workflow

Driver onboarding import is now connected end to end:

1. An authenticated user downloads the tenant template from the Imports page.
2. The browser uploads CSV/XLSX plus required notes to the Node API.
3. The Node API forwards only the file and declared data type to the internal Python service using a service token.
4. Python validates file size, extension, headers, row count, formulas, names, phone numbers, email addresses, dates, visa types, notes, and within-file duplicate phones.
5. The Node API stores valid normalized rows in a tenant-scoped preview job with a 24-hour expiry and writes an audit event.
6. An authorized role commits the preview.
7. PostgreSQL inserts drivers in one transaction, rejects tenant duplicate phones, allocates employee codes atomically, clears preview PII, finalizes job counts, and writes the commit audit in the same transaction.

## Security boundary

The Python service:

- has no user JWT handling;
- has no PostgreSQL credentials;
- has no tenant-selection authority;
- cannot commit data;
- requires `X-Service-Token` for processing endpoints;
- accepts only CSV/XLSX up to 10 MB and 5,000 data rows;
- rejects formula cells in XLSX files;
- returns normalized rows and structured validation errors only.

The Node API:

- enforces existing RBAC and tenant middleware;
- requires notes for preview and commit;
- stores jobs under the resolved tenant;
- limits Multer to one in-memory 10 MB file;
- expires uncommitted preview payloads after 24 hours;
- permits preview for operational roles but excludes `ACCOUNTS` from commit;
- records preview and commit audit events.

## Key implementation files

- `services/python-processing/logicore_processing/import_processor.py`
- `services/python-processing/logicore_processing/main.py`
- `services/python-processing/tests/test_import_processor.py`
- `apps/api/src/modules/imports/imports.processor.ts`
- `apps/api/src/modules/imports/imports.router.ts`
- `apps/web-admin/src/pages/Imports.tsx`
- `apps/web-admin/src/api/client.ts`
- `db/migrations/0008_python_import_pipeline.sql`

## Validation performed

- Python 3.12 compile check: passed.
- Six Python import-processing unit tests: passed.
- Changed the API manifest from Multer 1.x to the maintained 2.x line after the clean-install attempt reported the 1.x security deprecation.
- Syntax transpilation for all changed TypeScript/TSX files: passed.
- Docker Compose configuration validation: passed.
- PostgreSQL migrations `0001` through `0008` on an isolated PostgreSQL 16 database: passed.
- Migration `0008` replay/idempotency check: passed.
- Atomic employee-code smoke: returned `TEMP-000001` then `TEMP-000002`.
- Temporary PostgreSQL container was stopped and removed after validation.

## Validation limitation

The supplied npm lockfile is damaged, matching the prior runtime report. A clean dependency download in the isolated working copy was not permitted by the environment, so TypeScript/web builds could not be rerun here. The source changes are isolated, but both builds must be rerun after regenerating dependencies from manifests in the target repo.

## Next bounded Python services

After onboarding is accepted, extend the same service contract one workflow at a time:

1. finance payable/receivable preview with master-category validation;
2. performance-sheet normalization;
3. fines/Salik OCR with human confirmation;
4. controlled XLSX/PDF report generation.

Do not give the Python processor direct tenant database access or let an AI model generate unrestricted SQL.
