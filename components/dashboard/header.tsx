"use client";

import { Menu } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { DashboardSidebarUser } from "./sidebar";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export type DashboardHeaderProps = {
  title: string;
  user: DashboardSidebarUser;
  onMobileMenuToggle?: () => void;
};

export function Header({ title, user, onMobileMenuToggle }: DashboardHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border bg-background px-4 lg:px-8",
        "supports-[backdrop-filter]:bg-background/95 supports-[backdrop-filter]:backdrop-blur-sm"
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 lg:hidden"
          aria-label="Abrir menú de navegación"
          onClick={onMobileMenuToggle}
        >
          <Menu className="size-5" strokeWidth={1.75} />
        </Button>
        <h1 className="truncate text-base font-semibold tracking-tight text-foreground">
          {title}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Avatar size="sm" className="ring-1 ring-border">
          <AvatarFallback className="bg-muted text-xs font-semibold text-muted-foreground">
            {initialsFromName(user.name)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
