import { notFound } from "next/navigation";

import { PublicEnrollForm } from "@/components/landing/public-enroll-form";
import { rowToCard, type CardRow } from "@/lib/parse-card-row";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type PageProps = {
  params: { cardId: string };
};

export default async function PublicCardRegistrationPage({ params }: PageProps) {
  const admin = (() => { try { return getSupabaseAdmin(); } catch { return null; } })();

  if (!admin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          No se puede abrir este registro en este momento. Configura
          <code className="mx-1 rounded bg-white px-1 py-0.5">SUPABASE_SERVICE_ROLE_KEY</code>
          y vuelve a intentar.
        </div>
      </div>
    );
  }

  const { data, error } = await admin
    .from("cards")
    .select("*, business:businesses(name)")
    .eq("id", params.cardId)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const card = rowToCard(data as CardRow);
  const businessRaw = (data as Record<string, unknown>)["business"];
  const business = (Array.isArray(businessRaw) ? businessRaw[0] : businessRaw) as
    | { name?: string }
    | null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Tarjeta digital de lealtad
        </h1>
        <p className="mt-3 text-slate-600">
          Regístrate para recibir tu tarjeta y guardarla en Google Wallet.
        </p>
      </div>
      <PublicEnrollForm
        cardId={card.id}
        programName={card.design.program_name || card.name}
        businessName={business?.name || "este negocio"}
      />
    </div>
  );
}
