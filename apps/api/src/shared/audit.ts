import { getPool } from "./db";
import { Request } from "express";

export async function audit(req: Request, params: {
  action: string;
  entity_type: string;
  entity_id: string;
  notes: string;
  before_json?: any;
  after_json?: any;
}) {
  const tenantId = req.tenantId || req.user?.tenant_id;
  const actor = req.user?.id || null;

  if (!tenantId) return;

  await getPool().query(
    `INSERT INTO audit_log(tenant_id, actor_user_id, action, entity_type, entity_id, notes, before_json, after_json, ip, user_agent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      tenantId,
      actor,
      params.action,
      params.entity_type,
      params.entity_id,
      params.notes,
      params.before_json ? JSON.stringify(params.before_json) : null,
      params.after_json ? JSON.stringify(params.after_json) : null,
      req.ip || null,
      req.headers["user-agent"] || null,
    ]
  );
}
