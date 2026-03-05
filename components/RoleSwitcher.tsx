"use client";

import { useRole } from "@/components/RoleProvider";
import { usePathname, useRouter } from "next/navigation";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/**
 * Simple toggle used for live demos.
 * Switch between Analyst and Supervisor to preview masking differences.
 */
export function RoleSwitcher() {
  const { role, setRole } = useRole();
  const router = useRouter();
  const pathname = usePathname();

  function applyRole(nextRole: "analyst" | "operator" | "supervisor") {
    setRole(nextRole);

    // Mode-driven navigation: operator mode uses Operator View.
    if (nextRole === "operator" && pathname !== "/operator") {
      router.push("/operator");
    }
    if (nextRole !== "operator" && pathname === "/operator") {
      router.push("/link-analysis");
    }
  }

  return (
    <div className="flex items-center gap-2" aria-label="Role switcher">
      <span className="hud-label hidden xl:inline">Role</span>
      <ToggleGroup
        type="single"
        value={role}
        variant="outline"
        size="sm"
        onValueChange={(value) => {
          if (value === "analyst" || value === "operator" || value === "supervisor") {
            applyRole(value);
          }
        }}
        className="rounded-md border border-border/70 bg-secondary/30 p-1"
      >
        <ToggleGroupItem value="analyst" aria-label="Set role analyst" title="Analyst: protected values stay masked">
          Analyst
        </ToggleGroupItem>
        <ToggleGroupItem value="operator" aria-label="Set role operator" title="Operator: field-first view with mission-relevant access">
          Operator
        </ToggleGroupItem>
        <ToggleGroupItem value="supervisor" aria-label="Set role supervisor" title="Supervisor: protected values are visible">
          Supervisor
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
