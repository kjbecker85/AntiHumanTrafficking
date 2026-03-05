import { NextResponse } from "next/server";
import { buildOperatorAiBrief } from "@/lib/operatorAi";
import type { UserRole } from "@/lib/types";

export async function GET(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await context.params;
  const { searchParams } = new URL(request.url);
  const roleParam = searchParams.get("role");
  const windowHoursParam = Number(searchParams.get("windowHours") ?? "48");

  const role: UserRole =
    roleParam === "analyst" || roleParam === "operator" || roleParam === "supervisor"
      ? roleParam
      : "operator";
  const windowHours = Number.isFinite(windowHoursParam) ? Math.max(4, Math.min(240, windowHoursParam)) : 48;

  return NextResponse.json(buildOperatorAiBrief(caseId, role, windowHours));
}

