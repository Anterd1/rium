import { NextResponse } from "next/server";

import { rowToCard, type CardRow } from "@/lib/parse-card-row";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildGoogleClassId, ensureWalletClass } from "@/lib/wallet/google";

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

  let body: { card_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const cardId = typeof body.card_id === "string" ? body.card_id.trim() : "";
  if (!cardId) return NextResponse.json({ error: "card_id is required." }, { status: 400 });

  const { data: row, error: fetchError } = await supabase
    .from("cards")
    .select("*")
    .eq("id", cardId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!row)       return NextResponse.json({ error: "card not found." }, { status: 404 });

  const card = rowToCard(row as CardRow);

  let classId: string;
  try {
    classId = buildGoogleClassId(card.id);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Google Wallet is not configured." },
      { status: 503 }
    );
  }

  // ── Ensure the correct class type in Google Wallet ─────────────────────────
  try {
    await ensureWalletClass(card, classId);
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

  // ── Persist classId in the card record ────────────────────────────────────
  const existingRaw = row.wallet_class_ids;
  const existingIds =
    existingRaw && typeof existingRaw === "object" && !Array.isArray(existingRaw)
      ? { ...(existingRaw as Record<string, unknown>) }
      : {};

  const { error: updateError } = await supabase
    .from("cards")
    .update({ wallet_class_ids: { ...existingIds, google: classId } })
    .eq("id", cardId)
    .eq("business_id", businessId);

  if (updateError) {
    return NextResponse.json(
      {
        error: `Class created in Google Wallet but failed to update card: ${updateError.message}`,
        classId,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ classId });
}
