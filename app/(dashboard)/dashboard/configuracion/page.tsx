import { redirect } from "next/navigation";

import { ConfiguracionClient } from "@/components/dashboard/configuracion/configuracion-client";
import type { Business } from "@/lib/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function normalizeBusiness(row: {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  plan: string;
  branding: unknown;
  created_at: string;
}): Business {
  const raw = (row.branding as Record<string, unknown> | null) ?? {};
  const primary =
    typeof raw.primary_color === "string" && raw.primary_color
      ? raw.primary_color
      : "#0f172a";
  const secondary =
    typeof raw.secondary_color === "string" && raw.secondary_color
      ? raw.secondary_color
      : "#6366f1";

  const branding: NonNullable<Business["branding"]> = {
    primary_color: primary,
    secondary_color: secondary,
  };

  if (typeof raw.api_key === "string" && raw.api_key) {
    branding.api_key = raw.api_key;
  }
  if (typeof raw.webhook_url === "string" && raw.webhook_url) {
    branding.webhook_url = raw.webhook_url;
  }

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo_url: row.logo_url,
    plan: row.plan as Business["plan"],
    branding,
    created_at: row.created_at,
  };
}

export default async function ConfiguracionPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: userData, error: profileError } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (profileError || !userData?.business_id) {
    redirect("/dashboard");
  }

  const { data: row, error } = await supabase
    .from("businesses")
    .select("id, name, slug, logo_url, plan, branding, created_at")
    .eq("id", userData.business_id)
    .single();

  if (error || !row) {
    throw new Error(error?.message ?? "Negocio no encontrado");
  }

  const business = normalizeBusiness(row);

  return <ConfiguracionClient initialBusiness={business} />;
}
