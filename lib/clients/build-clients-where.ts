import type { Prisma } from "@prisma/client";
import type { GetClientsQuery } from "@/lib/clients/clients-query-schema";

export function buildClientsWhere(
  psychologistId: string,
  query: Pick<GetClientsQuery, "statusId" | "q">
): Prisma.ClientProfileWhereInput {
  const { statusId, q } = query;

  return {
    psychologistId,
    ...(statusId ? { statusId } : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { user: { is: { email: { contains: q, mode: "insensitive" } } } }
          ]
        }
      : {})
  };
}
