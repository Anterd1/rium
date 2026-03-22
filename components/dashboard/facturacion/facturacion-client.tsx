"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Check,
  CreditCard,
  ExternalLink,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import type { Business, Subscription } from "@/lib/types";
import { cn } from "@/lib/utils";

type SubscriptionSlice = Pick<
  Subscription,
  "plan" | "status" | "current_period_end" | "stripe_subscription_id"
>;

type Props = {
  business: Pick<Business, "id" | "name" | "plan">;
  subscription: SubscriptionSlice | null;
};

const STATUS_LABEL: Record<Subscription["status"], string> = {
  active: "Activa",
  canceled: "Cancelada",
  past_due: "Pago vencido",
  trialing: "Prueba",
};

function statusBadgeClass(status: Subscription["status"]) {
  switch (status) {
    case "active":
    case "trialing":
      return "border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-500/20";
    case "past_due":
      return "border-amber-500/30 bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-500/20";
    case "canceled":
      return "border-border bg-muted text-muted-foreground";
    default:
      return "";
  }
}

export function FacturacionClient({ business, subscription }: Props) {
  const router = useRouter();
  const [checkoutPlan, setCheckoutPlan] = useState<PlanId | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const effectivePlan = subscription?.plan ?? business.plan;
  const currentPlan = PLANS.find((p) => p.id === effectivePlan) ?? PLANS[0];
  const displayStatus: Subscription["status"] =
    subscription?.status ?? "active";

  const periodEndLabel = subscription?.current_period_end
    ? format(new Date(subscription.current_period_end), "d MMM yyyy", {
        locale: es,
      })
    : null;

  const scrollToPlans = () => {
    document.getElementById("comparacion-planes")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const openPortal = async () => {
    if (!subscription?.stripe_subscription_id) {
      toast.error(
        "Aún no hay una suscripción de Stripe vinculada. Elige un plan para comenzar."
      );
      return;
    }
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !body.url) {
        toast.error(
          typeof body.error === "string"
            ? body.error
            : "No se pudo abrir el portal de facturación."
        );
        return;
      }
      window.location.assign(body.url);
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setPortalLoading(false);
    }
  };

  const selectPlan = async (plan: PlanId) => {
    if (plan === effectivePlan && subscription?.stripe_subscription_id) {
      toast.info("Ya estás en este plan.");
      return;
    }
    setCheckoutPlan(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !body.url) {
        toast.error(
          typeof body.error === "string"
            ? body.error
            : "No se pudo iniciar el checkout."
        );
        return;
      }
      window.location.assign(body.url);
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setCheckoutPlan(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Facturación
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Plan, pagos y facturas de {business.name}
        </p>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CreditCard className="size-5" strokeWidth={1.75} />
            </div>
            <div>
              <CardTitle className="text-lg">Plan actual</CardTitle>
              <CardDescription>
                {currentPlan.name} — ${currentPlan.price} MXN/mes
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "w-fit shrink-0 font-medium capitalize",
              statusBadgeClass(displayStatus)
            )}
          >
            {STATUS_LABEL[displayStatus]}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              Fin del periodo actual:{" "}
            </span>
            {periodEndLabel ?? "—"}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={scrollToPlans}>
              Cambiar plan
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => void openPortal()}
              disabled={portalLoading}
            >
              {portalLoading ? "Abriendo…" : "Gestionar suscripción"}
              <ExternalLink className="size-4" strokeWidth={1.75} />
            </Button>
          </div>
        </CardContent>
      </Card>

      <section id="comparacion-planes" className="scroll-mt-8 space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          Comparar planes
        </h3>
        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === effectivePlan;
            return (
              <Card
                key={plan.id}
                className={cn(
                  "flex flex-col border shadow-sm transition-shadow",
                  isCurrent && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
              >
                <CardHeader>
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    ${plan.price}
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}MXN/mes
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-emerald-500"
                          strokeWidth={2}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {isCurrent ? (
                    <Badge variant="secondary" className="w-full justify-center py-2">
                      Plan actual
                    </Badge>
                  ) : (
                    <Button
                      type="button"
                      className="w-full"
                      disabled={checkoutPlan !== null}
                      onClick={() => void selectPlan(plan.id)}
                    >
                      {checkoutPlan === plan.id ? "Redirigiendo…" : "Seleccionar"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>

      <Card className="border-dashed border-border bg-muted/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Receipt className="size-5 text-muted-foreground" strokeWidth={1.75} />
            <CardTitle className="text-base">Historial de facturas</CardTitle>
          </div>
          <CardDescription>
            Aquí aparecerán tus facturas cuando conectes la API de Stripe
            (listado de invoices).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Placeholder: se puede implementar con{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-foreground/80">
              stripe.invoices.list
            </code>{" "}
            y el customer de Stripe.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-4 text-muted-foreground hover:text-foreground"
            onClick={() => router.refresh()}
          >
            Actualizar página
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
