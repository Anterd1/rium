import { notFound, redirect } from "next/navigation";

import { rowToCard, type CardRow } from "@/lib/parse-card-row";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TarjetaDetailClient } from "@/components/dashboard/tarjetas/tarjeta-detail-client";

export const dynamic = "force-dynamic";

export default async function TarjetaDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: userData } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .maybeSingle();

  const businessId = userData?.business_id;
  if (!businessId) redirect("/dashboard");

  // Fetch card (verify business ownership)
  const { data: cardRow } = await supabase
    .from("cards")
    .select("*")
    .eq("id", params.id)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!cardRow) notFound();

  const card = rowToCard(cardRow as CardRow);

  // Business logo
  const { data: business } = await supabase
    .from("businesses")
    .select("logo_url")
    .eq("id", businessId)
    .maybeSingle();

  // Customer cards with customer info
  const { data: ccRows } = await supabase
    .from("customer_cards")
    .select(
      "id, customer_id, purchases, gift_available, wallet_save_link, created_at, customers(id, name, email, phone)"
    )
    .eq("card_id", card.id)
    .order("purchases", { ascending: false });

  const customerCardIds = (ccRows ?? []).map((cc) => cc.id);

  // Recent purchases
  const { data: purchaseRows } =
    customerCardIds.length > 0
      ? await supabase
          .from("purchases")
          .select("id, customer_card_id, created_at")
          .in("customer_card_id", customerCardIds)
          .order("created_at", { ascending: false })
          .limit(100)
      : { data: [] };

  // Recent redemptions
  const { data: redemptionRows } =
    customerCardIds.length > 0
      ? await supabase
          .from("redemptions")
          .select("id, customer_card_id, created_at")
          .in("customer_card_id", customerCardIds)
          .order("created_at", { ascending: false })
          .limit(100)
      : { data: [] };

  // Build map: customer_card_id -> customer info
  type CcRow = {
    id: string;
    customer_id: string;
    purchases: number;
    gift_available: boolean;
    wallet_save_link: string | null;
    created_at: string;
    customers:
      | { id: string; name: string; email: string; phone: string | null }
      | { id: string; name: string; email: string; phone: string | null }[]
      | null;
  };

  const processedCCs = (ccRows as CcRow[] | null ?? []).map((cc) => {
    const raw = Array.isArray(cc.customers) ? cc.customers[0] : cc.customers;
    return {
      id: cc.id,
      purchases: cc.purchases,
      gift_available: cc.gift_available,
      wallet_save_link: cc.wallet_save_link,
      created_at: cc.created_at,
      customer: {
        id: raw?.id ?? "",
        name: raw?.name ?? "Cliente",
        email: raw?.email ?? "",
        phone: raw?.phone ?? null,
      },
    };
  });

  const ccNameMap = new Map(processedCCs.map((cc) => [cc.id, cc.customer.name]));

  // Merge purchases + redemptions into unified activity feed
  const activity = [
    ...(purchaseRows ?? []).map((p) => ({
      id: `p-${p.id}`,
      kind: "purchase" as const,
      customer_name: ccNameMap.get(p.customer_card_id) ?? "Cliente",
      created_at: p.created_at,
    })),
    ...(redemptionRows ?? []).map((r) => ({
      id: `r-${r.id}`,
      kind: "redemption" as const,
      customer_name: ccNameMap.get(r.customer_card_id) ?? "Cliente",
      created_at: r.created_at,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 40);

  return (
    <TarjetaDetailClient
      card={card}
      businessLogoUrl={business?.logo_url ?? null}
      customerCards={processedCCs}
      recentActivity={activity}
      totalRedemptions={redemptionRows?.length ?? 0}
    />
  );
}
