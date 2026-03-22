import { NextResponse } from "next/server";

import { getReportData } from "@/lib/report-data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: userData, error: profileError } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (profileError || !userData?.business_id) {
    return NextResponse.json({ error: "Sin negocio asignado" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "6m";
  const branchParam = searchParams.get("branch_id");
  const branchId =
    branchParam && branchParam.trim() !== "" && branchParam !== "all"
      ? branchParam.trim()
      : null;

  try {
    const data = await getReportData(supabase, userData.business_id, {
      period,
      branchId,
    });
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al generar informe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
