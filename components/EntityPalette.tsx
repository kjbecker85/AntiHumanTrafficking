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
  suspect: "#f97316",
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
            className="group h-auto min-h-28 flex-col gap-2 overflow-hidden border border-border/60 px-2 py-3 transition-all duration-200"
            style={{
              background:
                selectedType === type
                  ? `linear-gradient(180deg, ${iconAccent[type]}22 0%, rgba(7, 12, 24, 0.96) 100%)`
                  : "linear-gradient(180deg, rgba(30,41,59,0.55) 0%, rgba(9,14,28,0.94) 100%)",
              boxShadow:
                selectedType === type
                  ? `inset 0 0 0 1px ${iconAccent[type]}66, 0 10px 24px rgba(2,6,23,0.45), 0 0 28px ${iconAccent[type]}33`
                  : `inset 0 0 0 1px rgba(255,255,255,0.04), 0 10px 20px rgba(2,6,23,0.32)`,
            }}
            onClick={() => setSelectedType(type)}
            title={`Use ${getEntityTypeLabel(type)} entity`}
          >
            <span
              className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border border-white/15 transition-transform duration-200 group-hover:scale-[1.04]"
              style={{
                background: `
                  radial-gradient(circle at 30% 28%, rgba(255,255,255,0.22), transparent 22%),
                  radial-gradient(circle at 50% 35%, ${iconAccent[type]}88, rgba(3,7,18,0.92) 72%)
                `,
                boxShadow: selectedType === type
                  ? `inset 0 1px 0 rgba(255,255,255,0.18), 0 0 22px ${iconAccent[type]}66, 0 8px 22px rgba(2,6,23,0.55)`
                  : `inset 0 1px 0 rgba(255,255,255,0.12), 0 0 14px ${iconAccent[type]}33, 0 8px 18px rgba(2,6,23,0.45)`,
              }}
            >
              <span
                className="pointer-events-none absolute inset-[5px] rounded-[14px]"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.01) 42%, rgba(0,0,0,0.14) 100%)",
                }}
              />
              <span
                className="pointer-events-none absolute inset-x-2 top-1 h-px"
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)" }}
              />
              <EntityTypeGlyph
                type={type}
                className="relative z-10 h-7 w-7 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.22)]"
                strokeWidth={2.1}
              />
            </span>
            <span className="text-center text-[11px] leading-tight text-slate-100">{getEntityTypeLabel(type)}</span>
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
