import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "municipality_session";
const SESSION_DAYS = 14;
export type AuthUser = { id: string; name: string; email: string; role: Role; municipalityId: string | null; municipality: { id: string; name: string; slug: string } | null };
const digest = (token: string) => {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET_MUST_BE_AT_LEAST_32_CHARACTERS");
  return createHmac("sha256", secret).update(token).digest("hex");
};

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { userId, tokenHash: digest(token), expiresAt } });
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: digest(token) } });
  jar.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: digest(token) }, include: { user: { include: { municipality: { select: { id: true, name: true, slug: true } } } } } });
  if (!session || session.expiresAt <= new Date() || !session.user.isActive) {
    if (session) await prisma.session.delete({ where: { id: session.id } });
    jar.delete(COOKIE_NAME);
    return null;
  }
  const { user } = session;
  return { id: user.id, name: user.name, email: user.email, role: user.role, municipalityId: user.municipalityId, municipality: user.municipality };
}

export async function requireUser(allowedRoles?: Role[]) {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  if (allowedRoles && !allowedRoles.includes(user.role)) throw new Error("FORBIDDEN");
  return user;
}

export function isStaffRole(role: Role) { return new Set<Role>([Role.SUPER_ADMIN, Role.ADMIN, Role.EDITOR, Role.STAFF]).has(role); }
export const publicUser = (user: AuthUser) => ({ id: user.id, name: user.name, email: user.email, role: user.role, municipality: user.municipality });
