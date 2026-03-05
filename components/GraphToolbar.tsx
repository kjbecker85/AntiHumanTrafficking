"use client";

import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import type { Entity, EntityType, Relationship, UserRole } from "@/lib/types";
import type { GraphFilters, GraphLayoutMode } from "@/lib/graph";
import { formatEntityType } from "@/lib/format";
import { maskEntityName } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface GraphToolbarProps {
  filters: GraphFilters;
  onChange: (next: GraphFilters) => void;
  counts: { entities: number; relationships: number };
  entities: Entity[];
  role: UserRole;
  labelMode: "focus" | "all";
  onLabelModeChange: (mode: "focus" | "all") => void;
  layoutMode: GraphLayoutMode;
  onLayoutModeChange: (mode: GraphLayoutMode) => void;
  boardLocked: boolean;
  onToggleBoardLock: () => void;
  onResetBoardPositions: () => void;
  presetDraftName: string;
  onPresetDraftNameChange: (value: string) => void;
  presetNames: string[];
  selectedPresetName: string;
  onSelectPresetName: (value: string) => void;
  onSavePreset: () => void;
  onLoadPreset: () => void;
  onDeletePreset: () => void;
}

const typeOptions: Array<{ value: "all" | EntityType; label: string }> = [
  { value: "all", label: "All" },
  { value: "person", label: formatEntityType("person") },
  { value: "suspect", label: formatEntityType("suspect") },
  { value: "unknown_person", label: formatEntityType("unknown_person") },
  { value: "victim", label: formatEntityType("victim") },
  { value: "associate", label: formatEntityType("associate") },
  { value: "organization", label: formatEntityType("organization") },
  { value: "phone", label: formatEntityType("phone") },
  { value: "email", label: formatEntityType("email") },
  { value: "vehicle", label: formatEntityType("vehicle") },
  { value: "license_plate", label: formatEntityType("license_plate") },
  { value: "location", label: formatEntityType("location") },
  { value: "account", label: formatEntityType("account") },
  { value: "document", label: formatEntityType("document") },
];

export function GraphToolbar({
  filters,
  onChange,
  counts,
  entities,
  role,
  labelMode,
  onLabelModeChange,
  layoutMode,
  onLayoutModeChange,
  boardLocked,
  onToggleBoardLock,
  onResetBoardPositions,
  presetDraftName,
  onPresetDraftNameChange,
  presetNames,
  selectedPresetName,
  onSelectPresetName,
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
}: GraphToolbarProps) {
  const options = entities.map((entity) => ({
    id: entity.id,
    label: maskEntityName(entity, role),
  }));

  return (
    <div className="space-y-4">
      <div>
        <p className="hud-label mb-1">Entity Search</p>
        <Autocomplete
          options={options}
          size="small"
          value={null}
          inputValue={filters.search}
          onInputChange={(_event, value) => onChange({ ...filters, search: value })}
          onChange={(_event, value) => {
            if (value?.label) {
              onChange({ ...filters, search: value.label });
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Search names or aliases"
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  color: "#e2e8f0",
                  background: "rgba(15,23,42,0.5)",
                  "& fieldset": { borderColor: "rgba(100,116,139,0.45)" },
                  "&:hover fieldset": { borderColor: "rgba(34,211,238,0.7)" },
                  "&.Mui-focused fieldset": {
                    borderColor: "#22d3ee",
                    boxShadow: "0 0 0 1px rgba(34,211,238,0.3)",
                  },
                },
                "& .MuiInputBase-input::placeholder": {
                  color: "#94a3b8",
                  opacity: 1,
                },
              }}
            />
          )}
        />
      </div>

      <div className="space-y-1">
        <p className="hud-label">Entity Type</p>
        <Select
          value={filters.type}
          onValueChange={(value) =>
            onChange({
              ...filters,
              type: value as "all" | EntityType,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Type filter" />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="hud-label">Min Confidence</p>
          <span className="text-xs text-cyan-200 text-telemetry">{filters.minConfidence.toFixed(2)}</span>
        </div>
        <Slider
          value={[filters.minConfidence]}
          min={0}
          max={1}
          step={0.05}
          onValueChange={(value) => {
            onChange({ ...filters, minConfidence: Number(value[0] ?? 0) });
          }}
        />
      </div>

      <div className="space-y-1">
        <p className="hud-label">Relationship Strength</p>
        <Select
          value={filters.strength}
          onValueChange={(value) =>
            onChange({
              ...filters,
              strength: value as "all" | Relationship["strength"],
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Strength filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">all</SelectItem>
            <SelectItem value="high">high</SelectItem>
            <SelectItem value="medium">medium</SelectItem>
            <SelectItem value="low">low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="hud-label">Label Display</p>
          <Select
            value={labelMode}
            onValueChange={(value) => onLabelModeChange(value as "focus" | "all")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="focus">focused only</SelectItem>
              <SelectItem value="all">all labels</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="hud-label">Layout Style</p>
          <Select
            value={layoutMode}
            onValueChange={(value) => onLayoutModeChange(value as GraphLayoutMode)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="corkboard">corkboard</SelectItem>
              <SelectItem value="circular">circular</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" onClick={onToggleBoardLock}>
          {boardLocked ? "Unlock board" : "Lock board"}
        </Button>
        <Button type="button" variant="secondary" onClick={onResetBoardPositions}>
          Reset positions
        </Button>
      </div>

      <div className="space-y-2 rounded-md border border-border/50 p-3">
        <p className="hud-label">Layout Presets</p>
        <input
          value={presetDraftName}
          onChange={(event) => onPresetDraftNameChange(event.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-secondary/20 px-3 py-2 text-sm"
          placeholder="Preset name"
        />
        <div className="grid grid-cols-3 gap-2">
          <Button type="button" size="sm" onClick={onSavePreset}>
            Save
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={onLoadPreset} disabled={!selectedPresetName}>
            Load
          </Button>
          <Button type="button" size="sm" variant="destructive" onClick={onDeletePreset} disabled={!selectedPresetName}>
            Delete
          </Button>
        </div>
        <Select value={selectedPresetName || undefined} onValueChange={onSelectPresetName}>
          <SelectTrigger>
            <SelectValue placeholder="Select preset" />
          </SelectTrigger>
          <SelectContent>
            {presetNames.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{counts.entities} entities</Badge>
        <Badge variant="secondary">{counts.relationships} relationships</Badge>
      </div>
    </div>
  );
}
