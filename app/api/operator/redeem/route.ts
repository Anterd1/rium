import { NextResponse } from "next/server";

import { rowToCard, type CardRow } from "@/lib/parse-card-row";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: userData } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (!userData?.business_id) {
    return NextResponse.json({ error: "Sin negocio asignado" }, { status: 403 });
  }

  let body: { customer_card_id?: string; branch_id?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const customerCardId = typeof body.customer_card_id === "string" ? body.customer_card_id.trim() : "";
  if (!customerCardId) {
    return NextResponse.json({ error: "customer_card_id requerido" }, { status: 400 });
  }

  const branchId = typeof body.branch_id === "string" && body.branch_id ? body.branch_id : null;

  const { data: row, error: fetchError } = await supabase
    .from("customer_cards")
    .select(`id, gift_available, card:cards ( * )`)
    .eq("id", customerCardId)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!row)       return NextResponse.json({ error: "Tarjeta no encontrada" }, { status: 404 });

  const cardRaw = row.card as unknown;
  const cardRow = (Array.isArray(cardRaw) ? cardRaw[0] : cardRaw) as CardRow | null;
  if (!cardRow) return NextResponse.json({ error: "Datos de tarjeta incompletos" }, { status: 404 });

  if (cardRow.business_id !== userData.business_id) {
    return NextResponse.json({ error: "Esta tarjeta no pertenece a tu negocio" }, { status: 403 });
  }

  const card = rowToCard(cardRow);

  // For stamps/loyalty: require gift_available flag
  if (["stamps", "loyalty"].includes(card.type) && !row.gift_available) {
    return NextResponse.json(
      { error: "El cliente todavía no tiene una recompensa disponible" },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from("customer_cards")
    .update({ gift_available: false })
    .eq("id", customerCardId);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const { error: redemptionError } = await supabase
    .from("redemptions")
    .insert({ customer_card_id: customerCardId, branch_id: branchId, registered_by: user.id });

  if (redemptionError) return NextResponse.json({ error: redemptionError.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    customer_card: { id: customerCardId, gift_available: false },
    reward: card.reward_description,
  });
}
