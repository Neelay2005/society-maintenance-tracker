import { z } from "zod";

export const complaintCategoryEnum = z.enum([
  "PLUMBING",
  "ELECTRICAL",
  "CLEANING",
  "SECURITY",
  "NOISE",
  "MAINTENANCE",
  "OTHER",
]);

export const priorityEnum = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const complaintCreateSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title cannot exceed 100 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: complaintCategoryEnum,
  priority: priorityEnum.optional().default("MEDIUM"),
  photoUrl: z.string().optional().nullable(),
});

export type ComplaintCreateInput = z.infer<typeof complaintCreateSchema>;
