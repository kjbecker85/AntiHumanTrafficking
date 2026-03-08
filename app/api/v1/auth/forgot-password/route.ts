import { NextRequest, NextResponse } from "next/server";
import { getDataStore } from "@/lib/data-store";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { email?: string };
  const response = await getDataStore().requestPasswordReset(body.email ?? "");

  return NextResponse.json({
    ok: response.ok,
    token: response.token,
    expiresAt: response.expiresAt,
    message: response.message,
  });
}
