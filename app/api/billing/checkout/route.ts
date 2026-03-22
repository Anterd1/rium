import { NextResponse } from "next/server";

import { stripePriceIdForPlan, type PlanId } from "@/lib/billing/plans";
import { stripe } from "@/lib/stripe/client";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function appBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  if (process.env.VERCEL_URL)
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

async function getOrCreateStripeCustomer(
  businessId: string,
  email: string
): Promise<string> {
  const search = await stripe.customers.search({
    query: `metadata['business_id']:'${businessId}'`,
    limit: 1,
  });
  if (search.data[0]) return search.data[0].id;

  const customer = await stripe.customers.create({
    email,
    metadata: { business_id: businessId },
  });
  return customer.id;
}

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const plan = (body as { plan?: string }).plan;
  if (plan !== "basic" && plan !== "pro" && plan !== "enterprise") {
    return NextResponse.json(
      { error: "plan debe ser basic, pro o enterprise" },
      { status: 400 }
    );
  }

  const planId = plan as PlanId;
  const priceId = stripePriceIdForPlan(planId);
  const baseUrl = appBaseUrl();

  const customerId = await getOrCreateStripeCustomer(
    userData.business_id,
    user.email
  );

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/dashboard/facturacion?checkout=success`,
    cancel_url: `${baseUrl}/dashboard/facturacion?checkout=canceled`,
    metadata: { business_id: userData.business_id },
    subscription_data: {
      metadata: { business_id: userData.business_id },
    },
    allow_promotion_codes: true,
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "No se pudo crear la sesión de checkout" },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: session.url });
}
