import { redirect } from "next/navigation";

import { ClientesClient } from "@/components/dashboard/clientes/clientes-client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Customer } from "@/lib/types";

export default async function ClientesPage() {
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

  let customers: Customer[] = [];

  if (businessId) {
    const { data } = await supabase
      .from("customers")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    customers = (data ?? []) as Customer[];
  }

  return <ClientesClient customers={customers} />;
}
