"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RevealItem, RevealStagger } from "@/components/layout/reveal";
import { cn } from "@/lib/utils";

export type LandingPlan = {
  id: string;
  name: string;
  price: number;
  description: string;
  detail: string;
  features: string[];
  popular?: boolean;
};

export const LANDING_PLANS: LandingPlan[] = [
  {
    id: "basico",
    name: "Básico",
    price: 399,
    description: "Para empezar con una tarjeta y una ubicación.",
    detail:
      "Perfecto si recién digitalizas tu programa: una tarjeta, una sucursal y métricas esenciales sin ruido.",
    features: [
      "1 tarjeta activa",
      "1 sucursal",
      "Notificaciones básicas",
      "Estadísticas",
      "Soporte por email",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 599,
    description: "El equilibrio ideal para negocios en crecimiento.",
    detail:
      "Más tarjetas y sucursales, notificaciones avanzadas y soporte prioritario para escalar con confianza.",
    features: [
      "3 tarjetas activas",
      "3 sucursales",
      "Notificaciones avanzadas",
      "Estadísticas detalladas",
      "Soporte prioritario",
    ],
    popular: true,
  },
  {
    id: "empresarial",
    name: "Empresarial",
    price: 749,
    description: "Máxima capacidad e integración para equipos grandes.",
    detail:
      "Volúmenes altos, exportación de datos y API para conectar Rium con tus sistemas internos.",
    features: [
      "10 tarjetas activas",
      "10 sucursales",
      "Notificaciones ilimitadas",
      "Estadísticas avanzadas + exportación",
      "Soporte prioritario + API",
    ],
  },
];

type PricingSectionProps = {
  id?: string;
  className?: string;
  heading?: string;
  subheading?: string;
  detailed?: boolean;
};

export function PricingSection({
  id = "pricing",
  className,
  heading = "Planes simples y transparentes",
  subheading = "Elige el plan que encaje con tu operación. Sin letras pequeñas.",
  detailed = false,
}: PricingSectionProps) {
  return (
    <section id={id} className={cn("scroll-mt-20 bg-white py-20 sm:py-24", className)}>
      <RevealStagger className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <RevealItem className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{heading}</h2>
          <p className="mt-4 text-lg text-muted-foreground">{subheading}</p>
        </RevealItem>

        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {LANDING_PLANS.map((plan) => (
            <RevealItem key={plan.id}>
              <Card
                className={cn(
                  "relative flex flex-col overflow-hidden border-border/80 bg-white shadow-sm shadow-black/[0.04] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                  plan.popular &&
                    "z-[1] border-primary/25 shadow-lg shadow-primary/[0.12] ring-2 ring-primary/30 lg:scale-[1.02]"
                )}
              >
                {plan.popular ? (
                  <div className="flex items-center justify-center bg-primary px-4 py-2">
                    <span className="text-xs font-semibold tracking-wide text-primary-foreground">
                      Más popular
                    </span>
                  </div>
                ) : null}
                <CardHeader className="pb-4 pt-6">
                  <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                  <CardDescription className="text-base">{plan.description}</CardDescription>
                  {detailed ? (
                    <p className="pt-2 text-sm leading-relaxed text-muted-foreground">{plan.detail}</p>
                  ) : null}
                  <div className="pt-4">
                    <span className="text-4xl font-bold tracking-tight text-foreground">
                      ${plan.price}
                    </span>
                    <span className="text-muted-foreground">/mes</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3 pb-6">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex gap-3 text-sm text-foreground">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
                      </span>
                      <span className="leading-snug">{feature}</span>
                    </div>
                  ))}
                </CardContent>
                <CardFooter className="border-t border-border/60 bg-muted/20">
                  <Button
                    className="w-full h-11 text-base"
                    variant={plan.popular ? "default" : "outline"}
                    render={<Link href="/register" />}
                    nativeButton={false}
                  >
                    Comenzar
                  </Button>
                </CardFooter>
              </Card>
            </RevealItem>
          ))}
        </div>
      </RevealStagger>
    </section>
  );
}
