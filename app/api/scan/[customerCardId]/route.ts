import { NextResponse } from "next/server";

import { rowToCard, type CardRow } from "@/lib/parse-card-row";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: { customerCardId: string } };

export async function GET(_req: Request, context: RouteContext) {
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

  const { customerCardId } = context.params;

  const { data: row, error } = await supabase
    .from("customer_cards")
    .select(`
      id,
      purchases,
      gift_available,
      customer:customers ( id, name, email, phone ),
      card:cards ( * )
    `)
    .eq("id", customerCardId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!row)  return NextResponse.json({ error: "Tarjeta no encontrada" }, { status: 404 });

  const customerRaw = row.customer as unknown;
  const customer = (Array.isArray(customerRaw) ? customerRaw[0] : customerRaw) as
    | { id: string; name: string; email: string; phone: string | null }
    | null;

  const cardRaw = row.card as unknown;
  const cardRow = (Array.isArray(cardRaw) ? cardRaw[0] : cardRaw) as CardRow | null;

  if (!customer || !cardRow) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 404 });
  }

  // Verify the card belongs to this operator's business
  if (cardRow.business_id !== userData.business_id) {
    return NextResponse.json({ error: "Esta tarjeta no pertenece a tu negocio" }, { status: 403 });
  }

  const card = rowToCard(cardRow);

  return NextResponse.json({
    customerCard: {
      id: row.id,
      purchases: row.purchases,
      gift_available: row.gift_available,
    },
    customer,
    card: {
      id: card.id,
      name: card.name,
      type: card.type,
      target_purchases: card.target_purchases,
      reward_description: card.reward_description,
      config: card.config,
      design: {
        program_name: card.design.program_name,
        bg_color: card.design.bg_color,
        text_color: card.design.text_color,
        stamp_icon: card.design.stamp_icon,
      },
    },
  });
}
