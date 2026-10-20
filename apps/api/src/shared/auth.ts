import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type AuthUser = {
  id: string;
  tenant_id: string;
  role: string;
  email: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      tenantId?: string;
    }
  }
}

export function attachUserFromJwt(req: Request, _res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return next();

  const token = auth.slice("Bearer ".length);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev") as any;
    req.user = {
      id: decoded.id,
      tenant_id: decoded.tenant_id,
      role: decoded.role,
      email: decoded.email,
    };
  } catch {
    // ignore invalid token; downstream protected routes will reject
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(Object.assign(new Error("Unauthorized"), { status: 401 }));
  next();
}
