"use client";

import type { CaseRecord, UserRole } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HudPanel } from "@/components/hud/HudPanel";

interface CaseScopeBarProps {
  cases: CaseRecord[];
  caseId: string;
  role: UserRole;
  onChangeCase: (caseId: string) => void;
}

export function CaseScopeBar({ cases, caseId, role, onChangeCase }: CaseScopeBarProps) {
  return (
    <HudPanel
      title="Case Scope"
      actions={(
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Role: {role}</Badge>
          <Badge variant="destructive" title="Protected fields are masked unless the role can view them.">
            Protected-data controls active
          </Badge>
        </div>
      )}
    >
      <div className="max-w-xl">
        <p className="hud-label mb-1">Active Case</p>
        <Select value={caseId} onValueChange={onChangeCase}>
          <SelectTrigger>
            <SelectValue placeholder="Select case" />
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
  );
}
