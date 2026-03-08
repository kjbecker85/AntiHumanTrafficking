import { NextResponse } from "next/server";
import { getDataStore } from "@/lib/data-store";
import type { ReportRecord } from "@/lib/types";

export async function POST(request: Request) {
  const payload = (await request.json()) as Omit<ReportRecord, "id">;
  const created = await getDataStore().createReport(payload);
  return NextResponse.json(created, { status: 201 });
}
