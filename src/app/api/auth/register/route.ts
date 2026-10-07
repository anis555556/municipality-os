import { hash } from "bcryptjs";
import { Role } from "@prisma/client";
import { createSession, publicUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError, json } from "@/lib/http";
import { clientAddress, enforceRateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validation";
import { resolveMunicipality } from "@/lib/tenant";

export async function POST(request: Request) {
  try {
    await enforceRateLimit(`register:${clientAddress(request)}`, 5);
    const input = registerSchema.parse(await request.json());
    const municipality = await resolveMunicipality(request);
    if (!municipality) return json({ error: "البلدية غير مهيأة بعد" }, 503);
    if (await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } })) return json({ error: "البريد الإلكتروني مستخدم بالفعل" }, 409);
    const user = await prisma.user.create({ data: { name: input.name, email: input.email, phone: input.phone, passwordHash: await hash(input.password, 12), role: Role.CITIZEN, municipalityId: municipality.id }, include: { municipality: { select: { id: true, name: true, slug: true } } } });
    await createSession(user.id);
    await audit({ municipalityId: municipality.id, actorId: user.id, action: "REGISTER", entity: "User", entityId: user.id, ipAddress: clientAddress(request) });
    return json({ user: publicUser({ ...user, municipality: user.municipality }) }, 201);
  } catch (error) { return apiError(error); }
}
