import { Role } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { apiError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireTenant } from "@/lib/tenant";
const proposalSchema = z.object({ title: z.string().trim().min(5).max(160), body: z.string().trim().min(15).max(3000), category: z.string().trim().min(2).max(80) });
export async function POST(request: Request) {
  try {
    const user = await requireUser([Role.CITIZEN]); await enforceRateLimit(`proposal:${user.id}`, 5, 60 * 60_000);
    const { municipality } = await requireTenant(request, true); const input = proposalSchema.parse(await request.json());
    const data = await prisma.proposal.create({ data: { municipalityId: municipality.id, citizenId: user.id, ...input } });
    await audit({ municipalityId: municipality.id, actorId: user.id, action: "CREATE", entity: "Proposal", entityId: data.id });
    return json({ data }, 201);
  } catch (error) { return apiError(error); }
}
