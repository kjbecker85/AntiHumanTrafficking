import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mockDb";
import type { ReportRecord } from "@/lib/types";

export async function POST(request: Request) {
  const payload = (await request.json()) as Omit<ReportRecord, "id">;
  const created: ReportRecord = {
    ...payload,
    id: `rep-${String(mockDb.reports.length + 1).padStart(3, "0")}`,
  };
  mockDb.reports.unshift(created);
  return NextResponse.json(created, { status: 201 });
}
