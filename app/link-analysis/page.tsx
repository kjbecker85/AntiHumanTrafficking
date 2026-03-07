"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Clock3, LayoutGrid, PanelBottomOpen, Search } from "lucide-react";
import { api } from "@/lib/api";
import {
  applyGraphFilters,
  createCircularLayout,
  createCorkboardLayout,
  createEdges,
  type GraphFilters,
  type GraphLayoutMode,
} from "@/lib/graph";
import type { CaseRecord, Entity, EntityType, Relationship, ReportRecord } from "@/lib/types";
import { CaseScopeBar } from "@/components/CaseScopeBar";
import { GraphToolbar } from "@/components/GraphToolbar";
import { SelectionPanel } from "@/components/SelectionPanel";
import { HelpOverlay } from "@/components/HelpOverlay";
import { useRole } from "@/components/RoleProvider";
import { CaseTimeline } from "@/components/CaseTimeline";
import { EntityPalette } from "@/components/EntityPalette";
import { EdgePalette } from "@/components/EdgePalette";
import { HudPanel } from "@/components/hud/HudPanel";
import { HudKpi } from "@/components/hud/HudKpi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/use-toast";
import { maskEntityName } from "@/lib/auth";

const GraphCanvas = dynamic(
  () => import("@/components/GraphCanvas").then((module) => module.GraphCanvas),
  { ssr: false },
);

const EntityGeoMap = dynamic(
  () => import("@/components/EntityGeoMap").then((module) => module.EntityGeoMap),
  { ssr: false },
);

interface LayoutPreset {
  name: string;
  positions: Record<string, { x: number; y: number }>;
  updatedAt: string;
}

export default function LinkAnalysisPage() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [activeCaseId, setActiveCaseId] = useState("case-atl-001");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState<Relationship | null>(null);
  const { role, userId } = useRole();
  const { toast } = useToast();
  const [labelMode, setLabelMode] = useState<"focus" | "all">("focus");
  const [layoutMode, setLayoutMode] = useState<GraphLayoutMode>("corkboard");
  const [boardLocked, setBoardLocked] = useState(false);
  const [manualNodePositions, setManualNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [layoutPresets, setLayoutPresets] = useState<LayoutPreset[]>([]);
  const [selectedPresetName, setSelectedPresetName] = useState("");
  const [presetDraftName, setPresetDraftName] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [entityEditorMode, setEntityEditorMode] = useState<"identity" | "description" | "attributes">("identity");
  const [contextMenu, setContextMenu] = useState<{
    entity: Entity;
    x: number;
    y: number;
  } | null>(null);
  const [leftRailCollapsed, setLeftRailCollapsed] = useState(false);
  const [rightRailCollapsed, setRightRailCollapsed] = useState(false);
  const [entityListSearch, setEntityListSearch] = useState("");
  const [activeTimelineReportId, setActiveTimelineReportId] = useState<string | null>(null);

  const [filters, setFilters] = useState<GraphFilters>({
    search: "",
    type: "all",
    minConfidence: 0.35,
    strength: "all",
  });

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
      const sorted = [...reportData].sort((a, b) => (a.timeObserved < b.timeObserved ? -1 : 1));
      if (sorted.length > 0) {
        setDateStart(sorted[0].timeObserved.slice(0, 10));
        setDateEnd(sorted[sorted.length - 1].timeObserved.slice(0, 10));
      }
      setSelectedEntity(null);
      setSelectedRelationship(null);
      setActiveTimelineReportId(null);
    });
  }, [activeCaseId]);

  useEffect(() => {
    if (!contextMenu) return;
    function closeMenu() {
      setContextMenu(null);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    }
    window.addEventListener("click", closeMenu);
    window.addEventListener("contextmenu", closeMenu);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("contextmenu", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [contextMenu]);

  useEffect(() => {
    setManualNodePositions({});
  }, [layoutMode]);

  const presetStorageKey = useMemo(
    () => `link-board-presets:${activeCaseId}:${layoutMode}`,
    [activeCaseId, layoutMode],
  );

  const draftStorageKey = useMemo(
    () => `link-board-draft:${activeCaseId}:${layoutMode}`,
    [activeCaseId, layoutMode],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const rawPresets = window.localStorage.getItem(presetStorageKey);
      if (rawPresets) {
        const parsed = JSON.parse(rawPresets) as LayoutPreset[];
        setLayoutPresets(Array.isArray(parsed) ? parsed : []);
      } else {
        setLayoutPresets([]);
      }
      const rawDraft = window.localStorage.getItem(draftStorageKey);
      if (rawDraft) {
        const parsed = JSON.parse(rawDraft) as Record<string, { x: number; y: number }>;
        setManualNodePositions(parsed ?? {});
      } else {
        setManualNodePositions({});
      }
    } catch {
      setLayoutPresets([]);
      setManualNodePositions({});
    }
  }, [draftStorageKey, presetStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(draftStorageKey, JSON.stringify(manualNodePositions));
  }, [draftStorageKey, manualNodePositions]);

  function persistPresets(next: LayoutPreset[]) {
    setLayoutPresets(next);
    if (typeof window === "undefined") return;
    window.localStorage.setItem(presetStorageKey, JSON.stringify(next));
  }

  function savePreset() {
    const name = presetDraftName.trim();
    if (!name) {
      toast({
        title: "Preset name required",
        description: "Provide a preset name before saving.",
      });
      return;
    }
    const record: LayoutPreset = {
      name,
      positions: manualNodePositions,
      updatedAt: new Date().toISOString(),
    };
    const deduped = layoutPresets.filter((item) => item.name !== name);
    persistPresets([record, ...deduped].slice(0, 20));
    setSelectedPresetName(name);
    toast({
      title: "Layout preset saved",
      description: `Saved "${name}" for this case and layout mode.`,
    });
  }

  function loadPreset() {
    if (!selectedPresetName) return;
    const preset = layoutPresets.find((item) => item.name === selectedPresetName);
    if (!preset) return;
    setManualNodePositions(preset.positions);
    toast({
      title: "Layout preset loaded",
      description: `Loaded "${preset.name}".`,
    });
  }

  function deletePreset() {
    if (!selectedPresetName) return;
    persistPresets(layoutPresets.filter((item) => item.name !== selectedPresetName));
    toast({
      title: "Layout preset deleted",
      description: `Deleted "${selectedPresetName}".`,
    });
    setSelectedPresetName("");
  }

  const filteredGraph = useMemo(() => applyGraphFilters(entities, relationships, filters), [entities, relationships, filters]);

  const computedNodes = useMemo(() => {
    if (layoutMode === "circular") {
      return createCircularLayout(filteredGraph.entities);
    }
    return createCorkboardLayout(filteredGraph.entities, filteredGraph.relationships);
  }, [filteredGraph.entities, filteredGraph.relationships, layoutMode]);

  const nodes = useMemo(
    () =>
      computedNodes.map((node) => ({
        ...node,
        ...(manualNodePositions[node.id] ? manualNodePositions[node.id] : {}),
      })),
    [computedNodes, manualNodePositions],
  );

  const edges = useMemo(() => createEdges(filteredGraph.relationships), [filteredGraph.relationships]);

  const reportsByDate = useMemo(() => {
    const start = dateStart ? new Date(`${dateStart}T00:00:00.000Z`).getTime() : Number.NEGATIVE_INFINITY;
    const end = dateEnd ? new Date(`${dateEnd}T23:59:59.999Z`).getTime() : Number.POSITIVE_INFINITY;
    return reports.filter((report) => {
      const observed = new Date(report.timeObserved).getTime();
      return observed >= start && observed <= end;
    });
  }, [dateStart, dateEnd, reports]);

  const mapEntities = useMemo(() => {
    const reportEntityIds = new Set(reportsByDate.flatMap((report) => report.relatedEntityIds));
    return entities.filter((entity) => entity.geo && reportEntityIds.has(entity.id));
  }, [entities, reportsByDate]);

  const timelineStripReports = useMemo(
    () => [...reportsByDate].sort((a, b) => (a.timeObserved < b.timeObserved ? -1 : 1)).slice(-30),
    [reportsByDate],
  );

  const searchableEntityList = useMemo(() => {
    const query = entityListSearch.trim().toLowerCase();
    return filteredGraph.entities.filter((entity) => {
      if (!query) return true;
      return (
        entity.displayName.toLowerCase().includes(query) ||
        entity.aliases.some((alias) => alias.toLowerCase().includes(query))
      );
    });
  }, [entityListSearch, filteredGraph.entities]);

  async function addEntityFromPalette(input: { type: EntityType; displayName: string; protectedFlag: boolean }) {
    const created = await api.createEntity(activeCaseId, {
      type: input.type,
      displayName: input.displayName,
      aliases: [],
      confidence: 0.7,
      protectedFlag: input.protectedFlag,
      descriptors: ["palette-added"],
    });
    setEntities((previous) => [created, ...previous]);
    setSelectedRelationship(null);
    setSelectedEntity(created);
    toast({
      title: "Entity added",
      description: `${created.displayName} inserted into the graph.`,
    });
    await api.postAuditEvent({
      actorId: userId,
      actionType: "create_entity",
      objectType: "entity",
      objectId: created.id,
      metadata: { source: "entity_palette", caseId: activeCaseId },
    });
  }

  async function addRelationshipFromPalette(input: {
    fromEntityId: string;
    toEntityId: string;
    type: Relationship["type"];
    strength: Relationship["strength"];
    confidence: number;
    label: string;
  }) {
    const created = await api.createRelationship(activeCaseId, {
      fromEntityId: input.fromEntityId,
      toEntityId: input.toEntityId,
      type: input.type,
      strength: input.strength,
      confidence: input.confidence,
      sourceCount: 1,
      label: input.label,
    });
    setRelationships((previous) => [created, ...previous]);
    setSelectedEntity(null);
    setSelectedRelationship(created);
    toast({
      title: "Relationship created",
      description: `New edge "${input.label}" is now visible.`,
    });
    await api.postAuditEvent({
      actorId: userId,
      actionType: "create_relationship",
      objectType: "relationship",
      objectId: created.id,
      metadata: { source: "edge_palette", caseId: activeCaseId },
    });
  }

  async function patchRelationship(
    relationshipId: string,
    updates: Partial<Pick<Relationship, "strength" | "confidence" | "label" | "type">>,
  ) {
    const patched = await api.patchRelationship(relationshipId, updates);
    setRelationships((previous) => previous.map((rel) => (rel.id === relationshipId ? patched : rel)));
    setSelectedRelationship(patched);
    await api.postAuditEvent({
      actorId: userId,
      actionType: "edit_relationship",
      objectType: "relationship",
      objectId: relationshipId,
      metadata: {
        caseId: activeCaseId,
        updatedFields: Object.keys(updates).join(","),
      },
    });
  }

  async function patchEntityMetadata(
    entityId: string,
    updates: Partial<Pick<Entity, "uniqueIdentity" | "uniqueIdentifierType" | "eventDateTime" | "descriptionText" | "attributes">>,
  ) {
    const patched = await api.patchEntity(entityId, updates);
    setEntities((previous) => previous.map((entity) => (entity.id === entityId ? patched : entity)));
    setSelectedEntity(patched);
    await api.postAuditEvent({
      actorId: userId,
      actionType: "edit_entity",
      objectType: "entity",
      objectId: entityId,
      metadata: {
        caseId: activeCaseId,
        updatedFields: Object.keys(updates).join(","),
      },
    });
  }

  return (
    <div className="space-y-4">
      <CaseScopeBar
        cases={cases}
        caseId={activeCaseId}
        role={role}
        onChangeCase={setActiveCaseId}
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <HudKpi label="Entities" value={filteredGraph.entities.length} />
        <HudKpi label="Relationships" value={filteredGraph.relationships.length} />
        <HudKpi label="Reports in Range" value={reportsByDate.length} />
        <HudKpi label="Manual Node Overrides" value={Object.keys(manualNodePositions).length} />
      </section>

      <div className="flex gap-4">
        <motion.aside
          animate={{ width: leftRailCollapsed ? 72 : 340 }}
          transition={{ duration: 0.16 }}
          className="space-y-3 overflow-hidden"
        >
          <HudPanel
            title={leftRailCollapsed ? undefined : "Control Rail"}
            actions={(
              <Button
                size="icon"
                variant="outline"
                onClick={() => setLeftRailCollapsed((previous) => !previous)}
                title={leftRailCollapsed ? "Expand left rail" : "Collapse left rail"}
              >
                {leftRailCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            )}
          >
            {leftRailCollapsed ? (
              <div className="grid gap-2">
                <Button variant="secondary" size="icon" onClick={() => setLeftRailCollapsed(false)}>
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="icon" onClick={() => setLeftRailCollapsed(false)}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <GraphToolbar
                filters={filters}
                onChange={setFilters}
                counts={{ entities: filteredGraph.entities.length, relationships: filteredGraph.relationships.length }}
                entities={filteredGraph.entities}
                role={role}
                labelMode={labelMode}
                onLabelModeChange={setLabelMode}
                layoutMode={layoutMode}
                onLayoutModeChange={setLayoutMode}
                boardLocked={boardLocked}
                onToggleBoardLock={() => setBoardLocked((previous) => !previous)}
                onResetBoardPositions={() => setManualNodePositions({})}
                presetDraftName={presetDraftName}
                onPresetDraftNameChange={setPresetDraftName}
                presetNames={layoutPresets.map((item) => item.name)}
                selectedPresetName={selectedPresetName}
                onSelectPresetName={setSelectedPresetName}
                onSavePreset={savePreset}
                onLoadPreset={loadPreset}
                onDeletePreset={deletePreset}
              />
            )}
          </HudPanel>

          <AnimatePresence>
            {!leftRailCollapsed ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="space-y-3"
              >
                <HudPanel title="Keyboard Entity Selection" subtitle="Search and select entities without canvas interaction.">
                  <Input
                    value={entityListSearch}
                    onChange={(event) => setEntityListSearch(event.target.value)}
                    placeholder="Search entities..."
                  />
                  <div className="mt-2 max-h-48 space-y-1 overflow-auto">
                    {searchableEntityList.map((entity) => (
                      <button
                        key={entity.id}
                        type="button"
                        className={`w-full rounded-md border px-2 py-1.5 text-left text-sm ${
                          selectedEntity?.id === entity.id
                            ? "border-cyan-400 bg-cyan-950/40 text-cyan-100"
                            : "border-border/50 bg-secondary/20"
                        }`}
                        onClick={() => {
                          setSelectedRelationship(null);
                          setSelectedEntity(entity);
                        }}
                      >
                        {maskEntityName(entity, role)}
                      </button>
                    ))}
                    {searchableEntityList.length === 0 ? <p className="hint px-2 py-1">No entities match.</p> : null}
                  </div>
                </HudPanel>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.aside>

        <section className="min-w-0 flex-1">
          <div className="relative">
            <div className="graph-toolbar-overlay">
              <Badge>{layoutMode}</Badge>
              <Badge variant="secondary">{boardLocked ? "locked" : "editable"}</Badge>
              <Button size="sm" variant="secondary" onClick={() => setLeftRailCollapsed((previous) => !previous)}>
                {leftRailCollapsed ? "Open Controls" : "Hide Controls"}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setRightRailCollapsed((previous) => !previous)}>
                {rightRailCollapsed ? "Open Details" : "Hide Details"}
              </Button>
            </div>
            <GraphCanvas
              nodes={nodes}
              edges={edges}
              role={role}
              selectedNodeId={selectedEntity?.id ?? null}
              selectedEdgeId={selectedRelationship?.id ?? null}
              labelMode={labelMode}
              boardLocked={boardLocked}
              onMoveNode={(nodeId, x, y) => {
                setManualNodePositions((previous) => ({ ...previous, [nodeId]: { x, y } }));
              }}
              onSelectNode={(entity) => {
                setSelectedRelationship(null);
                setSelectedEntity(entity);
              }}
              onNodeContextMenu={(entity, position) => {
                setSelectedRelationship(null);
                setSelectedEntity(entity);
                setContextMenu({
                  entity,
                  x: position.x,
                  y: position.y,
                });
              }}
              onSelectEdge={(relationship) => {
                setSelectedEntity(null);
                setSelectedRelationship(relationship);
              }}
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <EntityPalette onAddEntity={addEntityFromPalette} />
            <EdgePalette
              entities={entities}
              role={role}
              selectedEntityId={selectedEntity?.id ?? null}
              onCreateRelationship={addRelationshipFromPalette}
            />
          </div>

          <section className="hud-bottom-strip">
            <div className="mb-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-cyan-300" />
                <p className="hud-label">Timeline of Events</p>
              </div>
              <div className="flex flex-wrap items-end gap-2 lg:justify-end">
                <label className="grid gap-1">
                  <span className="hud-label">Start Date</span>
                  <Input
                    type="date"
                    value={dateStart}
                    onChange={(event) => setDateStart(event.target.value)}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="hud-label">End Date</span>
                  <Input
                    type="date"
                    value={dateEnd}
                    onChange={(event) => setDateEnd(event.target.value)}
                  />
                </label>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button size="sm" variant="secondary">
                      <PanelBottomOpen className="mr-1 h-4 w-4" />
                      Expand Timeline
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[70vh] overflow-auto">
                    <SheetHeader>
                      <SheetTitle>Full Case Timeline</SheetTitle>
                      <SheetDescription>
                        Detailed chronological report stream linked to entities.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-4">
                      <CaseTimeline
                        reports={reportsByDate}
                        entities={entities}
                        role={role}
                        selectedEntityId={selectedEntity?.id ?? null}
                        onSelectEntity={(entity) => {
                          setSelectedRelationship(null);
                          setSelectedEntity(entity);
                        }}
                      />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
            <div className="hud-timeline-strip">
              {timelineStripReports.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  className={`hud-timeline-pill ${activeTimelineReportId === report.id ? "active" : ""}`}
                  onClick={() => {
                    setActiveTimelineReportId(report.id);
                    const primaryEntity = entities.find((entity) => report.relatedEntityIds.includes(entity.id));
                    if (primaryEntity) {
                      setSelectedRelationship(null);
                      setSelectedEntity(primaryEntity);
                    }
                  }}
                >
                  {new Date(report.timeObserved).toLocaleDateString()} {new Date(report.timeObserved).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </button>
              ))}
            </div>
          </section>

        </section>

        <motion.aside
          animate={{ width: rightRailCollapsed ? 72 : 390 }}
          transition={{ duration: 0.16 }}
          className="space-y-3 overflow-hidden"
        >
          <HudPanel
            title={rightRailCollapsed ? undefined : "Detail Rail"}
            actions={(
              <Button
                size="icon"
                variant="outline"
                onClick={() => setRightRailCollapsed((previous) => !previous)}
                title={rightRailCollapsed ? "Expand right rail" : "Collapse right rail"}
              >
                {rightRailCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            )}
          >
            {rightRailCollapsed ? (
              <div className="grid gap-2">
                <Button variant="secondary" size="icon" onClick={() => setRightRailCollapsed(false)}>
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <SelectionPanel
                selectedEntity={selectedEntity}
                selectedRelationship={selectedRelationship}
                reports={reports}
                role={role}
                entityEditorMode={entityEditorMode}
                onPatchRelationship={patchRelationship}
                onPatchEntity={patchEntityMetadata}
              />
            )}
          </HudPanel>
        </motion.aside>
      </div>

      <section>
        <EntityGeoMap
          entities={mapEntities}
          role={role}
          mapClassName="h-[520px]"
          selectedEntityId={selectedEntity?.id ?? null}
          onSelectEntity={(entity) => {
            setSelectedRelationship(null);
            setSelectedEntity(entity);
          }}
        />
      </section>

      {contextMenu ? (
        <div
          className="entity-context-menu"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
        >
          <p><strong>{contextMenu.entity.displayName}</strong></p>
          <button
            type="button"
            onClick={() => {
              setEntityEditorMode("identity");
              setRightRailCollapsed(false);
              setContextMenu(null);
            }}
          >
            Edit Identity Date &amp; Time
          </button>
          <button
            type="button"
            onClick={() => {
              setEntityEditorMode("description");
              setRightRailCollapsed(false);
              setContextMenu(null);
            }}
          >
            Edit Description
          </button>
          <button
            type="button"
            onClick={() => {
              setEntityEditorMode("attributes");
              setRightRailCollapsed(false);
              setContextMenu(null);
            }}
          >
            Edit Attributes
          </button>
          <button type="button" onClick={() => setContextMenu(null)}>Close</button>
        </div>
      ) : null}

      <HelpOverlay pageKey="link-analysis" />
    </div>
  );
}
