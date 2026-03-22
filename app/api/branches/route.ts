import { NextResponse } from "next/server";

import { PLAN_LIMITS } from "@/lib/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (userError || !userData?.business_id) {
    return NextResponse.json(
      { error: "Negocio no encontrado" },
      { status: 400 }
    );
  }

  const { data: branches, error } = await supabase
    .from("branches")
    .select("*")
    .eq("business_id", userData.business_id)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ branches: branches ?? [] });
}

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (userError || !userData?.business_id) {
    return NextResponse.json(
      { error: "Negocio no encontrado" },
      { status: 400 }
    );
  }

  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("plan")
    .eq("id", userData.business_id)
    .single();

  if (businessError || !business) {
    return NextResponse.json(
      { error: "Negocio no encontrado" },
      { status: 400 }
    );
  }

  const planKey = String(business.plan);
  const maxBranches = PLAN_LIMITS[planKey]?.max_branches ?? 1;

  const { count, error: countError } = await supabase
    .from("branches")
    .select("id", { count: "exact", head: true })
    .eq("business_id", userData.business_id);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  const current = count ?? 0;
  if (current >= maxBranches) {
    return NextResponse.json(
      {
        error: "Límite de sucursales alcanzado para tu plan",
        code: "PLAN_LIMIT",
      },
      { status: 403 }
    );
  }

  let body: { name?: string; address?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const address = typeof body.address === "string" ? body.address.trim() : "";

  if (!name || !address) {
    return NextResponse.json(
      { error: "Nombre y dirección son obligatorios" },
      { status: 400 }
    );
  }

  const { data: branch, error: insertError } = await supabase
    .from("branches")
    .insert({
      business_id: userData.business_id,
      name,
      address,
      active: true,
      lat: null,
      lng: null,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ branch }, { status: 201 });
}
