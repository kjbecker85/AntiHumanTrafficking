"use client";

import { useMemo, useState } from "react";
import type { EntityType } from "@/lib/types";
import { EntityTypeGlyph, getEntityTypeLabel } from "@/components/EntityTypeGlyph";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HudPanel } from "@/components/hud/HudPanel";

interface EntityPaletteProps {
  onAddEntity: (input: { type: EntityType; displayName: string; protectedFlag: boolean }) => Promise<void>;
}

const paletteTypes: EntityType[] = [
  "person",
  "suspect",
  "victim",
  "associate",
  "unknown_person",
  "phone",
  "email",
  "vehicle",
  "license_plate",
  "location",
  "organization",
  "account",
  "document",
];

const iconAccent: Record<EntityType, string> = {
  person: "#67e8f9",
  suspect: "#fb923c",
  unknown_person: "#e2e8f0",
  victim: "#fbbf24",
  associate: "#93c5fd",
  organization: "#60a5fa",
  phone: "#38bdf8",
  email: "#22d3ee",
  vehicle: "#22d3ee",
  license_plate: "#2dd4bf",
  location: "#2dd4bf",
  account: "#7dd3fc",
  document: "#cbd5e1",
};

export function EntityPalette({ onAddEntity }: EntityPaletteProps) {
  const [selectedType, setSelectedType] = useState<EntityType>("person");
  const [displayName, setDisplayName] = useState("");
  const [protectedFlag, setProtectedFlag] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const defaultHint = useMemo(() => {
    switch (selectedType) {
      case "suspect":
        return "Example: Unknown Driver Alpha";
      case "phone":
        return "Example: +1-303-555-0144";
      case "location":
        return "Example: 1800 Market St";
      default:
        return `Example: ${getEntityTypeLabel(selectedType)} Record`;
    }
  }, [selectedType]);

  return (
    <HudPanel title="Entity Palette" subtitle="Pick an icon, set a label, and insert a new entity into this case.">
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-4">
        {paletteTypes.map((type) => (
          <Button
            key={type}
            type="button"
            variant={selectedType === type ? "default" : "secondary"}
            size="sm"
            className="h-auto flex-col gap-1.5 border border-border/60 py-2"
            onClick={() => setSelectedType(type)}
            title={`Use ${getEntityTypeLabel(type)} entity`}
          >
            <span
              className="relative grid h-8 w-8 place-items-center rounded-full border border-white/25"
              style={{
                background: `radial-gradient(circle at 35% 30%, ${iconAccent[type]}55, rgba(2,6,23,.72) 70%)`,
                boxShadow: selectedType === type
                  ? `0 0 16px ${iconAccent[type]}66`
                  : `0 0 10px ${iconAccent[type]}30`,
              }}
            >
              <svg
                viewBox="-14 -14 28 28"
                className="relative h-[18px] w-[18px]"
                aria-hidden
                style={{ color: "#f8fafc" }}
              >
                <g
                  stroke="currentColor"
                  fill="none"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <EntityTypeGlyph type={type} />
                </g>
              </svg>
            </span>
            <span className="text-[11px]">{getEntityTypeLabel(type)}</span>
          </Button>
        ))}
      </div>
      <div className="mt-3 grid gap-3">
        <label className="grid gap-1 text-sm">
          <span className="hud-label">Entity Display Name</span>
          <Input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder={defaultHint}
          />
        </label>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={protectedFlag}
            onChange={(event) => setProtectedFlag(event.target.checked)}
          />
          Mark as protected data
        </label>
        <Button
          type="button"
          disabled={submitting || !displayName.trim()}
          onClick={async () => {
            const name = displayName.trim();
            if (!name) return;
            setSubmitting(true);
            try {
              await onAddEntity({
                type: selectedType,
                displayName: name,
                protectedFlag,
              });
              setDisplayName("");
              setProtectedFlag(false);
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {submitting ? "Adding..." : "Add to Cork Board"}
        </Button>
      </div>
    </HudPanel>
  );
}
