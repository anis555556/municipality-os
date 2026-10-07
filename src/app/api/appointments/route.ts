import { Role, AppointmentStatus, NotificationType } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { requireUser } from "@/lib/auth";
import { apiError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireTenant } from "@/lib/tenant";
import { appointmentSchema } from "@/lib/validation";
export async function POST(request: Request) {
  try {
    const actor = await requireUser([Role.CITIZEN]); await enforceRateLimit(`appointment:${actor.id}`, 6, 60 * 60_000); const { municipality } = await requireTenant(request, true);
    const input = appointmentSchema.parse(await request.json()); const startsAt = new Date(input.startsAt);
    if (startsAt <= new Date() || startsAt.getTime() > Date.now() + 90 * 24 * 3600_000) return json({ error: "اختر موعدًا خلال التسعين يومًا القادمة" }, 400);
    const referenceNo = `APT-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`;
    const data = await prisma.appointment.create({ data: { municipalityId: municipality.id, citizenId: actor.id, serviceName: input.serviceName, startsAt, notes: input.notes, referenceNo, status: AppointmentStatus.REQUESTED } });
    await prisma.notification.create({ data: { municipalityId: municipality.id, userId: actor.id, title: "تم تسجيل طلب الموعد", body: `رقم المتابعة ${referenceNo}`, type: NotificationType.APPOINTMENT } });
    await audit({ municipalityId: municipality.id, actorId: actor.id, action: "CREATE", entity: "Appointment", entityId: data.id });
    return json({ data }, 201);
  } catch (error) { return apiError(error); }
}
