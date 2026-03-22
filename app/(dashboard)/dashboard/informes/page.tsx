import { redirect } from "next/navigation";

import { InformesClient } from "@/components/dashboard/informes/informes-client";
import { getReportData } from "@/lib/report-data";
import type { Branch } from "@/lib/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function InformesPage() {
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
    redirect("/login");
  }

  const businessId = userData.business_id;

  const [{ data: branches, error: branchesError }, initialData] = await Promise.all([
    supabase
      .from("branches")
      .select("id, business_id, name, address, lat, lng, active")
      .eq("business_id", businessId)
      .order("name", { ascending: true }),
    getReportData(supabase, businessId, { period: "6m", branchId: null }),
  ]);

  if (branchesError) {
    throw new Error(branchesError.message);
  }

  return (
    <InformesClient
      initialData={initialData}
      branches={(branches ?? []) as Branch[]}
      defaultPeriod="6m"
    />
  );
}
