import { NextRequest, NextResponse } from "next/server";
import { logoutSession } from "@/lib/authStore";
import { mockDb } from "@/lib/mockDb";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { token?: string };
  const token = body.token ?? "";
  if (token) {
    logoutSession(mockDb, token);
  }

  return NextResponse.json({ ok: true });
}
