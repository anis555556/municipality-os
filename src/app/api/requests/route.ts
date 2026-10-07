import { Prisma, Role, RequestStatus, NotificationType } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { apiError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { clientAddress, enforceRateLimit } from "@/lib/rate-limit";
import { requireTenant } from "@/lib/tenant";
import { requestSchema } from "@/lib/validation";
export async function POST(request: Request) {
  try {
    const actor = await requireUser([Role.CITIZEN]); await enforceRateLimit(`request:${actor.id}`, 10, 60 * 60_000);
    const { municipality } = await requireTenant(request, true); const input = requestSchema.parse(await request.json());
    const service = await prisma.service.findFirst({ where: { id: input.serviceId, municipalityId: municipality.id, status: "ACTIVE" } });
    if (!service) return json({ error: "الخدمة غير متاحة" }, 404);
    const referenceNo = `BR-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
    const created = await prisma.serviceRequest.create({ data: { municipalityId: municipality.id, serviceId: service.id, citizenId: actor.id, referenceNo, title: input.title, description: input.description, payload: input.payload as Prisma.InputJsonValue, timeline: { create: { status: RequestStatus.NEW, message: "تم استلام الطلب وإضافته إلى قائمة المراجعة." } } }, include: { service: true, timeline: true } });
    await prisma.notification.create({ data: { municipalityId: municipality.id, userId: actor.id, title: "تم استلام طلبك", body: `رقم المتابعة ${referenceNo}`, type: NotificationType.REQUEST_UPDATE } });
    await audit({ municipalityId: municipality.id, actorId: actor.id, action: "CREATE", entity: "ServiceRequest", entityId: created.id, ipAddress: clientAddress(request) });
    return json({ data: created, demoLabel: "بيانات تجريبية — Demo Data" }, 201);
  } catch (error) { return apiError(error); }
}
