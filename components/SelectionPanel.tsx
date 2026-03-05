"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Entity, Relationship, ReportRecord, UserRole } from "@/lib/types";
import { maskEntityName } from "@/lib/auth";
import { formatEntityType, formatTokenLabel } from "@/lib/format";
import { HudPanel } from "@/components/hud/HudPanel";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SelectionPanelProps {
  selectedEntity: Entity | null;
  selectedRelationship: Relationship | null;
  reports: ReportRecord[];
  role: UserRole;
  entityEditorMode?: "identity" | "description" | "attributes";
  onPatchRelationship: (
    relationshipId: string,
    updates: Partial<Pick<Relationship, "strength" | "confidence" | "label" | "type">>,
  ) => Promise<void>;
  onPatchEntity: (
    entityId: string,
    updates: Partial<Pick<Entity, "uniqueIdentity" | "uniqueIdentifierType" | "eventDateTime" | "descriptionText" | "attributes">>,
  ) => Promise<void>;
}

export function SelectionPanel({
  selectedEntity,
  selectedRelationship,
  reports,
  role,
  entityEditorMode = "identity",
  onPatchRelationship,
  onPatchEntity,
}: SelectionPanelProps) {
  const [relationshipLabel, setRelationshipLabel] = useState("");
  const [relationshipType, setRelationshipType] = useState<Relationship["type"]>("association");
  const [uniqueIdentity, setUniqueIdentity] = useState("");
  const [eventDateTime, setEventDateTime] = useState("");
  const [descriptionText, setDescriptionText] = useState("");
  const [attributesText, setAttributesText] = useState("");
  const [activeTab, setActiveTab] = useState<"entity" | "relationship">("entity");

  useEffect(() => {
    if (!selectedRelationship) return;
    setRelationshipLabel(selectedRelationship.label ?? "");
    setRelationshipType(selectedRelationship.type);
    setActiveTab("relationship");
  }, [selectedRelationship]);

  useEffect(() => {
    if (!selectedEntity) return;
    setUniqueIdentity(selectedEntity.uniqueIdentity ?? "");
    setEventDateTime(selectedEntity.eventDateTime ?? "");
    setDescriptionText(selectedEntity.descriptionText ?? "");
    const asText = Object.entries(selectedEntity.attributes ?? {})
      .map(([k, v]) => `${k}:${v}`)
      .join(", ");
    setAttributesText(asText);
    setActiveTab("entity");
  }, [selectedEntity]);

  if (!selectedEntity && !selectedRelationship) {
    return (
      <HudPanel title="Selection Panel" subtitle="Select a node or link in the graph to inspect details.">
        <p className="hint">No active selection.</p>
      </HudPanel>
    );
  }

  const relatedReports = selectedEntity
    ? reports.filter((r) => r.relatedEntityIds.includes(selectedEntity.id)).slice(0, 6)
    : [];

  return (
    <HudPanel title="Selection Panel" subtitle="Entity and relationship inspection tools.">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "entity" | "relationship")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="entity" disabled={!selectedEntity}>Entity</TabsTrigger>
          <TabsTrigger value="relationship" disabled={!selectedRelationship}>Relationship</TabsTrigger>
        </TabsList>

        <TabsContent value="entity">
          <AnimatePresence mode="wait">
            {selectedEntity ? (
              <motion.div
                key={selectedEntity.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
                className="space-y-3"
              >
                <div className="selection-header-grid">
                  <div>
                    <p className="font-hud text-lg text-cyan-100">{maskEntityName(selectedEntity, role)}</p>
                    <p className="hint">{formatEntityType(selectedEntity.type)}</p>
                  </div>
                  <div className="selection-entity-image-wrap">
                    {selectedEntity.imageUrl ? (
                      <img
                        src={selectedEntity.imageUrl}
                        alt={`${maskEntityName(selectedEntity, role)} profile`}
                        className="selection-entity-image"
                      />
                    ) : (
                      <div className="selection-entity-image placeholder">No photo</div>
                    )}
                  </div>
                </div>

                <div className="selection-meta-grid">
                  <p><strong>Confidence:</strong> {selectedEntity.confidence.toFixed(2)}</p>
                  <p><strong>Protected:</strong> {selectedEntity.protectedFlag ? "yes" : "no"}</p>
                  <p><strong>Aliases:</strong> {selectedEntity.aliases.join(", ") || "none"}</p>
                  <p><strong>Descriptors:</strong> {selectedEntity.descriptors.join(", ") || "none"}</p>
                </div>

                {entityEditorMode === "identity" ? (
                  <div className="selection-editor-grid">
                    <label className="grid gap-1">
                      <span className="hud-label">Unique Identity</span>
                      <Input value={uniqueIdentity} onChange={(event) => setUniqueIdentity(event.target.value)} />
                    </label>
                    <label className="grid gap-1">
                      <span className="hud-label">Date &amp; Time</span>
                      <Input
                        type="datetime-local"
                        value={eventDateTime}
                        onChange={(event) => setEventDateTime(event.target.value)}
                      />
                    </label>
                    <Button
                      type="button"
                      onClick={() => onPatchEntity(selectedEntity.id, { uniqueIdentity, eventDateTime })}
                    >
                      Save Identity/Time
                    </Button>
                  </div>
                ) : null}

                {entityEditorMode === "description" ? (
                  <div className="selection-editor-grid">
                    <label className="grid gap-1">
                      <span className="hud-label">Description</span>
                      <Textarea value={descriptionText} rows={4} onChange={(event) => setDescriptionText(event.target.value)} />
                    </label>
                    <Button type="button" onClick={() => onPatchEntity(selectedEntity.id, { descriptionText })}>
                      Save Description
                    </Button>
                  </div>
                ) : null}

                {entityEditorMode === "attributes" ? (
                  <div className="selection-editor-grid">
                    <label className="grid gap-1">
                      <span className="hud-label">Attributes (key:value, comma separated)</span>
                      <Textarea value={attributesText} rows={4} onChange={(event) => setAttributesText(event.target.value)} />
                    </label>
                    <Button
                      type="button"
                      onClick={() => {
                        const attributes = Object.fromEntries(
                          attributesText
                            .split(",")
                            .map((part) => part.trim())
                            .filter(Boolean)
                            .map((part) => {
                              const [k, ...rest] = part.split(":");
                              return [k?.trim() ?? "", rest.join(":").trim()];
                            })
                            .filter(([k]) => Boolean(k)),
                        );
                        onPatchEntity(selectedEntity.id, { attributes });
                      }}
                    >
                      Save Attributes
                    </Button>
                  </div>
                ) : null}

                <div>
                  <p className="hud-label mb-2">Related Reports</p>
                  <ul className="space-y-2 text-sm">
                    {relatedReports.map((report) => (
                      <li key={report.id} className="rounded-md border border-border/40 p-2">
                        {report.timeObserved.slice(0, 10)} - {report.narrative}
                      </li>
                    ))}
                    {relatedReports.length === 0 ? <li className="hint">No related reports.</li> : null}
                  </ul>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="relationship">
          <AnimatePresence mode="wait">
            {selectedRelationship ? (
              <motion.div
                key={selectedRelationship.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
                className="space-y-3"
              >
                <p><strong>Type:</strong> {formatTokenLabel(selectedRelationship.type)}</p>
                <p><strong>Strength:</strong> {selectedRelationship.strength}</p>
                <p><strong>Confidence:</strong> {selectedRelationship.confidence.toFixed(2)}</p>
                <p><strong>Source Count:</strong> {selectedRelationship.sourceCount}</p>

                <label className="grid gap-1">
                  <span className="hud-label">Relationship Label</span>
                  <Input value={relationshipLabel} onChange={(event) => setRelationshipLabel(event.target.value)} />
                </label>
                <label className="grid gap-1">
                  <span className="hud-label">Relationship Type</span>
                  <Select
                    value={relationshipType}
                    onValueChange={(value) => setRelationshipType(value as Relationship["type"])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contact">contact</SelectItem>
                      <SelectItem value="co_location">co_location</SelectItem>
                      <SelectItem value="financial">financial</SelectItem>
                      <SelectItem value="communication">communication</SelectItem>
                      <SelectItem value="association">association</SelectItem>
                    </SelectContent>
                  </Select>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="secondary" onClick={() => onPatchRelationship(selectedRelationship.id, { strength: "low", confidence: 0.45 })}>
                    Set Low
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => onPatchRelationship(selectedRelationship.id, { strength: "medium", confidence: 0.65 })}>
                    Set Medium
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => onPatchRelationship(selectedRelationship.id, { strength: "high", confidence: 0.85 })}>
                    Set High
                  </Button>
                  <Button
                    type="button"
                    onClick={() =>
                      onPatchRelationship(selectedRelationship.id, { label: relationshipLabel, type: relationshipType })
                    }
                  >
                    Save Edge Label
                  </Button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </TabsContent>
      </Tabs>
    </HudPanel>
  );
}
