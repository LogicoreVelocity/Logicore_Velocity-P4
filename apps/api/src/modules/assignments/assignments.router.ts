import { Router } from "express";
import { requireRole } from "../../shared/rbac";
import {
  createAssignmentController,
  endAssignmentController,
  listAssignmentsController,
} from "./assignments.controller";

const router = Router();

const readRoles = ["SUPER_ADMIN", "DELEGATED_SUPER_ADMIN", "ADMIN", "ACCOUNTS", "USER"];
const writeRoles = ["SUPER_ADMIN", "DELEGATED_SUPER_ADMIN", "ADMIN", "USER"];

router.get("/", requireRole(readRoles), listAssignmentsController);
router.post("/", requireRole(writeRoles), createAssignmentController);
router.post("/:assignmentId/end", requireRole(writeRoles), endAssignmentController);

export default router;
