"use client";

import { useEffect, useMemo, useState } from "react";
import { FileDown, Link2, ShieldAlert, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import type { CaseRecord, Entity, Relationship, ReportRecord } from "@/lib/types";
import { HelpOverlay } from "@/components/HelpOverlay";
import { HudPanel } from "@/components/hud/HudPanel";
import { HudKpi } from "@/components/hud/HudKpi";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function BriefingPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [activeCaseId, setActiveCaseId] = useState("case-atl-001");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);

  useEffect(() => {
    api.getCases().then(setCases);
  }, []);

  useEffect(() => {
    Promise.all([
      api.getEntities(activeCaseId),
      api.getRelationships(activeCaseId),
      api.getReports(activeCaseId),
    ]).then(([entityData, relationshipData, reportData]) => {
      setEntities(entityData);
      setRelationships(relationshipData);
      setReports(reportData);
    });
  }, [activeCaseId]);

  const summary = useMemo(() => {
    return {
      highStrengthLinks: relationships.filter((relationship) => relationship.strength === "high").length,
      protectedEntities: entities.filter((entity) => entity.protectedFlag).length,
      recentReports: [...reports].sort((a, b) => (a.timeObserved < b.timeObserved ? 1 : -1)).slice(0, 6),
    };
  }, [relationships, entities, reports]);

  return (
    <div className="space-y-4">
      <HudPanel title="Briefing Mode" subtitle="Leadership snapshot and handoff-ready case summary.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <HudKpi label="Entities" value={entities.length} icon={<Sparkles className="h-4 w-4" />} />
          <HudKpi label="Relationships" value={relationships.length} icon={<Link2 className="h-4 w-4" />} />
          <HudKpi label="High Strength Links" value={summary.highStrengthLinks} icon={<Link2 className="h-4 w-4" />} />
          <HudKpi label="Protected Entities" value={summary.protectedEntities} icon={<ShieldAlert className="h-4 w-4" />} />
        </div>
      </HudPanel>

      <HudPanel title="Active Case">
        <div className="max-w-xl">
          <p className="hud-label mb-1">Case Selection</p>
          <Select value={activeCaseId} onValueChange={setActiveCaseId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {cases.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </HudPanel>

      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <HudPanel title="Briefing Snapshot">
          <div className="space-y-2 text-sm">
            <p><strong>Total Entities:</strong> {entities.length}</p>
            <p><strong>Total Relationships:</strong> {relationships.length}</p>
            <p><strong>High Strength Links:</strong> {summary.highStrengthLinks}</p>
            <p><strong>Protected Entities:</strong> {summary.protectedEntities}</p>
          </div>
          <Button
            className="mt-4"
            onClick={() => {
              window.alert("Mock export complete. In phase 2 this will trigger secure PDF generation.");
            }}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Export Briefing (Mock)
          </Button>
        </HudPanel>

        <HudPanel title="Recent Report Highlights">
          <ul className="space-y-2 text-sm">
            {summary.recentReports.map((report) => (
              <li key={report.id} className="rounded-md border border-border/40 p-2">
                <span className="text-cyan-100 text-telemetry">{report.timeObserved.slice(0, 16).replace("T", " ")}</span>
                {" - "}
                {report.narrative}
              </li>
            ))}
          </ul>
        </HudPanel>
      </div>

      <HelpOverlay pageKey="global" />
    </div>
  );
}
