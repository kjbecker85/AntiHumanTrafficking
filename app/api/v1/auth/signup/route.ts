import { NextRequest, NextResponse } from "next/server";
import { getDataStore } from "@/lib/data-store";
import type { UserRole } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      displayName?: string;
      email?: string;
      password?: string;
      assignedRoles?: UserRole[];
    };

    const result = await getDataStore().signup({
      displayName: body.displayName ?? "",
      email: body.email ?? "",
      password: body.password ?? "",
      assignedRoles: Array.isArray(body.assignedRoles) ? body.assignedRoles : [],
    });

    return NextResponse.json({
      token: result.token,
      user: result.user,
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}
