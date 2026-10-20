import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import { ZodError } from "zod";
import { initDb } from "./shared/db";
import { attachUserFromJwt } from "./shared/auth";
import { resolveTenant } from "./shared/tenant";
import { registerRoutes } from "./routes";
import { startSchedulers } from "./schedulers";

dotenv.config();

// Fail-fast for missing secrets in production
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.error("[API] JWT_SECRET is required in production");
  process.exit(1);
}

const app = express();

// When behind a reverse proxy (Render/Fly/Nginx), set trust proxy for correct IP rate-limiting.
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

// CORS (restrict in production)
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Non-browser clients (curl, mobile apps) often have no Origin header.
      if (!origin) return cb(null, true);

      // Dev convenience: if no allowlist configured, allow all.
      if (allowedOrigins.length === 0) return cb(null, true);

      if (allowedOrigins.includes(origin)) return cb(null, true);
      const err: any = new Error("CORS origin not allowed");
      err.status = 403;
      return cb(err);
    },
    credentials: false,
  })
);

app.use(express.json({ limit: "2mb" }));

// Public
app.get("/health", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Basic rate limiting on auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 60),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again later." },
});
app.use("/auth", authLimiter);

// Auth parsing
app.use(attachUserFromJwt);

// Tenant resolution (for all protected routes)
app.use(resolveTenant);

// Routes
registerRoutes(app);

// Error handler (keep last)
app.use((err: any, _req: any, res: any, _next: any) => {
  const isValidationError = err instanceof ZodError;
  const status = isValidationError ? 400 : err?.status || 500;
  const message = isValidationError
    ? err.errors.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`).join("; ")
    : err?.message || "Internal error";
  res.status(status).json({ error: message });
});

// Start
const port = Number(process.env.APP_PORT || 4000);

initDb()
  .then(() => {
    startSchedulers();
    app.listen(port, () => {
      console.log(`[API] Listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error("[API] Failed to start:", err);
    process.exit(1);
  });
