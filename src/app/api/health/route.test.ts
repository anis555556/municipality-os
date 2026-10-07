import { beforeEach, describe, expect, it, vi } from "vitest";
const { databaseUnavailable } = vi.hoisted(() => ({ databaseUnavailable: { value: false } }));
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: () => databaseUnavailable.value ? Promise.reject(new Error("database down")) : Promise.resolve(1) } }));
import { GET } from "./route";
describe("GET /api/health", () => {
  beforeEach(() => { databaseUnavailable.value = false; });
  it("reports a healthy API and database", async () => { const response = await GET(); expect(response.status).toBe(200); expect((await response.json()).database).toBe("connected"); });
  it("returns 503 when PostgreSQL is unavailable", async () => { databaseUnavailable.value = true; const response = await GET(); expect(response.status).toBe(503); expect((await response.json()).status).toBe("degraded"); });
});
