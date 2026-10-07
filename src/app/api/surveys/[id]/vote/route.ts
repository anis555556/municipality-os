import { Role, SurveyStatus } from "@prisma/client";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { apiError, json } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
const voteSchema = z.object({ optionId: z.string().min(1) });
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser([Role.CITIZEN]); const { municipality } = await requireTenant(request, true); const { id } = await params;
    const { optionId } = voteSchema.parse(await request.json());
    const survey = await prisma.survey.findFirst({ where: { id, municipalityId: municipality.id, status: SurveyStatus.OPEN }, select: { id: true, endsAt: true } });
    if (!survey || (survey.endsAt && survey.endsAt <= new Date())) return json({ error: "الاستطلاع مغلق" }, 404);
    const option = await prisma.surveyOption.findFirst({ where: { id: optionId, surveyId: id } }); if (!option) return json({ error: "الخيار غير متاح" }, 400);
    const existing = await prisma.surveyResponse.findUnique({ where: { surveyId_userId: { surveyId: id, userId: user.id } } });
    if (existing) return json({ error: "تم تسجيل مشاركتك مسبقًا" }, 409);
    const data = await prisma.surveyResponse.create({ data: { surveyId: id, optionId, userId: user.id } });
    return json({ data }, 201);
  } catch (error) { return apiError(error); }
}
