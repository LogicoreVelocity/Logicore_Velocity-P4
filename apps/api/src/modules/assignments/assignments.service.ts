import { getPool } from "../../shared/db";
import { HttpError } from "../../shared/http";
import * as repo from "./assignments.repo";

export function listAssignments(tenantId: string, status?: string) {
  return repo.listAssignments(tenantId, status);
}

export async function createAssignment(params: {
  tenantId: string;
  driverId: string;
  projectId: string;
  clientProjectId?: string;
  salaryMode: "FIXED" | "PER_ORDER";
  fixedBasic?: number;
  fixedAttendanceBonus?: number;
  fixedPerformanceBonus?: number;
  perOrderRate?: number;
  rentalReceivableDefault?: number;
  startDate: string;
  notes: string;
  actorId: string;
}) {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");

    const driver = await repo.readDriverForUpdate(client, params.tenantId, params.driverId);
    if (!driver) throw new HttpError(404, "Employee not found");

    const project = await repo.readProject(client, params.tenantId, params.projectId);
    if (!project) throw new HttpError(404, "Project not found");

    const active = await repo.readActiveAssignment(client, params.tenantId, params.driverId);
    if (active) throw new HttpError(409, "Employee already has an active assignment");

    if (project.license_required && !project.is_driving_school && !driver.license_no) {
      throw new HttpError(400, "Employee license is required before assignment to this project");
    }

    const assignment = await repo.insertAssignment(client, params);

    if (driver.status !== "ASSIGNED") {
      await client.query(
        `UPDATE drivers SET status='ASSIGNED', updated_at=now(), updated_by=$1 WHERE tenant_id=$2 AND id=$3`,
        [params.actorId, params.tenantId, params.driverId]
      );

      await client.query(
        `INSERT INTO driver_status_history(tenant_id, driver_id, from_status, to_status, reason, notes, created_by)
         VALUES ($1,$2,$3,'ASSIGNED','ASSIGNMENT_CREATE',$4,$5)`,
        [params.tenantId, params.driverId, driver.status, params.notes, params.actorId]
      );
    }

    await client.query("COMMIT");
    return { assignment, before_driver: driver, after_driver_status: "ASSIGNED" };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function endAssignment(params: {
  tenantId: string;
  assignmentId: string;
  endDate: string;
  reason: string;
  notes: string;
  actorId: string;
}) {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");

    const assignment = await repo.readAssignmentForUpdate(client, params.tenantId, params.assignmentId);
    if (!assignment) throw new HttpError(404, "Assignment not found");
    if (assignment.status !== "ACTIVE" || assignment.end_date) {
      throw new HttpError(400, "Assignment is already ended");
    }

    const driver = await repo.readDriverForUpdate(client, params.tenantId, assignment.driver_id);
    if (!driver) throw new HttpError(404, "Employee not found");

    await client.query(
      `UPDATE assignments
       SET status='ENDED', end_date=$1, notes=notes || E'\nEND NOTE: ' || $2, updated_at=now(), updated_by=$3
       WHERE tenant_id=$4 AND id=$5`,
      [params.endDate, params.notes, params.actorId, params.tenantId, params.assignmentId]
    );

    const remainingActive = await repo.readActiveAssignment(client, params.tenantId, assignment.driver_id, params.assignmentId);
    if (!remainingActive && driver.status === "ASSIGNED") {
      await client.query(
        `UPDATE drivers SET status='IDLE_TEMP', updated_at=now(), updated_by=$1 WHERE tenant_id=$2 AND id=$3`,
        [params.actorId, params.tenantId, assignment.driver_id]
      );

      await client.query(
        `INSERT INTO driver_status_history(tenant_id, driver_id, from_status, to_status, reason, notes, created_by)
         VALUES ($1,$2,'ASSIGNED','IDLE_TEMP',$3,$4,$5)`,
        [params.tenantId, assignment.driver_id, params.reason, params.notes, params.actorId]
      );
    }

    await client.query("COMMIT");
    return {
      before_assignment: assignment,
      after_assignment: { ...assignment, status: "ENDED", end_date: params.endDate },
      before_driver: driver,
      after_driver_status: remainingActive ? driver.status : "IDLE_TEMP",
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
