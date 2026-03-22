import type { Metadata } from "next";
import Link from "next/link";
import { PricingFaq } from "@/components/landing/pricing-faq";
import { PricingSection } from "@/components/landing/pricing-section";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Precios — Rium",
  description:
    "Planes Rium para tarjetas de lealtad en Apple Wallet y Google Wallet. Prueba gratis 14 días.",
};

export default function PricingPage() {
  return (
    <>
      <section className="border-b border-border/60 bg-gradient-to-b from-[#0066CC]/[0.06] to-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">
            Precios
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Invierte en lealtad, no en complejidad
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Misma plataforma en todos los planes: tarjetas nativas para{" "}
            <span className="font-medium text-foreground">Google Wallet</span> y{" "}
            <span className="font-medium text-foreground">Apple Wallet</span>. Los planes solo
            cambian límites y nivel de soporte.{" "}
            <span className="font-medium text-foreground">14 días de prueba</span> en cualquier
            tier.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="h-12 px-8 text-base shadow-md shadow-primary/15"
              render={<Link href="/register" />}
              nativeButton={false}
            >
              Comenzar prueba gratis
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 border-border/80 bg-white px-8 text-base"
              render={<Link href="/" />}
              nativeButton={false}
            >
              Volver al inicio
            </Button>
          </div>
        </div>
      </section>

      <PricingSection
        id="pricing"
        heading="Comparar planes"
        subheading="Todos incluyen emisión en wallets, panel web y actualizaciones. Escala cuando lo necesites."
        detailed
      />

      <PricingFaq className="border-t border-border/40" />
    </>
  );
}
