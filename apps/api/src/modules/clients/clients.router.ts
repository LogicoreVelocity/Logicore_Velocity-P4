import { Router } from "express";
import { requireRole } from "../../shared/rbac";
import {
  createClientController,
  listClientProjectsController,
  listClientsController,
  updateClientController,
} from "./clients.controller";

const router = Router();

const readRoles = ["SUPER_ADMIN", "DELEGATED_SUPER_ADMIN", "ADMIN", "ACCOUNTS", "USER"];
const writeRoles = ["SUPER_ADMIN", "DELEGATED_SUPER_ADMIN", "ADMIN", "USER"];

router.get("/", requireRole(readRoles), listClientsController);
router.get("/projects", requireRole(readRoles), listClientProjectsController);
router.post("/", requireRole(writeRoles), createClientController);
router.patch("/:clientId", requireRole(writeRoles), updateClientController);

export default router;
