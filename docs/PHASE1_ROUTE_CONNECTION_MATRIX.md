# Phase 1 - Visible Core Route and Connection Truth

Source of truth: `Logicore_Velocity_P0_Locked_FullStack/phase4_fullstack_patched`.

The adjacent `Logicore_Velocity_Backend_Full_P0A/logicore_velocity_fullstack_merged_STAGE` folder is compiled/partial backend output and is not the editable full-stack source for this phase.

## Visible Core Matrix

| Area | Web route | Page/component | API client functions | Backend mounted routes | Backend chain | Auth/RBAC | Tenant scope | Notes/audit requirement |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Login | `/login` | `src/pages/Login.tsx` | `AuthProvider.login()` | `POST /auth/login` | `auth.router -> users table + JWT` | Public endpoint with auth rate limit | Login body includes `tenant_id`; no tenant middleware before `/auth` | No audit required for login in P0 form/audit rules |
| Dashboard | `/` | `src/pages/Dashboard.tsx` | `getDashboardSummary()` | `GET /dashboard/summary` | `dashboard.router -> controller -> service -> repo -> DB` | `SUPER_ADMIN`, `DELEGATED_SUPER_ADMIN`, `ADMIN`, `ACCOUNTS`, `USER` | `resolveTenant`; only `SUPER_ADMIN` may use `X-Tenant-Id` | Read-only; no notes/audit |
| Employees list | `/employees` | `src/pages/Employees.tsx` | `listEmployees(search)` | `GET /employees` and compatibility `GET /drivers` | `drivers.router -> listDrivers service -> DB` | `SUPER_ADMIN`, `DELEGATED_SUPER_ADMIN`, `ADMIN`, `ACCOUNTS`, `USER` | Tenant-scoped by `drivers.tenant_id` | Read-only; no notes/audit |
| Employee profile | `/employees/:employeeId` | `src/pages/EmployeeProfile.tsx` | `getEmployee()`, `getEmployeeTimeline()` | `GET /employees/:driverId`, `GET /employees/:driverId/timeline`; compatibility `/drivers/:driverId` redirects | `drivers.router -> getDriver/getDriverTimeline service -> DB` | `SUPER_ADMIN`, `DELEGATED_SUPER_ADMIN`, `ADMIN`, `ACCOUNTS`, `USER` | Tenant-scoped by `drivers`, status history, assignments, assets, finance rows | Read-only; no notes/audit |
| Clients | `/clients` | `src/pages/Clients.tsx` | `listClients()`, `createClient()`, `updateClient()` | `GET /clients`, `POST /clients`, `PATCH /clients/:clientId`, `GET /clients/projects` | `clients.router -> controller -> service -> repo -> DB` | Read: `SUPER_ADMIN`, `DELEGATED_SUPER_ADMIN`, `ADMIN`, `ACCOUNTS`, `USER`; write excludes `ACCOUNTS` | Tenant-scoped by `clients/projects/assignments.tenant_id` | Create/update require `notes`; audit actions `CLIENT_CREATE`, `CLIENT_UPDATE` |
| Integrations | `/integrations` | `src/pages/Integrations.tsx` | `listIntegrationsStatus()`, `syncSheets()`, `requestFinesSalikImport()` | `GET /integrations/sheets/status`, `POST /integrations/sheets/sync-now`, `POST /integrations/fines-salik/import` | `integrations.router -> sheets-sync job/import_jobs` and `integrations.router -> audit` | Status: `SUPER_ADMIN`, `DELEGATED_SUPER_ADMIN`, `ADMIN`; sync: `SUPER_ADMIN`, `DELEGATED_SUPER_ADMIN`; fines import also allows `ACCOUNTS` | Tenant-scoped by `sheet_sources/import_jobs.tenant_id` | Sync/import require `notes`; sheets sync records `import_jobs`; fines/salik request audits `FINES_SALIK_IMPORT_REQUESTED` |
| Vehicles | `/vehicles` | `src/pages/Vehicles.tsx` | `listVehicles()`, `createVehicle()` | `GET /assets/vehicles`, `POST /assets/vehicles` | `assets.router -> DB` | `SUPER_ADMIN`, `DELEGATED_SUPER_ADMIN`, `ADMIN`, `USER` | Tenant-scoped by `vehicles.tenant_id` | Create requires `notes`; audit action `VEHICLE_CREATE` |
| Assignments | `/assignments` | `src/pages/Assignments.tsx` | `listAssignments()`, `createAssignment()`, `endAssignment()` | `GET /assignments`, `POST /assignments`, `POST /assignments/:assignmentId/end` | `assignments.router -> controller -> service -> repo -> DB` | Read: `SUPER_ADMIN`, `DELEGATED_SUPER_ADMIN`, `ADMIN`, `ACCOUNTS`, `USER`; write excludes `ACCOUNTS` | Tenant-scoped by `assignments/drivers/projects.tenant_id`; DB unique index enforces one active assignment per employee | Create/end require `notes`; audits `ASSIGNMENT_CREATE`, `ASSIGNMENT_END`; writes driver status history |
| Approvals | `/approvals` | `src/pages/Approvals.tsx` | `listApprovals()`, `decideApproval()` | `GET /approvals`, `POST /approvals/:approvalId/decide` | `approvals.router -> DB`; finance edit approvals apply side effects | Read: `SUPER_ADMIN`, `DELEGATED_SUPER_ADMIN`, `ADMIN`, `ACCOUNTS`; decide excludes `ACCOUNTS` | Tenant-scoped by `approval_requests.tenant_id` and finance edit rows | Decision requires `notes`; audits `APPROVAL_DECIDE`; approved finance edits also audit `APPROVAL_APPLIED_FINANCE_EDIT` |
| Finance | `/finance` | `src/pages/Finance.tsx` | `listFinanceTransactions()`, `listFinanceCategories()`, `listFinanceSubcategories()`, `createFinanceTransaction()` | `GET/POST /finance/transactions`, `POST /finance/transactions/:txId/edit-request`, `POST /finance/transactions/:txId/void`, category/subcategory reads | `finance.router -> finance.service/direct DB` | Transactions/categories: all core roles; edit request: all core roles; void: `SUPER_ADMIN` only | Tenant-scoped by finance category/subcategory/transaction tenant IDs | Create/edit request/void require `notes`; audits `FINANCE_TX_CREATE`, `FINANCE_TX_EDIT_REQUEST`, `FINANCE_TX_VOID` |

## Fixed Broken Visible Chains

- Login now redirects to `/` after successful authentication, and `/login` redirects away when already authenticated.
- Visible Employees routes now exist; old `/drivers` URLs redirect or remain mounted as backend compatibility aliases.
- Dashboard no longer calls the AI draft endpoint for KPIs; it calls `GET /dashboard/summary`.
- Missing backend AI router is present again, so the header draft box no longer breaks API compilation.
- Clients, Assignments, and Dashboard now have explicit router/controller/service/repo chains.
- Clients, Integrations, Vehicles, Assignments, Approvals, and Finance now have visible web pages wired through named API client functions.
- Super Admin tenant override is visible only to `SUPER_ADMIN`, matching backend tenant middleware.
- Finance void route is now `SUPER_ADMIN` only, matching the locked P0 rule.
- API build and web build scripts no longer depend on broken npm `.bin` shims in this Windows path.

## Known Truth, Not Hidden

- Clients show active rider and project counts. Month-over-month client/project movement is not implemented because the current schema has no historical snapshot table for client activity.
- Google Sheets sync remains a provider stub by design; it updates sheet status and import job rows. Real OAuth/service-account fetching is still a later integration task.
- Some older modules, especially `assets`, `finance`, and `approvals`, still use router-level controller logic or service/direct DB rather than fully split controller/service/repo files. The matrix records the actual chain instead of inventing layers.
