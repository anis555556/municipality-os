import { Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { isStaffRole, requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { apiError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { validateResourceData } from "@/lib/validation";
import { z } from "zod";

type Delegate = { findFirst(args: unknown): Promise<Record<string, unknown> | null>; update(args: unknown): Promise<Record<string, unknown>>; delete(args: unknown): Promise<Record<string, unknown>> };
const modelByResource: Record<string, string> = { services: "service", projects: "project", facilities: "facility", news: "news", events: "event", announcements: "announcement", surveys: "survey", proposals: "proposal", requests: "serviceRequest", complaints: "complaint", appointments: "appointment", notifications: "notification", employees: "employee", users: "user", "audit-log": "auditLog" };
const publicWhere: Record<string, Record<string, unknown>> = { services: { status: "ACTIVE" }, news: { status: "PUBLISHED" }, events: { status: "PUBLISHED" }, announcements: { status: "PUBLISHED" }, surveys: { status: "OPEN" } };
const editFields: Record<string, string[]> = {
  services: ["slug", "name", "category", "description", "requirements", "documents", "steps", "durationDays", "feeIls", "status", "icon"],
  projects: ["slug", "name", "description", "imageUrl", "latitude", "longitude", "progress", "status", "startsAt", "endsAt", "budgetIls", "contractor"],
  facilities: ["slug", "name", "category", "description", "address", "latitude", "longitude", "hours", "phone"],
  news: ["slug", "title", "excerpt", "body", "imageUrl", "status", "publishedAt"], events: ["slug", "title", "description", "locationName", "latitude", "longitude", "startsAt", "endsAt", "status"],
  announcements: ["title", "body", "priority", "status", "publishedAt", "expiresAt"], surveys: ["title", "description", "status", "endsAt", "options"], complaints: ["status"],
  requests: ["status"], proposals: ["status"], appointments: ["status", "startsAt", "notes"], notifications: ["title", "body", "type", "userId", "readAt"], employees: ["name", "department", "title"], users: ["name", "email", "phone", "role", "isActive", "password"]
};
function delegate(name: string) { return (prisma as unknown as Record<string, Delegate>)[name]; }
async function syncPoint(resource: string, id: string, latitude: number, longitude: number) {
  if (resource === "projects") await prisma.$executeRaw`UPDATE "Project" SET location = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326) WHERE id = ${id}`;
  if (resource === "facilities") await prisma.$executeRaw`UPDATE "Facility" SET location = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326) WHERE id = ${id}`;
}
function clean(resource: string, body: Record<string, unknown>) { const allowed = editFields[resource] ?? []; return Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key))); }

export async function GET(request: Request, { params }: { params: Promise<{ resource: string; id: string }> }) {
  try {
    const { resource, id } = await params; const model = modelByResource[resource]; if (!model) return json({ error: "المورد غير متاح" }, 404);
    const { municipality, user } = await requireTenant(request);
    const staff = Boolean(user && isStaffRole(user.role) && (user.role === Role.SUPER_ADMIN || user.municipalityId === municipality.id));
    const privateResource = ["requests", "complaints", "appointments", "notifications", "proposals", "employees", "users", "audit-log"].includes(resource);
    if (privateResource && !user) throw new Error("UNAUTHORIZED");
    if (["employees", "audit-log"].includes(resource) && !staff) throw new Error("FORBIDDEN");
    if (["users", "audit-log"].includes(resource) && user?.role !== Role.ADMIN && user?.role !== Role.SUPER_ADMIN) throw new Error("FORBIDDEN");
    if (resource === "users" && !staff && user?.id !== id) throw new Error("FORBIDDEN");
    const where: Record<string, unknown> = { id, municipalityId: municipality.id, ...(publicWhere[resource] || {}) };
    if (["requests", "complaints", "appointments", "proposals"].includes(resource) && !staff) where.citizenId = user?.id ?? "";
    if (resource === "notifications" && !staff) where.OR = [{ userId: user?.id ?? "" }, { userId: null }];
    const data = await delegate(model).findFirst({ where, ...(["requests", "complaints"].includes(resource) ? { include: { ...(resource === "requests" ? { service: true } : {}), timeline: { orderBy: { createdAt: "asc" } } } } : {}), ...(resource === "users" ? { select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true } } : {}) });
    return data ? json({ data }) : json({ error: "العنصر غير موجود" }, 404);
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ resource: string; id: string }> }) {
  try {
    const { resource, id } = await params; const model = modelByResource[resource]; if (!model) return json({ error: "المورد غير متاح" }, 404);
    const actor = await requireUser([Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR, Role.STAFF, Role.CITIZEN]);
    const { municipality } = await requireTenant(request, true);
    if (actor.role === Role.CITIZEN && resource !== "notifications") throw new Error("FORBIDDEN");
    if (actor.role === Role.STAFF && !["requests", "complaints", "appointments"].includes(resource)) throw new Error("FORBIDDEN");
    if (actor.role === Role.EDITOR && !["services", "projects", "facilities", "news", "events", "announcements", "surveys"].includes(resource)) throw new Error("FORBIDDEN");
    const body = await request.json() as Record<string, unknown>; const picked = clean(resource, body);
    if (!Object.keys(picked).length) return json({ error: "لا توجد حقول قابلة للتعديل" }, 400);
    if (actor.role === Role.CITIZEN && Object.keys(picked).some((key) => key !== "readAt")) throw new Error("FORBIDDEN");
    let data: Record<string, unknown>;
    if (resource === "requests") data = z.object({ status: z.enum(["NEW", "UNDER_REVIEW", "IN_PROGRESS", "WAITING_CITIZEN", "COMPLETED", "REJECTED", "CANCELLED"]) }).parse(picked);
    else if (resource === "complaints") data = z.object({ status: z.enum(["NEW", "RECEIVED", "PROCESSING", "RESOLVED", "REJECTED"]) }).parse(picked);
    else if (resource === "proposals") data = z.object({ status: z.enum(["RECEIVED", "REVIEWING", "ACCEPTED", "DECLINED"]) }).parse(picked);
    else if (resource === "appointments") data = z.object({ status: z.enum(["REQUESTED", "CONFIRMED", "COMPLETED", "CANCELLED"]).optional(), startsAt: z.coerce.date().optional(), notes: z.string().max(1000).optional() }).parse(picked);
    else if (resource === "notifications") data = { ...validateResourceData(resource, picked, true) as Record<string, unknown>, ...(picked.readAt !== undefined ? { readAt: picked.readAt === null ? null : z.coerce.date().parse(picked.readAt) } : {}) };
    else if (resource === "users") { const input = z.object({ name: z.string().trim().min(2).max(120).optional(), email: z.email().max(254).transform((value) => value.toLowerCase()).optional(), phone: z.string().max(40).optional(), role: z.nativeEnum(Role).optional(), isActive: z.boolean().optional(), password: z.string().min(12).max(128).regex(/[A-Za-z]/).regex(/[0-9]/).optional() }).parse(picked); const { password, ...profile } = input; data = { ...profile, ...(password ? { passwordHash: await hash(password, 12) } : {}) }; }
    else data = validateResourceData(resource, picked, true) as Record<string, unknown>;
    if (resource === "notifications" && typeof data.userId === "string" && data.userId) {
      const target = await prisma.user.findFirst({ where: { id: data.userId, municipalityId: municipality.id }, select: { id: true } });
      if (!target) return json({ error: "المستخدم المحدد لا ينتمي إلى هذه البلدية" }, 400);
    }
    if (resource === "users" && actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) throw new Error("FORBIDDEN");
    if (resource === "users" && data.role === Role.SUPER_ADMIN && actor.role !== Role.SUPER_ADMIN) throw new Error("FORBIDDEN");
    const existing = await delegate(model).findFirst({ where: { id, municipalityId: municipality.id } });
    if (!existing) return json({ error: "العنصر غير موجود" }, 404);
    if (actor.role === Role.CITIZEN && existing.userId !== actor.id) throw new Error("FORBIDDEN");
    if (resource === "users" && existing.id === actor.id && (data.role !== undefined || data.isActive === false)) throw new Error("FORBIDDEN");
    let updated: Record<string, unknown>;
    if (resource === "surveys" && Array.isArray(data.options)) {
      const options = data.options as string[]; const surveyData = { ...data }; delete surveyData.options;
      updated = await prisma.$transaction(async (tx) => {
        if (await tx.surveyResponse.count({ where: { surveyId: id } }) > 0) throw new Error("SURVEY_HAS_RESPONSES");
        await tx.surveyOption.deleteMany({ where: { surveyId: id } });
        if (options.length) await tx.surveyOption.createMany({ data: options.map((label) => ({ surveyId: id, label })) });
        return tx.survey.update({ where: { id }, data: surveyData, include: { options: true } });
      }, { isolationLevel: "Serializable" }) as unknown as Record<string, unknown>;
    } else updated = await delegate(model).update({ where: { id }, data });
    if (["projects", "facilities"].includes(resource) && (data.latitude !== undefined || data.longitude !== undefined)) {
      await syncPoint(resource, id, Number(data.latitude ?? existing.latitude), Number(data.longitude ?? existing.longitude));
    }
    if (resource === "requests" && data.status && data.status !== existing.status) {
      const status = data.status as import("@prisma/client").RequestStatus;
      await prisma.requestEvent.create({ data: { requestId: id, status, message: `تم تحديث حالة الطلب إلى ${statusLabel(status)}.`, actorId: actor.id } });
      await prisma.notification.create({ data: { municipalityId: municipality.id, userId: String(existing.citizenId), title: "تحديث على طلبك", body: `الحالة الجديدة: ${statusLabel(status)}`, type: "REQUEST_UPDATE" } });
    }
    if (resource === "complaints" && data.status && data.status !== existing.status) {
      const status = data.status as import("@prisma/client").ComplaintStatus;
      await prisma.complaintEvent.create({ data: { complaintId: id, status, message: `تم تحديث حالة الشكوى إلى ${statusLabel(status)}.`, actorId: actor.id } });
      await prisma.notification.create({ data: { municipalityId: municipality.id, userId: String(existing.citizenId), title: "تحديث على شكواك", body: `الحالة الجديدة: ${statusLabel(status)}`, type: "COMPLAINT_UPDATE" } });
    }
    if (resource === "appointments" && data.status && data.status !== existing.status) {
      await prisma.notification.create({ data: { municipalityId: municipality.id, userId: String(existing.citizenId), title: "تحديث على موعدك", body: `الحالة الجديدة: ${statusLabel(String(data.status))}`, type: "APPOINTMENT" } });
    }
    await audit({ municipalityId: municipality.id, actorId: actor.id, action: "UPDATE", entity: model, entityId: id, metadata: { fields: Object.keys(data).filter((field) => field !== "passwordHash") } });
    return json({ data: updated });
  } catch (error) { return apiError(error); }
}

function statusLabel(value: string) { const labels: Record<string, string> = { NEW: "جديد", UNDER_REVIEW: "قيد المراجعة", IN_PROGRESS: "قيد التنفيذ", WAITING_CITIZEN: "بانتظار المواطن", COMPLETED: "مكتمل", REJECTED: "مرفوض", CANCELLED: "ملغي", RECEIVED: "تم الاستلام", PROCESSING: "قيد المعالجة", RESOLVED: "تم الحل" }; return labels[value] || value; }

export async function DELETE(request: Request, { params }: { params: Promise<{ resource: string; id: string }> }) {
  try {
    const { resource, id } = await params; const model = modelByResource[resource]; if (!model) return json({ error: "المورد غير متاح" }, 404);
    if (resource === "audit-log") return json({ error: "سجل التدقيق للقراءة فقط" }, 405);
    const actor = await requireUser([Role.SUPER_ADMIN, Role.ADMIN]);
    const { municipality } = await requireTenant(request, true);
    const existing = await delegate(model).findFirst({ where: { id, municipalityId: municipality.id } });
    if (!existing) return json({ error: "العنصر غير موجود" }, 404);
    if (resource === "users" && existing.id === actor.id) return json({ error: "لا يمكن حذف حسابك الحالي" }, 409);
    if (resource === "users" && existing.role === Role.SUPER_ADMIN && actor.role !== Role.SUPER_ADMIN) throw new Error("FORBIDDEN");
    await delegate(model).delete({ where: { id } });
    await audit({ municipalityId: municipality.id, actorId: actor.id, action: "DELETE", entity: model, entityId: id });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
