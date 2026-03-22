import {
  BarChart3,
  Building2,
  Gift,
  Wallet,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RevealItem, RevealStagger } from "@/components/layout/reveal";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Wallet,
    title: "Wallet Digital",
    description: "Tarjetas en Google Wallet y Apple Wallet",
  },
  {
    icon: Gift,
    title: "Programa de Lealtad",
    description: "5 compras = 1 regalo. Personalizable.",
  },
  {
    icon: BarChart3,
    title: "Análisis en Tiempo Real",
    description: "Dashboard con métricas de tu negocio",
  },
  {
    icon: Building2,
    title: "Multi-sucursal",
    description: "Gestiona múltiples ubicaciones",
  },
] as const;

export function FeaturesSection({ className }: { className?: string }) {
  return (
    <section className={cn("bg-white py-20 sm:py-24", className)}>
      <RevealStagger className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <RevealItem className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Todo lo que necesitas para fidelizar
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Herramientas pensadas para negocios que quieren crecer sin complicaciones.
          </p>
        </RevealItem>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, description }) => (
            <RevealItem key={title}>
              <Card className="border-border/80 bg-white shadow-sm shadow-black/[0.03] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/[0.06]">
                <CardHeader className="pb-2">
                  <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" strokeWidth={2} aria-hidden />
                  </div>
                  <CardTitle className="text-lg font-semibold">{title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-base leading-relaxed">
                    {description}
                  </CardDescription>
                </CardContent>
              </Card>
            </RevealItem>
          ))}
        </div>
      </RevealStagger>
    </section>
  );
}
