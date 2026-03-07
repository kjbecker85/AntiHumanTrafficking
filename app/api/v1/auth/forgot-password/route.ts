import { NextRequest, NextResponse } from "next/server";
import { createPasswordResetRequest } from "@/lib/authStore";
import { mockDb } from "@/lib/mockDb";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as { email?: string };
  const resetRequest = createPasswordResetRequest(mockDb, body.email ?? "");

  return NextResponse.json({
    ok: true,
    token: resetRequest?.token ?? null,
    expiresAt: resetRequest?.expiresAt ?? null,
    message: resetRequest
      ? "Password reset token generated."
      : "If the account exists, a password reset token is ready.",
  });
}
