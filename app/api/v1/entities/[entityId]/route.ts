import { NextResponse } from "next/server";
import { getDataStore } from "@/lib/data-store";
import type { Entity } from "@/lib/types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ entityId: string }> },
) {
  const { entityId } = await context.params;
  const payload = (await request.json()) as Partial<Pick<Entity, "uniqueIdentity" | "uniqueIdentifierType" | "eventDateTime" | "descriptionText" | "attributes">>;
  const updated = await getDataStore().updateEntity(entityId, payload);

  if (!updated) {
    return NextResponse.json({ error: "entity not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}
