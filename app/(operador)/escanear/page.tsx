import { redirect } from "next/navigation";

import { QrScanner } from "@/components/operador/qr-scanner";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function EscanearPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("name, role")
    .eq("id", user.id)
    .single();

  return (
    <QrScanner
      operatorName={profile?.name ?? user.email ?? "Operador"}
      isAdmin={profile?.role === "admin"}
    />
  );
}
