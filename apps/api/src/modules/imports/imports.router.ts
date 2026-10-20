import { Router, Request } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { z } from "zod";
import type { PoolClient } from "pg";
import { requireRole } from "../../shared/rbac";
import { HttpError } from "../../shared/http";
import { audit } from "../../shared/audit";
import { getPool } from "../../shared/db";
import { OnboardingPreviewRowSchema, requestImportPreview } from "./imports.processor";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 10 },
});

const PreviewBodySchema = z.object({
  data_type: z.enum(["ONBOARDING", "DRIVERS_ONBOARDING"]),
  notes: z.string().trim().min(1).max(2000),
});

const CommitBodySchema = z.object({
  notes: z.string().trim().min(1).max(2000),
});

function importStatus(rowsValid: number, rowsInvalid: number) {
  if (rowsValid === 0) return "FAILED";
  return rowsInvalid > 0 ? "PARTIAL" : "SUCCESS";
}

function summarizeErrors(errors: Array<{ row: number; field: string; message: string }>) {
  if (errors.length === 0) return null;
  return errors.slice(0, 20).map((item) => `row ${item.row} ${item.field}: ${item.message}`).join("; ");
}

async function expireOldPreviews(tenantId: string) {
  await getPool().query(
    `UPDATE import_jobs
     SET stage='EXPIRED', preview_rows=NULL
     WHERE tenant_id=$1 AND stage='PREVIEWED' AND preview_expires_at < now()`,
    [tenantId],
  );
}

// Download templates
router.get("/templates/:name", requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN","ACCOUNTS","USER"]), async (req, res, next) => {
  try {
    const name = req.params.name;
    const allowed = new Set([
      "payables_template.csv",
      "receivables_template.csv",
      "performance_template.csv",
      "drivers_onboarding_template.csv",
      "vehicles_template.csv",
      "sims_template.csv",
      "assignments_template.csv",
      "fines_salik_template.csv",
    ]);
    if (!allowed.has(name)) throw new HttpError(404, "Template not found");

    const filePath = path.resolve(process.cwd(), "../../templates/imports", name);
    if (!fs.existsSync(filePath)) throw new HttpError(404, "Template missing on server");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) { next(err); }
});

async function previewHandler(req: Request, res: any, next: any) {
  try {
    const body = PreviewBodySchema.parse(req.body);
    if (!req.file) throw new HttpError(400, "file is required");
    await expireOldPreviews(req.tenantId!);

    const preview = await requestImportPreview({
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      buffer: req.file.buffer,
      dataType: body.data_type,
    });
    const status = importStatus(preview.rows_valid, preview.rows_invalid);
    const { rows } = await getPool().query(
      `INSERT INTO import_jobs(
         tenant_id, source_type, source_ref, data_type, status,
         rows_total, rows_success, rows_failed, error_summary, notes, created_by,
         stage, file_sha256, preview_rows, preview_expires_at
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'PREVIEWED',$12,$13::jsonb,now() + interval '24 hours')
       RETURNING id, data_type, status, stage, rows_total, rows_success, rows_failed, created_at, preview_expires_at`,
      [
        req.tenantId!,
        path.extname(preview.file_name).toLowerCase() === ".xlsx" ? "XLSX" : "CSV",
        preview.file_name,
        preview.data_type,
        status,
        preview.rows_total,
        preview.rows_valid,
        preview.rows_invalid,
        summarizeErrors(preview.errors),
        body.notes,
        req.user!.id,
        preview.file_sha256,
        JSON.stringify(preview.rows),
      ],
    );

    await audit(req, {
      action: "IMPORT_PREVIEW_CREATED",
      entity_type: "IMPORT_JOB",
      entity_id: rows[0].id,
      notes: body.notes,
      after_json: {
        file_name: preview.file_name,
        file_sha256: preview.file_sha256,
        data_type: preview.data_type,
        rows_total: preview.rows_total,
        rows_valid: preview.rows_valid,
        rows_invalid: preview.rows_invalid,
      },
    });

    res.status(201).json({ job: rows[0], preview });
  } catch (err) { next(err); }
}

router.post(
  "/preview",
  requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN","ACCOUNTS","USER"]),
  upload.single("file"),
  previewHandler,
);

// Backward-compatible alias for the former scaffold upload endpoint.
router.post(
  "/upload",
  requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN","ACCOUNTS","USER"]),
  upload.single("file"),
  previewHandler,
);

router.get(
  "/jobs",
  requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN","ACCOUNTS","USER"]),
  async (req, res, next) => {
    try {
      await expireOldPreviews(req.tenantId!);
      const { rows } = await getPool().query(
        `SELECT id, source_type, source_ref, data_type, status, stage,
                rows_total, rows_success, rows_failed, error_summary, notes,
                created_by, created_at, preview_expires_at, committed_at
         FROM import_jobs
         WHERE tenant_id=$1
         ORDER BY created_at DESC
         LIMIT 100`,
        [req.tenantId!],
      );
      res.json({ data: rows });
    } catch (err) { next(err); }
  },
);

router.post(
  "/:jobId/commit",
  requireRole(["SUPER_ADMIN","DELEGATED_SUPER_ADMIN","ADMIN","USER"]),
  async (req, res, next) => {
    let client: PoolClient | undefined;
    try {
      client = await getPool().connect();
      const jobId = z.string().uuid().parse(req.params.jobId);
      const body = CommitBodySchema.parse(req.body);
      await client.query("BEGIN");

      const jobResult = await client.query(
        `SELECT * FROM import_jobs WHERE tenant_id=$1 AND id=$2 FOR UPDATE`,
        [req.tenantId!, jobId],
      );
      const job = jobResult.rows[0];
      if (!job) throw new HttpError(404, "Import job not found");
      if (job.stage !== "PREVIEWED") throw new HttpError(409, "Import job has already been committed");
      if (job.preview_expires_at && new Date(job.preview_expires_at).getTime() < Date.now()) {
        await client.query(
          `UPDATE import_jobs SET stage='EXPIRED', preview_rows=NULL WHERE tenant_id=$1 AND id=$2`,
          [req.tenantId!, jobId],
        );
        await client.query("COMMIT");
        return res.status(410).json({ error: "Import preview has expired; create a new preview" });
      }
      if (job.data_type !== "ONBOARDING") throw new HttpError(400, "Only ONBOARDING commits are enabled");

      const previewRows = z.array(OnboardingPreviewRowSchema).max(5000).parse(job.preview_rows || []);
      if (previewRows.length === 0) throw new HttpError(400, "Import job has no valid rows to commit");

      const inserted: Array<{ id: string; employee_code: string; phone: string; source_row: number }> = [];
      const skipped: Array<{ phone: string; source_row: number; reason: string }> = [];
      for (const row of previewRows) {
        const codeType = row.visa_type === "OWN_VISA" ? "TEMP" : "CWDS";
        const codeResult = await client.query(
          `SELECT next_employee_code($1, $2::employee_code_type) AS employee_code`,
          [req.tenantId!, codeType],
        );
        const createResult = await client.query(
          `INSERT INTO drivers(
             tenant_id, full_name, phone, email, visa_type, employee_code_type,
             employee_code, status, joined_at, notes, created_by, updated_by
           )
           VALUES ($1,$2,$3,$4,$5,$6,$7,'ONBOARDING',$8,$9,$10,$10)
           ON CONFLICT (tenant_id, phone) DO NOTHING
           RETURNING id, employee_code, phone`,
          [
            req.tenantId!, row.full_name, row.phone, row.email, row.visa_type,
            codeType, codeResult.rows[0].employee_code, row.joined_at, row.notes,
            req.user!.id,
          ],
        );
        if (createResult.rows[0]) {
          inserted.push({ ...createResult.rows[0], source_row: row.source_row });
        } else {
          skipped.push({ phone: row.phone, source_row: row.source_row, reason: "Phone already exists for tenant" });
        }
      }

      const validationFailures = Number(job.rows_failed || 0);
      const rowsFailed = validationFailures + skipped.length;
      const finalStatus = importStatus(inserted.length, rowsFailed);
      await client.query(
        `UPDATE import_jobs
         SET status=$1, stage='COMMITTED', rows_success=$2, rows_failed=$3,
             error_summary=$4, preview_rows=NULL, committed_at=now()
         WHERE tenant_id=$5 AND id=$6`,
        [
          finalStatus,
          inserted.length,
          rowsFailed,
          skipped.length ? skipped.map((item) => `row ${item.source_row}: ${item.reason}`).join("; ") : job.error_summary,
          req.tenantId!,
          jobId,
        ],
      );

      await client.query(
        `INSERT INTO audit_log(
           tenant_id, actor_user_id, action, entity_type, entity_id, notes,
           before_json, after_json, ip, user_agent
         ) VALUES ($1,$2,'IMPORT_ONBOARDING_COMMITTED','IMPORT_JOB',$3,$4,$5::jsonb,$6::jsonb,$7,$8)`,
        [
          req.tenantId!, req.user!.id, jobId, body.notes,
          JSON.stringify({ stage: "PREVIEWED", status: job.status }),
          JSON.stringify({ stage: "COMMITTED", status: finalStatus, inserted, skipped }),
          req.ip || null,
          req.headers["user-agent"] || null,
        ],
      );

      await client.query("COMMIT");
      res.json({
        ok: inserted.length > 0,
        job_id: jobId,
        status: finalStatus,
        inserted_count: inserted.length,
        skipped_count: skipped.length,
        validation_failure_count: validationFailures,
        inserted,
        skipped,
      });
    } catch (err) {
      if (client) await client.query("ROLLBACK").catch(() => undefined);
      next(err);
    } finally {
      client?.release();
    }
  },
);

export default router;
