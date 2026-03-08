import { maskEntityName, strengthToWeight } from "@/lib/auth";
import type { Entity, OperatorAiBrief, Relationship, ReportRecord, UserRole } from "@/lib/types";

function asHoursFromNow(isoTime: string, nowMs: number): number {
  const diffMs = nowMs - new Date(isoTime).getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60));
}

function scoreEntity(entity: Entity, reports: ReportRecord[], nowMs: number): number {
  const relatedReports = reports.filter((report) => report.relatedEntityIds.includes(entity.id));
  const reportCountScore = Math.min(1, relatedReports.length / 8);
  const latest = relatedReports[0];
  const recencyScore = latest ? 1 / (1 + asHoursFromNow(latest.timeObserved, nowMs) / 24) : 0;
  return entity.confidence * 0.55 + reportCountScore * 0.25 + recencyScore * 0.2;
}

export function buildOperatorAiBrief(
  caseId: string,
  role: UserRole,
  windowHours: number,
  input: {
    entities: Entity[];
    relationships: Relationship[];
    reports: ReportRecord[];
  },
): OperatorAiBrief {
  const now = new Date();
  const nowMs = now.getTime();
  const entities = input.entities.filter((entity) => entity.caseId === caseId);
  const relationships = input.relationships.filter((relationship) => relationship.caseId === caseId);
  const reports = [...input.reports]
    .filter((report) => report.caseId === caseId)
    .sort((a, b) => (a.timeObserved < b.timeObserved ? 1 : -1));

  const evidence = reports.slice(0, 6).map((report) => ({
    reportId: report.id,
    timeObserved: report.timeObserved,
    location: report.location,
    narrative: report.narrative,
    relatedEntityIds: report.relatedEntityIds,
  }));

  const watchItems = entities
    .map((entity) => {
      const edgeWeight = relationships
        .filter((relationship) => relationship.fromEntityId === entity.id || relationship.toEntityId === entity.id)
        .reduce((acc, relationship) => acc + relationship.confidence * strengthToWeight(relationship.strength), 0);
      const score = scoreEntity(entity, reports, nowMs) + Math.min(0.35, edgeWeight * 0.02);
      return {
        entityId: entity.id,
        entityName: maskEntityName(entity, role),
        type: entity.type,
        score: Number(score.toFixed(3)),
        rationale: `Confidence ${entity.confidence.toFixed(2)} with ${reports.filter((r) => r.relatedEntityIds.includes(entity.id)).length} linked reports.`,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const recentReports = reports.filter((report) => asHoursFromNow(report.timeObserved, nowMs) <= Math.max(4, windowHours));
  const locationWeights = new Map<string, number>();
  recentReports.forEach((report) => {
    const hoursAgo = asHoursFromNow(report.timeObserved, nowMs);
    const weight = 1 / (1 + hoursAgo / 12);
    locationWeights.set(report.location, (locationWeights.get(report.location) ?? 0) + weight);
  });

  const topLocation = [...locationWeights.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? reports[0]?.location ?? "Unknown";
  const topLocationEntity = entities.find((entity) => entity.geo && entity.geo.address?.includes(topLocation)) ?? entities.find((entity) => entity.geo);

  const reportTimesAsc = [...reports]
    .slice(0, 12)
    .map((report) => new Date(report.timeObserved).getTime())
    .sort((a, b) => a - b);
  let avgIntervalHours = 12;
  if (reportTimesAsc.length > 1) {
    let total = 0;
    for (let index = 1; index < reportTimesAsc.length; index += 1) {
      total += (reportTimesAsc[index] - reportTimesAsc[index - 1]) / (1000 * 60 * 60);
    }
    avgIntervalHours = Math.max(4, Math.min(48, total / (reportTimesAsc.length - 1)));
  }

  const latestTimeMs = reports[0] ? new Date(reports[0].timeObserved).getTime() : nowMs;
  const nextStart = new Date(latestTimeMs + avgIntervalHours * 0.7 * 60 * 60 * 1000);
  const nextEnd = new Date(latestTimeMs + avgIntervalHours * 1.3 * 60 * 60 * 1000);
  const probabilityBase = Math.min(1, 0.35 + recentReports.length * 0.035 + Math.min(0.2, (locationWeights.get(topLocation) ?? 0) * 0.08));

  const topEvidenceIds = evidence.slice(0, 3).map((item) => item.reportId);
  const recommendations = [
    {
      id: "rec-1",
      title: `Stage observation near ${topLocation}`,
      priority: "immediate" as const,
      rationale: "Recent reports cluster at this location with repeated co-occurrence patterns.",
      evidenceReportIds: topEvidenceIds,
    },
    {
      id: "rec-2",
      title: `Prioritize watch on ${watchItems[0]?.entityName ?? "top entity"}`,
      priority: "soon" as const,
      rationale: "Entity has high confidence and multi-report activity linkage.",
      evidenceReportIds: topEvidenceIds.slice(0, 2),
    },
    {
      id: "rec-3",
      title: "Validate communication chain before next window",
      priority: "monitor" as const,
      rationale: "Communication and association edges suggest coordination before movement.",
      evidenceReportIds: topEvidenceIds.slice(1, 3),
    },
  ];

  return {
    caseId,
    generatedAt: now.toISOString(),
    summary: `AI detects ${recentReports.length} recent reports, ${watchItems.length} active watch entities, and elevated recurrence around ${topLocation}.`,
    prediction: {
      nextEventWindowStart: nextStart.toISOString(),
      nextEventWindowEnd: nextEnd.toISOString(),
      predictedLocation: topLocation,
      predictedLat: topLocationEntity?.geo?.lat,
      predictedLon: topLocationEntity?.geo?.lon,
      probability: Number(probabilityBase.toFixed(2)),
    },
    watchItems,
    recommendations,
    evidence,
    riskNotes: [
      "This is decision support, not certainty. Use supervisor review for high-impact actions.",
      "Sparse or delayed field reporting can shift the forecast window.",
      "Protected entities may be masked based on current role permissions.",
    ],
  };
}
