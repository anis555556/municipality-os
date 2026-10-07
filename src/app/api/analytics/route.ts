import { Role, RequestStatus, ComplaintStatus } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { apiError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
export async function GET(request: Request) {
  try {
    const user = await requireUser([Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR, Role.STAFF]); const { municipality } = await requireTenant(request, true);
    const [requests, complaints, projects, services, users] = await Promise.all([
      prisma.serviceRequest.groupBy({ by: ["status"], where: { municipalityId: municipality.id }, _count: { _all: true } }),
      prisma.complaint.groupBy({ by: ["status"], where: { municipalityId: municipality.id }, _count: { _all: true } }),
      prisma.project.count({ where: { municipalityId: municipality.id } }), prisma.service.count({ where: { municipalityId: municipality.id, status: "ACTIVE" } }),
      user.role === Role.ADMIN || user.role === Role.SUPER_ADMIN ? prisma.user.count({ where: { municipalityId: municipality.id } }) : Promise.resolve(null)
    ]);
    const count = (rows: { status: string; _count: { _all: number } }[], statuses: string[]) => Object.fromEntries(statuses.map((status) => [status, rows.find((x) => x.status === status)?._count._all || 0]));
    return json({ data: { requests: count(requests, Object.values(RequestStatus)), complaints: count(complaints, Object.values(ComplaintStatus)), projects, services, users, label: "بيانات تجريبية — Demo Data" } });
  } catch (error) { return apiError(error); }
}
