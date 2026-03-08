import { NextRequest, NextResponse } from "next/server";
import { getDataStore } from "@/lib/data-store";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { token?: string };
  const token = body.token ?? "";
  if (token) {
    await getDataStore().logout(token);
  }

  return NextResponse.json({ ok: true });
}
