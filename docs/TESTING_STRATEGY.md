# Testing Strategy (Production)

## 1) Backend
### 1.1 Unit tests
- Target: pure functions (state machine, validations, calculations)
- Tool: Jest/Vitest

### 1.2 Integration tests
- Spin up Postgres with docker-compose
- Run migrations + seed
- Test API routes with supertest

### 1.3 Contract tests
- Keep `openapi/logicore-velocity.yaml` updated
- Validate request/response shapes in CI

### 1.4 “Auto-correct” failures (safe approach)
You should NOT auto-patch production logic in runtime.
Instead:
- CI runs tests
- If failing, fix the code and re-deploy
- Optionally use a “self-heal” playbook: feature flags to disable broken modules quickly (Super Admin toggles)

## 2) Web Admin (React)
- Unit: components
- Integration: API mocks
- E2E: Playwright (recommended) with seeded DB

## 3) Mobile (Expo)
- Unit: screen logic
- E2E: Detox (later) for Android/iOS

## 4) Recommended CI pipeline (GitHub Actions)
- Install
- Lint
- Test API
- Build API
- Build Web
- (Optional) Expo build checks

## 5) Runtime safety (self-defensive)
- Strict RBAC middleware
- Tenant isolation middleware
- Audit log for all state-changing routes
- Approvals required for edits
- Super Admin only for deletes/voids
