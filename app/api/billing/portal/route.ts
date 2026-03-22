import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe/client";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function appBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL_URL)
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export async function POST() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: userData, error: profileError } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (profileError || !userData?.business_id) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const { data: subRows, error: subError } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id")
    .eq("business_id", userData.business_id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (subError) {
    return NextResponse.json({ error: subError.message }, { status: 500 });
  }

  const stripeSubscriptionId = subRows?.[0]?.stripe_subscription_id as
    | string
    | null
    | undefined;

  if (!stripeSubscriptionId) {
    return NextResponse.json(
      { error: "No hay suscripción de Stripe para este negocio" },
      { status: 400 }
    );
  }

  const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const customerId =
    typeof stripeSub.customer === "string"
      ? stripeSub.customer
      : stripeSub.customer.id;

  const baseUrl = appBaseUrl();
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${baseUrl}/dashboard/facturacion`,
  });

  return NextResponse.json({ url: portal.url });
}
