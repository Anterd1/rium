import { NextResponse } from "next/server";

import type { Notification } from "@/lib/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function normalizeTargeting(
  raw: unknown
): Notification["targeting"] | undefined {
  if (raw === null || raw === undefined) {
    return null;
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

export async function GET() {
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

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("business_id", userData.business_id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ notifications: notifications ?? [] });
}

export async function POST(request: Request) {
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

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!title || !text) {
    return NextResponse.json(
      { error: "Título y mensaje son obligatorios" },
      { status: 400 }
    );
  }

  const type =
    body.type === "push" || body.type === "email" || body.type === "sms"
      ? body.type
      : null;
  if (!type) {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }

  const targeting =
    body.targeting === undefined ? null : normalizeTargeting(body.targeting);
  if (targeting === undefined) {
    return NextResponse.json(
      { error: "Formato de segmentación inválido" },
      { status: 400 }
    );
  }

  let sentAt: string | null = null;
  if (body.sent_at !== undefined && body.sent_at !== null) {
    if (typeof body.sent_at !== "string") {
      return NextResponse.json({ error: "sent_at inválido" }, { status: 400 });
    }
    sentAt = body.sent_at;
  }

  const { data: row, error: insertError } = await supabase
    .from("notifications")
    .insert({
      business_id: userData.business_id,
      title,
      body: text,
      type,
      targeting,
      sent_at: sentAt,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ notification: row }, { status: 201 });
}
