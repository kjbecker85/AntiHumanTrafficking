import { NextResponse } from "next/server";
import { getDataStore } from "@/lib/data-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await context.params;
  return NextResponse.json(await getDataStore().listReports(caseId));
}
