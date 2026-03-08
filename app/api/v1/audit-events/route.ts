import { NextResponse } from "next/server";
import { getDataStore } from "@/lib/data-store";
import type { AuditEvent } from "@/lib/types";

export async function POST(request: Request) {
  const payload = (await request.json()) as Omit<AuditEvent, "id" | "timestamp">;
  const created = await getDataStore().addAuditEvent(payload);
  return NextResponse.json(created, { status: 201 });
}
