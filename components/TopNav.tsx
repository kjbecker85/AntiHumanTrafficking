"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Command, Radar } from "lucide-react";

const navItems = [
  { href: "/cases", label: "Case Workspace" },
  { href: "/entities", label: "Entity Profiles" },
  { href: "/reports", label: "Report Entry" },
  { href: "/link-analysis", label: "Cork Board" },
  { href: "/briefing", label: "Briefing" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 border-b border-border/60 bg-background/65 px-4 py-3 backdrop-blur-lg md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="font-hud text-xl font-semibold tracking-[0.08em] text-cyan-100">
            Investigation Dashboard
          </Link>
          <Badge className="hidden lg:inline-flex">
            <Radar className="mr-1 h-3.5 w-3.5" />
            Active Case Context
          </Badge>
        </div>
        <div className="hidden flex-1 items-center justify-center gap-1 xl:flex">
          {navItems.map((item) => (
            <Button
              key={item.href}
              variant={pathname === item.href ? "default" : "ghost"}
              size="sm"
              asChild
              className={pathname === item.href ? "" : "text-slate-300"}
            >
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <RoleSwitcher />
          <Button size="icon" variant="outline" className="hidden md:inline-flex" title="Alerts">
            <Bell className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" className="hidden md:inline-flex" title="Command palette">
            <Command className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1 overflow-x-auto xl:hidden">
        {navItems.map((item) => (
          <Button
            key={`compact-${item.href}`}
            variant={pathname === item.href ? "default" : "ghost"}
            size="sm"
            asChild
          >
            <Link href={item.href}>{item.label}</Link>
          </Button>
        ))}
      </div>
    </nav>
  );
}
