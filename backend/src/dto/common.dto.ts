import { z } from "zod";

export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().max(120).optional(),
  sort: z.string().max(40).optional(),
});
