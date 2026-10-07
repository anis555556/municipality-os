import { PublicationStatus, ServiceStatus } from "@prisma/client";
import { apiError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { resolveMunicipality } from "@/lib/tenant";
import { enforceRateLimit, clientAddress } from "@/lib/rate-limit";
export async function GET(request: Request) {
  try {
    await enforceRateLimit(`search:${clientAddress(request)}`, 60, 60_000);
    const url = new URL(request.url); const q = (url.searchParams.get("q") || "").trim().slice(0, 100);
    if (q.length < 2) return json({ data: [] });
    const municipality = await resolveMunicipality(request); if (!municipality) return json({ data: [] });
    const contains = { contains: q, mode: "insensitive" as const };
    const [services, projects, facilities, news, events] = await Promise.all([
      prisma.service.findMany({ where: { municipalityId: municipality.id, status: ServiceStatus.ACTIVE, OR: [{ name: contains }, { description: contains }, { category: contains }] }, select: { id: true, name: true, description: true, slug: true }, take: 4 }),
      prisma.project.findMany({ where: { municipalityId: municipality.id, OR: [{ name: contains }, { description: contains }] }, select: { id: true, name: true, description: true }, take: 4 }),
      prisma.facility.findMany({ where: { municipalityId: municipality.id, OR: [{ name: contains }, { category: contains }] }, select: { id: true, name: true, category: true }, take: 4 }),
      prisma.news.findMany({ where: { municipalityId: municipality.id, status: PublicationStatus.PUBLISHED, OR: [{ title: contains }, { excerpt: contains }] }, select: { id: true, title: true, excerpt: true }, take: 4 }),
      prisma.event.findMany({ where: { municipalityId: municipality.id, status: PublicationStatus.PUBLISHED, title: contains }, select: { id: true, title: true, description: true }, take: 4 })
    ]);
    return json({ data: [...services.map((x) => ({ ...x, kind: "خدمة", href: `/services/${x.slug}` })), ...projects.map((x) => ({ ...x, kind: "مشروع", href: "/transparency" })), ...facilities.map((x) => ({ ...x, kind: "مرفق", href: "/city-guide" })), ...news.map((x) => ({ ...x, kind: "خبر", href: "/news" })), ...events.map((x) => ({ ...x, kind: "فعالية", href: "/events" }))] });
  } catch (error) { return apiError(error); }
}
