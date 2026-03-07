import { NextRequest, NextResponse } from "next/server";
import { loginWithPassword } from "@/lib/authStore";
import { mockDb } from "@/lib/mockDb";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { email?: string; password?: string };
    const result = loginWithPassword(mockDb, {
      email: body.email ?? "",
      password: body.password ?? "",
    });

    return NextResponse.json({
      token: result.session.token,
      user: result.context,
    });
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 401 });
  }
}
