import { NextResponse } from "next/server";
import { addEntity, mockDb } from "@/lib/mockDb";
import type { Entity } from "@/lib/types";

export async function GET(
  _request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await context.params;
  return NextResponse.json(mockDb.entities.filter((e) => e.caseId === caseId));
}

export async function POST(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await context.params;
  const payload = (await request.json()) as Omit<Entity, "id" | "caseId">;
  const created = addEntity({
    ...payload,
    caseId,
  });
  return NextResponse.json(created, { status: 201 });
}
