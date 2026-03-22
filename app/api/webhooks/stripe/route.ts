import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import { planFromStripePriceId } from "@/lib/billing/plans";
import { stripe } from "@/lib/stripe/client";
import type { Subscription as DbSubscription } from "@/lib/types";

/** Stripe API 2023-10-16 still returns this; latest SDK types may omit it. */
function subscriptionPeriodEndUnix(sub: Stripe.Subscription): number | null {
  const v = (sub as unknown as { current_period_end?: number })
    .current_period_end;
  return typeof v === "number" ? v : null;
}

export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function mapStripeStatus(
  s: Stripe.Subscription.Status
): DbSubscription["status"] {
  if (s === "active") return "active";
  if (s === "trialing") return "trialing";
  if (s === "past_due") return "past_due";
  return "canceled";
}

async function resolveBusinessId(
  stripeSub: Stripe.Subscription
): Promise<string | null> {
  const fromMeta = stripeSub.metadata?.business_id;
  if (fromMeta) return fromMeta;

  const { data } = await getSupabaseAdmin()
    .from("subscriptions")
    .select("business_id")
    .eq("stripe_subscription_id", stripeSub.id)
    .maybeSingle();

  return data?.business_id ?? null;
}

async function upsertSubscriptionRow(
  businessId: string,
  stripeSub: Stripe.Subscription,
  plan: ReturnType<typeof planFromStripePriceId>
) {
  const status = mapStripeStatus(stripeSub.status);
  const endUnix = subscriptionPeriodEndUnix(stripeSub);
  const current_period_end = endUnix
    ? new Date(endUnix * 1000).toISOString()
    : null;

  const { data: updated } = await getSupabaseAdmin()
    .from("subscriptions")
    .update({
      stripe_subscription_id: stripeSub.id,
      plan,
      status,
      current_period_end,
    })
    .eq("business_id", businessId)
    .select("id");

  if (!updated?.length) {
    await getSupabaseAdmin().from("subscriptions").insert({
      business_id: businessId,
      stripe_subscription_id: stripeSub.id,
      plan,
      status,
      current_period_end,
    });
  }
}

async function syncFromStripeSubscription(stripeSub: Stripe.Subscription) {
  const businessId = await resolveBusinessId(stripeSub);
  if (!businessId) return;

  const price = stripeSub.items.data[0]?.price;
  const priceId = typeof price === "string" ? price : price?.id;
  if (!priceId) return;

  const plan = planFromStripePriceId(priceId);
  await upsertSubscriptionRow(businessId, stripeSub, plan);

  const live =
    stripeSub.status === "active" ||
    stripeSub.status === "trialing" ||
    stripeSub.status === "past_due";

  await getSupabaseAdmin()
    .from("businesses")
    .update({ plan: live ? plan : "basic" })
    .eq("id", businessId);
}

export async function POST(request: Request) {
  const body = await request.text();
  const sig = headers().get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const businessId = session.metadata?.business_id;
        const subId = session.subscription;
        if (!businessId || typeof subId !== "string") break;

        const stripeSub = await stripe.subscriptions.retrieve(subId);
        const price = stripeSub.items.data[0]?.price;
        const priceId = typeof price === "string" ? price : price?.id;
        if (!priceId) break;

        const plan = planFromStripePriceId(priceId);
        await upsertSubscriptionRow(businessId, stripeSub, plan);
        await getSupabaseAdmin()
          .from("businesses")
          .update({ plan })
          .eq("id", businessId);
        break;
      }
      case "customer.subscription.updated": {
        const stripeSub = event.data.object as Stripe.Subscription;
        await syncFromStripeSubscription(stripeSub);
        break;
      }
      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as Stripe.Subscription;
        const businessId = await resolveBusinessId(stripeSub);
        if (!businessId) break;

        const delEnd = subscriptionPeriodEndUnix(stripeSub);
        await getSupabaseAdmin()
          .from("subscriptions")
          .update({
            status: "canceled",
            current_period_end: delEnd
              ? new Date(delEnd * 1000).toISOString()
              : null,
          })
          .eq("stripe_subscription_id", stripeSub.id);

        await getSupabaseAdmin()
          .from("businesses")
          .update({ plan: "basic" })
          .eq("id", businessId);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe webhook]", e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
