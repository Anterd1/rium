import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type RouteContext = { params: { id: string } };

async function requireBusinessId(
  supabase: ReturnType<typeof createServerSupabaseClient>
): Promise<{ businessId: string } | { response: NextResponse }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }

  const { data: userData, error } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (error || !userData?.business_id) {
    return {
      response: NextResponse.json(
        { error: "Negocio no encontrado" },
        { status: 400 }
      ),
    };
  }

  return { businessId: userData.business_id as string };
}

export async function PUT(request: Request, context: RouteContext) {
  const supabase = createServerSupabaseClient();
  const auth = await requireBusinessId(supabase);
  if ("response" in auth) {
    return auth.response;
  }
  const { businessId } = auth;

  const id = context.params.id;

  const { data: existing, error: fetchError } = await supabase
    .from("branches")
    .select("id, business_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 });
  }

  if (existing.business_id !== businessId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: { name?: string; address?: string; active?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
    }
    updates.name = name;
  }

  if (body.address !== undefined) {
    const address = typeof body.address === "string" ? body.address.trim() : "";
    if (!address) {
      return NextResponse.json(
        { error: "La dirección no puede estar vacía" },
        { status: 400 }
      );
    }
    updates.address = address;
  }

  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }
    updates.active = body.active;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
  }

  const { data: branch, error: updateError } = await supabase
    .from("branches")
    .update(updates)
    .eq("id", id)
    .eq("business_id", businessId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ branch });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const supabase = createServerSupabaseClient();
  const auth = await requireBusinessId(supabase);
  if ("response" in auth) {
    return auth.response;
  }
  const { businessId } = auth;

  const id = context.params.id;

  const { data: existing, error: fetchError } = await supabase
    .from("branches")
    .select("id, business_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Sucursal no encontrada" }, { status: 404 });
  }

  if (existing.business_id !== businessId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { error: deleteError } = await supabase
    .from("branches")
    .delete()
    .eq("id", id)
    .eq("business_id", businessId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
