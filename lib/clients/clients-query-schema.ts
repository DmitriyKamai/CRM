import { z } from "zod";

export const getClientsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(20).max(50).default(20),
  statusId: z.string().min(1).optional(),
  q: z.string().trim().min(2).max(100).optional()
});

export type GetClientsQuery = z.infer<typeof getClientsQuerySchema>;
