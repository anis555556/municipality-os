import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
describe("Prisma schema contract", () => {
  it("contains municipal tenancy and core operational models", () => {
    const models = new Set(Prisma.dmmf.datamodel.models.map((model) => model.name));
    ["Municipality", "User", "Service", "ServiceRequest", "RequestEvent", "Complaint", "ComplaintEvent", "Project", "Facility", "News", "Event", "Survey", "Notification", "AuditLog", "Upload", "Proposal", "RateLimitBucket"].forEach((model) => expect(models.has(model), model).toBe(true));
  });
  it("scopes every core domain entity by municipalityId", () => {
    const models = new Map(Prisma.dmmf.datamodel.models.map((model) => [model.name, model]));
    ["Service", "ServiceRequest", "Complaint", "Project", "Facility", "News", "Event", "Survey", "Notification"].forEach((name) => expect(models.get(name)?.fields.some((field) => field.name === "municipalityId"), name).toBe(true));
  });
});
