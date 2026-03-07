import { NextRequest, NextResponse } from "next/server";
import { buildUserContext, createSessionForUser, registerUser } from "@/lib/authStore";
import { mockDb } from "@/lib/mockDb";
import type { UserRole } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      displayName?: string;
      email?: string;
      password?: string;
      assignedRoles?: UserRole[];
    };

    const user = registerUser(mockDb, {
      displayName: body.displayName ?? "",
      email: body.email ?? "",
      password: body.password ?? "",
      assignedRoles: Array.isArray(body.assignedRoles) ? body.assignedRoles : [],
    });
    const session = createSessionForUser(mockDb, user, user.defaultRole);

    return NextResponse.json({
      token: session.token,
      user: buildUserContext(user, session.activeRole),
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: (error as Error).message }, { status: 400 });
  }
}
