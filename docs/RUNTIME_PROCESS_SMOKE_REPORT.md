# Runtime / Process / Smoke Inspection Report

Date: 2026-08-04  
Active local root: `Logicore_Velocity_P0_Locked_FullStack/phase4_fullstack_patched`

## Executive status

The visible source/API graph is connected in code, and migrations/seed can run against a clean smoke database. The current blocker is the local npm installation tree: `node_modules` and `package-lock.json` contain interrupted-reify/staging damage. Runtime moved past the originally reported missing `object-inspect`, then exposed additional missing hoisted packages from the same damaged tree.

Do not treat the current smoke failure as an API/controller/source wiring failure. It is dependency installation damage until proven otherwise.

## GitHub reference status

Referenced repositories:

- `LogicoreVelocity/Logicore-Velocity---P0-P4`
  - `main`: `de9bf58c61f2a608111db63956caaf53577c0b00`
  - additional branch: `apex/archive-normalization-2026-07-30`
  - default branch root is an archive-style multi-snapshot repository.
  - `Logicore_Velocity_P0_Locked_FullStack/phase4_fullstack_patched` on remote `main` contains README files only; the runnable local folder has more files than the remote default-branch snapshot.
- `LogicoreVelocity/Logicore-Velocity---Legacy`
  - `main`: `9dfcdda87ea77065366f7f6c7e1a2c6a42335875`
  - additional branch: `apex/legacy-normalization-2026-07-30`
  - checkout on Windows fails because the repo contains an invalid Windows path: `implementation plan ` with a trailing space.

## Active source graph

### Backend mount graph

```mermaid
flowchart TD
  main[apps/api/src/main.ts]
  routes[apps/api/src/routes/index.ts]
  main --> routes
  routes --> auth[/auth]
  routes --> dashboard[/dashboard]
  routes --> employees[/employees -> driversRouter]
  routes --> drivers[/drivers -> driversRouter legacy]
  routes --> clients[/clients]
  routes --> assignments[/assignments]
  routes --> finance[/finance]
  routes --> assets[/assets]
  routes --> integrations[/integrations]
  routes --> approvals[/approvals]
  routes --> superadmin[/superadmin]
  routes --> imports[/imports]
  routes --> mobile[/mobile]
  routes --> ai[/ai]
```

### Visible web route graph

```mermaid
flowchart TD
  login["/login"] --> authApi["POST /auth/login"]
  dashboard["/"] --> dashboardApi["GET /dashboard/summary"]
  employees["/employees"] --> employeesApi["GET /employees"]
  employeeProfile["/employees/:employeeId"] --> employeeDetailApi["GET /employees/:id + /timeline"]
  driversLegacy["/drivers, /drivers/:driverId"] --> employees
  clients["/clients"] --> clientsApi["GET/POST/PATCH /clients; GET /clients/projects"]
  integrations["/integrations"] --> integrationsApi["GET /integrations/sheets/status; POST sync/import"]
  vehicles["/vehicles"] --> vehiclesApi["GET/POST /assets/vehicles"]
  assignments["/assignments"] --> assignmentsApi["GET/POST /assignments; POST /assignments/:id/end"]
  approvals["/approvals"] --> approvalsApi["GET /approvals; POST /approvals/:id/decide"]
  finance["/finance"] --> financeApi["GET/POST /finance/transactions; categories/subcategories"]
```

## Auth / RBAC / tenant scope notes

- `apps/api/src/main.ts` applies JWT user attachment before tenant resolution.
- Protected routes use `resolveTenant`.
- Super Admin tenant override is only sent by the web client when `user.role === "SUPER_ADMIN"`.
- Finance transaction void is restricted to `SUPER_ADMIN`.
- Visible read flows generally include `SUPER_ADMIN`, `DELEGATED_SUPER_ADMIN`, `ADMIN`, and appropriate operational roles.
- Mutating flows call audit helpers in the backend modules where source support exists.

## HTML inspection

Files checked:

- `apps/web-admin/index.html`
- `apps/web-admin/dist/index.html`

Result:

- Both HTML entrypoints contain the expected React root: `<div id="root"></div>`.
- Source title bytes are valid UTF-8: `Logicore Velocity — Admin`.
- Shell display may show `â€”`, but byte inspection confirms this is console encoding, not file corruption.

## Python / task / process inspection

Active root:

- No `.py` files found under the active app root.
- No Windows scheduled tasks matched `Logicore`, `Velocity`, `python`, `node`, or `npm`.
- Only Python process observed was pgAdmin's bundled Python:
  - `C:\Program Files\PostgreSQL\16\pgAdmin 4\python\python.exe ... pgAdmin4.py`

Node/process/port status observed:

- No API server was listening on `4000`.
- No Vite server was listening on `5173`.
- Local host port `5432` is occupied by local PostgreSQL, not the smoke Docker database.
- Smoke database uses Docker container `logicore-phase1-db` on `127.0.0.1:55432`.

## Database smoke

Smoke DB:

- Docker container: `logicore-phase1-db`
- URL: `postgres://logicore:password@127.0.0.1:55432/logicore_velocity`

Commands passed:

- `npm run db:migrate`
- `npm run db:seed`

Latest seed output:

- `tenant_id: 2bb4e0db-215d-4d42-be8b-96dde6e532a6`
- seeded users:
  - `superadmin@logicore.local`
  - `admin@logicore.local`
  - `accounts@logicore.local`
  - `user@logicore.local`
  - `driver@logicore.local`
- linked `driver_id: d21a0407-1785-497b-9b46-8bfed499b1ec`

## Dependency installation damage

Original runtime blocker:

```text
Cannot find module 'object-inspect'
Require stack:
node_modules/side-channel-list/index.js
apps/api/node_modules/side-channel/index.js
apps/api/node_modules/qs/lib/stringify.js
apps/api/node_modules/express/...
```

Targeted repairs performed:

- restored root `object-inspect@1.13.4`
- restored root `es-errors@1.3.0`
- restored root `get-intrinsic@1.3.0`
- restored root `append-field@1.0.0`

Each repair advanced runtime resolution, which confirms the original failure was local dependency-tree damage, not Express/app code.

Subsequent runtime blockers found:

```text
Cannot find module 'es-errors/type'
Cannot find module 'get-intrinsic'
Cannot find package node_modules/append-field/index.js
Cannot find module 'readable-stream'
```

Current lock/tree evidence:

- `package-lock.json` contains 41 empty package records.
- Empty package records include:
  - `node_modules/readable-stream`
  - `node_modules/bl/node_modules/readable-stream`
  - `node_modules/side-channel`
  - `node_modules/@babel/core`
  - `node_modules/@types/node`
  - `node_modules/chalk`
  - `node_modules/cross-spawn`
  - `node_modules/fast-glob`
  - `node_modules/minipass`
  - `node_modules/terser`
- `node_modules` contains hundreds of hidden npm staging dirs, e.g. `.typescript-*`, `.rollup-*`, `.vite-*`.
- A lock-bypassed attempt to install `readable-stream@2.3.8` hung and had to be stopped.
- Normal `npm install readable-stream@2.3.8` failed with:

```text
npm error Invalid Version:
```

This points at corrupted npm/arborist metadata in the local tree/lock.

## Current smoke status

Source/runtime validation before the dependency tree degraded further:

- API build passed.
- Web build passed.
- DB migrate passed.
- DB seed passed.
- API runtime advanced beyond `object-inspect`, then failed on additional missing packages.

Current local install state after interrupted npm repair attempts:

- API build is blocked by missing/damaged installed package payloads.
- Web build is blocked by missing/damaged installed package payloads.
- API runtime is still blocked by dependency-tree damage, currently in the Multer/import branch at `concat-stream -> readable-stream`.

Because the lockfile has empty package records and npm itself now errors/hangs during targeted installs, the safe next recovery is a clean dependency reinstall, not continued targeted package extraction.

## Recommended recovery path

Requires explicit approval because it removes generated dependency folders:

1. Stop local Node/npm processes for this app.
2. Move existing dependency folders and lockfile to a timestamped backup, rather than deleting:
   - `node_modules`
   - `apps/api/node_modules`
   - `apps/web-admin/node_modules`
   - `apps/mobile-driver/node_modules`
   - `package-lock.json`
3. Run a fresh install from manifests:
   - preferred with current npm: `npm install --workspaces --include-workspace-root`
   - if npm 11 + Node 24 continues to expose tooling issues, use an LTS Node/npm pair for this repo.
4. Re-run:
   - `npm --workspace apps/api run build`
   - `npm --workspace apps/web-admin run build`
   - `npm run db:migrate`
   - `npm run db:seed`
   - API `/health`
   - login + visible route API smoke

## Browser validation limitation

Browser plugin is not available in this environment, and Playwright is not installed in the active root. Only HTTP/build/runtime smoke was attempted. Full UI screenshot/console validation should be run after dependency reinstall restores a stable Vite server.
