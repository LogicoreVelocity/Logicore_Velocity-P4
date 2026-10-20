# Logicore Velocity — Phase 4 Full Stack (Scaffold)

This ZIP is a **full-stack, production-oriented scaffold** for Logicore Velocity Phase-4:
- **Backend API** (Node.js + TypeScript + Express)
- **Admin Web Portal** (React + Vite + Tailwind)
- **Driver Mobile App** (Expo React Native)
- **PostgreSQL migrations** for Phase-4 modules
- **Python processing service** for controlled CSV/XLSX validation
- **Import templates** (CSV)
- **OpenAPI spec** starter
- **Schedulers** (Google Sheets sync every 3 hours, Not-reporting automation hook, Support SLA hook)

> This is intentionally built as a safe scaffold: core rules and permissions are enforced, and integrations
> that require credentials (Google Sheets OAuth, Salik/Dubai Police) are stubbed with TODO blocks.

---

## 0) Prerequisites
- Node.js **18+**
- Docker Desktop (or Docker Engine)
- PostgreSQL (optional if you use docker-compose DB)
- Recommended: VS Code

---

## 1) Setup (one-time)

### 1.1 Install dependencies (root workspaces)
From repo root:
```bash
npm install
```

### 1.2 Start Postgres (Docker)
```bash
docker compose -f infra/docker-compose.yml up -d
```

### 1.3 Configure API environment
Copy env file:
```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env` if needed (DB credentials etc).

### 1.4 Run DB migrations
```bash
npm run db:migrate
```

### 1.5 Configure the Python processing service

Use the same long random token in the API environment and processing-service environment:

```text
PYTHON_PROCESSOR_URL=http://127.0.0.1:8000
PYTHON_PROCESSOR_TOKEN=replace_with_a_long_random_service_token
PROCESSING_SERVICE_TOKEN=replace_with_a_long_random_service_token
```

Docker Compose starts PostgreSQL and the Python processor together. For a direct local Python run, see `services/python-processing/README.md`.

### 1.6 Seed demo tenant + users
```bash
npm run db:seed
```

It prints:
- tenant_id
- Super Admin credentials
- Demo Admin/User credentials
- Demo Driver credentials for mobile app

---

## 2) Run the system

### 2.1 Run API
```bash
npm run dev:api
```
API: http://localhost:4000  
Health: http://localhost:4000/health  
OpenAPI YAML: `openapi/logicore-velocity.yaml`

### 2.2 Run Admin Web Portal
```bash
npm run dev:web
```
Web: http://localhost:5173

### 2.3 Run Driver Mobile App (Expo)
```bash
npm run dev:mobile
```
Then open in Expo Go (or iOS/Android simulator).

### 2.4 Run Python processing directly (optional)

```bash
python -m pip install -r services/python-processing/requirements.txt
python -m uvicorn logicore_processing.main:app --app-dir services/python-processing --host 127.0.0.1 --port 8000
```

---

## 3) Key Phase-4 rules already wired

### Super Admin Control Panel (security-first)
- All logic settings live under `/superadmin/*`
- Super Admin can delegate permissions (scaffold supports role checks)

### Finance governance (locked)
- Any authorized user can **create** payables/receivables
- Edit requires **approval request**
- Delete is **Super Admin only** (implemented as VOID; hard delete is not offered)

### Google Sheets
- Configuration only in Super Admin control panel
- Scheduler triggers sync job **every 3 hours** (stub; add OAuth & fetch)

### Search/filter/sort everywhere
- The API list endpoints follow a shared pattern:
  - `search=`
  - `filters[field]=value`
  - `sort=field:asc`
  - `limit/offset`

### Mobile Support SLA hooks
- Support ticket routes exist
- SLA job hook exists (forced solved/not solved after 1 hour) — TODO in scheduler logic

---

## 4) Where to implement remaining “full” logic next

- **Onboarding import (preview → commit)**: completed through `apps/api/src/modules/imports/*` and `services/python-processing/*`
- **Google Sheets OAuth fetch**: `apps/api/src/integrations/googleSheets/*`
- **Not reporting automation**: `apps/api/src/schedulers/not-reporting.job.ts`
- **Support SLA enforcement**: `apps/api/src/schedulers/support-sla.job.ts`
- **PDF export jobs**: `apps/api/src/modules/reports/*`

---

## 5) Notes about screenshot protection (mobile)
- Android: we use `expo-screen-capture` to prevent screenshots where possible.
- iOS: we can detect screen recording and blur on app switch, but **no solution can prevent a second phone camera**.

---

## 6) Troubleshooting
- If migrations fail, check `apps/api/.env` DB settings and that Postgres is running.
- If web portal can't reach API, update `apps/web-admin/.env.example` or local `.env`.

---

## 7) Credentials (after seed)
Check the terminal output of `npm run db:seed`.

Enjoy — and if you want, I can extend this scaffold into a full production build with:
- file uploads + import preview
- AI intent router with strict DTO schemas
- report engine (Excel/PDF)
- proper permission delegation UI
