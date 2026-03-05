import { NextResponse } from "next/server";
import { addRelationship, mockDb } from "@/lib/mockDb";
import type { Relationship } from "@/lib/types";

export async function GET(
  _request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await context.params;
  return NextResponse.json(mockDb.relationships.filter((r) => r.caseId === caseId));
}

export async function POST(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await context.params;
  const payload = (await request.json()) as Omit<Relationship, "id" | "caseId">;
  const created = addRelationship({
    ...payload,
    caseId,
  });
  return NextResponse.json(created, { status: 201 });
}
