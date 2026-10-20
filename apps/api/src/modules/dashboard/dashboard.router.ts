import { Router } from "express";
import { requireRole } from "../../shared/rbac";
import { dashboardSummaryController } from "./dashboard.controller";

const router = Router();

router.get(
  "/summary",
  requireRole(["SUPER_ADMIN", "DELEGATED_SUPER_ADMIN", "ADMIN", "ACCOUNTS", "USER"]),
  dashboardSummaryController
);

export default router;
