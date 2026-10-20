import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { audit } from "../../shared/audit";
import * as service from "./assignments.service";

const optionalMoney = z.preprocess(
  (value) => value === "" || value === null || value === undefined ? undefined : value,
  z.coerce.number().nonnegative().optional()
);

const CreateAssignmentSchema = z.object({
  driver_id: z.string().uuid(),
  project_id: z.string().uuid(),
  client_project_id: z.string().optional(),
  salary_mode: z.enum(["FIXED", "PER_ORDER"]),
  fixed_basic: optionalMoney,
  fixed_attendance_bonus: optionalMoney,
  fixed_performance_bonus: optionalMoney,
  per_order_rate: optionalMoney,
  rental_receivable_default: optionalMoney,
  start_date: z.string().min(1),
  notes: z.string().min(1),
});

const EndAssignmentSchema = z.object({
  end_date: z.string().min(1),
  reason: z.string().min(1),
  notes: z.string().min(1),
});

export async function listAssignmentsController(req: Request, res: Response, next: NextFunction) {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    const data = await service.listAssignments(req.tenantId!, status);
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function createAssignmentController(req: Request, res: Response, next: NextFunction) {
  try {
    const body = CreateAssignmentSchema.parse(req.body);
    const result = await service.createAssignment({
      tenantId: req.tenantId!,
      driverId: body.driver_id,
      projectId: body.project_id,
      clientProjectId: body.client_project_id,
      salaryMode: body.salary_mode,
      fixedBasic: body.fixed_basic,
      fixedAttendanceBonus: body.fixed_attendance_bonus,
      fixedPerformanceBonus: body.fixed_performance_bonus,
      perOrderRate: body.per_order_rate,
      rentalReceivableDefault: body.rental_receivable_default,
      startDate: body.start_date,
      notes: body.notes,
      actorId: req.user!.id,
    });

    await audit(req, {
      action: "ASSIGNMENT_CREATE",
      entity_type: "ASSIGNMENT",
      entity_id: result.assignment.id,
      notes: body.notes,
      before_json: { driver: result.before_driver },
      after_json: { assignment: result.assignment, driver_status: result.after_driver_status },
    });

    res.status(201).json(result.assignment);
  } catch (err) {
    next(err);
  }
}

export async function endAssignmentController(req: Request, res: Response, next: NextFunction) {
  try {
    const body = EndAssignmentSchema.parse(req.body);
    const result = await service.endAssignment({
      tenantId: req.tenantId!,
      assignmentId: req.params.assignmentId,
      endDate: body.end_date,
      reason: body.reason,
      notes: body.notes,
      actorId: req.user!.id,
    });

    await audit(req, {
      action: "ASSIGNMENT_END",
      entity_type: "ASSIGNMENT",
      entity_id: req.params.assignmentId,
      notes: body.notes,
      before_json: result.before_assignment,
      after_json: {
        assignment: result.after_assignment,
        driver_status: result.after_driver_status,
        reason: body.reason,
      },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
