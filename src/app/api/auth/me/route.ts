import { getCurrentUser, publicUser } from "@/lib/auth";
import { apiError, json } from "@/lib/http";
export async function GET() {
  try { const user = await getCurrentUser(); return user ? json({ user: publicUser(user) }) : json({ user: null }, 401); }
  catch (error) { return apiError(error); }
}
