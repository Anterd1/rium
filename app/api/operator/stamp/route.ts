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

  let body: { customer_card_id?: string; quantity?: number; amount?: number; branch_id?: string | null; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const customerCardId = typeof body.customer_card_id === "string" ? body.customer_card_id.trim() : "";
  if (!customerCardId) {
    return NextResponse.json({ error: "customer_card_id requerido" }, { status: 400 });
  }

  const quantity = typeof body.quantity === "number" && body.quantity > 0 ? Math.floor(body.quantity) : 1;
  const amount   = typeof body.amount   === "number" && body.amount   > 0 ? body.amount : null;
  const branchId = typeof body.branch_id === "string" && body.branch_id ? body.branch_id : null;

  // ── Fetch customer_card with card ──────────────────────────────────────────
  const { data: row, error: fetchError } = await supabase
    .from("customer_cards")
    .select(`id, purchases, gift_available, card:cards ( * )`)
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
  const target = Math.max(1, card.target_purchases || 1);
  const prev   = Number(row.purchases) || 0;
  const next   = prev + quantity;

  let newPurchases    = next;
  let newGiftAvailable = Boolean(row.gift_available);

  // Stamp/loyalty logic: reset counter and flag gift when target is reached
  if (["stamps", "loyalty"].includes(card.type) && target > 0 && next >= target) {
    newPurchases     = next % target; // handle quantity > target
    newGiftAvailable = true;
  }

  const { error: updateError } = await supabase
    .from("customer_cards")
    .update({ purchases: newPurchases, gift_available: newGiftAvailable })
    .eq("id", customerCardId);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // Insert one purchase record per stamp (keeps the audit log clean)
  const purchaseRows = Array.from({ length: quantity }, () => ({
    customer_card_id: customerCardId,
    branch_id: branchId,
    registered_by: user.id,
    ...(amount ? { amount: amount / quantity } : {}),
  }));

  const { error: purchaseError } = await supabase.from("purchases").insert(purchaseRows);
  if (purchaseError) return NextResponse.json({ error: purchaseError.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    customer_card: {
      id: customerCardId,
      purchases: newPurchases,
      gift_available: newGiftAvailable,
    },
    stamped: quantity,
  });
}
