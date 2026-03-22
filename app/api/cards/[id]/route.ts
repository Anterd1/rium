import { NextResponse } from "next/server";

import { rowToCard, type CardRow } from "@/lib/parse-card-row";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

type UpdateBody = {
  name?: string;
  type?: string;
  target_purchases?: number;
  reward_description?: string;
  design?: {
    bg_color?: string;
    text_color?: string;
    program_name?: string;
  };
};

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { supabase, user, businessId } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!businessId) {
    return NextResponse.json({ error: "Negocio no encontrado." }, { status: 400 });
  }

  let body: UpdateBody;
  try {
    body = (await request.json()) as UpdateBody;
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }

  const { data: existingRow, error: fetchError } = await supabase
    .from("cards")
    .select("*")
    .eq("id", id)
    .eq("business_id", businessId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existingRow) {
    return NextResponse.json({ error: "Tarjeta no encontrada." }, { status: 404 });
  }

  const existing = rowToCard(existingRow as CardRow);

  const name =
    typeof body.name === "string" ? body.name.trim() : existing.name;
  if (!name) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }

  let type = existing.type;
  if (body.type === "event" || body.type === "loyalty") {
    type = body.type;
  } else if (body.type !== undefined) {
    return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
  }

  let target = existing.target_purchases;
  if (body.target_purchases !== undefined) {
    const t = body.target_purchases;
    if (!Number.isInteger(t) || t < 1) {
      return NextResponse.json(
        { error: "target_purchases debe ser un entero ≥ 1." },
        { status: 400 }
      );
    }
    target = t;
  }

  const reward =
    typeof body.reward_description === "string"
      ? body.reward_description
      : existing.reward_description;

  const d = body.design;
  const design = {
    ...existing.design,
    bg_color:
      typeof d?.bg_color === "string" ? d.bg_color : existing.design.bg_color,
    text_color:
      typeof d?.text_color === "string"
        ? d.text_color
        : existing.design.text_color,
    program_name:
      typeof d?.program_name === "string"
        ? d.program_name.trim()
        : existing.design.program_name,
  };

  const { data: updated, error: updateError } = await supabase
    .from("cards")
    .update({
      name,
      type,
      target_purchases: target,
      reward_description: reward,
      design,
    })
    .eq("id", id)
    .eq("business_id", businessId)
    .select("*")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ card: rowToCard(updated as CardRow) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { supabase, user, businessId } = await getAuthContext();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  if (!businessId) {
    return NextResponse.json({ error: "Negocio no encontrado." }, { status: 400 });
  }

  const { data: removed, error } = await supabase
    .from("cards")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!removed?.length) {
    return NextResponse.json({ error: "Tarjeta no encontrada." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
