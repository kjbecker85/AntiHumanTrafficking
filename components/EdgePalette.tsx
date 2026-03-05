"use client";

import { useEffect, useMemo, useState } from "react";
import type { Entity, Relationship, UserRole } from "@/lib/types";
import { maskEntityName } from "@/lib/auth";
import { formatEntityType } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HudPanel } from "@/components/hud/HudPanel";

type EdgeCategory = "communication" | "association" | "organizational" | "financial";

interface EdgePaletteProps {
  entities: Entity[];
  role: UserRole;
  selectedEntityId: string | null;
  onCreateRelationship: (input: {
    fromEntityId: string;
    toEntityId: string;
    type: Relationship["type"];
    strength: Relationship["strength"];
    confidence: number;
    label: string;
  }) => Promise<void>;
}

const categoryOptions: Record<EdgeCategory, string[]> = {
  communication: [
    "called",
    "texted",
    "emailed",
    "messaged",
    "contacted",
    "communicated_with",
    "connected_on_social_media",
    "shared_account_with",
  ],
  association: [
    "associated_with",
    "met_with",
    "seen_with",
    "introduced",
    "connected_to",
    "linked_to",
    "coordinated_with",
  ],
  organizational: [
    "member_of",
    "leader_of",
    "works_for",
    "employed_by",
    "manages",
    "reports_to",
    "collaborates_with",
  ],
  financial: [
    "paid",
    "received_payment_from",
    "transferred_money_to",
    "funded",
    "laundered_money_for",
    "shares_account_with",
    "benefits_from",
  ],
};

function mapCategoryToRelationshipType(category: EdgeCategory): Relationship["type"] {
  if (category === "communication") return "communication";
  if (category === "financial") return "financial";
  return "association";
}

export function EdgePalette({ entities, role, selectedEntityId, onCreateRelationship }: EdgePaletteProps) {
  const [fromEntityId, setFromEntityId] = useState("");
  const [toEntityId, setToEntityId] = useState("");
  const [category, setCategory] = useState<EdgeCategory>("association");
  const [label, setLabel] = useState(categoryOptions.association[0]);
  const [strength, setStrength] = useState<Relationship["strength"]>("medium");
  const [confidence, setConfidence] = useState(0.65);
  const [submitting, setSubmitting] = useState(false);

  const sortedEntities = useMemo(
    () => [...entities].sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [entities],
  );

  useEffect(() => {
    const options = categoryOptions[category];
    setLabel(options[0]);
  }, [category]);

  useEffect(() => {
    if (selectedEntityId) {
      setFromEntityId(selectedEntityId);
    }
  }, [selectedEntityId]);

  const labelOptions = categoryOptions[category];
  const canSubmit = Boolean(fromEntityId && toEntityId && fromEntityId !== toEntityId && label);

  return (
    <HudPanel title="Edge Builder" subtitle="Create a connection by selecting source, target, and edge details.">
      <div className="grid gap-3">
        <label className="grid gap-1">
          <span className="hud-label">Source Entity</span>
          <Select value={fromEntityId} onValueChange={setFromEntityId}>
            <SelectTrigger>
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              {sortedEntities.map((entity) => (
                <SelectItem key={`from-${entity.id}`} value={entity.id}>
                  {maskEntityName(entity, role)} ({formatEntityType(entity.type)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="grid gap-1">
          <span className="hud-label">Target Entity</span>
          <Select value={toEntityId} onValueChange={setToEntityId}>
            <SelectTrigger>
              <SelectValue placeholder="Select target" />
            </SelectTrigger>
            <SelectContent>
              {sortedEntities.map((entity) => (
                <SelectItem key={`to-${entity.id}`} value={entity.id}>
                  {maskEntityName(entity, role)} ({formatEntityType(entity.type)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <label className="grid gap-1">
          <span className="hud-label">Edge Category</span>
          <Select value={category} onValueChange={(value) => setCategory(value as EdgeCategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="communication">Communication Edges</SelectItem>
              <SelectItem value="association">Association Edges</SelectItem>
              <SelectItem value="organizational">Organizational / Role Edges</SelectItem>
              <SelectItem value="financial">Financial Edges</SelectItem>
            </SelectContent>
          </Select>
        </label>

        <label className="grid gap-1">
          <span className="hud-label">Edge Label</span>
          <Select value={label} onValueChange={setLabel}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {labelOptions.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>

        <div className="grid gap-1">
          <span className="hud-label">Strength</span>
          <Select value={strength} onValueChange={(value) => setStrength(value as Relationship["strength"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">low</SelectItem>
              <SelectItem value="medium">medium</SelectItem>
              <SelectItem value="high">high</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <span className="hud-label">Confidence</span>
            <span className="text-xs text-cyan-200 text-telemetry">{confidence.toFixed(2)}</span>
          </div>
          <Slider
            value={[confidence]}
            min={0.3}
            max={0.99}
            step={0.01}
            onValueChange={(values) => setConfidence(Number(values[0] ?? 0.65))}
          />
        </div>

        <Button
          type="button"
          disabled={!canSubmit || submitting}
          onClick={async () => {
            if (!canSubmit) return;
            setSubmitting(true);
            try {
              await onCreateRelationship({
                fromEntityId,
                toEntityId,
                type: mapCategoryToRelationshipType(category),
                strength,
                confidence,
                label,
              });
              setToEntityId("");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {submitting ? "Connecting..." : "Create Edge"}
        </Button>
      </div>
    </HudPanel>
  );
}
