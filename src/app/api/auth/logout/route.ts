import { destroySession, getCurrentUser } from "@/lib/auth";
import { json, apiError } from "@/lib/http";
export async function POST() {
  try { const user = await getCurrentUser(); await destroySession(); return json({ ok: true, signedOut: Boolean(user) }); }
  catch (error) { return apiError(error); }
}
