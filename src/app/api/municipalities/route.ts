import { Role } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { apiError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
const municipalitySchema = z.object({ name: z.string().trim().min(2).max(160), slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,60}$/), description: z.string().max(2000).default(""), phone: z.string().max(50).default(""), email: z.email().max(254).default(""), address: z.string().max(300).default(""), latitude: z.number().min(-90).max(90).default(31.4394), longitude: z.number().min(-180).max(180).default(34.4032), brandPrimary: z.string().regex(/^#[\da-fA-F]{6}$/).default("#D71920"), brandSecondary: z.string().regex(/^#[\da-fA-F]{6}$/).default("#009B4D") });
export async function GET() {
  try { await requireUser([Role.SUPER_ADMIN]); const data = await prisma.municipality.findMany({ select: { id: true, name: true, slug: true, createdAt: true } }); return json({ data }); }
  catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try { const actor = await requireUser([Role.SUPER_ADMIN]); const input = municipalitySchema.parse(await request.json()); const data = await prisma.municipality.create({ data: input }); await audit({ municipalityId: data.id, actorId: actor.id, action: "CREATE", entity: "Municipality", entityId: data.id }); return json({ data }, 201); }
  catch (error) { return apiError(error); }
}
