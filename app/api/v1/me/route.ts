import { NextRequest, NextResponse } from "next/server";
import { requireSessionContext } from "@/lib/authStore";
import { mockDb } from "@/lib/mockDb";

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim()
    || request.nextUrl.searchParams.get("token")
    || "";

  const context = token ? requireSessionContext(mockDb, token) : null;
  if (!context) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(context);
}
