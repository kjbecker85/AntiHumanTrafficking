import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mockDb";

export async function GET(
  _request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await context.params;
  return NextResponse.json(mockDb.reports.filter((r) => r.caseId === caseId));
}