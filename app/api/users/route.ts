import { randomBytes } from "crypto";

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

/** Converts a username to the internal Supabase Auth email format */
function usernameToEmail(username: string): string {
  return `op_${username.toLowerCase().trim()}@rium.internal`;
}

function sanitizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

export async function GET() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: userData } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (!userData?.business_id) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const { data: users, error } = await supabase
    .from("users")
    .select("id, business_id, email, name, username, role, active, branch_id")
    .eq("business_id", userData.business_id)
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ users: users ?? [] });
}

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { data: userData } = await supabase
    .from("users")
    .select("business_id, role")
    .eq("id", user.id)
    .single();

  if (!userData?.business_id) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  if (userData.role !== "admin") {
    return NextResponse.json({ error: "Solo administradores pueden crear usuarios" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const name      = typeof b.name     === "string" ? b.name.trim() : "";
  const username  = typeof b.username === "string" ? sanitizeUsername(b.username) : "";
  const password  = typeof b.password === "string" ? b.password : "";
  const role      = b.role === "admin" || b.role === "operator" ? b.role : null;
  const branchId  = typeof b.branch_id === "string" && b.branch_id ? b.branch_id : null;

  if (!name || !username || !password || !role) {
    return NextResponse.json(
      { error: "nombre, usuario, contraseña y rol son obligatorios" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
  }

  // Operators must have a branch
  if (role === "operator" && !branchId) {
    return NextResponse.json({ error: "Los operadores deben tener una sucursal asignada" }, { status: 400 });
  }

  // Verify branch belongs to this business
  if (branchId) {
    const { data: branch } = await supabase
      .from("branches")
      .select("id")
      .eq("id", branchId)
      .eq("business_id", userData.business_id)
      .maybeSingle();

    if (!branch) {
      return NextResponse.json({ error: "Sucursal no válida" }, { status: 400 });
    }
  }

  // Check username uniqueness
  const { data: duplicate } = await supabase
    .from("users")
    .select("id")
    .ilike("username", username)
    .maybeSingle();

  if (duplicate) {
    return NextResponse.json(
      { error: "Este nombre de usuario ya está en uso" },
      { status: 409 }
    );
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceKey || !url) {
    return NextResponse.json({ error: "Servicio no configurado" }, { status: 503 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const internalEmail = usernameToEmail(username);

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: internalEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, role, username },
    app_metadata: { role },
  });

  if (authError || !created.user) {
    return NextResponse.json(
      { error: authError?.message ?? "No se pudo crear la cuenta" },
      { status: 400 }
    );
  }

  const { data: row, error: insertError } = await admin
    .from("users")
    .upsert(
      {
        id: created.user.id,
        business_id: userData.business_id,
        email: internalEmail,
        name,
        username,
        role,
        branch_id: branchId,
        active: true,
      },
      { onConflict: "id" }
    )
    .select("id, business_id, email, name, username, role, active, branch_id")
    .single();

  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ user: row }, { status: 201 });
}
