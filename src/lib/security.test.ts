import { describe, expect, it } from "vitest";
import { compare, hash } from "bcryptjs";
import { Role } from "@prisma/client";
import { complaintSchema, passwordSchema, registerSchema, requestSchema } from "@/lib/validation";
import { effectiveTenantId } from "@/lib/tenant";
import { isStaffRole } from "@/lib/auth";

describe("authentication validation", () => {
  it("accepts a sufficiently strong password and rejects a weak one", () => {
    expect(passwordSchema.safeParse("CivicSecure2026").success).toBe(true);
    expect(passwordSchema.safeParse("password").success).toBe(false);
  });
  it("normalizes email addresses and validates citizen registration", () => {
    expect(registerSchema.parse({ name: "مواطن تجريبي", email: "CITIZEN@example.com", password: "CivicSecure2026" }).email).toBe("citizen@example.com");
    expect(registerSchema.safeParse({ name: "A", email: "not-an-email", password: "weak" }).success).toBe(false);
  });
  it("hashes passwords instead of storing their original value", async () => {
    const stored = await hash("CivicSecure2026", 4);
    expect(stored).not.toBe("CivicSecure2026");
    expect(await compare("CivicSecure2026", stored)).toBe(true);
    expect(await compare("wrong-password", stored)).toBe(false);
  });
});

describe("RBAC and municipality isolation", () => {
  it("distinguishes staff from citizens", () => {
    expect(isStaffRole(Role.ADMIN)).toBe(true); expect(isStaffRole(Role.STAFF)).toBe(true); expect(isStaffRole(Role.CITIZEN)).toBe(false);
  });
  it("allows access to the assigned tenant and rejects cross-tenant writes", () => {
    expect(effectiveTenantId("municipality-a", { role: Role.ADMIN, municipalityId: "municipality-a" })).toBe("municipality-a");
    expect(() => effectiveTenantId("municipality-b", { role: Role.ADMIN, municipalityId: "municipality-a" })).toThrow("FORBIDDEN");
    expect(effectiveTenantId("municipality-b", { role: Role.SUPER_ADMIN, municipalityId: null })).toBe("municipality-b");
  });
});

describe("service requests and complaints", () => {
  it("validates a service request payload", () => {
    expect(requestSchema.safeParse({ serviceId: "service-building", title: "رخصة بناء جديدة", description: "بيانات طلب تجريبي" }).success).toBe(true);
    expect(requestSchema.safeParse({ serviceId: "", title: "لا" }).success).toBe(false);
  });
  it("validates complaint coordinates and required description", () => {
    expect(complaintSchema.safeParse({ title: "عطل في إنارة الشارع", description: "عمود الإنارة لا يعمل منذ المساء.", category: "الإنارة", latitude: 31.4394, longitude: 34.4032 }).success).toBe(true);
    expect(complaintSchema.safeParse({ title: "شكوى", description: "قصير", category: "الإنارة", latitude: 120, longitude: 34 }).success).toBe(false);
  });
});
