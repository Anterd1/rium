"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type DashboardTheme = "light" | "dark" | "system";

interface DashboardThemeCtx {
  theme: DashboardTheme;
  resolvedTheme: "light" | "dark";
  setTheme: (t: DashboardTheme) => void;
  mounted: boolean;
}

const Ctx = createContext<DashboardThemeCtx>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
  mounted: false,
});

export function useDashboardTheme() {
  return useContext(Ctx);
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolve(t: DashboardTheme): "light" | "dark" {
  return t === "system" ? getSystemTheme() : t;
}

export function DashboardThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<DashboardTheme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("rium-dashboard-theme") as DashboardTheme | null;
    const initial: DashboardTheme =
      stored && ["light", "dark", "system"].includes(stored) ? stored : "system";
    setThemeState(initial);
    setResolvedTheme(resolve(initial));
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setResolvedTheme(getSystemTheme());
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme, mounted]);

  const setTheme = (t: DashboardTheme) => {
    setThemeState(t);
    setResolvedTheme(resolve(t));
    localStorage.setItem("rium-dashboard-theme", t);
  };

  return (
    <Ctx.Provider value={{ theme, resolvedTheme, setTheme, mounted }}>
      {children}
    </Ctx.Provider>
  );
}
