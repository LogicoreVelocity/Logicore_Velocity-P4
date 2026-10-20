import { Router } from "express";
import { CreateDriverSchema, TransitionSchema } from "./drivers.schemas";
import { parseListQuery } from "../../shared/pagination";
import { audit } from "../../shared/audit";
import { getPool } from "../../shared/db";
import { HttpError } from "../../shared/http";
import { canTransition, generateEmployeeCode, listDrivers, getDriver, getDriverTimeline, DriverStatus } from "./drivers.service";
import { requireRole } from "../../shared/rbac";

const router = Router();

// List drivers
router.get("/", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN","ACCOUNTS","USER"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const { limit, offset, search, sort } = parseListQuery(req.query);
    const result = await listDrivers({ tenantId, limit, offset, search, sort });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Create driver
router.post("/", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN","USER"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const body = CreateDriverSchema.parse(req.body);

    const employeeCodeType = (body.visa_type === "OWN_VISA") ? "TEMP" : "CWDS";
    const employeeCode = await generateEmployeeCode(tenantId, employeeCodeType as any);

    const { rows } = await getPool().query(
      `INSERT INTO drivers(tenant_id, full_name, phone, email, visa_type, employee_code_type, employee_code, status, joined_at, notes, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'ONBOARDING',$8,$9,$10,$10)
       RETURNING *`,
      [
        tenantId,
        body.full_name,
        body.phone,
        body.email || null,
        body.visa_type,
        employeeCodeType,
        employeeCode,
        body.joined_at || null,
        body.notes,
        req.user!.id,
      ]
    );

    await audit(req, {
      action: "DRIVER_CREATE",
      entity_type: "DRIVER",
      entity_id: rows[0].id,
      notes: body.notes,
      after_json: rows[0],
    });

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// Get driver
router.get("/:driverId", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN","ACCOUNTS","USER"]), async (req, res, next) => {
  try {
    const d = await getDriver(req.tenantId!, req.params.driverId);
    if (!d) throw new HttpError(404, "Driver not found");
    res.json(d);
  } catch (err) {
    next(err);
  }
});

// Driver timeline (roadmap)
router.get("/:driverId/timeline", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN","ACCOUNTS","USER"]), async (req, res, next) => {
  try {
    const data = await getDriverTimeline(req.tenantId!, req.params.driverId);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Transition driver status
router.post("/:driverId/transition", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN","USER"]), async (req, res, next) => {
  try {
    const tenantId = req.tenantId!;
    const body = TransitionSchema.parse(req.body);

    const current = await getDriver(tenantId, req.params.driverId);
    if (!current) throw new HttpError(404, "Driver not found");

    const from = current.status as DriverStatus;
    const to = body.to_status as DriverStatus;

    if (!canTransition(from, to)) {
      throw new HttpError(400, `Invalid transition ${from} -> ${to}`);
    }

    await getPool().query(
      `UPDATE drivers SET status=$1, updated_at=now(), updated_by=$2 WHERE tenant_id=$3 AND id=$4`,
      [to, req.user!.id, tenantId, req.params.driverId]
    );

    await getPool().query(
      `INSERT INTO driver_status_history(tenant_id, driver_id, from_status, to_status, reason, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [tenantId, req.params.driverId, from, to, body.reason, body.notes, req.user!.id]
    );

    await audit(req, {
      action: "DRIVER_STATUS_TRANSITION",
      entity_type: "DRIVER",
      entity_id: req.params.driverId,
      notes: body.notes,
      before_json: { status: from },
      after_json: { status: to, reason: body.reason },
    });

    res.json({ ok: true, from_status: from, to_status: to });
  } catch (err) {
    next(err);
  }
});

export default router;
