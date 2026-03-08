import { NextResponse } from "next/server";
import { getDataStore } from "@/lib/data-store";
import type { Entity } from "@/lib/types";

export async function GET(
  _request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await context.params;
  return NextResponse.json(await getDataStore().listEntities(caseId));
}

export async function POST(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  const { caseId } = await context.params;
  const payload = (await request.json()) as Omit<Entity, "id" | "caseId">;
  const created = await getDataStore().createEntity(caseId, payload);
  return NextResponse.json(created, { status: 201 });
}
