import { NextResponse } from "next/server";
import { addCase, mockDb } from "@/lib/mockDb";
import type { CaseRecord } from "@/lib/types";

export async function GET() {
  return NextResponse.json(mockDb.cases);
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Omit<CaseRecord, "id">;
  const created = addCase(payload);
  return NextResponse.json(created, { status: 201 });
}
