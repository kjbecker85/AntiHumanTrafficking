import { NextRequest, NextResponse } from "next/server";
import { getDataStore } from "@/lib/data-store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { email?: string; password?: string };
    const result = await getDataStore().login({
      email: body.email ?? "",
      password: body.password ?? "",
    });

    return NextResponse.json({
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 401 });
  }
}
