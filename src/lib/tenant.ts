import { headers } from "next/headers";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function resolveMunicipality(request?: Request) {
  const h = request ? request.headers : await headers();
  const explicitSlug = h.get("x-municipality-slug");
  const slug = explicitSlug || process.env.DEFAULT_MUNICIPALITY_SLUG || "al-bureij";
  return prisma.municipality.findUnique({ where: { slug } });
}

export async function requireTenant(request: Request, requireMembership = false) {
  const municipality = await resolveMunicipality(request);
  if (!municipality) throw new Error("NOT_FOUND");
  const user = await getCurrentUser();
  if (requireMembership) {
    if (!user) throw new Error("UNAUTHORIZED");
    if (user.role !== Role.SUPER_ADMIN && user.municipalityId !== municipality.id) throw new Error("FORBIDDEN");
  }
  return { municipality, user };
}

export function effectiveTenantId(municipalityId: string, user: { role: Role; municipalityId: string | null }) {
  if (user.role === Role.SUPER_ADMIN) return municipalityId;
  if (user.municipalityId !== municipalityId) throw new Error("FORBIDDEN");
  return user.municipalityId;
}
