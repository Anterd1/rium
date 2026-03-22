import { redirect } from "next/navigation";

import { NuevaTarjetaClient } from "@/components/dashboard/tarjetas/nueva-tarjeta/nueva-tarjeta-client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PLAN_LIMITS, type Business } from "@/lib/types";

export const dynamic = "force-dynamic";

function isPlanKey(v: string | undefined): v is Business["plan"] {
  return v === "basic" || v === "pro" || v === "enterprise";
}

export default async function NuevaTarjetaPage() {
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

  const { data: business } = await supabase
    .from("businesses")
    .select("plan, logo_url")
    .eq("id", businessId)
    .maybeSingle();

  const planKey = isPlanKey(business?.plan) ? business.plan : "basic";
  const maxCards = PLAN_LIMITS[planKey]?.max_cards ?? 1;

  const { count } = await supabase
    .from("cards")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);

  const currentCount = count ?? 0;

  return (
    <NuevaTarjetaClient
      planKey={planKey}
      maxCards={maxCards}
      currentCount={currentCount}
      businessLogoUrl={business?.logo_url ?? null}
    />
  );
}
