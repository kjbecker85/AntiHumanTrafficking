import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HudKpiProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  className?: string;
}

export function HudKpi({ label, value, icon, className }: HudKpiProps) {
  return (
    <div className={cn("hud-kpi", className)}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="hud-kpi-label">{label}</span>
        {icon ? <span className="text-cyan-300">{icon}</span> : null}
      </div>
      <p className="hud-kpi-value">{value}</p>
    </div>
  );
}
