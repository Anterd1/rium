import { NextResponse } from "next/server";

import { rowToCard, type CardRow } from "@/lib/parse-card-row";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  buildGoogleClassId,
  buildGoogleObjectId,
  createOrUpdatePass,
} from "@/lib/wallet/google";

type EnrollBody = {
  card_id?: string;
  name?: string;
  email?: string;
  phone?: string | null;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(request: Request) {
  let body: EnrollBody;
  try {
    body = (await request.json()) as EnrollBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const cardId = typeof body.card_id === "string" ? body.card_id.trim() : "";
  const name   = typeof body.name   === "string" ? body.name.trim() : "";
  const email  = typeof body.email  === "string" ? normalizeEmail(body.email) : "";
  const phone  =
    body.phone === null || body.phone === undefined
      ? null
      : typeof body.phone === "string"
        ? body.phone.trim() || null
        : null;

  if (!cardId || !name || !email) {
    return NextResponse.json(
      { error: "card_id, nombre y correo son obligatorios" },
      { status: 400 }
    );
  }

  let admin: ReturnType<typeof getSupabaseAdmin>;
  try {
    admin = getSupabaseAdmin();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Admin no configurado" },
      { status: 503 }
    );
  }

  // ── Fetch card ──────────────────────────────────────────────────────────────
  const { data: cardRow, error: cardError } = await admin
    .from("cards")
    .select("*")
    .eq("id", cardId)
    .eq("active", true)
    .maybeSingle();

  if (cardError) return NextResponse.json({ error: cardError.message }, { status: 500 });
  if (!cardRow)  return NextResponse.json({ error: "Tarjeta no encontrada o inactiva" }, { status: 404 });

  const card = rowToCard(cardRow as CardRow);

  // ── Upsert customer ─────────────────────────────────────────────────────────
  const { data: existingCustomer } = await admin
    .from("customers")
    .select("id")
    .eq("business_id", card.business_id)
    .eq("email", email)
    .maybeSingle();

  let customerId = existingCustomer?.id as string | undefined;
  if (!customerId) {
    const { data: created, error: createErr } = await admin
      .from("customers")
      .insert({ business_id: card.business_id, name, email, phone })
      .select("id")
      .single();

    if (createErr || !created?.id) {
      return NextResponse.json(
        { error: createErr?.message ?? "No se pudo crear el cliente" },
        { status: 500 }
      );
    }
    customerId = created.id as string;
  }

  // ── Upsert customer_card ────────────────────────────────────────────────────
  const { data: existingCC } = await admin
    .from("customer_cards")
    .select("id, purchases, gift_available")
    .eq("customer_id", customerId)
    .eq("card_id", cardId)
    .maybeSingle();

  let customerCardId = existingCC?.id as string | undefined;
  if (!customerCardId) {
    const { data: createdCC, error: ccErr } = await admin
      .from("customer_cards")
      .insert({ customer_id: customerId, card_id: cardId, purchases: 0, gift_available: false })
      .select("id, purchases, gift_available")
      .single();

    if (ccErr || !createdCC?.id) {
      return NextResponse.json(
        { error: ccErr?.message ?? "No se pudo asignar la tarjeta" },
        { status: 500 }
      );
    }
    customerCardId = createdCC.id as string;
  }

  // ── Create / update Google Wallet pass ──────────────────────────────────────
  const classId  = card.wallet_class_ids?.google?.trim() || buildGoogleClassId(card.id);
  const objectId = buildGoogleObjectId(customerCardId);

  let saveLink: string;
  try {
    const result = await createOrUpdatePass({
      objectId,
      classId,
      card,
      customerName: name,
      customerCardId,
      purchases: existingCC?.purchases ?? 0,
      giftAvailable: existingCC?.gift_available ?? false,
    });
    saveLink = result.saveLink;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo crear el pase de Google Wallet" },
      { status: 502 }
    );
  }

  // ── Persist wallet ids ──────────────────────────────────────────────────────
  await admin
    .from("cards")
    .update({ wallet_class_ids: { ...(card.wallet_class_ids ?? {}), google: classId } })
    .eq("id", card.id);

  await admin
    .from("customer_cards")
    .update({ wallet_object_id: objectId, wallet_save_link: saveLink })
    .eq("id", customerCardId);

  return NextResponse.json({
    ok: true,
    customer_id: customerId,
    customer_card_id: customerCardId,
    saveLink,
  });
}
