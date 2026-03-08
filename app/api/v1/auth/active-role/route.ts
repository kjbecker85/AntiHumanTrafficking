import { NextRequest, NextResponse } from "next/server";
import { getDataStore } from "@/lib/data-store";
import type { UserRole } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { token?: string; role?: UserRole };
    if (!body.token || !body.role) {
      return NextResponse.json({ message: "Token and role are required." }, { status: 400 });
    }

    const context = await getDataStore().switchRole(body.token, body.role);
    return NextResponse.json({ user: context });
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}
