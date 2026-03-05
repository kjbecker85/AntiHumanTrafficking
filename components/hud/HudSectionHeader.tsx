import { ReactNode } from "react";

interface HudSectionHeaderProps {
  icon?: ReactNode;
  title: string;
  actions?: ReactNode;
}

export function HudSectionHeader({ icon, title, actions }: HudSectionHeaderProps) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {icon ? <span className="text-cyan-300">{icon}</span> : null}
        <h4 className="font-hud text-base font-semibold tracking-wide">{title}</h4>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
