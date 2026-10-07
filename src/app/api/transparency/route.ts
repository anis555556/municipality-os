import { ComplaintStatus, PublicationStatus, RequestStatus, ServiceStatus } from "@prisma/client";
import { apiError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { resolveMunicipality } from "@/lib/tenant";
export async function GET(request: Request) {
  try {
    const municipality = await resolveMunicipality(request); if (!municipality) return json({ data: { requests: 12, complaints: 7, projects: 3, services: 8 }, demoLabel: "بيانات تجريبية — Demo Data" });
    const [requests, complaints, projects, services, news, events] = await Promise.all([
      prisma.serviceRequest.groupBy({ by: ["status"], where: { municipalityId: municipality.id }, _count: { _all: true } }),
      prisma.complaint.groupBy({ by: ["status"], where: { municipalityId: municipality.id }, _count: { _all: true } }),
      prisma.project.count({ where: { municipalityId: municipality.id } }), prisma.service.count({ where: { municipalityId: municipality.id, status: ServiceStatus.ACTIVE } }),
      prisma.news.count({ where: { municipalityId: municipality.id, status: PublicationStatus.PUBLISHED } }), prisma.event.count({ where: { municipalityId: municipality.id, status: PublicationStatus.PUBLISHED } })
    ]);
    const closedRequestStatuses = new Set<RequestStatus>([RequestStatus.COMPLETED, RequestStatus.REJECTED, RequestStatus.CANCELLED]);
    const closedComplaintStatuses = new Set<ComplaintStatus>([ComplaintStatus.RESOLVED, ComplaintStatus.REJECTED]);
    const openRequests = requests.filter((item) => !closedRequestStatuses.has(item.status)).reduce((sum, item) => sum + item._count._all, 0);
    const openComplaints = complaints.filter((item) => !closedComplaintStatuses.has(item.status)).reduce((sum, item) => sum + item._count._all, 0);
    return json({ data: { requests: openRequests, complaints: openComplaints, projects, services, news, events }, demoLabel: "بيانات تجريبية — Demo Data" });
  } catch (error) { return apiError(error); }
}
