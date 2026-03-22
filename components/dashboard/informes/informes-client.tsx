"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  CreditCard,
  Gift,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";

import type { ReportData } from "@/lib/report-data";
import type { Branch } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRIMARY = "#0066CC";
const SUCCESS = "#10B981";

type InformesClientProps = {
  initialData: ReportData;
  branches: Branch[];
  defaultPeriod?: string;
};

const PERIOD_OPTIONS = [
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "3m", label: "Últimos 3 meses" },
  { value: "6m", label: "Últimos 6 meses" },
  { value: "1y", label: "Último año" },
] as const;

function formatInt(n: number) {
  return n.toLocaleString("es");
}

export function InformesClient({
  initialData,
  branches,
  defaultPeriod = "6m",
}: InformesClientProps) {
  const [period, setPeriod] = useState(defaultPeriod);
  const [branchId, setBranchId] = useState<string>("all");
  const [data, setData] = useState<ReportData>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialSnapshot = useRef(initialData);
  initialSnapshot.current = initialData;

  const fetchReports = useCallback(async (p: string, branch: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ period: p });
      if (branch && branch !== "all") {
        params.set("branch_id", branch);
      }
      const res = await fetch(`/api/reports?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(typeof body.error === "string" ? body.error : "Error al cargar");
      }
      const json = (await res.json()) as ReportData;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (period === defaultPeriod && branchId === "all") {
      setData(initialSnapshot.current);
      return;
    }
    void fetchReports(period, branchId);
  }, [period, branchId, defaultPeriod, fetchReports]);

  const barEmpty = !data.monthly.some((m) => m.purchases > 0 || m.redemptions > 0);
  const lineEmpty = data.customerGrowth.every((g) => g.count === 0);
  const chartsEmpty = barEmpty && lineEmpty;

  const kpiItems = [
    {
      label: "Total Clientes",
      value: data.kpis.customers,
      icon: Users,
      sublabel: "Altas en el periodo",
    },
    {
      label: "Tarjetas Activas",
      value: data.kpis.cards,
      icon: CreditCard,
      sublabel: "Programas activos",
    },
    {
      label: "Compras Totales",
      value: data.kpis.purchases,
      icon: ShoppingBag,
      sublabel: "En el periodo",
    },
    {
      label: "Canjes Totales",
      value: data.kpis.redemptions,
      icon: Gift,
      sublabel: "En el periodo",
    },
  ] as const;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Informes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Analítica de tu programa de lealtad.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Periodo</p>
            <Select
              value={period}
              onValueChange={(v) => v && setPeriod(v)}
              disabled={loading}
            >
              <SelectTrigger className="w-full min-w-[200px] sm:w-[220px]">
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Sucursal</p>
            <Select
              value={branchId}
              onValueChange={(v) => v && setBranchId(v)}
              disabled={loading}
            >
              <SelectTrigger className="w-full min-w-[200px] sm:w-[220px]">
                <SelectValue placeholder="Sucursal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las sucursales</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div
        className={cn(
          "grid grid-cols-2 gap-4 lg:grid-cols-4",
          loading && "opacity-60 pointer-events-none"
        )}
      >
        {kpiItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {item.label}
                </CardTitle>
                <Icon className="size-4 text-muted-foreground/60" strokeWidth={1.75} aria-hidden />
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
                  {formatInt(item.value)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{item.sublabel}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {chartsEmpty ? (
        <Card className="border-dashed border-border bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <BarChart3 className="size-6 text-muted-foreground/60" strokeWidth={1.5} aria-hidden />
            </div>
            <div>
              <p className="font-medium text-foreground">Sin datos en este periodo</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Ajusta el rango de fechas o la sucursal, o registra compras y canjes para ver
                gráficos.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
              <BarChart3 className="size-5 text-muted-foreground" strokeWidth={1.75} aria-hidden />
              <CardTitle className="text-base font-semibold text-foreground">
                Compras vs canjes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {barEmpty ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No hay compras ni canjes en este periodo.
                </p>
              ) : (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12, fill: "currentColor", opacity: 0.5 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "currentColor", opacity: 0.5 }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid rgba(255,255,255,0.1)",
                          background: "var(--card)",
                          color: "var(--card-foreground)",
                          fontSize: "13px",
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="purchases"
                        name="Compras"
                        fill={PRIMARY}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="redemptions"
                        name="Canjes"
                        fill={SUCCESS}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
              <TrendingUp className="size-5 text-muted-foreground" strokeWidth={1.75} aria-hidden />
              <CardTitle className="text-base font-semibold text-foreground">
                Clientes acumulados
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {lineEmpty ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Aún no hay clientes registrados.
                </p>
              ) : (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={data.customerGrowth}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12, fill: "currentColor", opacity: 0.5 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "currentColor", opacity: 0.5 }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid rgba(255,255,255,0.1)",
                          background: "var(--card)",
                          color: "var(--card-foreground)",
                          fontSize: "13px",
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name="Clientes"
                        stroke={PRIMARY}
                        strokeWidth={2}
                        dot={{ fill: PRIMARY, strokeWidth: 0, r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
