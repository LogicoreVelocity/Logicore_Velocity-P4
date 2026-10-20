import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../../shared/rbac";

const router = Router();

const ComposeSchema = z.object({
  prompt: z.string().min(1).max(2000),
});

function inferIntent(prompt: string) {
  const lower = prompt.toLowerCase();
  if (lower.includes("vehicle") || lower.includes("plate")) return "ASSET_CHANGE_DRAFT";
  if (lower.includes("fine") || lower.includes("salik") || lower.includes("finance")) return "FINANCE_DRAFT";
  if (lower.includes("assign") || lower.includes("project") || lower.includes("client")) return "ASSIGNMENT_DRAFT";
  if (lower.includes("employee") || lower.includes("driver")) return "EMPLOYEE_DRAFT";
  return "GENERAL_OPERATIONS_DRAFT";
}

router.post(
  "/compose",
  requireRole(["SUPER_ADMIN", "DELEGATED_SUPER_ADMIN", "ADMIN", "ACCOUNTS", "USER"]),
  async (req, res, next) => {
    try {
      const body = ComposeSchema.parse(req.body);
      const intent = inferIntent(body.prompt);

      res.json({
        draft: {
          intent,
          confidence: 0.55,
          form: {
            notes: body.prompt.trim(),
          },
          warnings: ["Draft only. Submit through the relevant workflow to enforce RBAC, notes, approvals, and audit."],
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/summary/today",
  requireRole(["SUPER_ADMIN", "DELEGATED_SUPER_ADMIN", "ADMIN", "ACCOUNTS", "USER"]),
  async (_req, res) => {
    res.json({
      data: {
        message: "Dashboard data is available at /dashboard/summary.",
        date: new Date().toISOString().slice(0, 10),
      },
    });
  }
);

export default router;
