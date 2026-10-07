import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";
let cleanupCounter = 0;

/** Shared PostgreSQL-backed sliding-window counter, so limits also apply across Render instances. */
export async function enforceRateLimit(key: string, limit = 8, windowMs = 15 * 60_000) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET_MUST_BE_AT_LEAST_32_CHARACTERS");
  const bucketKey = createHmac("sha256", secret).update(key).digest("hex");
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitBucket" ("bucketKey", "count", "expiresAt", "createdAt", "updatedAt")
    VALUES (${bucketKey}, 1, NOW() + ${windowMs} * INTERVAL '1 millisecond', NOW(), NOW())
    ON CONFLICT ("bucketKey") DO UPDATE SET
      "count" = CASE WHEN "RateLimitBucket"."expiresAt" <= NOW() THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
      "expiresAt" = CASE WHEN "RateLimitBucket"."expiresAt" <= NOW() THEN NOW() + ${windowMs} * INTERVAL '1 millisecond' ELSE "RateLimitBucket"."expiresAt" END,
      "updatedAt" = NOW()
    RETURNING "count"
  `;
  if ((rows[0]?.count ?? 0) > limit) throw new Error("RATE_LIMITED");
  cleanupCounter += 1;
  if (cleanupCounter % 128 === 0) await prisma.rateLimitBucket.deleteMany({ where: { expiresAt: { lte: new Date() } } });
}
export function clientAddress(request: Request) { return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"; }
