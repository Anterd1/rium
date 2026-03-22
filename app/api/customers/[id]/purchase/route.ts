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
      purchases,
      gift_available,
      card:cards ( id, business_id, target_purchases )
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
  ) as { id: string; business_id: string; target_purchases: number } | null | undefined;

  if (row.customer_id !== customerId || !card?.business_id || card.business_id !== businessId) {
    return NextResponse.json({ error: "Tarjeta no pertenece a este cliente" }, { status: 403 });
  }

  const target = Number(card.target_purchases) || 0;
  const prev = Number(row.purchases) || 0;
  const nextCount = prev + 1;

  let newPurchases = nextCount;
  let newGiftAvailable = Boolean(row.gift_available);

  if (target > 0 && nextCount >= target) {
    newPurchases = 0;
    newGiftAvailable = true;
  }

  const { error: updateError } = await supabase
    .from("customer_cards")
    .update({
      purchases: newPurchases,
      gift_available: newGiftAvailable,
    })
    .eq("id", customerCardId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .insert({
      customer_card_id: customerCardId,
      branch_id: branchId,
      registered_by: user.id,
    })
    .select("*")
    .single();

  if (purchaseError) {
    return NextResponse.json({ error: purchaseError.message }, { status: 500 });
  }

  return NextResponse.json({
    purchase,
    customer_card: {
      id: customerCardId,
      purchases: newPurchases,
      gift_available: newGiftAvailable,
    },
  });
}
