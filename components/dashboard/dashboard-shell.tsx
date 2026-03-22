"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { DashboardThemeProvider, useDashboardTheme } from "./dashboard-theme-context";
import { Header } from "./header";
import { MobileSidebar } from "./mobile-sidebar";
import { Sidebar, type DashboardSidebarUser } from "./sidebar";

export type DashboardShellProps = {
  children: React.ReactNode;
  user: DashboardSidebarUser;
  businessName: string;
};

const ROUTE_TITLES: { prefix: string; title: string }[] = [
  { prefix: "/dashboard/configuracion", title: "Configuración" },
  { prefix: "/dashboard/facturacion", title: "Facturación" },
  { prefix: "/dashboard/usuarios", title: "Usuarios" },
  { prefix: "/dashboard/sucursales", title: "Sucursales" },
  { prefix: "/dashboard/notificaciones", title: "Notificaciones" },
  { prefix: "/dashboard/informes", title: "Informes" },
  { prefix: "/dashboard/clientes", title: "Clientes" },
  { prefix: "/dashboard/tarjetas", title: "Tarjetas" },
  { prefix: "/dashboard", title: "Dashboard" },
].sort((a, b) => b.prefix.length - a.prefix.length);

function titleFromPathname(pathname: string): string {
  for (const route of ROUTE_TITLES) {
    if (pathname === route.prefix || pathname.startsWith(`${route.prefix}/`)) {
      return route.title;
    }
  }
  return "Dashboard";
}

function DashboardShellInner({ children, user, businessName }: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { resolvedTheme, mounted } = useDashboardTheme();

  const title = useMemo(() => titleFromPathname(pathname), [pathname]);

  // Sync dark class to document.body so portals (Select, Dialog, Tooltip)
  // rendered outside the dashboard div still pick up dark CSS variables.
  useEffect(() => {
    if (!mounted) return;
    if (resolvedTheme === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
    return () => {
      document.body.classList.remove("dark");
    };
  }, [mounted, resolvedTheme]);

  return (
    <div
      className={cn(
        "min-h-screen bg-background",
        mounted && resolvedTheme === "dark" && "dark"
      )}
      suppressHydrationWarning
    >
      <Sidebar user={user} businessName={businessName} />
      <MobileSidebar
        open={mobileOpen}
        onOpenChange={setMobileOpen}
        user={user}
        businessName={businessName}
      />
      <div className="ml-0 flex min-h-screen flex-col lg:ml-64">
        <Header
          title={title}
          user={user}
          onMobileMenuToggle={() => setMobileOpen(true)}
        />
        <div key={pathname} className="flex-1 px-4 py-6 lg:px-8 animate-heysis-fade-up">
          {children}
        </div>
      </div>
    </div>
  );
}

export function DashboardShell(props: DashboardShellProps) {
  return (
    <DashboardThemeProvider>
      <DashboardShellInner {...props} />
    </DashboardThemeProvider>
  );
}
