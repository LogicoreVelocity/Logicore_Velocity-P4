import { Express } from "express";
import authRouter from "../modules/auth/auth.router";
import driversRouter from "../modules/drivers/drivers.router";
import financeRouter from "../modules/finance/finance.router";
import assetsRouter from "../modules/assets/assets.router";
import integrationsRouter from "../modules/integrations/integrations.router";
import approvalsRouter from "../modules/workflow/approvals.router";
import superadminRouter from "../modules/superadmin/superadmin.router";
import importsRouter from "../modules/imports/imports.router";
import mobileRouter from "../modules/mobile/mobile.router";
import aiRouter from "../modules/ai/ai.router";
import dashboardRouter from "../modules/dashboard/dashboard.router";
import clientsRouter from "../modules/clients/clients.router";
import assignmentsRouter from "../modules/assignments/assignments.router";

export function registerRoutes(app: Express) {
  app.use("/auth", authRouter);

  // Protected (tenant resolved)
  app.use("/dashboard", dashboardRouter);
  app.use("/employees", driversRouter);
  app.use("/drivers", driversRouter);
  app.use("/clients", clientsRouter);
  app.use("/assignments", assignmentsRouter);
  app.use("/finance", financeRouter);
  app.use("/assets", assetsRouter);
  app.use("/integrations", integrationsRouter);
  app.use("/approvals", approvalsRouter);
  app.use("/superadmin", superadminRouter);
  app.use("/imports", importsRouter);
  app.use("/mobile", mobileRouter);
  app.use("/ai", aiRouter);
}
