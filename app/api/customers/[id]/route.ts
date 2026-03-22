import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type RouteContext = { params: { id: string } };

async function getBusinessId(supabase: ReturnType<typeof createServerSupabaseClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
      businessId: null as string | null,
      userId: null as string | null,
    };
  }

  const { data: userData, error } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (error || !userData?.business_id) {
    return {
      error: NextResponse.json({ error: "Sin negocio asignado" }, { status: 403 }),
      businessId: null as string | null,
      userId: user.id,
    };
  }

  return { error: null, businessId: userData.business_id, userId: user.id };
}

export async function GET(_request: Request, context: RouteContext) {
  const supabase = createServerSupabaseClient();
  const session = await getBusinessId(supabase);
  if (session.error) return session.error;
  const { businessId } = session;

  const { id } = context.params;

  const { data, error } = await supabase
    .from("customers")
    .select(
      `
      *,
      customer_cards (
        *,
        card:cards (*),
        purchases (*),
        redemptions (*)
      )
    `
    )
    .eq("id", id)
    .eq("business_id", businessId!)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ customer: data });
}

export async function PUT(request: Request, context: RouteContext) {
  const supabase = createServerSupabaseClient();
  const session = await getBusinessId(supabase);
  if (session.error) return session.error;
  const { businessId } = session;

  const { id } = context.params;

  let body: { name?: string; email?: string; phone?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const patch: Record<string, string | null> = {};
  if (typeof body.name === "string") patch.name = body.name.trim();
  if (typeof body.email === "string") patch.email = body.email.trim();
  if (body.phone === null) patch.phone = null;
  else if (typeof body.phone === "string") patch.phone = body.phone.trim() || null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("customers")
    .update(patch)
    .eq("id", id)
    .eq("business_id", businessId!)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ customer: data });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const supabase = createServerSupabaseClient();
  const session = await getBusinessId(supabase);
  if (session.error) return session.error;
  const { businessId } = session;

  const { id } = context.params;

  const { data, error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId!)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
