import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HudPanelProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

export function HudPanel({
  title,
  subtitle,
  actions,
  className,
  bodyClassName,
  children,
}: HudPanelProps) {
  return (
    <section className={cn("hud-panel", className)}>
      {title || actions ? (
        <header className="hud-panel-header">
          <div>
            {title ? <h3 className="hud-title">{title}</h3> : null}
            {subtitle ? <p className="hint mt-1">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn("hud-panel-body", bodyClassName)}>{children}</div>
    </section>
  );
}
