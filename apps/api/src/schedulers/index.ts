import cron from "node-cron";
import { sheetsSyncJob } from "./sheets-sync.job";
import { notReportingJob } from "./not-reporting.job";
import { supportSlaJob } from "./support-sla.job";

export function startSchedulers() {
  // Sheets sync every 3 hours (00:00, 03:00, 06:00, ...)
  cron.schedule("0 */3 * * *", () => sheetsSyncJob().catch(console.error));

  // Not reporting automation daily (02:15)
  cron.schedule("15 2 * * *", () => notReportingJob().catch(console.error));

  // Support SLA tick every 5 minutes
  cron.schedule("*/5 * * * *", () => supportSlaJob().catch(console.error));

  console.log("[Schedulers] Started");
}
