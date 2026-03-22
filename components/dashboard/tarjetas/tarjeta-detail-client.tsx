"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Award,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  Gift,
  QrCode,
  ShoppingBag,
  Star,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { CardPreview } from "@/components/dashboard/tarjetas/card-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Card as CardModel } from "@/lib/types";

type CustomerCardRow = {
  id: string;
  purchases: number;
  gift_available: boolean;
  wallet_save_link: string | null;
  created_at: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
};

type ActivityItem = {
  id: string;
  kind: "purchase" | "redemption";
  customer_name: string;
  created_at: string;
};

type Props = {
  card: CardModel;
  businessLogoUrl: string | null;
  customerCards: CustomerCardRow[];
  recentActivity: ActivityItem[];
  totalRedemptions: number;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Hace un momento";
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `Hace ${days} días`;
  return formatDate(iso);
}

export function TarjetaDetailClient({
  card,
  businessLogoUrl,
  customerCards,
  recentActivity,
  totalRedemptions,
}: Props) {
  const [tab, setTab] = useState<"clientes" | "actividad">("clientes");
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const searchParams = useSearchParams();


  // Generate QR whenever modal opens
  useEffect(() => {
    if (!qrOpen) return;
    let active = true;
    async function gen() {
      try {
        const QRCode = (await import("qrcode")).default;
        const url = `${window.location.origin}/registro/${card.id}`;
        const dataUrl = await QRCode.toDataURL(url, {
          width: 320,
          margin: 2,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        if (active) setQrDataUrl(dataUrl);
      } catch {
        if (active) setQrDataUrl("");
      }
    }
    void gen();
    return () => { active = false; };
  }, [qrOpen, card.id]);

  // Auto-open QR modal when redirected after creation
  useEffect(() => {
    if (searchParams.get("nuevo") === "1") {
      setQrOpen(true);
      // Clean the param from the URL without navigation
      const url = new URL(window.location.href);
      url.searchParams.delete("nuevo");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  async function copyUrl() {
    const url = `${window.location.origin}/registro/${card.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  function downloadQr() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-${card.name.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  }

  const kpis = useMemo(() => {
    const totalCustomers = customerCards.length;
    const totalPurchases = customerCards.reduce(
      (sum, cc) => sum + cc.purchases,
      0
    );
    const readyForReward = customerCards.filter(
      (cc) => cc.gift_available
    ).length;
    const activeCustomers = customerCards.filter(
      (cc) => cc.purchases > 0
    ).length;
    const conversionRate =
      totalCustomers > 0
        ? Math.round((totalRedemptions / Math.max(totalCustomers, 1)) * 100)
        : 0;

    return { totalCustomers, totalPurchases, readyForReward, activeCustomers, conversionRate };
  }, [customerCards, totalRedemptions]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/dashboard/tarjetas"
            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {card.name}
              </h2>
              <Badge
                variant="secondary"
                className={cn(
                  "font-medium",
                  card.type === "event"
                    ? "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300"
                    : "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300"
                )}
              >
                {card.type === "event" ? "Evento" : "Lealtad"}
              </Badge>
              <Badge
                variant={card.active ? "default" : "outline"}
                className="font-medium"
              >
                {card.active ? "Activa" : "Inactiva"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Meta: {card.target_purchases} compras ·{" "}
              {card.reward_description || "Sin recompensa definida"}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0 gap-2"
          onClick={() => setQrOpen(true)}
        >
          <QrCode className="size-4" />
          Código QR
        </Button>
      </div>

      {/* Top row: card preview + KPIs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* Card visual */}
        <div className="space-y-4">
          <CardPreview
            card={card}
            businessLogoUrl={businessLogoUrl}
            className="w-full"
          />
          <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-sm">
            <p className="font-medium text-foreground">Información</p>
            <div className="space-y-1 text-muted-foreground">
              <div className="flex justify-between">
                <span>Tipo</span>
                <span className="font-medium text-foreground capitalize">
                  {card.type === "loyalty" ? "Lealtad" : "Evento"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Meta de compras</span>
                <span className="font-medium text-foreground">
                  {card.target_purchases}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Creada</span>
                <span className="font-medium text-foreground">
                  {formatDate(card.created_at)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Estado</span>
                <span
                  className={cn(
                    "font-medium",
                    card.active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                  )}
                >
                  {card.active ? "Activa" : "Inactiva"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 gap-4 content-start xl:grid-cols-2">
          <KpiCard
            icon={Users}
            iconColor="text-blue-500"
            iconBg="bg-blue-50 dark:bg-blue-950/40"
            label="Clientes inscritos"
            value={kpis.totalCustomers}
            sub={`${kpis.activeCustomers} con al menos 1 compra`}
          />
          <KpiCard
            icon={ShoppingBag}
            iconColor="text-emerald-500"
            iconBg="bg-emerald-50 dark:bg-emerald-950/40"
            label="Compras registradas"
            value={kpis.totalPurchases}
            sub={
              kpis.totalCustomers > 0
                ? `~${(kpis.totalPurchases / kpis.totalCustomers).toFixed(1)} por cliente`
                : "Sin actividad aún"
            }
          />
          <KpiCard
            icon={Gift}
            iconColor="text-amber-500"
            iconBg="bg-amber-50 dark:bg-amber-950/40"
            label="Listos para recompensa"
            value={kpis.readyForReward}
            sub="clientes con regalo disponible"
          />
          <KpiCard
            icon={Award}
            iconColor="text-violet-500"
            iconBg="bg-violet-50 dark:bg-violet-950/40"
            label="Canjes totales"
            value={totalRedemptions}
            sub={
              kpis.totalCustomers > 0
                ? `${kpis.conversionRate}% tasa de conversión`
                : "Sin canjes aún"
            }
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-0">
          {(["clientes", "actividad"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "relative px-5 py-3 text-sm font-medium transition-colors capitalize",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tab === t
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "clientes" ? "Clientes" : "Actividad reciente"}
              {t === "clientes" && kpis.totalCustomers > 0 && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {kpis.totalCustomers}
                </span>
              )}
              {tab === t && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {tab === "clientes" && (
        <CustomersTab customerCards={customerCards} card={card} />
      )}
      {tab === "actividad" && (
        <ActivityTab activity={recentActivity} />
      )}

      {/* QR Modal */}
      {qrOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setQrOpen(false); }}
        >
          <div className="relative w-full max-w-sm rounded-2xl border border-border bg-background shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Código QR de registro</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Tus clientes escanean este QR para unirse a {card.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQrOpen(false)}
                className="ml-4 flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* QR */}
            <div className="flex flex-col items-center gap-4 px-6 py-6">
              <div className="flex items-center justify-center rounded-2xl border border-border bg-white p-5 shadow-sm">
                {qrDataUrl ? (
                  <Image
                    src={qrDataUrl}
                    alt="QR de registro"
                    width={240}
                    height={240}
                    className="rounded-lg"
                    unoptimized
                  />
                ) : (
                  <div className="flex size-60 items-center justify-center text-sm text-muted-foreground">
                    Generando QR…
                  </div>
                )}
              </div>

              {/* URL */}
              <div className="w-full rounded-xl border border-border bg-muted/50 px-3 py-2">
                <p className="break-all text-center font-mono text-xs text-muted-foreground">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/registro/${card.id}`
                    : `/registro/${card.id}`}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 border-t border-border px-6 py-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 gap-2"
                onClick={copyUrl}
              >
                <Copy className="size-4" />
                Copiar enlace
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 gap-2"
                onClick={downloadQr}
                disabled={!qrDataUrl}
              >
                <Download className="size-4" />
                Descargar QR
              </Button>
              <Button
                type="button"
                className="gap-2"
                onClick={() => {
                  const url = `${window.location.origin}/registro/${card.id}`;
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
              >
                <ExternalLink className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <Card className="border bg-card shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              iconBg
            )}
          >
            <Icon className={cn("size-5", iconColor)} strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
              {value.toLocaleString("es-MX")}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{sub}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomersTab({
  customerCards,
  card,
}: {
  customerCards: CustomerCardRow[];
  card: CardModel;
}) {
  if (customerCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted">
          <Users className="size-7 text-muted-foreground" strokeWidth={1.25} />
        </div>
        <p className="font-semibold text-foreground">Aún no hay clientes inscritos</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Cuando alguien escanee el QR de registro, aparecerá aquí con su progreso.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Cliente
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">
                Email
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Progreso
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                Estado
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                Inscrito
              </th>
              <th className="px-4 py-3 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {customerCards.map((cc) => {
              const pct = Math.min(
                100,
                Math.round((cc.purchases / card.target_purchases) * 100)
              );
              return (
                <tr
                  key={cc.id}
                  className="group transition-colors hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {cc.customer.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-foreground truncate max-w-[120px]">
                        {cc.customer.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell truncate max-w-[180px]">
                    {cc.customer.email}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <Progress value={pct} className="h-1.5 flex-1" />
                      <span className="text-xs tabular-nums text-muted-foreground shrink-0">
                        {cc.purchases}/{card.target_purchases}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {cc.gift_available ? (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 font-medium gap-1">
                        <Gift className="size-3" />
                        Listo
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-muted-foreground font-medium">
                        <TrendingUp className="size-3 mr-1" />
                        En progreso
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                    {formatDate(cc.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/clientes/${cc.customer.id}`}
                      className="flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground"
                    >
                      <ChevronRight className="size-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActivityTab({ activity }: { activity: ActivityItem[] }) {
  if (activity.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted">
          <Star className="size-7 text-muted-foreground" strokeWidth={1.25} />
        </div>
        <p className="font-semibold text-foreground">Sin actividad aún</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Las compras y canjes de esta tarjeta aparecerán aquí en tiempo real.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <ul className="divide-y divide-border">
        {activity.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full",
                item.kind === "purchase"
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
              )}
            >
              {item.kind === "purchase" ? (
                <ShoppingBag className="size-3.5" strokeWidth={2} />
              ) : (
                <Gift className="size-3.5" strokeWidth={2} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {item.customer_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.kind === "purchase" ? "Compra registrada" : "Canje de recompensa"}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-medium text-foreground">
                {formatRelative(item.created_at)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {formatTime(item.created_at)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
