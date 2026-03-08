import { NextResponse } from "next/server";
import { getDataStore } from "@/lib/data-store";

export async function GET() {
  const health = await getDataStore().getHealth();
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    backend: health.backend,
    persistence: health.persistence,
    counts: health.counts,
  });
}
