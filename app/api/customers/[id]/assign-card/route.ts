import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type RouteContext = { params: { id: string } };

export async function POST(request: Request, context: RouteContext) {
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
    return NextResponse.json({ error: "Sin negocio asignado" }, { status: 403 });
  }

  const businessId = userData.business_id;
  const customerId = context.params.id;

  let body: { card_id?: string; branch_id?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const cardId = typeof body.card_id === "string" ? body.card_id.trim() : "";
  const branchId =
    typeof body.branch_id === "string" && body.branch_id.trim().length > 0
      ? body.branch_id.trim()
      : null;

  if (!cardId) {
    return NextResponse.json({ error: "card_id es requerido" }, { status: 400 });
  }

  const { data: customerRow, error: customerError } = await supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (customerError) {
    return NextResponse.json({ error: customerError.message }, { status: 500 });
  }
  if (!customerRow) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  const { data: cardRow, error: cardError } = await supabase
    .from("cards")
    .select("id")
    .eq("id", cardId)
    .eq("business_id", businessId)
    .eq("active", true)
    .maybeSingle();

  if (cardError) {
    return NextResponse.json({ error: cardError.message }, { status: 500 });
  }
  if (!cardRow) {
    return NextResponse.json({ error: "Tarjeta no encontrada o inactiva" }, { status: 404 });
  }

  if (branchId) {
    const { data: branchRow, error: branchError } = await supabase
      .from("branches")
      .select("id")
      .eq("id", branchId)
      .eq("business_id", businessId)
      .eq("active", true)
      .maybeSingle();

    if (branchError) {
      return NextResponse.json({ error: branchError.message }, { status: 500 });
    }
    if (!branchRow) {
      return NextResponse.json({ error: "Sucursal no válida" }, { status: 400 });
    }
  }

  const { data: existingRow, error: existingError } = await supabase
    .from("customer_cards")
    .select("id")
    .eq("customer_id", customerId)
    .eq("card_id", cardId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existingRow) {
    return NextResponse.json({
      customer_card: existingRow,
      already_assigned: true,
    });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("customer_cards")
    .insert({
      customer_id: customerId,
      card_id: cardId,
      branch_id: branchId,
      purchases: 0,
      gift_available: false,
    })
    .select("id, customer_id, card_id, branch_id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    customer_card: inserted,
    already_assigned: false,
  });
}
