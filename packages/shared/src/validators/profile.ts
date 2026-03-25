import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, "Name must be at least 1 character")
    .max(100, "Name must be at most 100 characters")
    .optional(),
  image: z.string().url("Invalid image URL").nullable().optional(),
});

export type UpdateProfileSchemaInput = z.infer<typeof updateProfileSchema>;
