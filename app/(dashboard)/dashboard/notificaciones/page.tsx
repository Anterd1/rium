import { redirect } from "next/navigation";

import { NotificacionesClient } from "@/components/dashboard/notificaciones/notificaciones-client";
import type { Branch, Notification } from "@/lib/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function NotificacionesPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .maybeSingle();

  const businessId = profile?.business_id ?? null;

  let notifications: Notification[] = [];
  let branches: Branch[] = [];

  if (businessId) {
    const [{ data: notificationRows }, { data: branchRows }] = await Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false }),
      supabase
        .from("branches")
        .select("*")
        .eq("business_id", businessId)
        .order("name", { ascending: true }),
    ]);

    notifications = (notificationRows ?? []) as Notification[];
    branches = (branchRows ?? []) as Branch[];
  }

  return (
    <NotificacionesClient
      initialNotifications={notifications}
      branches={branches}
      businessId={businessId}
    />
  );
}
