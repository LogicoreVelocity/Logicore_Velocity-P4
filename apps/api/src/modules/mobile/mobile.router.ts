import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../../shared/rbac";
import { getPool } from "../../shared/db";
import { HttpError } from "../../shared/http";
import { audit } from "../../shared/audit";

const router = Router();

async function getDriverIdForUser(tenantId: string, userId: string): Promise<string> {
  const { rows } = await getPool().query(`SELECT driver_id FROM users WHERE tenant_id=$1 AND id=$2`, [tenantId, userId]);
  const driverId = rows[0]?.driver_id;
  if (!driverId) throw new HttpError(400, "This user is not linked to a driver profile");
  return driverId;
}

// Payslips list (view only)
router.get("/payslips", requireRole(["DRIVER"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const driverId = await getDriverIdForUser(tenantId, req.user!.id);

    const { rows } = await getPool().query(
      `SELECT p.id, pp.period_start, pp.period_end, p.total_payables, p.total_receivables, p.net_pay, p.generated_at
       FROM payslips p
       JOIN payslip_periods pp ON pp.id=p.period_id
       WHERE p.tenant_id=$1 AND p.driver_id=$2
       ORDER BY pp.period_start DESC
       LIMIT 24`,
      [tenantId, driverId]
    );

    res.json({ data: rows });
  } catch (err) { next(err); }
});

// Support ticket create
const CreateTicketSchema = z.object({
  category: z.enum(["RIDER_VEHICLE","RIDER_CLIENT","RIDER_ACCOUNTS"]),
  mode: z.enum(["CALLBACK","MESSAGE"]),
  scheduled_call_at: z.string().optional(),
  subject: z.string().min(2),
  description: z.string().min(2),
  notes: z.string().min(1),
});

router.post("/support/tickets", requireRole(["DRIVER"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const driverId = await getDriverIdForUser(tenantId, req.user!.id);
    const body = CreateTicketSchema.parse(req.body);

    // Route to assigned user (primary first)
    const ruleRes = await getPool().query(
      `SELECT * FROM support_routing_rules WHERE tenant_id=$1 AND category=$2 AND enabled=true`,
      [tenantId, body.category]
    );
    const assigned = ruleRes.rows[0]?.primary_user_id || ruleRes.rows[0]?.secondary_user_id || null;

    const { rows } = await getPool().query(
      `INSERT INTO support_tickets(tenant_id, driver_id, category, mode, subject, description, status, assigned_user_id, scheduled_call_at, notes, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,'OPEN',$7,$8,$9,$10,$10)
       RETURNING *`,
      [tenantId, driverId, body.category, body.mode, body.subject, body.description, assigned, body.scheduled_call_at || null, body.notes, req.user!.id]
    );

    await audit(req, {
      action: "MOBILE_SUPPORT_TICKET_CREATE",
      entity_type: "SUPPORT_TICKET",
      entity_id: rows[0].id,
      notes: body.notes,
      after_json: rows[0],
    });

    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// Support ticket list
router.get("/support/tickets", requireRole(["DRIVER"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const driverId = await getDriverIdForUser(tenantId, req.user!.id);

    const { rows } = await getPool().query(
      `SELECT id, category, mode, subject, status, created_at, updated_at
       FROM support_tickets WHERE tenant_id=$1 AND driver_id=$2
       ORDER BY created_at DESC LIMIT 100`,
      [tenantId, driverId]
    );

    res.json({ data: rows });
  } catch (err) { next(err); }
});

// Driver feedback (solved/not solved)
const FeedbackSchema = z.object({
  solved: z.boolean(),
  not_solved_reason: z.string().optional(),
  notes: z.string().min(1),
});

router.post("/support/tickets/:ticketId/feedback", requireRole(["DRIVER"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const driverId = await getDriverIdForUser(tenantId, req.user!.id);
    const body = FeedbackSchema.parse(req.body);

    const tRes = await getPool().query(
      `SELECT * FROM support_tickets WHERE tenant_id=$1 AND id=$2 AND driver_id=$3`,
      [tenantId, req.params.ticketId, driverId]
    );
    const ticket = tRes.rows[0];
    if (!ticket) throw new HttpError(404, "Ticket not found");

    await getPool().query(
      `INSERT INTO support_messages(ticket_id, sender_user_id, sender_type, message)
       VALUES ($1,$2,'DRIVER',$3)`,
      [ticket.id, req.user!.id, body.solved ? "Driver marked solved" : `Driver not solved: ${body.not_solved_reason || ""}`]
    );

    await getPool().query(
      `UPDATE support_tickets SET status=$1, updated_at=now(), updated_by=$2 WHERE tenant_id=$3 AND id=$4`,
      [body.solved ? "SOLVED" : "UNSOLVED", req.user!.id, tenantId, ticket.id]
    );

    await audit(req, {
      action: "MOBILE_SUPPORT_FEEDBACK",
      entity_type: "SUPPORT_TICKET",
      entity_id: ticket.id,
      notes: body.notes,
      after_json: { solved: body.solved, not_solved_reason: body.not_solved_reason || null },
    });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
