import { NextResponse } from "next/server";
import { addAuditEvent } from "@/lib/mockDb";
import type { AuditEvent } from "@/lib/types";

export async function POST(request: Request) {
  const payload = (await request.json()) as Omit<AuditEvent, "id" | "timestamp">;
  const created = addAuditEvent(payload);
  return NextResponse.json(created, { status: 201 });
}
