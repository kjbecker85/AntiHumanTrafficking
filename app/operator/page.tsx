"use client";

import dynamic from "next/dynamic";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Activity, BrainCircuit, MapPin, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";
import { maskEntityName } from "@/lib/auth";
import { formatEntityType } from "@/lib/format";
import type { CaseRecord, Entity, OperatorAiBrief, Relationship, ReportRecord } from "@/lib/types";
import { useRole } from "@/components/RoleProvider";
import { HelpOverlay } from "@/components/HelpOverlay";
import { HudPanel } from "@/components/hud/HudPanel";
import { HudKpi } from "@/components/hud/HudKpi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EntityGeoMap = dynamic(
  () => import("@/components/EntityGeoMap").then((module) => module.EntityGeoMap),
  { ssr: false },
);

export default function OperatorPage() {
  const { role } = useRole();
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [activeCaseId, setActiveCaseId] = useState("case-atl-001");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiBrief, setAiBrief] = useState<OperatorAiBrief | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [forecastWindowHours, setForecastWindowHours] = useState(48);

  const [location, setLocation] = useState("Union Station Transit Hub");
  const [narrative, setNarrative] = useState("Field observation from operator quick form.");
  const [sourceType, setSourceType] = useState<ReportRecord["sourceType"]>("field_observation");
  const [relatedEntityId, setRelatedEntityId] = useState("e1");

  useEffect(() => {
    api.getCases().then(setCases);
  }, []);

  useEffect(() => {
    Promise.all([
      api.getEntities(activeCaseId),
      api.getRelationships(activeCaseId),
      api.getReports(activeCaseId),
    ])
      .then(([entityData, relationshipData, reportData]) => {
        setEntities(entityData);
        setRelationships(relationshipData);
        setReports([...reportData].sort((a, b) => (a.timeObserved < b.timeObserved ? 1 : -1)));
        setSelectedEntity(null);
        if (entityData.length > 0) {
          setRelatedEntityId(entityData[0].id);
        }
      })
      .catch((err) => setError((err as Error).message));
  }, [activeCaseId]);

  useEffect(() => {
    setAiLoading(true);
    setAiError(null);
    api
      .getOperatorBrief(activeCaseId, role, forecastWindowHours)
      .then(setAiBrief)
      .catch((err) => setAiError((err as Error).message))
      .finally(() => setAiLoading(false));
  }, [activeCaseId, role, forecastWindowHours, reports.length]);

  const entityReportCount = useMemo(() => {
    const counts = new Map<string, number>();
    reports.forEach((report) => {
      report.relatedEntityIds.forEach((id) => {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      });
    });
    return counts;
  }, [reports]);

  const watchItems = useMemo(() => {
    return [...entities]
      .sort((a, b) => {
        const scoreA = a.confidence + (entityReportCount.get(a.id) ?? 0) * 0.03;
        const scoreB = b.confidence + (entityReportCount.get(b.id) ?? 0) * 0.03;
        return scoreB - scoreA;
      })
      .slice(0, 8);
  }, [entities, entityReportCount]);

  const activeEntityOptions = useMemo(
    () => entities.filter((entity) => entity.caseId === activeCaseId),
    [entities, activeCaseId],
  );

  const recentHours = 24;
  const recentCutoff = Date.now() - recentHours * 60 * 60 * 1000;
  const recentReportCount = reports.filter((report) => new Date(report.timeObserved).getTime() >= recentCutoff).length;

  async function onSubmitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const created = await api.createReport({
        caseId: activeCaseId,
        timeObserved: new Date().toISOString(),
        location,
        narrative,
        sourceType,
        relatedEntityIds: [relatedEntityId],
      });
      setReports((previous) => [created, ...previous]);
      setNarrative("Field observation from operator quick form.");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <HudPanel title="Operator View" subtitle="Field-first mission dashboard with live watch items and reporting.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <HudKpi label="Entities" value={entities.length} icon={<Activity className="h-4 w-4" />} />
          <HudKpi label="Relationships" value={relationships.length} icon={<Activity className="h-4 w-4" />} />
          <HudKpi label="Reports" value={reports.length} icon={<MapPin className="h-4 w-4" />} />
          <HudKpi label="Last 24h Reports" value={recentReportCount} icon={<ShieldAlert className="h-4 w-4" />} />
        </div>
      </HudPanel>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <HudPanel title="Case and Forecast Controls">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-1">
            <span className="hud-label">Active Case</span>
            <Select value={activeCaseId} onValueChange={setActiveCaseId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {cases.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-1">
            <span className="hud-label">Forecast Window (Hours)</span>
            <Input
              type="number"
              min={12}
              max={168}
              value={forecastWindowHours}
              onChange={(event) => setForecastWindowHours(Math.max(12, Math.min(168, Number(event.target.value) || 48)))}
            />
          </label>
          <div className="grid gap-1">
            <span className="hud-label">Current Role</span>
            <p className="rounded-md border border-border/50 bg-secondary/20 px-3 py-2 text-sm">{role}</p>
          </div>
        </div>
      </HudPanel>

      <section className="operator-ai-grid">
        <HudPanel title="AI Brief" subtitle="Synthesized watchlist and risk guidance.">
          {aiLoading ? <p className="hint">Loading AI brief...</p> : null}
          {aiError ? <p className="text-sm text-rose-300">{aiError}</p> : null}
          {!aiLoading && !aiError && aiBrief ? (
            <div className="space-y-3 text-sm">
              <p>{aiBrief.summary}</p>
              <div className="rounded-md border border-border/50 p-3">
                <p className="hud-label mb-1">Prediction</p>
                <p>
                  {aiBrief.prediction.predictedLocation} | probability {Math.round(aiBrief.prediction.probability * 100)}%
                </p>
                <p className="hint">
                  {aiBrief.prediction.nextEventWindowStart.slice(0, 16).replace("T", " ")}
                  {" - "}
                  {aiBrief.prediction.nextEventWindowEnd.slice(0, 16).replace("T", " ")}
                </p>
              </div>
              <div>
                <p className="hud-label mb-1">Top Watch Items</p>
                <ul className="space-y-2">
                  {aiBrief.watchItems.slice(0, 5).map((item) => (
                    <li key={item.entityId} className="rounded-md border border-border/40 p-2">
                      <strong>{item.entityName}</strong> ({formatEntityType(item.type)}) score {item.score.toFixed(2)}
                      <p className="hint mt-1">{item.rationale}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </HudPanel>

        <HudPanel title="Operational Recommendations" subtitle="Action queue prioritized by AI evidence.">
          {aiBrief?.recommendations?.length ? (
            <ul className="space-y-2 text-sm">
              {aiBrief.recommendations.map((recommendation) => (
                <li key={recommendation.id} className="rounded-md border border-border/40 p-3">
                  <p className="font-semibold">{recommendation.title}</p>
                  <p className="hint">{recommendation.rationale}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.1em] text-cyan-200">{recommendation.priority}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hint">No recommendations available.</p>
          )}
          <div className="mt-4 rounded-md border border-border/50 p-3">
            <p className="hud-label mb-1 flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-cyan-300" />
              Risk Notes
            </p>
            <ul className="space-y-1 text-sm">
              {aiBrief?.riskNotes?.map((note) => <li key={note}>- {note}</li>)}
              {!aiBrief?.riskNotes?.length ? <li className="hint">No risk notes yet.</li> : null}
            </ul>
          </div>
        </HudPanel>
      </section>

      <div className="grid-2">
        <EntityGeoMap
          entities={entities.filter((entity) => entity.geo)}
          role={role}
          selectedEntityId={selectedEntity?.id ?? null}
          onSelectEntity={setSelectedEntity}
        />

        <HudPanel title="Field Reporting Form" subtitle="Quick structured capture for operator updates.">
          <form className="grid gap-3" onSubmit={onSubmitReport}>
            <label className="grid gap-1">
              <span className="hud-label">Location</span>
              <Input value={location} onChange={(event) => setLocation(event.target.value)} required />
            </label>
            <label className="grid gap-1">
              <span className="hud-label">Narrative</span>
              <Textarea value={narrative} onChange={(event) => setNarrative(event.target.value)} rows={5} required />
            </label>
            <label className="grid gap-1">
              <span className="hud-label">Source Type</span>
              <Select value={sourceType} onValueChange={(value) => setSourceType(value as ReportRecord["sourceType"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="field_observation">field_observation</SelectItem>
                  <SelectItem value="partner_submission">partner_submission</SelectItem>
                  <SelectItem value="internal_note">internal_note</SelectItem>
                  <SelectItem value="open_source">open_source</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1">
              <span className="hud-label">Related Entity</span>
              <Select value={relatedEntityId} onValueChange={setRelatedEntityId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {activeEntityOptions.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {maskEntityName(entity, role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <Button type="submit">Submit Field Report</Button>
          </form>
        </HudPanel>
      </div>

      <section className="operator-kpi-grid">
        <HudPanel title="Current Watch Items">
          <ul className="space-y-2 text-sm">
            {watchItems.map((item) => (
              <li key={item.id} className="rounded-md border border-border/40 p-2">
                <button type="button" className="link-button" onClick={() => setSelectedEntity(item)}>
                  {maskEntityName(item, role)}
                </button>
                <span className="hint">
                  {" "}
                  ({formatEntityType(item.type)}, conf {item.confidence.toFixed(2)}, reports {entityReportCount.get(item.id) ?? 0})
                </span>
              </li>
            ))}
          </ul>
        </HudPanel>

        <HudPanel title="Entity Cards">
          <div className="operator-entity-grid">
            {entities.map((entity) => (
              <article
                key={entity.id}
                className={`entity-mini-card ${selectedEntity?.id === entity.id ? "selected" : ""}`}
                onClick={() => setSelectedEntity(entity)}
              >
                <div className="entity-card-thumb-wrap">
                  {entity.imageUrl ? (
                    <img
                      src={entity.imageUrl}
                      alt={`${maskEntityName(entity, role)} profile`}
                      className="entity-card-thumb"
                    />
                  ) : (
                    <div className="entity-card-thumb placeholder" aria-label="No entity image">No photo</div>
                  )}
                </div>
                <h4>{maskEntityName(entity, role)}</h4>
                <div className="mt-2 grid gap-1 text-sm">
                  <p><strong>Type:</strong> {formatEntityType(entity.type)}</p>
                  <p><strong>Confidence:</strong> {entity.confidence.toFixed(2)}</p>
                  <p><strong>Reports:</strong> {entityReportCount.get(entity.id) ?? 0}</p>
                  <p><strong>Address:</strong> {entity.geo?.address ?? "none"}</p>
                </div>
              </article>
            ))}
          </div>
        </HudPanel>
      </section>

      <HelpOverlay pageKey="operator" />
    </div>
  );
}
