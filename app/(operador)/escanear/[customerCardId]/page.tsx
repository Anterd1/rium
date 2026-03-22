import { redirect, notFound } from "next/navigation";

import { CardAction } from "@/components/operador/card-action";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type PageProps = { params: { customerCardId: string } };

export default async function ScanResultPage({ params }: PageProps) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/scan/${params.customerCardId}`,
    {
      headers: {
        // Pass the auth cookie so the API can authenticate the operator
        Cookie: (await import("next/headers")).cookies().toString(),
      },
      cache: "no-store",
    }
  );

  if (res.status === 404) notFound();
  if (res.status === 403) redirect("/escanear");

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "Error desconocido" }));
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-2xl">⚠️</p>
        <p className="text-base font-medium text-white">{error}</p>
        <a href="/escanear" className="mt-2 text-sm text-[#3b82f6] underline underline-offset-4">
          Volver al escáner
        </a>
      </div>
    );
  }

  const data = await res.json();

  return <CardAction data={data} />;
}
