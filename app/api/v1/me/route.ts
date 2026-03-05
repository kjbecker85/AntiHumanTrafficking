import { NextResponse } from "next/server";
import { mockDb } from "@/lib/mockDb";

export async function GET() {
  return NextResponse.json(mockDb.userContext);
}
