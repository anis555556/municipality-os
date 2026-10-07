import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { getCurrentUser, isStaffRole, requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { apiError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { validateResourceData } from "@/lib/validation";

type Delegate = { findMany(args: unknown): Promise<unknown[]>; create(args: unknown): Promise<Record<string, unknown>> };
const resourceModels: Record<string, { delegate: string; public: boolean }> = {
  services: { delegate: "service", public: true }, projects: { delegate: "project", public: true }, facilities: { delegate: "facility", public: true },
  news: { delegate: "news", public: true }, events: { delegate: "event", public: true }, announcements: { delegate: "announcement", public: true },
  surveys: { delegate: "survey", public: true }, proposals: { delegate: "proposal", public: false }, requests: { delegate: "serviceRequest", public: false }, complaints: { delegate: "complaint", public: false },
  appointments: { delegate: "appointment", public: false }, notifications: { delegate: "notification", public: false }, employees: { delegate: "employee", public: false },
  users: { delegate: "user", public: false }, "audit-log": { delegate: "auditLog", public: false }
};
const allowedFields: Record<string, string[]> = {
  services: ["slug", "name", "category", "description", "requirements", "documents", "steps", "durationDays", "feeIls", "status", "icon"],
  projects: ["slug", "name", "description", "imageUrl", "latitude", "longitude", "progress", "status", "startsAt", "endsAt", "budgetIls", "contractor"],
  facilities: ["slug", "name", "category", "description", "address", "latitude", "longitude", "hours", "phone"],
  news: ["slug", "title", "excerpt", "body", "imageUrl", "status", "publishedAt"],
  events: ["slug", "title", "description", "locationName", "latitude", "longitude", "startsAt", "endsAt", "status"],
  announcements: ["title", "body", "priority", "status", "publishedAt", "expiresAt"],
  surveys: ["title", "description", "status", "endsAt", "options"], proposals: ["status"], employees: ["name", "department", "title", "userId"],
  users: ["name", "email", "phone", "role", "isActive"], notifications: ["title", "body", "type", "userId"],
};
const publicWhere: Record<string, object> = { services: { status: "ACTIVE" }, news: { status: "PUBLISHED" }, events: { status: "PUBLISHED" }, announcements: { status: "PUBLISHED" }, surveys: { status: "OPEN" } };
function delegate(name: string) { return (prisma as unknown as Record<string, Delegate>)[name]; }
async function syncPoint(resource: string, id: string, latitude: number, longitude: number) {
  if (resource === "projects") await prisma.$executeRaw`UPDATE "Project" SET location = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326) WHERE id = ${id}`;
  if (resource === "facilities") await prisma.$executeRaw`UPDATE "Facility" SET location = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326) WHERE id = ${id}`;
}
function pickData(resource: string, body: Record<string, unknown>) {
  const allowed = allowedFields[resource] ?? [];
  return Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)));
}

export async function GET(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  try {
    const { resource } = await params;
    const config = resourceModels[resource];
    if (!config) return json({ error: "المورد غير متاح" }, 404);
    const { municipality } = await requireTenant(request);
    const user = await getCurrentUser();
    const staff = Boolean(user && isStaffRole(user.role) && (user.role === Role.SUPER_ADMIN || user.municipalityId === municipality.id));
    if (!config.public && !staff && !user) throw new Error("UNAUTHORIZED");
    if (["users", "employees", "audit-log"].includes(resource) && !staff) throw new Error("FORBIDDEN");
    if (["users", "audit-log"].includes(resource) && user?.role !== Role.ADMIN && user?.role !== Role.SUPER_ADMIN) throw new Error("FORBIDDEN");
    const where: Record<string, unknown> = { municipalityId: municipality.id, ...(config.public && !staff ? publicWhere[resource] : {}) };
    if (["requests", "complaints", "appointments", "proposals"].includes(resource) && !staff) where.citizenId = user!.id;
    if (resource === "notifications" && !staff) where.OR = [{ userId: user!.id }, { userId: null }];
    const requestedTake = Number(new URL(request.url).searchParams.get("limit") || 100);
    const take = Number.isFinite(requestedTake) ? Math.max(1, Math.min(requestedTake, 200)) : 100;
    const rows = await delegate(config.delegate).findMany({ where, orderBy: { createdAt: "desc" }, take, ...(["requests", "complaints"].includes(resource) ? { include: { ...(resource === "requests" ? { service: true } : {}), timeline: { orderBy: { createdAt: "asc" } } } } : {}), ...(resource === "surveys" ? { include: { options: { include: { _count: { select: { responses: true } } } } } } : {}), ...(resource === "users" ? { select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true, municipalityId: true } } : {}) });
    return json({ data: rows, demoLabel: "بيانات تجريبية — Demo Data" });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  try {
    const { resource } = await params;
    const config = resourceModels[resource];
    if (!config) return json({ error: "المورد غير متاح" }, 404);
    const actor = await requireUser([Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR]);
    const { municipality } = await requireTenant(request, true);
    if (actor.role === Role.EDITOR && !["services", "projects", "facilities", "news", "events", "announcements", "surveys"].includes(resource)) throw new Error("FORBIDDEN");
    if (resource === "users" && actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) throw new Error("FORBIDDEN");
    const body = await request.json() as Record<string, unknown>;
    if (resource === "users") {
      if (typeof body.name !== "string" || body.name.trim().length < 2 || typeof body.email !== "string" || typeof body.password !== "string") return json({ error: "أدخل الاسم والبريد وكلمة مرور صالحة" }, 400);
      const { passwordSchema, emailSchema } = await import("@/lib/validation");
      const email = emailSchema.parse(body.email); const password = passwordSchema.parse(body.password);
      const requestedRole = Object.values(Role).includes(body.role as Role) ? body.role as Role : Role.CITIZEN;
      if (requestedRole === Role.SUPER_ADMIN && actor.role !== Role.SUPER_ADMIN) throw new Error("FORBIDDEN");
      if (requestedRole === Role.ADMIN && actor.role !== Role.SUPER_ADMIN) throw new Error("FORBIDDEN");
      if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) return json({ error: "البريد الإلكتروني مستخدم بالفعل" }, 409);
      const created = await prisma.user.create({ data: { municipalityId: requestedRole === Role.SUPER_ADMIN ? null : municipality.id, name: body.name.trim().slice(0, 120), email, phone: typeof body.phone === "string" ? body.phone.slice(0, 40) : "", role: requestedRole, passwordHash: await hash(password, 12) }, select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true } });
      await audit({ municipalityId: municipality.id, actorId: actor.id, action: "CREATE", entity: "User", entityId: created.id });
      return NextResponse.json({ data: created }, { status: 201 });
    }
    const picked = pickData(resource, body);
    if (Object.keys(picked).length === 0) return json({ error: "لا توجد حقول صالحة للحفظ" }, 400);
    let data = validateResourceData(resource, picked) as Record<string, unknown>;
    if (["notifications", "employees"].includes(resource) && typeof data.userId === "string" && data.userId) {
      const target = await prisma.user.findFirst({ where: { id: data.userId, municipalityId: municipality.id }, select: { id: true } });
      if (!target) return json({ error: "المستخدم المحدد لا ينتمي إلى هذه البلدية" }, 400);
    }
    if (resource === "surveys") { const { options, ...surveyFields } = data; data = { ...surveyFields, ...(Array.isArray(options) && options.length ? { options: { create: options.map((label) => ({ label })) } } : {}) }; }
    const created = await delegate(config.delegate).create({ data: { ...data, municipalityId: municipality.id } });
    if (["projects", "facilities"].includes(resource)) await syncPoint(resource, String(created.id), Number(created.latitude), Number(created.longitude));
    await audit({ municipalityId: municipality.id, actorId: actor.id, action: "CREATE", entity: config.delegate, entityId: String(created.id) });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) { return apiError(error); }
}
