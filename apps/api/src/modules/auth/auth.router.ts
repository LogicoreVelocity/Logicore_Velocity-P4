import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getPool } from "../../shared/db";
import { HttpError } from "../../shared/http";

const router = Router();

const LoginSchema = z.object({
  tenant_id: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", async (req, res, next) => {
  try {
    const body = LoginSchema.parse(req.body);
    const { tenant_id, email, password } = body;

    const { rows } = await getPool().query(
      `SELECT id, tenant_id, role, email, password_hash, display_name, is_active
       FROM users WHERE tenant_id=$1 AND email=$2`,
      [tenant_id, email.toLowerCase()]
    );

    if (!rows[0] || !rows[0].is_active) throw new HttpError(401, "Invalid credentials");

    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) throw new HttpError(401, "Invalid credentials");

    const token = jwt.sign(
      { id: rows[0].id, tenant_id: rows[0].tenant_id, role: rows[0].role, email: rows[0].email },
      process.env.JWT_SECRET || "dev",
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );

    res.json({
      token,
      user: {
        id: rows[0].id,
        tenant_id: rows[0].tenant_id,
        role: rows[0].role,
        email: rows[0].email,
        display_name: rows[0].display_name,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
