import { z } from "zod";
import { HttpError } from "../../shared/http";

export const OnboardingPreviewRowSchema = z.object({
  source_row: z.number().int().positive(),
  full_name: z.string().min(2).max(120),
  phone: z.string().min(7).max(32),
  email: z.string().email().nullable(),
  visa_type: z.enum(["OWN_VISA", "NEED_VISA", "NEED_VISA_AND_LICENSE"]),
  joined_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  notes: z.string().min(1).max(1000),
});

const PreviewErrorSchema = z.object({
  row: z.number().int().positive(),
  field: z.string(),
  code: z.string(),
  message: z.string(),
});

const ImportPreviewSchema = z.object({
  ok: z.boolean(),
  data_type: z.literal("ONBOARDING"),
  file_name: z.string(),
  file_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  headers: z.array(z.string()),
  expected_headers: z.array(z.string()),
  rows_total: z.number().int().nonnegative(),
  rows_valid: z.number().int().nonnegative(),
  rows_invalid: z.number().int().nonnegative(),
  rows: z.array(OnboardingPreviewRowSchema).max(5000),
  errors: z.array(PreviewErrorSchema).max(200),
  errors_truncated: z.boolean(),
});

export type ImportPreview = z.infer<typeof ImportPreviewSchema>;

function processorConfig() {
  const baseUrl = String(process.env.PYTHON_PROCESSOR_URL || "").replace(/\/$/, "");
  const token = String(process.env.PYTHON_PROCESSOR_TOKEN || "");
  if (!baseUrl || !token) {
    throw new HttpError(503, "Python processing service is not configured");
  }
  return { baseUrl, token };
}

export async function requestImportPreview(params: {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
  dataType: string;
}): Promise<ImportPreview> {
  const { baseUrl, token } = processorConfig();
  const form = new FormData();
  form.set("data_type", params.dataType);
  form.set(
    "file",
    new Blob([new Uint8Array(params.buffer)], { type: params.mimeType || "application/octet-stream" }),
    params.originalName,
  );

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.PYTHON_PROCESSOR_TIMEOUT_MS || 20_000),
  );

  try {
    const response = await fetch(`${baseUrl}/v1/imports/preview`, {
      method: "POST",
      headers: { "X-Service-Token": token },
      body: form,
      signal: controller.signal,
    });
    const payload: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new HttpError(response.status === 422 ? 400 : 502, payload.detail || "Python processing service rejected the file");
    }
    const parsed = ImportPreviewSchema.safeParse(payload);
    if (!parsed.success) {
      throw new HttpError(502, "Python processing service returned an invalid response");
    }
    return parsed.data;
  } catch (error: any) {
    if (error instanceof HttpError) throw error;
    if (error?.name === "AbortError") throw new HttpError(504, "Python processing service timed out");
    throw new HttpError(502, "Python processing service is unavailable");
  } finally {
    clearTimeout(timeout);
  }
}
