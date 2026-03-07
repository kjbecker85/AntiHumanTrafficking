import { NextResponse } from "next/server";
import { addReport } from "@/lib/mockDb";
import type { ReportRecord } from "@/lib/types";

export async function POST(request: Request) {
  const payload = (await request.json()) as Omit<ReportRecord, "id">;
  const created = addReport(payload);
  return NextResponse.json(created, { status: 201 });
}
