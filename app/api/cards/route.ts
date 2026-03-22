import { NextResponse } from "next/server";

import { rowToCard, type CardRow } from "@/lib/parse-card-row";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PLAN_LIMITS, type Business } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getAuthContext() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { supabase, user: null, businessId: null as string | null };
  }
  const { data: userData } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .maybeSingle();
  return {
    supabase,
    user,
    businessId: userData?.business_id ?? null,
  };
}

function isPlanKey(v: string | undefined): v is Business["plan"] {
  return v === "basic" || v === "pro" || v === "enterprise";
}

export async function GET() {
  const { supabase, user, businessId } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!businessId) {
    return NextResponse.json({ error: "Negocio no encontrado." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const cards = (data ?? []).map((row) => rowToCard(row as CardRow));
  return NextResponse.json({ cards });
}

const VALID_CARD_TYPES = [
  "loyalty",
  "event",
  "stamps",
  "coupon",
  "cashback",
  "gift_card",
  "discount",
] as const;

type ValidCardType = (typeof VALID_CARD_TYPES)[number];

function isValidCardType(v: string): v is ValidCardType {
  return (VALID_CARD_TYPES as readonly string[]).includes(v);
}

type CreateBody = {
  name?: string;
  type?: string;
  target_purchases?: number;
  reward_description?: string;
  design?: Record<string, unknown>;
  config?: Record<string, unknown>;
};

export async function POST(request: Request) {
  const { supabase, user, businessId } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!businessId) {
    return NextResponse.json({ error: "Negocio no encontrado." }, { status: 400 });
  }

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }

  const typeRaw = typeof body.type === "string" ? body.type : "";
  if (!isValidCardType(typeRaw)) {
    return NextResponse.json({ error: "Tipo de tarjeta inválido." }, { status: 400 });
  }
  const type = typeRaw;

  // target_purchases is required only for stamps-based types
  const stampsTypes = ["loyalty", "stamps"];
  const needsTarget = stampsTypes.includes(type);
  const target =
    typeof body.target_purchases === "number" ? body.target_purchases : (needsTarget ? NaN : 1);
  if (needsTarget && (!Number.isInteger(target) || target < 1)) {
    return NextResponse.json(
      { error: "target_purchases debe ser un entero ≥ 1." },
      { status: 400 }
    );
  }

  const reward =
    typeof body.reward_description === "string" ? body.reward_description : "";

  const d = body.design ?? {};
  const design = {
    bg_color: typeof d.bg_color === "string" ? d.bg_color : "#0f172a",
    text_color: typeof d.text_color === "string" ? d.text_color : "#f8fafc",
    label_color: typeof d.label_color === "string" ? d.label_color : "#94a3b8",
    program_name: typeof d.program_name === "string" ? (d.program_name as string).trim() : "",
    logo_url: null as string | null,
    hero_url: null as string | null,
    barcode_type: typeof d.barcode_type === "string" ? d.barcode_type : "QR_CODE",
    fine_print: typeof d.fine_print === "string" ? d.fine_print : "",
    homepage_url: typeof d.homepage_url === "string" ? d.homepage_url : "",
  };

  const config = body.config ?? {};

  const { data: business, error: bizError } = await supabase
    .from("businesses")
    .select("plan")
    .eq("id", businessId)
    .maybeSingle();

  if (bizError) {
    return NextResponse.json({ error: bizError.message }, { status: 500 });
  }

  const planKey = isPlanKey(business?.plan) ? business.plan : "basic";
  const maxCards = PLAN_LIMITS[planKey]?.max_cards ?? PLAN_LIMITS.basic.max_cards;

  const { count, error: countError } = await supabase
    .from("cards")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  if ((count ?? 0) >= maxCards) {
    return NextResponse.json(
      {
        error: `Límite de tarjetas alcanzado (${maxCards}) para tu plan.`,
      },
      { status: 403 }
    );
  }

  const { data: inserted, error: insertError } = await supabase
    .from("cards")
    .insert({
      business_id: businessId,
      name,
      type,
      target_purchases: target,
      reward_description: reward,
      design,
      config,
      wallet_class_ids: {},
    })
    .select("*")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ card: rowToCard(inserted as CardRow) });
}
