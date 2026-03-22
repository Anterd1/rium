import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("name, email, business_id")
    .eq("id", user.id)
    .maybeSingle();

  let businessName = "Mi negocio";

  if (profile?.business_id) {
    const { data: business } = await supabase
      .from("businesses")
      .select("name")
      .eq("id", profile.business_id)
      .maybeSingle();

    if (business?.name) {
      businessName = business.name;
    }
  }

  const displayName =
    profile?.name?.trim() ||
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null) ||
    user.email?.split("@")[0] ||
    "Usuario";

  const displayEmail = profile?.email ?? user.email ?? "";

  return (
    <DashboardShell
      user={{ name: displayName, email: displayEmail }}
      businessName={businessName}
    >
      {children}
    </DashboardShell>
  );
}
