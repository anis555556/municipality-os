import { prisma } from "@/lib/prisma";
export async function audit(input: { municipalityId?: string | null; actorId?: string | null; action: string; entity: string; entityId?: string | null; metadata?: Record<string, unknown>; ipAddress?: string | null }) {
  await prisma.auditLog.create({ data: { municipalityId: input.municipalityId ?? null, actorId: input.actorId ?? null, action: input.action, entity: input.entity, entityId: input.entityId ?? null, metadata: (input.metadata ?? {}) as object, ipAddress: input.ipAddress ?? null } });
}
