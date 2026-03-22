"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  CreditCard,
  LogOut,
  MapPin,
  Receipt,
  Settings,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import type { DashboardSidebarUser } from "./sidebar";

const navItems: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Tarjetas", href: "/dashboard/tarjetas", icon: CreditCard },
  { label: "Clientes", href: "/dashboard/clientes", icon: Users },
  { label: "Informes", href: "/dashboard/informes", icon: BarChart3 },
  { label: "Notificaciones", href: "/dashboard/notificaciones", icon: Bell },
  { label: "Sucursales", href: "/dashboard/sucursales", icon: MapPin },
  { label: "Usuarios", href: "/dashboard/usuarios", icon: UserCog },
  { label: "Facturación", href: "/dashboard/facturacion", icon: Receipt },
  { label: "Configuración", href: "/dashboard/configuracion", icon: Settings },
];

type MobileSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: DashboardSidebarUser;
  businessName: string;
};

export function MobileSidebar({
  open,
  onOpenChange,
  user,
  businessName,
}: MobileSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    onOpenChange(false);
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleNavigate = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        showCloseButton
        className="flex h-full max-h-[100dvh] w-64 max-w-[256px] flex-col gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&>button]:text-sidebar-foreground/60 [&>button]:hover:bg-sidebar-accent/50 [&>button]:hover:text-sidebar-foreground"
      >
        <SheetHeader className="flex h-14 flex-row items-center border-b border-sidebar-border px-5 py-0 text-left">
          <SheetTitle className="flex items-center gap-2.5 text-sidebar-foreground">
            <span className="flex size-7 items-center justify-center rounded-lg bg-[#3b82f6] text-xs font-bold text-white">R</span>
            <span className="text-base font-bold tracking-tight">Rium</span>
          </SheetTitle>
        </SheetHeader>

        <nav
          className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-3"
          aria-label="Principal móvil"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-sidebar-accent text-sidebar-foreground"
                    : "text-sidebar-foreground/55 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[#3b82f6]"
                    aria-hidden
                  />
                )}
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    active ? "text-[#3b82f6]" : "text-sidebar-foreground/40 group-hover:text-sidebar-foreground/70"
                  )}
                  strokeWidth={1.75}
                  aria-hidden
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="mb-1 flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-foreground">
              {user.name.trim().slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-sidebar-foreground leading-tight">{user.name}</p>
              <p className="truncate text-xs text-sidebar-foreground/45 leading-tight mt-0.5">{businessName}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 rounded-lg text-sidebar-foreground/50 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            Cerrar sesión
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
