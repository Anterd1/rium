import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CustomerDetail } from "@/components/dashboard/clientes/customer-detail";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Branch, Card, CustomerDetailData } from "@/lib/types";

type PageProps = {
  params: { id: string };
};

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = params;
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
  if (!businessId) {
    notFound();
  }

  const { data: row, error } = await supabase
    .from("customers")
    .select(
      `
      *,
      customer_cards (
        *,
        card:cards (*),
        purchases (*),
        redemptions (*)
      )
    `
    )
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();

  if (error || !row) {
    notFound();
  }

  const customer = row as unknown as CustomerDetailData;

  const { data: branchRows } = await supabase
    .from("branches")
    .select("id, name, business_id, address, lat, lng, active")
    .eq("business_id", businessId)
    .eq("active", true)
    .order("name");

  const branches = (branchRows ?? []) as Branch[];

  const { data: cardRows } = await supabase
    .from("cards")
    .select("id, business_id, name, type, target_purchases, reward_description, design, wallet_class_ids, active, created_at")
    .eq("business_id", businessId)
    .eq("active", true)
    .order("name");

  const availableCards = (cardRows ?? []) as Card[];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href="/dashboard/clientes"
        className="inline-flex w-fit items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
      >
        <ArrowLeft className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        Volver a clientes
      </Link>

      <CustomerDetail customer={customer} branches={branches} availableCards={availableCards} />
    </div>
  );
}
