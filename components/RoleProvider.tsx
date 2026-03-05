"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { UserRole } from "@/lib/types";

interface RoleContextValue {
  role: UserRole;
  userId: string;
  setRole: (next: UserRole) => void;
}

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

/**
 * RoleProvider stores the demo role globally so all pages react to role changes.
 *
 * Beginner note:
 * - We persist role in localStorage so your demo selection survives refresh.
 * - In phase 2, this will be replaced by authenticated role claims from Entra ID.
 */
export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>("analyst");

  useEffect(() => {
    const saved = window.localStorage.getItem("demo-role");
    if (saved === "analyst" || saved === "operator" || saved === "supervisor") {
      setRole(saved);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("demo-role", role);
  }, [role]);

  const value = useMemo<RoleContextValue>(() => {
    return {
      role,
      userId: role === "supervisor" ? "supervisor-1" : role === "operator" ? "operator-1" : "analyst-1",
      setRole,
    };
  }, [role]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used inside RoleProvider");
  }
  return context;
}
