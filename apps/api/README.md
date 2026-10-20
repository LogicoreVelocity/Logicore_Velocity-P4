# @logicore/api

Node.js + TypeScript + Express API for Logicore Velocity (Phase 4).

## Run
```bash
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

## Key security controls
- JWT auth
- Tenant isolation middleware
- Role-based access control
- Audit log writes for state changes
- Super Admin control panel endpoints

## Next extensions
- Google Sheets OAuth provider
- Import preview → validation → commit pipeline
- Report engine (PDF/XLSX)
