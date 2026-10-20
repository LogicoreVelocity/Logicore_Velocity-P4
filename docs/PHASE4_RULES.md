# Phase 4 Locked Rules (Recap)

This document captures the locked system laws we agreed.

## 1) Super Admin Control Panel owns all logic
- Google Sheet URL + Mapping only in Super Admin Control Panel
- Rule thresholds, salary defaults, categories/subcategories, AI budget/toggles are all controlled here
- Super Admin can delegate permissions to other users

## 2) Dashboard layout is the same for everyone
- Same UI layout
- Data visibility and actions are permission-gated

## 3) Finance governance
- Any permitted user can ADD transactions (payable/receivable)
- EDIT requires Super Admin approval (edit request → approval workflow)
- DELETE is Super Admin only (implemented as VOID recommended)

## 4) Imports
- Every import screen provides a template download + upload
- Payables/Receivables import must validate subcategory values against master subcategories (no free text)

## 5) Driver lifecycle
ONBOARDING → IDLE_NEW_JOINING (7–14) → ASSIGNED → (VACATION/UNASSIGNING) → IDLE_POST_VACATION → OFFBOARDING → CANCELLED
- Vacation unassign has option KEEP_WITH_DRIVER for assets

## 6) Not reporting automation
- Day 3: reminder to assigned user
- Day 5: notify Super Admin + assigned user; move to IDLE_TEMP
- Day 7–14: MISSING_OR_RUNAWAY; user changes only with Super Admin approval
- Day 15+: INACTIVE; only Super Admin can change

## 7) Google Sheets sync
- Automated sync every 3 hours

## 8) AI
- AI drafts actions into forms (never auto-approves)
- Super Admin can toggle AI and set budget limits

## 9) Mobile app
- Payslip view only (no download; screenshot prevention best effort)
- Support categories: Rider & Vehicle / Rider & Client / Rider & Accounts
- Callback/message flow with forced driver feedback after 1 hour
