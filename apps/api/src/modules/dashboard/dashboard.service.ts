import { readDashboardSummary } from "./dashboard.repo";

export function getDashboardSummary(tenantId: string) {
  return readDashboardSummary(tenantId);
}
