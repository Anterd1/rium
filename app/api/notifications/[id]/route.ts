import { NextResponse } from "next/server";

import type { Notification } from "@/lib/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function normalizeTargeting(
  raw: unknown
): Notification["targeting"] | undefined {
  if (raw === null) {
    return null;
  }
  if (raw === undefined) {
    return undefined;
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return undefined;
  }
  const o = raw as Record<string, unknown>;
  const out: NonNullable<Notification["targeting"]> = {};

  if (Array.isArray(o.branch_ids)) {
    const ids = o.branch_ids.filter((x): x is string => typeof x === "string");
    if (ids.length) out.branch_ids = ids;
  }

  if (typeof o.min_purchases === "number" && Number.isFinite(o.min_purchases)) {
    out.min_purchases = Math.max(0, Math.floor(o.min_purchases));
  }

  if (typeof o.gift_available === "boolean") {
    out.gift_available = o.gift_available;
  }

  return Object.keys(out).length ? out : null;
}

type RouteContext = { params: { id: string } };

export async function PUT(request: Request, context: RouteContext) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (userError || !userData?.business_id) {
    return NextResponse.json(
      { error: "Negocio no encontrado" },
      { status: 400 }
    );
  }

  const id = context.params.id;

  const { data: existing, error: fetchError } = await supabase
    .from("notifications")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: "Notificación no encontrada" },
      { status: 404 }
    );
  }

  if (existing.business_id !== userData.business_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: {
    title?: string;
    body?: string;
    type?: string;
    targeting?: unknown;
    sent_at?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json(
        { error: "El título no puede estar vacío" },
        { status: 400 }
      );
    }
    updates.title = title;
  }

  if (body.body !== undefined) {
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!text) {
      return NextResponse.json(
        { error: "El mensaje no puede estar vacío" },
        { status: 400 }
      );
    }
    updates.body = text;
  }

  if (body.type !== undefined) {
    if (body.type !== "push" && body.type !== "email" && body.type !== "sms") {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }
    updates.type = body.type;
  }

  if (body.targeting !== undefined) {
    const targeting = normalizeTargeting(body.targeting);
    if (targeting === undefined) {
      return NextResponse.json(
        { error: "Formato de segmentación inválido" },
        { status: 400 }
      );
    }
    updates.targeting = targeting;
  }

  if (body.sent_at !== undefined) {
    if (body.sent_at !== null && typeof body.sent_at !== "string") {
      return NextResponse.json({ error: "sent_at inválido" }, { status: 400 });
    }
    updates.sent_at = body.sent_at;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
  }

  const { data: notification, error: updateError } = await supabase
    .from("notifications")
    .update(updates)
    .eq("id", id)
    .eq("business_id", userData.business_id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ notification });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (userError || !userData?.business_id) {
    return NextResponse.json(
      { error: "Negocio no encontrado" },
      { status: 400 }
    );
  }

  const id = context.params.id;

  const { data: existing, error: fetchError } = await supabase
    .from("notifications")
    .select("id, business_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json(
      { error: "Notificación no encontrada" },
      { status: 404 }
    );
  }

  if (existing.business_id !== userData.business_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { error: deleteError } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("business_id", userData.business_id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
