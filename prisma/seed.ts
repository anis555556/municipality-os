import "dotenv/config";
import { PrismaClient, Role, PublicationStatus, SurveyStatus } from "@prisma/client";
import { hash } from "bcryptjs";
import { randomBytes } from "node:crypto";
import { demoFacilities, demoNews, demoProjects, demoServices, mapCenter } from "../src/lib/demo-data";
import { passwordSchema } from "../src/lib/validation";

const prisma = new PrismaClient();

async function main() {
  const municipality = await prisma.municipality.upsert({ where: { slug: process.env.DEFAULT_MUNICIPALITY_SLUG || "al-bureij" }, update: {}, create: {
    name: "بلدية البريج", slug: process.env.DEFAULT_MUNICIPALITY_SLUG || "al-bureij",
    description: "بلدية البريج — بيئة تجريبية لمنصة Municipality OS. جميع البيانات والمعلومات الواردة في هذا الإصدار توضيحية.",
    phone: "059-000-0000", email: "info@al-bureij.example", address: "قطاع غزة — عنوان تجريبي",
    latitude: mapCenter.latitude, longitude: mapCenter.longitude, brandPrimary: "#D71920", brandSecondary: "#009B4D",
    settings: { timezone: "Asia/Gaza", businessHours: "الأحد–الخميس، 08:00–15:00", demo: process.env.SEED_DEMO_DATA === "true" }
  } });
  const seedDemoData = process.env.SEED_DEMO_DATA === "true";
  if (seedDemoData) {
    for (const item of demoServices) await prisma.service.upsert({ where: { municipalityId_slug: { municipalityId: municipality.id, slug: item.slug } }, update: {}, create: {
      id: item.id, municipalityId: municipality.id, slug: item.slug, name: item.name, category: item.category, description: item.description,
      requirements: item.requirements, documents: item.requirements, steps: item.steps, durationDays: Number.parseInt(item.duration, 10) || 5,
      feeIls: item.fee.includes("دون") ? 0 : 50, status: item.status, icon: item.icon
    } });
    for (const item of demoProjects) {
      const project = await prisma.project.upsert({ where: { municipalityId_slug: { municipalityId: municipality.id, slug: item.id } }, update: {}, create: {
        municipalityId: municipality.id, slug: item.id, name: item.name, description: item.description, latitude: item.latitude, longitude: item.longitude,
        progress: item.progress || 0, status: item.id === "p3" ? "PLANNED" : "IN_PROGRESS", startsAt: new Date("2026-01-15T08:00:00Z"),
        endsAt: new Date("2026-12-20T15:00:00Z"), budgetIls: 125000, contractor: "بيانات الجهة المنفذة تجريبية"
      } });
      await prisma.$executeRaw`UPDATE "Project" SET location = ST_SetSRID(ST_MakePoint(${project.longitude}, ${project.latitude}), 4326) WHERE id = ${project.id}`;
    }
    for (const item of demoFacilities) {
      const facility = await prisma.facility.upsert({ where: { municipalityId_slug: { municipalityId: municipality.id, slug: item.id } }, update: {}, create: {
        municipalityId: municipality.id, slug: item.id, name: item.name, category: item.category, description: item.description,
        address: "موقع تجريبي ضمن نطاق بلدية البريج", latitude: item.latitude, longitude: item.longitude, hours: "الأحد–الخميس، 08:00–15:00 — بيانات تجريبية", phone: "059-000-0000"
      } });
      await prisma.$executeRaw`UPDATE "Facility" SET location = ST_SetSRID(ST_MakePoint(${facility.longitude}, ${facility.latitude}), 4326) WHERE id = ${facility.id}`;
    }
    for (const item of demoNews) await prisma.news.upsert({ where: { municipalityId_slug: { municipalityId: municipality.id, slug: item.id } }, update: {}, create: {
      municipalityId: municipality.id, slug: item.id, title: item.title, excerpt: item.body, body: `${item.body}\n\nهذا المحتوى تجريبي ولا يمثل إعلانًا رسميًا.`, status: PublicationStatus.PUBLISHED, publishedAt: new Date()
    } });
    const now = new Date();
    const events = [
      { slug: "community-facility-dialogue", title: "جلسة حوار مجتمعي حول المرافق", locationName: "قاعة البلدية — موقع تجريبي", startsAt: new Date(now.getTime() + 6 * 86400_000) },
      { slug: "public-space-volunteer-day", title: "يوم تطوعي للعناية بالمساحات العامة", locationName: "الحديقة العامة — موقع تجريبي", startsAt: new Date(now.getTime() + 12 * 86400_000) }
    ];
    for (const event of events) await prisma.event.upsert({ where: { municipalityId_slug: { municipalityId: municipality.id, slug: event.slug } }, update: {}, create: { municipalityId: municipality.id, ...event, description: "فعالية توضيحية ضمن بيانات العرض التجريبية.", status: PublicationStatus.PUBLISHED } });
    await prisma.announcement.upsert({ where: { id: `demo-${municipality.id}` }, update: {}, create: { id: `demo-${municipality.id}`, municipalityId: municipality.id, title: "تنبيه: نسخة تجريبية", body: "الخدمات والمواقع والأرقام الظاهرة تجريبية ولا تمثل معلومات أو بيانات بلدية رسمية.", priority: "IMPORTANT", status: PublicationStatus.PUBLISHED, publishedAt: new Date() } });
    await prisma.survey.upsert({ where: { id: `survey-${municipality.id}` }, update: {}, create: { id: `survey-${municipality.id}`, municipalityId: municipality.id, title: "ما الأولوية التي تستحق اهتمامًا أكبر؟", description: "استطلاع توضيحي حول أولويات الخدمات العامة. النتائج بيانات تجريبية.", status: SurveyStatus.OPEN, endsAt: new Date(now.getTime() + 30 * 86400_000), options: { create: ["تحسين الطرق والأرصفة", "تطوير الإنارة العامة", "زيادة المساحات الخضراء", "تعزيز النظافة وإدارة النفايات"].map((label) => ({ label })) } } });
    const accountSpecs: { email: string; name: string; role: Role; envKey: string }[] = [
      { email: process.env.DEMO_ADMIN_EMAIL || "admin@bureij.local", name: "مدير بلدية البريج — تجريبي", role: Role.ADMIN, envKey: "DEMO_ADMIN_PASSWORD" },
      { email: process.env.DEMO_CITIZEN_EMAIL || "citizen@bureij.local", name: "مواطن تجريبي", role: Role.CITIZEN, envKey: "DEMO_CITIZEN_PASSWORD" }
    ];
    for (const spec of accountSpecs) {
      const exists = await prisma.user.findUnique({ where: { email: spec.email } });
      if (!exists) {
        const password = passwordSchema.parse(process.env[spec.envKey] || `${randomBytes(18).toString("base64url")}A7`);
        await prisma.user.create({ data: { municipalityId: municipality.id, email: spec.email, name: spec.name, role: spec.role, passwordHash: await hash(password, 12) } });
        console.log(`Created demo ${spec.role} account: ${spec.email} / ${password}`);
      }
    }
    const citizenEmail = process.env.DEMO_CITIZEN_EMAIL || "citizen@bureij.local";
    const citizen = await prisma.user.findUnique({ where: { email: citizenEmail }, select: { id: true } });
    const requestService = await prisma.service.findFirst({ where: { municipalityId: municipality.id, slug: "building-permit" }, select: { id: true } });
    if (citizen && requestService) await prisma.serviceRequest.upsert({ where: { referenceNo: "BR-DEMO-0001" }, update: {}, create: {
      municipalityId: municipality.id, citizenId: citizen.id, serviceId: requestService.id, referenceNo: "BR-DEMO-0001", title: "طلب ترخيص بناء — مثال تجريبي",
      description: "معاملة توضيحية لعرض سجل المتابعة وحالات الطلب.", status: "IN_PROGRESS", payload: { demo: true }, timeline: { create: [
        { status: "NEW", message: "تم استلام الطلب — سجل تجريبي." }, { status: "UNDER_REVIEW", message: "بدأت المراجعة — سجل تجريبي." }, { status: "IN_PROGRESS", message: "قيد الإجراء — حالة توضيحية." }
      ] }
    } });
    if (citizen) {
      const complaint = await prisma.complaint.upsert({ where: { referenceNo: "BLG-DEMO-0001" }, update: {}, create: {
        municipalityId: municipality.id, citizenId: citizen.id, referenceNo: "BLG-DEMO-0001", title: "بلاغ تجريبي: صيانة رصيف",
        description: "بلاغ توضيحي يعرض تحديد الموقع على الخريطة وسجل الحالة.", category: "الطرق والأرصفة", status: "PROCESSING", latitude: 31.4387, longitude: 34.4051,
        timeline: { create: [{ status: "NEW", message: "تم استلام البلاغ — سجل تجريبي." }, { status: "PROCESSING", message: "أحيل إلى فريق الصيانة — حالة توضيحية." }] }
      } });
      await prisma.$executeRaw`UPDATE "Complaint" SET location = ST_SetSRID(ST_MakePoint(${complaint.longitude}, ${complaint.latitude}), 4326) WHERE id = ${complaint.id}`;
      await prisma.appointment.upsert({ where: { referenceNo: "APT-DEMO-0001" }, update: {}, create: { municipalityId: municipality.id, citizenId: citizen.id, serviceName: "قسم خدمات الجمهور — مثال تجريبي", referenceNo: "APT-DEMO-0001", startsAt: new Date(Date.now() + 7 * 86400_000), status: "CONFIRMED", notes: "موعد توضيحي" } });
      await prisma.notification.upsert({ where: { id: `notice-demo-${municipality.id}` }, update: {}, create: { id: `notice-demo-${municipality.id}`, municipalityId: municipality.id, userId: citizen.id, title: "حساب مواطن تجريبي", body: "تنبيه تجريبي: بيانات الطلب والشكوى والموعد توضيحية.", type: "GENERAL" } });
    }
  
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME?.trim() || "مدير البلدية";

  if (adminEmail || adminPassword) {
    if (!adminEmail || !adminPassword) throw new Error("ADMIN_EMAIL_AND_ADMIN_PASSWORD_MUST_BE_SET_TOGETHER");
    const password = passwordSchema.parse(adminPassword);
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existing) {
      if (existing.role === Role.SUPER_ADMIN || (existing.role === Role.ADMIN && existing.municipalityId === municipality.id)) {
        await prisma.user.update({ where: { id: existing.id }, data: { name: adminName, role: Role.ADMIN, municipalityId: municipality.id, isActive: true } });
      } else if (existing.role === Role.CITIZEN || existing.municipalityId !== municipality.id) {
        throw new Error("ADMIN_EMAIL_ALREADY_BELONGS_TO_ANOTHER_USER");
      }
    } else {
      await prisma.user.create({
        data: {
          municipalityId: municipality.id,
          email: adminEmail,
          name: adminName,
          role: Role.ADMIN,
          isActive: true,
          passwordHash: await hash(password, 12)
        }
      });
      console.log(`Created administrator account: ${adminEmail}`);
    }
  }

  if (seedDemoData) {
    const demoAccountSpecs: { email: string; name: string; role: Role; envKey: string }[] = [
      { email: process.env.DEMO_ADMIN_EMAIL || "admin@bureij.local", name: "مدير بلدية البريج — تجريبي", role: Role.ADMIN, envKey: "DEMO_ADMIN_PASSWORD" },
      { email: process.env.DEMO_CITIZEN_EMAIL || "citizen@bureij.local", name: "مواطن تجريبي", role: Role.CITIZEN, envKey: "DEMO_CITIZEN_PASSWORD" }
    ];
    for (const spec of demoAccountSpecs) {
      const exists = await prisma.user.findUnique({ where: { email: spec.email } });
      if (!exists) {
        const password = passwordSchema.parse(process.env[spec.envKey] || `${randomBytes(18).toString("base64url")}A7`);
        await prisma.user.create({ data: { municipalityId: municipality.id, email: spec.email, name: spec.name, role: spec.role, passwordHash: await hash(password, 12) } });
        console.log(`Created demo ${spec.role} account: ${spec.email}`);
      }
    }
    const citizenEmail = process.env.DEMO_CITIZEN_EMAIL || "citizen@bureij.local";
    const citizen = await prisma.user.findUnique({ where: { email: citizenEmail }, select: { id: true } });
    const requestService = await prisma.service.findFirst({ where: { municipalityId: municipality.id, slug: "building-permit" }, select: { id: true } });
    if (citizen && requestService) await prisma.serviceRequest.upsert({ where: { referenceNo: "BR-DEMO-0001" }, update: {}, create: {
      municipalityId: municipality.id, citizenId: citizen.id, serviceId: requestService.id, referenceNo: "BR-DEMO-0001", title: "طلب ترخيص بناء — مثال تجريبي",
      description: "معاملة توضيحية لعرض سجل المتابعة وحالات الطلب.", status: "IN_PROGRESS", payload: { demo: true }, timeline: { create: [
        { status: "NEW", message: "تم استلام الطلب — سجل تجريبي." }, { status: "UNDER_REVIEW", message: "بدأت المراجعة — سجل تجريبي." }, { status: "IN_PROGRESS", message: "قيد الإجراء — حالة توضيحية." }
      ] }
    } });
    if (citizen) {
      const complaint = await prisma.complaint.upsert({ where: { referenceNo: "BLG-DEMO-0001" }, update: {}, create: {
        municipalityId: municipality.id, citizenId: citizen.id, referenceNo: "BLG-DEMO-0001", title: "بلاغ تجريبي: صيانة رصيف",
        description: "بلاغ توضيحي يعرض تحديد الموقع على الخريطة وسجل الحالة.", category: "الطرق والأرصفة", status: "PROCESSING", latitude: 31.4387, longitude: 34.4051,
        timeline: { create: [{ status: "NEW", message: "تم استلام البلاغ — سجل تجريبي." }, { status: "PROCESSING", message: "أحيل إلى فريق الصيانة — حالة توضيحية." }] }
      } });
      await prisma.$executeRaw`UPDATE "Complaint" SET location = ST_SetSRID(ST_MakePoint(${complaint.longitude}, ${complaint.latitude}), 4326) WHERE id = ${complaint.id}`;
      await prisma.appointment.upsert({ where: { referenceNo: "APT-DEMO-0001" }, update: {}, create: { municipalityId: municipality.id, citizenId: citizen.id, serviceName: "قسم خدمات الجمهور — مثال تجريبي", referenceNo: "APT-DEMO-0001", startsAt: new Date(Date.now() + 7 * 86400_000), status: "CONFIRMED", notes: "موعد توضيحي" } });
      await prisma.notification.upsert({ where: { id: `notice-demo-${municipality.id}` }, update: {}, create: { id: `notice-demo-${municipality.id}`, municipalityId: municipality.id, userId: citizen.id, title: "حساب مواطن تجريبي", body: "تنبيه تجريبي: بيانات الطلب والشكوى والموعد توضيحية.", type: "GENERAL" } });
    }
  }

  if (process.env.SUPER_ADMIN_EMAIL && process.env.SUPER_ADMIN_PASSWORD) {
    const password = passwordSchema.parse(process.env.SUPER_ADMIN_PASSWORD);
    await prisma.user.upsert({ where: { email: process.env.SUPER_ADMIN_EMAIL.toLowerCase() }, update: { role: Role.SUPER_ADMIN, municipalityId: null }, create: { email: process.env.SUPER_ADMIN_EMAIL.toLowerCase(), name: "مسؤول النظام الأعلى", role: Role.SUPER_ADMIN, passwordHash: await hash(password, 12) } });
  }
  console.log(`Seeded ${municipality.name}. Demo data: ${seedDemoData ? "enabled" : "disabled"}.`);
}

main().catch((error) => { console.error("Seed failed", error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
