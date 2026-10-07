import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function json(data: unknown, status = 200) { return NextResponse.json(data, { status }); }
export function apiError(error: unknown) {
  if (error instanceof ZodError) return json({ error: "بيانات غير صالحة", details: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) }, 400);
  if (error instanceof Error && error.message === "SURVEY_HAS_RESPONSES") return json({ error: "لا يمكن تغيير خيارات استطلاع بعد تسجيل أصوات عليه." }, 409);
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    if (error.code === "P2002") return json({ error: "توجد قيمة مستخدمة بالفعل. راجع البريد أو الرابط المختصر." }, 409);
    if (error.code === "P2003") return json({ error: "تعذر الحذف لوجود سجلات مرتبطة بهذا العنصر." }, 409);
    if (error.code === "P2025") return json({ error: "العنصر غير موجود" }, 404);
  }
  if (error instanceof Error && error.message === "UNAUTHORIZED") return json({ error: "يلزم تسجيل الدخول" }, 401);
  if (error instanceof Error && error.message === "FORBIDDEN") return json({ error: "ليست لديك صلاحية لهذا الإجراء" }, 403);
  if (error instanceof Error && error.message === "NOT_FOUND") return json({ error: "العنصر غير موجود" }, 404);
  if (error instanceof Error && error.message === "RATE_LIMITED") return json({ error: "محاولات كثيرة. يرجى الانتظار والمحاولة لاحقًا." }, 429);
  if (error instanceof Error && error.message === "CANNOT_DISABLE_LAST_ADMIN") return json({ error: "لا يمكن تعطيل آخر مسؤول نشط في البلدية." }, 409);
  console.error("API error", error);
  return json({ error: "تعذر إتمام الطلب" }, 500);
}
export function routeError(error: unknown) { return apiError(error); }
