import { prisma } from "@/lib/prisma";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return json({ status: "ok", database: "connected", service: "municipality-os", time: new Date().toISOString() });
  } catch {
    return json({ status: "degraded", database: "unavailable", service: "municipality-os" }, 503);
  }
}
