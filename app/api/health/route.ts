import { NextResponse } from "next/server";
import { mockDb, mockDbPersistence } from "@/lib/mockDb";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    persistence: {
      enabled: mockDbPersistence.enabled,
      filePath: mockDbPersistence.filePath,
    },
    counts: {
      cases: mockDb.cases.length,
      entities: mockDb.entities.length,
      relationships: mockDb.relationships.length,
      reports: mockDb.reports.length,
      auditEvents: mockDb.auditEvents.length,
    },
  });
}
