import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type RouteContext = { params: { id: string } };

export async function PUT(request: Request, context: RouteContext) {
  const targetId = context.params.id;

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: userData, error: profileError } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (profileError || !userData?.business_id) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const patch: {
    name?: string;
    role?: "admin" | "operator";
    active?: boolean;
  } = {};

  if (typeof b.name === "string") {
    const n = b.name.trim();
    if (!n) {
      return NextResponse.json({ error: "El nombre no puede estar vacío" }, { status: 400 });
    }
    patch.name = n;
  }

  if (b.role === "admin" || b.role === "operator") {
    patch.role = b.role;
  }

  if (typeof b.active === "boolean") {
    if (targetId === user.id && b.active === false) {
      return NextResponse.json(
        { error: "No puedes desactivar tu propia cuenta" },
        { status: 400 }
      );
    }
    patch.active = b.active;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "Envía al menos uno: name, role, active" },
      { status: 400 }
    );
  }

  const { data: existing, error: fetchError } = await supabase
    .from("users")
    .select("id, business_id")
    .eq("id", targetId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (existing.business_id !== userData.business_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { data: updated, error: updateError } = await supabase
    .from("users")
    .update(patch)
    .eq("id", targetId)
    .eq("business_id", userData.business_id)
    .select("id, business_id, email, name, role, active")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ user: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const targetId = context.params.id;

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (targetId === user.id) {
    return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 });
  }

  const { data: userData, error: profileError } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (profileError || !userData?.business_id) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from("users")
    .select("id, business_id")
    .eq("id", targetId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (existing.business_id !== userData.business_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (serviceKey && url) {
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: authDelError } = await admin.auth.admin.deleteUser(targetId);
    if (authDelError) {
      return NextResponse.json({ error: authDelError.message }, { status: 500 });
    }
  } else {
    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("id", targetId)
      .eq("business_id", userData.business_id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
