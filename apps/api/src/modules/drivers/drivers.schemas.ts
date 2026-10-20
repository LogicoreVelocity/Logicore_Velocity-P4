import { z } from "zod";

export const CreateDriverSchema = z.object({
  full_name: z.string().min(2),
  phone: z.string().min(7),
  email: z.string().email().optional(),
  visa_type: z.enum(["OWN_VISA","NEED_VISA","NEED_VISA_AND_LICENSE"]),
  joined_at: z.string().optional(), // YYYY-MM-DD
  notes: z.string().min(1),
});

export const TransitionSchema = z.object({
  to_status: z.string().min(1),
  reason: z.string().min(1),
  notes: z.string().min(1),
});
