import { Role } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { apiError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { resolveMunicipality } from "@/lib/tenant";

const settingsSchema = z.object({ name: z.string().trim().min(2).max(160), description: z.string().max(2000), phone: z.string().max(50), email: z.email().max(254), address: z.string().max(300), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), logoUrl: z.union([z.url(), z.literal("")]).optional(), brandPrimary: z.string().regex(/^#[\da-fA-F]{6}$/), brandSecondary: z.string().regex(/^#[\da-fA-F]{6}$/), businessHours: z.string().trim().max(120).default(""), mapZoom: z.number().min(10).max(18).default(14.8) });
export async function GET(request: Request) {
  try {
    const municipality = await resolveMunicipality(request);
    if (!municipality) return json({ error: "البلدية غير مهيأة" }, 404);
    const user = await getCurrentUser();
    return json({ municipality: { id: municipality.id, name: municipality.name, slug: municipality.slug, description: municipality.description, phone: municipality.phone, email: municipality.email, address: municipality.address, latitude: municipality.latitude, longitude: municipality.longitude, logoUrl: municipality.logoUrl, brandPrimary: municipality.brandPrimary, brandSecondary: municipality.brandSecondary, settings: municipality.settings }, isDemo: true, demoLabel: "بيانات تجريبية — Demo Data", canManage: Boolean(user && (user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN) && (user.role === Role.SUPER_ADMIN || user.municipalityId === municipality.id)) });
  } catch (error) { return apiError(error); }
}
export async function PATCH(request: Request) {
  try {
    const actor = await requireUser([Role.ADMIN, Role.SUPER_ADMIN]);
    const municipality = await resolveMunicipality(request);
    if (!municipality) return json({ error: "البلدية غير مهيأة" }, 404);
    if (actor.role !== Role.SUPER_ADMIN && actor.municipalityId !== municipality.id) return json({ error: "ليست لديك صلاحية لهذه البلدية" }, 403);
    const { businessHours, mapZoom, ...data } = settingsSchema.parse(await request.json());
    const currentSettings = municipality.settings && typeof municipality.settings === "object" && !Array.isArray(municipality.settings) ? municipality.settings as Record<string, unknown> : {};
    const updated = await prisma.municipality.update({ where: { id: municipality.id }, data: { ...data, settings: { ...currentSettings, businessHours, mapZoom } } });
    await audit({ municipalityId: updated.id, actorId: actor.id, action: "UPDATE_SETTINGS", entity: "Municipality", entityId: updated.id });
    return json({ municipality: updated });
  } catch (error) { return apiError(error); }
}
