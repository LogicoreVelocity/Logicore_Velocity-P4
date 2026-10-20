import { Request, Response, NextFunction, RequestHandler } from "express";
import { requireAuth } from "./auth";

export function requireRole(roles: string[]): RequestHandler[] {
  const roleGuard: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (!role || !roles.includes(role)) {
      return next(Object.assign(new Error("Forbidden"), { status: 403 }));
    }
    next();
  };

  return [requireAuth, roleGuard];
}
