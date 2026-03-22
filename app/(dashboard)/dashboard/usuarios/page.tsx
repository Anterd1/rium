import { redirect } from "next/navigation";

import { UsuariosClient } from "@/components/dashboard/usuarios/usuarios-client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Branch, User } from "@/lib/types";

export default async function UsuariosPage() {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: userData, error: profileError } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (profileError || !userData?.business_id) redirect("/dashboard");

  const [{ data: rows }, { data: branchRows }] = await Promise.all([
    supabase
      .from("users")
      .select("id, business_id, email, name, username, role, active, branch_id")
      .eq("business_id", userData.business_id)
      .order("name"),
    supabase
      .from("branches")
      .select("id, name, active")
      .eq("business_id", userData.business_id)
      .order("name"),
  ]);

  const users    = (rows ?? []) as User[];
  const branches = (branchRows ?? []) as Pick<Branch, "id" | "name" | "active">[];

  return (
    <UsuariosClient
      initialUsers={users}
      currentUserId={user.id}
      branches={branches}
    />
  );
}
