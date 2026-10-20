# Logicore Velocity — P0 Locked Rules & Coverage Checklist

**Status:** Locked ✅ (decisions frozen for build)  
**Last updated:** 2026-01-10

This document captures the *frozen P0 rules* and a *single source of truth checklist* of requirements you provided, so nothing gets missed during build.

---

## 1) Frozen P0 Rules (Do Not Change)

### UI / Theme
- **One standard layout system** (same components, spacing, typography, grids).
- **Palette-only theme switching**:
  - Midnight Blue (**default**)
  - Obsidian Gold
  - Ivory White (**mandatory**)
- **Theme switching permission:** Super Admin only.
- **Dashboard layout editing:** Super Admin only (role-based publish). **No free drag/drop for users.**

### Access Control
- Super Admin owns **all logical controls**:
  - permissions, approvals, imports, budgets, integrations, mappings, feature flags.
- Users can **add** transactions (if permitted), but:
  - **edit = approval required**
  - **delete = Super Admin only** (and for finance: prefer reversal over delete)

### Auditability
- Immutable audit logs across:
  - drivers, vehicles, SIM, assets, onboarding/offboarding, finance, approvals, reports, super admin actions.
- Every form/request/transaction includes **Notes**.

---

## 2) Core Workflow (No Loops, Always an End)

### Driver lifecycle
Onboarding → Idle (new join 7–14 days) → Assigning → Accounts (payables/receivables) → Unassigning (vacation/project change/offboarding) → Idle/vacation (back from vacation ~4 days) → Offboarding (dues cleared + assets returned) → Inactive.

### Missing driver rule
- 3 days: reminder to assigned user
- 5th day: notify Super Admin + assigned user; move driver to Idle
- 7–14 days: “missing/runaway” handling; user can change with Super Admin approval
- After 15 days: only Super Admin can change; moves to Inactive section

---

## 3) Modules & Rules Coverage

### A) Drivers
- Employee code types: **CWDS / TEMP**
- Project IDs provided by client recorded per assignment and retained forever in **History**
- Visa/license onboarding rules:
  - Own Visa: TEMP
  - Need visa / need visa+license: CWDS
  - If “needs license”: can be assigned to driving school project (without license details), then on unassign from school license details become required.

**Driver Profile must include:**
- Timeline/History tab with complete lifecycle (vehicles, SIM, clients, uniforms/assets, transactions, approvals, notes).

### B) Vehicles
- Add/edit/remove
- Branding section:
  - box installed (tick)
  - advertisement + permit expiry
  - box installed from where/when
- Remove:
  - box returned? removal reason + date
- **Vehicle replacement form**
  - reason + date/time + replacement vehicle + notes
- **Box ownership split**
  - bike can be ours, box can be client-owned; box can be returned separately and later replaced with another client’s box.

### C) SIM Cards
- Add:
  - card number
  - belongs to **CWDS** or **Client**
  - pickup/purchase date
- Remove:
  - if CWDS → “removed/deleted SIM” in audit
  - if Client → “returned to client”, include return date/time + returned-to (person)
- SIM replacement form:
  - reason + replacement card
  - reissue same SIM (charges/penalty)
  - date/time + notes

### D) Other Assets (helmet, uniform, safety kit, etc.)
- Stock list managed by Super Admin (icons + configurable colors)
- Assigning logic must respect availability (in-stock only)
- Asset belongs to CWDS or client:
  - if client-owned and driver unassigned: option “returned to client” so item does not return to stock.
- Damaged status + replacement workflow + notes.

### E) Finance / Accounts
- Payables & Receivables with **subcategories** (added by Super Admin + Accounts)
- Import:
  - bulk import payables/receivables allowed (templates)
  - any user may bulk import transactions (as permitted), edits require approval, no delete
  - Super Admin notified for **all transactions**
- Salary logic during assignment:
  - per-order salary OR fixed salary
  - fixed default: 2800 basic + 150 attendance bonus + 150 performance bonus = 3100
  - user can request salary hike; proceeds with default until approval then updates
  - per-order: rental receivable (1100) deduction; discount request flows similarly

**Fines / EMI rule**
- If fine prev month and new fine this month “huge” (e.g., 1000):
  - EMI request for 2 months allowed with Super Admin notification
  - >2 months requires Super Admin approval
- Training fees default:
  - 4000 with monthly EMI 500
  - advance payment supported; EMI timeline recalculates based on preference
- EMI dashboard visibility rule:
  - Do not highlight total EMI amount by default
  - If EMI not deducted for 2–3 months → flag as “EMI payment faulty”
  - If faulty for 3 months → add to dues and highlight

### F) Clients
- Clients page required:
  - compact professional cards
  - active riders count per project/client + MoM delta arrows
  - add/edit clients
  - POC contacts
  - SOP editor for Assigning/Unassigning (visible/editable per permissions)
  - optional: client SIM/assets/box management linked here

### G) Reports / Exports
- Every table/section supports:
  - search, filter by any column, sorting
  - export PDF + Excel
  - calendar-wise filtering
- Imports must provide templates for each import point.

### H) Google Sheets Integration
- Super Admin control panel:
  - Google sheet URL entry + mapping
  - automated retrieval every **3 hours**
- If sheets sync fails:
  - manual daily import enabled (all users) via CSV/XLSX for performance report (toggle in settings to show import on dashboard)

### I) Mobile App (drivers)
- Limited features:
  - view payslips (no download, no screenshot)
  - support tickets: rider+vehicle, rider+client, rider+accounts to allocated user
  - callback/message option with SLA prompts:
    - callback scheduled time, auto “solved?” prompt after 1 hour
    - message: prompt 1 hour after view
    - driver must confirm solved/not solved + reason

### J) AI
- Floating bottom-right button: **“V”**
- Capabilities:
  - smart search (“find driver, start quick action”)
  - prompt → fills correct form flows (assign/unassign/replacement/transactions)
  - Super Admin dashboards: daily summary, weekly delta, risks, inactive/idle, SLA alerts
- Provider safety:
  - keys never exposed to frontend
  - provider abstraction for future multi-provider
  - Super Admin can set AI budget + on/off

---

## 4) Security & Hardening (P0 Must)

- Tenant isolation: header override disallowed unless explicitly privileged.
- Refresh tokens stored hashed (not plaintext) + rotation.
- Restrict CORS origins (no reflective origin + credentials).
- Rate limiting: auth, imports, exports, search.
- Central validation (Zod) for all DTOs.
- Global error handler + safe responses; no secret logging.
- CSV injection sanitization on export/import.
- Audit log immutable; finance edits always require approval workflow.
- Health + readiness endpoints; job heartbeat monitoring.
- Backups + restore procedures documented for production.

---

## 5) Deployment Target

- **Staging:** Render Free (validation only)
- **Go-live P0:** Render Paid with separate Web + Worker + Cron + Postgres.
- Container-friendly, env-driven to allow later move to Railway/AWS.

---

## 6) What to Review Next (UI)

Included UI mockups in `docs/ui/`:
- `A_composite_image_displays_three_high-fidelity_UI_.png`
- `A_set_of_high-fidelity_UI_design_mockups_displays_.png`
- `A_collection_of_UI_mockups_for_Logicore_fleet_mana.png`
- `Logicore_Velocity_Logo.png`

---

## 7) Final Note
If any rule conflicts with an implementation detail, the rule in this document wins (P0 locked).
