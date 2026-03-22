import { redirect } from "next/navigation";

import { TarjetasClient } from "@/components/dashboard/tarjetas/tarjetas-client";
import { rowToCard, type CardRow } from "@/lib/parse-card-row";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PLAN_LIMITS, type Business } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TarjetasPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: userData } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .maybeSingle();

  const businessId = userData?.business_id;

  if (!businessId) {
    return (
      <TarjetasClient
        cards={[]}
        businessLogoUrl={null}
        planKey="basic"
        maxCards={PLAN_LIMITS.basic.max_cards}
      />
    );
  }

  const [{ data: cardsData }, { data: business }] = await Promise.all([
    supabase
      .from("cards")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false }),
    supabase
      .from("businesses")
      .select("plan, logo_url")
      .eq("id", businessId)
      .maybeSingle(),
  ]);

  const planKey: Business["plan"] =
    business?.plan === "pro" || business?.plan === "enterprise"
      ? business.plan
      : "basic";

  const limits = PLAN_LIMITS[planKey] ?? PLAN_LIMITS.basic;
  const cards = (cardsData ?? []).map((row) => rowToCard(row as CardRow));

  return (
    <TarjetasClient
      cards={cards}
      businessLogoUrl={business?.logo_url ?? null}
      planKey={planKey}
      maxCards={limits.max_cards}
    />
  );
}
