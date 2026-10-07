import { Role, RequestStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { apiError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser([Role.CITIZEN]); const { municipality } = await requireTenant(request, true); const { id } = await params;
    const existing = await prisma.serviceRequest.findFirst({ where: { id, municipalityId: municipality.id, citizenId: user.id } });
    if (!existing) return json({ error: "الطلب غير موجود" }, 404);
    const cancellableStatuses = new Set<RequestStatus>([RequestStatus.NEW, RequestStatus.UNDER_REVIEW]);
    if (!cancellableStatuses.has(existing.status)) return json({ error: "لا يمكن إلغاء الطلب بعد بدء تنفيذه" }, 409);
    const updated = await prisma.serviceRequest.update({ where: { id }, data: { status: RequestStatus.CANCELLED, timeline: { create: { status: RequestStatus.CANCELLED, message: "ألغى المواطن الطلب." } } } });
    await audit({ municipalityId: municipality.id, actorId: user.id, action: "CANCEL", entity: "ServiceRequest", entityId: id });
    return json({ data: updated });
  } catch (error) { return apiError(error); }
}
