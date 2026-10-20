# Dependency Recovery

The archived root `package-lock.json` contains empty package records and must not be reused as a clean production lock.

The clean deliverable intentionally omits that damaged lockfile and all `node_modules` directories. Recover dependencies from manifests in a fresh directory or after moving the generated folders to a backup.

Recommended sequence with an LTS Node.js release:

```powershell
npm install --workspaces --include-workspace-root
npm --workspace apps/api run build
npm --workspace apps/web-admin run build
npm --workspace apps/mobile-driver run lint
npm audit
```

Then run database and service validation:

```powershell
docker compose -f infra/docker-compose.yml up -d
npm run db:migrate
npm run db:seed
python -m unittest discover -s services/python-processing/tests -v
```

Do not repair the old dependency tree package by package. Regenerate one coherent lockfile from the workspace manifests and review any dependency-major changes before deployment.
