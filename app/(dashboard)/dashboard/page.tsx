import type React from "react";
import { redirect } from "next/navigation";
import { startOfMonth } from "date-fns";
import Link from "next/link";

import { CreditCard, QrCode, ScanLine, ShoppingCart, Tag, Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .maybeSingle();

  const businessId = profile?.business_id;

  let totalTarjetas = 0;
  let totalClientes = 0;
  let comprasEsteMes = 0;
  let canjesEsteMes = 0;

  if (businessId) {
    const monthStart = startOfMonth(new Date()).toISOString();

    const { count: cardsCount } = await supabase
      .from("cards")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);

    const { count: customersCount } = await supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);

    totalTarjetas = cardsCount ?? 0;
    totalClientes = customersCount ?? 0;

    const { data: businessCards } = await supabase
      .from("cards")
      .select("id")
      .eq("business_id", businessId);

    const cardIds = businessCards?.map((c) => c.id) ?? [];

    if (cardIds.length > 0) {
      const { data: customerCards } = await supabase
        .from("customer_cards")
        .select("id")
        .in("card_id", cardIds);

      const customerCardIds = customerCards?.map((cc) => cc.id) ?? [];

      if (customerCardIds.length > 0) {
        const { count: purchasesCount } = await supabase
          .from("purchases")
          .select("id", { count: "exact", head: true })
          .in("customer_card_id", customerCardIds)
          .gte("created_at", monthStart);

        const { count: redemptionsCount } = await supabase
          .from("redemptions")
          .select("id", { count: "exact", head: true })
          .in("customer_card_id", customerCardIds)
          .gte("created_at", monthStart);

        comprasEsteMes = purchasesCount ?? 0;
        canjesEsteMes = redemptionsCount ?? 0;
      }
    }
  }

  const kpis: { label: string; value: number; icon: React.ElementType; color: string }[] = [
    { label: "Total Tarjetas", value: totalTarjetas, icon: CreditCard, color: "text-blue-500" },
    { label: "Total Clientes", value: totalClientes, icon: Users, color: "text-emerald-500" },
    { label: "Compras este mes", value: comprasEsteMes, icon: ShoppingCart, color: "text-violet-500" },
    { label: "Canjes este mes", value: canjesEsteMes, icon: Tag, color: "text-amber-500" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Dashboard
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Resumen de actividad de tu programa de lealtad.
        </p>
      </div>

      {/* Scanner shortcut */}
      <Link
        href="/escanear"
        className="flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 transition-colors hover:bg-primary/10"
      >
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ScanLine className="size-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">Modo escáner</p>
          <p className="truncate text-sm text-muted-foreground">
            Escanea tarjetas de clientes y registra compras o canjes
          </p>
        </div>
        <QrCode className="ml-auto size-5 shrink-0 text-muted-foreground/50" strokeWidth={1.5} />
      </Link>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.label}
              className="border shadow-sm transition-shadow hover:shadow-md"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {kpi.label}
                  </CardTitle>
                  <Icon className={`size-4 shrink-0 ${kpi.color}`} strokeWidth={1.75} aria-hidden />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
                  {kpi.value.toLocaleString("es")}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
