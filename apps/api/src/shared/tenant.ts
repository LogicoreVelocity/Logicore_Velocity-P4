import { Request, Response, NextFunction } from "express";

/**
 * Tenant resolution rules (SECURE):
 *
 * - /health and /auth/* are public.
 * - For normal roles (ADMIN/ACCOUNTS/USER/DRIVER/DELEGATED_SUPER_ADMIN):
 *   tenantId is ALWAYS the tenant_id from the JWT. If X-Tenant-Id is provided and differs, reject.
 * - Only SUPER_ADMIN may act across tenants by setting X-Tenant-Id.
 */
export function resolveTenant(req: Request, _res: Response, next: NextFunction) {
  const originalUrl = req.originalUrl || req.path || "";
  if (originalUrl.startsWith("/health") || originalUrl.startsWith("/auth")) return next();

  const user = req.user;
  if (!user) return next(Object.assign(new Error("Unauthorized"), { status: 401 }));

  const headerTenant = req.header("X-Tenant-Id") || undefined;

  if (headerTenant && headerTenant !== user.tenant_id && user.role !== "SUPER_ADMIN") {
    return next(Object.assign(new Error("Tenant override not allowed"), { status: 403 }));
  }

  req.tenantId = user.role === "SUPER_ADMIN" ? (headerTenant || user.tenant_id) : user.tenant_id;

  if (!req.tenantId) return next(Object.assign(new Error("Tenant missing"), { status: 400 }));
  return next();
}
