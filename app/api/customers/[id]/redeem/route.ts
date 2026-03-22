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

  const { data: userData, error: profileError } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (profileError || !userData?.business_id) {
    return NextResponse.json({ error: "Sin negocio asignado" }, { status: 403 });
  }

  const businessId = userData.business_id;
  const customerId = context.params.id;

  let body: { customer_card_id?: string; branch_id?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const customerCardId =
    typeof body.customer_card_id === "string" ? body.customer_card_id.trim() : "";
  if (!customerCardId) {
    return NextResponse.json({ error: "customer_card_id requerido" }, { status: 400 });
  }

  const branchId =
    body.branch_id === undefined || body.branch_id === null || body.branch_id === ""
      ? null
      : typeof body.branch_id === "string"
        ? body.branch_id
        : null;

  if (branchId) {
    const { data: branch, error: branchError } = await supabase
      .from("branches")
      .select("id")
      .eq("id", branchId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (branchError || !branch) {
      return NextResponse.json({ error: "Sucursal no válida" }, { status: 400 });
    }
  }

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (customerError || !customer) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  const { data: row, error: ccError } = await supabase
    .from("customer_cards")
    .select(
      `
      id,
      customer_id,
      gift_available,
      card:cards ( business_id )
    `
    )
    .eq("id", customerCardId)
    .maybeSingle();

  if (ccError || !row) {
    return NextResponse.json({ error: "Tarjeta de cliente no encontrada" }, { status: 404 });
  }

  const cardRaw = row.card as unknown;
  const card = (
    Array.isArray(cardRaw) ? cardRaw[0] : cardRaw
  ) as { business_id: string } | null | undefined;

  if (row.customer_id !== customerId || !card?.business_id || card.business_id !== businessId) {
    return NextResponse.json({ error: "Tarjeta no pertenece a este cliente" }, { status: 403 });
  }

  if (!row.gift_available) {
    return NextResponse.json({ error: "No hay regalo disponible en esta tarjeta" }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("customer_cards")
    .update({ gift_available: false })
    .eq("id", customerCardId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { data: redemption, error: redemptionError } = await supabase
    .from("redemptions")
    .insert({
      customer_card_id: customerCardId,
      branch_id: branchId,
      registered_by: user.id,
    })
    .select("*")
    .single();

  if (redemptionError) {
    return NextResponse.json({ error: redemptionError.message }, { status: 500 });
  }

  return NextResponse.json({
    redemption,
    customer_card: {
      id: customerCardId,
      gift_available: false,
    },
  });
}
