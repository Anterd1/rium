import { redirect } from "next/navigation";

import { FacturacionClient } from "@/components/dashboard/facturacion/facturacion-client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Business, Subscription } from "@/lib/types";

export default async function FacturacionPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: userData, error: profileError } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (profileError || !userData?.business_id) {
    redirect("/dashboard");
  }

  const businessId = userData.business_id;

  const { data: businessRow, error: businessError } = await supabase
    .from("businesses")
    .select("id, name, slug, logo_url, plan, branding, created_at")
    .eq("id", businessId)
    .single();

  if (businessError || !businessRow) {
    throw new Error(businessError?.message ?? "Negocio no encontrado");
  }

  const { data: subRows, error: subError } = await supabase
    .from("subscriptions")
    .select(
      "id, business_id, stripe_subscription_id, plan, status, current_period_end"
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (subError) {
    throw new Error(subError.message);
  }

  const subscription = (subRows?.[0] ?? null) as Subscription | null;

  return (
    <FacturacionClient
      business={businessRow as Business}
      subscription={subscription}
    />
  );
}
