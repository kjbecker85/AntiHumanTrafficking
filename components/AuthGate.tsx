"use client";

import type { ReactNode } from "react";
import { AuthPanel } from "@/components/AuthPanel";
import { useRole } from "@/components/RoleProvider";

export function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useRole();

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="rounded-lg border border-border/60 bg-secondary/15 px-5 py-4 text-sm text-slate-300">
          Restoring mission session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPanel />;
  }

  return <>{children}</>;
}
