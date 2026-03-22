import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST() {
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
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const businessId = userData.business_id;

  const { data: existing, error: fetchErr } = await supabase
    .from("businesses")
    .select("branding")
    .eq("id", businessId)
    .single();

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  const apiKey = randomUUID();
  const current = (existing?.branding as Record<string, unknown> | null) ?? {};
  const nextBranding = { ...current, api_key: apiKey };

  const { error: updateErr } = await supabase
    .from("businesses")
    .update({ branding: nextBranding })
    .eq("id", businessId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ api_key: apiKey });
}
