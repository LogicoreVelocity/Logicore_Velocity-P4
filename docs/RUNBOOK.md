# Runbook (Ops)

## API
- Start: npm run dev:api
- Logs: console output (extend to file/ELK in production)
- Health: GET /health

## Database
- Start: docker compose -f infra/docker-compose.yml up -d
- Migrate: npm run db:migrate
- Seed: npm run db:seed

## Schedulers
- Sheets sync: every 3 hours (see apps/api/src/schedulers/sheets-sync.job.ts)
- Not-reporting: daily (hook, implement logic)
- Support SLA: every 5 minutes (hook, implement logic)

## Production checks
- Ensure audit_log is writing for all major actions
- Ensure approvals are enforced for edits
- Ensure tenant isolation middleware is applied globally
