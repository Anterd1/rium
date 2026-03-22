import { redirect } from "next/navigation";

import { SucursalesClient } from "@/components/dashboard/sucursales/sucursales-client";
import type { Branch, Business } from "@/lib/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function SucursalesPage() {
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

  const businessId = profile?.business_id ?? null;

  let branches: Branch[] = [];
  let plan: Business["plan"] = "basic";

  if (businessId) {
    const { data: business } = await supabase
      .from("businesses")
      .select("plan")
      .eq("id", businessId)
      .maybeSingle();

    if (business?.plan) {
      plan = business.plan as Business["plan"];
    }

    const { data: branchRows } = await supabase
      .from("branches")
      .select("*")
      .eq("business_id", businessId)
      .order("name", { ascending: true });

    branches = (branchRows ?? []) as Branch[];
  }

  return (
    <SucursalesClient initialBranches={branches} plan={plan} businessId={businessId} />
  );
}
