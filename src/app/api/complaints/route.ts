import { Role, ComplaintStatus, NotificationType } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { apiError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireTenant } from "@/lib/tenant";
import { complaintSchema } from "@/lib/validation";
export async function POST(request: Request) {
  try {
    const actor = await requireUser([Role.CITIZEN]); await enforceRateLimit(`complaint:${actor.id}`, 8, 60 * 60_000);
    const { municipality } = await requireTenant(request, true); const input = complaintSchema.parse(await request.json());
    const referenceNo = `BLG-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
    const created = await prisma.complaint.create({ data: { municipalityId: municipality.id, citizenId: actor.id, referenceNo, title: input.title, description: input.description, category: input.category, latitude: input.latitude, longitude: input.longitude, imageUrls: input.imageUrls, status: ComplaintStatus.NEW, timeline: { create: { status: ComplaintStatus.NEW, message: "تم استلام البلاغ وإضافته إلى قائمة المراجعة." } } } });
    await prisma.$executeRaw`UPDATE "Complaint" SET location = ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326) WHERE id = ${created.id}`;
    await prisma.notification.create({ data: { municipalityId: municipality.id, userId: actor.id, title: "تم استلام بلاغك", body: `رقم المتابعة ${referenceNo}`, type: NotificationType.COMPLAINT_UPDATE } });
    await audit({ municipalityId: municipality.id, actorId: actor.id, action: "CREATE", entity: "Complaint", entityId: created.id });
    return json({ data: created, demoLabel: "بيانات تجريبية — Demo Data" }, 201);
  } catch (error) { return apiError(error); }
}
