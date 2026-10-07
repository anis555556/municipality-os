import { z } from "zod";

export const emailSchema = z.email().max(254).transform((value) => value.toLowerCase());
export const passwordSchema = z.string().min(12, "كلمة المرور يجب ألا تقل عن 12 حرفًا").max(128).regex(/[A-Za-z]/, "أضف حرفًا لاتينيًا").regex(/[0-9]/, "أضف رقمًا");
export const registerSchema = z.object({ name: z.string().trim().min(2).max(120), email: emailSchema, phone: z.string().trim().max(40).optional().default(""), password: passwordSchema });
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });
export const requestSchema = z.object({ serviceId: z.string().min(1), title: z.string().trim().min(4).max(180), description: z.string().trim().max(5000).default(""), payload: z.record(z.string(), z.unknown()).default({}) });
export const complaintSchema = z.object({ title: z.string().trim().min(4).max(180), description: z.string().trim().min(8).max(5000), category: z.string().trim().min(2).max(80), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), imageUrls: z.array(z.string().max(2048)).max(3).default([]) });
export const appointmentSchema = z.object({ serviceName: z.string().trim().min(2).max(160), startsAt: z.iso.datetime(), notes: z.string().trim().max(1000).default("") });
export const slugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{1,60}$/);
const nonNegativeInteger = z.number().int().min(0).max(2_000_000_000);
const coordinateLatitude = z.number().min(-90).max(90);
const coordinateLongitude = z.number().min(-180).max(180);
const optionalDate = z.coerce.date().optional().nullable();
const serviceDataSchema = z.object({ slug: slugSchema, name: z.string().trim().min(2).max(160), category: z.string().trim().min(2).max(80), description: z.string().max(5000), requirements: z.array(z.string().max(400)).max(30).default([]), documents: z.array(z.string().max(400)).max(30).default([]), steps: z.array(z.string().max(400)).max(30).default([]), durationDays: nonNegativeInteger.default(5), feeIls: nonNegativeInteger.default(0), status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"), icon: z.string().max(12).optional() });
const projectDataSchema = z.object({ slug: slugSchema, name: z.string().trim().min(2).max(160), description: z.string().max(5000), imageUrl: z.union([z.url(), z.literal("")]).optional().nullable(), latitude: coordinateLatitude, longitude: coordinateLongitude, progress: z.number().int().min(0).max(100).default(0), status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "PAUSED"]).default("PLANNED"), startsAt: optionalDate, endsAt: optionalDate, budgetIls: nonNegativeInteger.default(0), contractor: z.string().max(200).optional() });
const facilityDataSchema = z.object({ slug: slugSchema, name: z.string().trim().min(2).max(160), category: z.string().trim().min(2).max(80), description: z.string().max(5000).optional(), address: z.string().max(300).optional(), latitude: coordinateLatitude, longitude: coordinateLongitude, hours: z.string().max(160).optional(), phone: z.string().max(50).optional() });
const newsDataSchema = z.object({ slug: slugSchema, title: z.string().trim().min(3).max(180), excerpt: z.string().max(1000), body: z.string().max(20_000), imageUrl: z.union([z.url(), z.literal("")]).optional().nullable(), status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"), publishedAt: optionalDate });
const eventDataSchema = z.object({ slug: slugSchema, title: z.string().trim().min(3).max(180), description: z.string().max(10_000), locationName: z.string().max(300), latitude: coordinateLatitude.optional().nullable(), longitude: coordinateLongitude.optional().nullable(), startsAt: z.coerce.date(), endsAt: optionalDate, status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT") });
const announcementDataSchema = z.object({ title: z.string().trim().min(3).max(180), body: z.string().trim().min(3).max(10_000), priority: z.enum(["NORMAL", "IMPORTANT", "URGENT"]).default("NORMAL"), status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"), publishedAt: optionalDate, expiresAt: optionalDate });
const surveyDataSchema = z.object({ title: z.string().trim().min(3).max(180), description: z.string().max(5000), status: z.enum(["DRAFT", "OPEN", "CLOSED"]).default("DRAFT"), endsAt: optionalDate, options: z.array(z.string().trim().min(1).max(180)).max(20).optional() });
const employeeDataSchema = z.object({ name: z.string().trim().min(2).max(120), department: z.string().trim().min(2).max(120), title: z.string().trim().min(2).max(120), userId: z.string().optional().nullable() });
const notificationDataSchema = z.object({ title: z.string().trim().min(2).max(180), body: z.string().trim().min(1).max(5000), type: z.enum(["REQUEST_UPDATE", "COMPLAINT_UPDATE", "APPOINTMENT", "ANNOUNCEMENT", "ALERT", "GENERAL"]).default("GENERAL"), userId: z.string().optional().nullable() });
export const resourceSchemas = { services: serviceDataSchema, projects: projectDataSchema, facilities: facilityDataSchema, news: newsDataSchema, events: eventDataSchema, announcements: announcementDataSchema, surveys: surveyDataSchema, employees: employeeDataSchema, notifications: notificationDataSchema } as const;
export function validateResourceData(resource: string, value: unknown, partial = false) {
  const schema = resourceSchemas[resource as keyof typeof resourceSchemas];
  if (!schema) return z.record(z.string(), z.unknown()).parse(value);
  return partial ? schema.partial().parse(value) : schema.parse(value);
}
