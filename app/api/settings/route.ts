import { NextResponse } from "next/server";

import type { Business } from "@/lib/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type BrandingJson = Record<string, unknown>;

function parseBranding(raw: unknown): NonNullable<Business["branding"]> {
  const b = (raw as BrandingJson | null) ?? {};
  const primary =
    typeof b.primary_color === "string" && b.primary_color
      ? b.primary_color
      : "#0f172a";
  const secondary =
    typeof b.secondary_color === "string" && b.secondary_color
      ? b.secondary_color
      : "#6366f1";
  const out: NonNullable<Business["branding"]> = {
    primary_color: primary,
    secondary_color: secondary,
  };
  if (typeof b.api_key === "string" && b.api_key) {
    out.api_key = b.api_key;
  }
  if (typeof b.webhook_url === "string" && b.webhook_url) {
    out.webhook_url = b.webhook_url;
  }
  return out;
}

async function getBusinessId(): Promise<
  | { ok: true; businessId: string; supabase: ReturnType<typeof createServerSupabaseClient> }
  | { ok: false; response: NextResponse }
> {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autorizado" }, { status: 401 }),
    };
  }

  const { data: userData, error: profileError } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (profileError || !userData?.business_id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 }),
    };
  }

  return { ok: true, businessId: userData.business_id, supabase };
}

export async function GET() {
  const ctx = await getBusinessId();
  if (!ctx.ok) {
    return ctx.response;
  }

  const { supabase, businessId } = ctx;

  const { data: row, error } = await supabase
    .from("businesses")
    .select("id, name, slug, logo_url, plan, branding, created_at")
    .eq("id", businessId)
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: error?.message ?? "No se pudo cargar la configuración" },
      { status: 500 }
    );
  }

  const branding = parseBranding(row.branding);

  const business: Business = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo_url: row.logo_url,
    plan: row.plan as Business["plan"],
    branding,
    created_at: row.created_at,
  };

  return NextResponse.json({ business });
}

export async function PUT(request: Request) {
  const ctx = await getBusinessId();
  if (!ctx.ok) {
    return ctx.response;
  }

  const { supabase, businessId } = ctx;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  const name =
    typeof b.name === "string" ? b.name.trim() : undefined;

  const brandingIn = b.branding as Record<string, unknown> | undefined;

  const updates: { name?: string; branding?: BrandingJson } = {};

  if (name !== undefined) {
    if (!name) {
      return NextResponse.json(
        { error: "El nombre no puede estar vacío" },
        { status: 400 }
      );
    }
    updates.name = name;
  }

  if (brandingIn && typeof brandingIn === "object") {
    const { data: existing, error: fetchErr } = await supabase
      .from("businesses")
      .select("branding")
      .eq("id", businessId)
      .single();

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    const current = (existing?.branding as BrandingJson | null) ?? {};
    const next: BrandingJson = { ...current };

    if (
      typeof brandingIn.primary_color === "string" &&
      brandingIn.primary_color
    ) {
      next.primary_color = brandingIn.primary_color;
    }
    if (
      typeof brandingIn.secondary_color === "string" &&
      brandingIn.secondary_color
    ) {
      next.secondary_color = brandingIn.secondary_color;
    }
    if (typeof brandingIn.webhook_url === "string") {
      next.webhook_url = brandingIn.webhook_url.trim() || null;
    }

    updates.branding = next;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No hay campos para actualizar" },
      { status: 400 }
    );
  }

  const { data: row, error } = await supabase
    .from("businesses")
    .update(updates)
    .eq("id", businessId)
    .select("id, name, slug, logo_url, plan, branding, created_at")
    .single();

  if (error || !row) {
    return NextResponse.json(
      { error: error?.message ?? "No se pudo guardar" },
      { status: 500 }
    );
  }

  const branding = parseBranding(row.branding);

  const business: Business = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo_url: row.logo_url,
    plan: row.plan as Business["plan"],
    branding,
    created_at: row.created_at,
  };

  return NextResponse.json({ business });
}
