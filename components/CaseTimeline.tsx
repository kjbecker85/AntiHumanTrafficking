"use client";

import type { Entity, ReportRecord, UserRole } from "@/lib/types";
import { maskEntityName } from "@/lib/auth";
import { HudPanel } from "@/components/hud/HudPanel";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CaseTimelineProps {
  reports: ReportRecord[];
  entities: Entity[];
  role: UserRole;
  selectedEntityId: string | null;
  onSelectEntity: (entity: Entity) => void;
}

export function CaseTimeline({ reports, entities, role, selectedEntityId, onSelectEntity }: CaseTimelineProps) {
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const sortedReports = [...reports].sort((a, b) => (a.timeObserved < b.timeObserved ? -1 : 1));

  return (
    <HudPanel title="Case Timeline" subtitle="Chronological report stream with linked entities.">
      <ScrollArea className="timeline-list">
        {sortedReports.map((report) => {
          const isRelated = selectedEntityId ? report.relatedEntityIds.includes(selectedEntityId) : false;
          const relatedEntities = report.relatedEntityIds
            .map((id) => entityById.get(id))
            .filter((item): item is Entity => Boolean(item));

          return (
            <article key={report.id} className={`timeline-item ${isRelated ? "highlight" : ""}`}>
              <p className="text-sm font-semibold text-cyan-100 text-telemetry">{new Date(report.timeObserved).toLocaleString()}</p>
              <p className="mt-1 text-sm">{report.narrative}</p>
              <p className="hint mt-1">
                <strong>Location:</strong> {report.location} | <strong>Source:</strong> {report.sourceType}
              </p>
              <div className="timeline-entity-list">
                {relatedEntities.map((entity) => (
                  <button
                    key={`${report.id}-${entity.id}`}
                    type="button"
                    className={`timeline-entity-chip ${selectedEntityId === entity.id ? "selected" : ""}`}
                    onClick={() => onSelectEntity(entity)}
                  >
                    <span className="timeline-entity-thumb-wrap">
                      {entity.imageUrl ? (
                        <img
                          src={entity.imageUrl}
                          alt={`${maskEntityName(entity, role)} profile`}
                          className="timeline-entity-thumb"
                        />
                      ) : (
                        <span className="timeline-entity-thumb placeholder">No</span>
                      )}
                    </span>
                    <span>{maskEntityName(entity, role)}</span>
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </ScrollArea>
    </HudPanel>
  );
}
