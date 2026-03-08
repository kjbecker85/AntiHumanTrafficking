import { NextResponse } from "next/server";
import { getDataStore } from "@/lib/data-store";
import type { CaseRecord } from "@/lib/types";

export async function GET() {
  return NextResponse.json(await getDataStore().listCases());
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Omit<CaseRecord, "id">;
  const created = await getDataStore().createCase(payload);
  return NextResponse.json(created, { status: 201 });
}
