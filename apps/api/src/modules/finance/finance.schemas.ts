import { z } from "zod";

export const CreateTxSchema = z.object({
  driver_id: z.string().uuid().optional(),
  tx_type: z.enum(["PAYABLE","RECEIVABLE"]),
  category_id: z.string().uuid(),
  subcategory_id: z.string().uuid(),
  amount: z.number().nonnegative(),
  currency: z.string().min(1).default("AED"),
  effective_date: z.string().min(10),
  external_ref: z.string().optional(),
  notes: z.string().min(1),
});

export const EditRequestSchema = z.object({
  proposed_changes: z.record(z.any()),
  notes: z.string().min(1),
});
