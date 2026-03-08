import { NextResponse } from "next/server";
import { getDataStore } from "@/lib/data-store";
import type { Relationship } from "@/lib/types";

export async function GET(
  _request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await context.params;
  return NextResponse.json(await getDataStore().listRelationships(caseId));
}

export async function POST(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await context.params;
  const payload = (await request.json()) as Omit<Relationship, "id" | "caseId">;
  const created = await getDataStore().createRelationship(caseId, payload);
  return NextResponse.json(created, { status: 201 });
}
