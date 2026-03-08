import { NextResponse } from "next/server";
import { getDataStore } from "@/lib/data-store";
import type { Relationship } from "@/lib/types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ relationshipId: string }> },
) {
  const { relationshipId } = await context.params;
  const payload = (await request.json()) as Partial<Pick<Relationship, "strength" | "confidence" | "label" | "type">>;
  const updated = await getDataStore().updateRelationship(relationshipId, payload);

  if (!updated) {
    return NextResponse.json({ error: "relationship not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
