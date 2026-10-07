import { ComplaintStatus, Role } from "@prisma/client";
import { getCurrentUser, isStaffRole } from "@/lib/auth";
import { demoFacilities, demoProjects, mapCenter } from "@/lib/demo-data";
import { apiError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { resolveMunicipality } from "@/lib/tenant";
export async function GET(request: Request) {
  try {
    const municipality = await resolveMunicipality(request);
    if (!municipality) return json({ center: mapCenter, zoom: 14.8, projects: demoProjects, facilities: demoFacilities, complaints: [], demoLabel: "بيانات تجريبية — Demo Data" });
    const user = await getCurrentUser();
    const staffForTenant = Boolean(user && isStaffRole(user.role) && (user.role === Role.SUPER_ADMIN || user.municipalityId === municipality.id));
    const mayViewComplaints = Boolean(user && (staffForTenant || user.role === Role.CITIZEN && user.municipalityId === municipality.id));
    const complaintStatuses = [ComplaintStatus.NEW, ComplaintStatus.RECEIVED, ComplaintStatus.PROCESSING];
    const complaintWhere = staffForTenant ? { municipalityId: municipality.id, status: { in: complaintStatuses } } : { municipalityId: municipality.id, citizenId: user?.id ?? "", status: { in: complaintStatuses } };
    const [projects, facilities, complaints] = await Promise.all([
      prisma.project.findMany({ where: { municipalityId: municipality.id }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.facility.findMany({ where: { municipalityId: municipality.id }, orderBy: { category: "asc" }, take: 200 }),
      mayViewComplaints ? prisma.complaint.findMany({ where: complaintWhere, select: { id: true, title: true, category: true, latitude: true, longitude: true, status: true }, take: 200 }) : Promise.resolve([])
    ]);
    const settings = municipality.settings && typeof municipality.settings === "object" && !Array.isArray(municipality.settings) ? municipality.settings as Record<string, unknown> : {};
    const projectFeatures = projects.map((item) => ({ id: item.id, name: item.name, category: "مشروع بلدي", description: item.description, longitude: item.longitude, latitude: item.latitude, status: item.status, progress: item.progress }));
    const facilityFeatures = facilities.map((item) => ({ id: item.id, name: item.name, category: item.category, description: item.description, longitude: item.longitude, latitude: item.latitude, status: "نشط" }));
    const complaintFeatures = complaints.map((item) => ({ id: item.id, name: item.title, category: "بلاغ", description: `${item.category} · ${item.status}`, longitude: item.longitude, latitude: item.latitude, status: item.status }));
    const showBureijSeed = municipality.slug === (process.env.DEFAULT_MUNICIPALITY_SLUG || "al-bureij");
    return json({ center: { longitude: municipality.longitude, latitude: municipality.latitude }, zoom: typeof settings.mapZoom === "number" ? settings.mapZoom : 14.8, projects: projectFeatures.length || !showBureijSeed ? projectFeatures : demoProjects, facilities: facilityFeatures.length || !showBureijSeed ? facilityFeatures : demoFacilities, complaints: complaintFeatures, demoLabel: "بيانات تجريبية — Demo Data" });
  } catch (error) { return apiError(error); }
}
