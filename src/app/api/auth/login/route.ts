import { compare } from "bcryptjs";
import { createSession, publicUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError, json } from "@/lib/http";
import { clientAddress, enforceRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    await enforceRateLimit(`login:${clientAddress(request)}`, 8);
    const input = loginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: input.email }, include: { municipality: { select: { id: true, name: true, slug: true } } } });
    if (!user || !user.isActive || !(await compare(input.password, user.passwordHash))) return json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" }, 401);
    await createSession(user.id);
    await audit({ municipalityId: user.municipalityId, actorId: user.id, action: "LOGIN", entity: "User", entityId: user.id, ipAddress: clientAddress(request) });
    return json({ user: publicUser({ ...user, municipality: user.municipality }) });
  } catch (error) { return apiError(error); }
}
