import { NextResponse } from "next/server";

import { rowToCard, type CardRow } from "@/lib/parse-card-row";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildGoogleObjectId, createOrUpdatePass } from "@/lib/wallet/google";

export const dynamic = "force-dynamic";

function googleApiErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "errors" in err) {
    const errors = (err as { errors?: { message?: string }[] }).errors;
    const first = errors?.[0]?.message;
    if (first) return first;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: userData, error: profileError } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (profileError || !userData?.business_id) {
    return NextResponse.json({ error: "No business assigned to this user." }, { status: 403 });
  }

  const businessId = userData.business_id;

  let body: { customer_card_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const customerCardId =
    typeof body.customer_card_id === "string" ? body.customer_card_id.trim() : "";
  if (!customerCardId) {
    return NextResponse.json({ error: "customer_card_id is required." }, { status: 400 });
  }

  // ── Fetch customer_card with nested card and customer ──────────────────────
  const { data: row, error: fetchError } = await supabase
    .from("customer_cards")
    .select(`
      id,
      purchases,
      gift_available,
      customer:customers ( id, name, business_id ),
      card:cards ( * )
    `)
    .eq("id", customerCardId)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!row)       return NextResponse.json({ error: "customer_card not found." }, { status: 404 });

  const customerRaw = row.customer as unknown;
  const customer = (Array.isArray(customerRaw) ? customerRaw[0] : customerRaw) as
    | { id: string; name: string; business_id: string }
    | null
    | undefined;

  const cardRaw = row.card as unknown;
  const cardRow = (Array.isArray(cardRaw) ? cardRaw[0] : cardRaw) as CardRow | null | undefined;

  if (!customer || !cardRow) {
    return NextResponse.json(
      { error: "Could not load customer or card for this pass." },
      { status: 404 }
    );
  }

  if (customer.business_id !== businessId || cardRow.business_id !== businessId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const card = rowToCard(cardRow);
  const classId = card.wallet_class_ids?.google?.trim();
  if (!classId) {
    return NextResponse.json(
      {
        error:
          "No Google Wallet class for this card template. POST /api/wallet/google/class with { card_id } first.",
      },
      { status: 400 }
    );
  }

  let objectId: string;
  try {
    objectId = buildGoogleObjectId(row.id);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Google Wallet is not configured." },
      { status: 503 }
    );
  }

  // ── Create / update pass ───────────────────────────────────────────────────
  let saveLink: string;
  try {
    const result = await createOrUpdatePass({
      objectId,
      classId,
      card,
      customerName: customer.name,
      customerCardId: row.id,
      purchases: Number(row.purchases) || 0,
      giftAvailable: Boolean(row.gift_available),
    });
    saveLink = result.saveLink;
  } catch (e) {
    const message = googleApiErrorMessage(e);
    const lower = message.toLowerCase();
    const isConfig =
      lower.includes("credentials") ||
      lower.includes("issuer") ||
      lower.includes("google_application") ||
      lower.includes("google_service_account");
    return NextResponse.json(
      { error: isConfig ? message : `Google Wallet API error: ${message}` },
      { status: isConfig ? 503 : 502 }
    );
  }

  const { error: updateError } = await supabase
    .from("customer_cards")
    .update({ wallet_object_id: objectId, wallet_save_link: saveLink })
    .eq("id", customerCardId);

  if (updateError) {
    return NextResponse.json(
      {
        error: `Pass created but failed to save links: ${updateError.message}`,
        objectId,
        saveLink,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ objectId, saveLink });
}
