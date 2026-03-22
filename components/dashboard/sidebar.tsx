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

import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

export type DashboardSidebarUser = {
  name: string;
  email: string;
};

type SidebarProps = {
  user: DashboardSidebarUser;
  businessName: string;
  className?: string;
};

export function Sidebar({ user, businessName, className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside
      className={cn(
        "hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        className
      )}
    >
      {/* Logo area */}
      <div className="flex h-14 items-center border-b border-sidebar-border px-5">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 text-sidebar-foreground transition-opacity hover:opacity-80"
          aria-label="Ir al inicio del dashboard"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-[#3b82f6] text-xs font-bold text-white">R</span>
          <span className="text-base font-bold tracking-tight">Rium</span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-3" aria-label="Principal">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-sidebar-accent text-sidebar-foreground shadow-sm"
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
                  "size-4 shrink-0 transition-colors",
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

      {/* User footer */}
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
    </aside>
  );
}
