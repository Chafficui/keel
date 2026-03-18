import { z } from "zod";
import { CONSENT_TYPES } from "../types/consent.js";

export const consentInputSchema = z.object({
  consentType: z.enum(CONSENT_TYPES),
  granted: z.boolean(),
  version: z.string().min(1, "Version is required"),
});

export type ConsentInputSchemaInput = z.infer<typeof consentInputSchema>;
