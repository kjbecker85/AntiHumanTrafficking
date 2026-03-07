import { NextRequest, NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/authStore";
import { mockDb } from "@/lib/mockDb";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { token?: string; password?: string };
    resetPasswordWithToken(mockDb, {
      token: body.token ?? "",
      password: body.password ?? "",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}
