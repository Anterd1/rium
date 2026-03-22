import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "¿Puedo cambiar de plan?",
    a: "Sí, puedes cambiar en cualquier momento",
  },
  {
    q: "¿Hay periodo de prueba?",
    a: "Sí, 14 días gratis",
  },
  {
    q: "¿Cómo funciona la facturación?",
    a: "Cobro mensual automático via Stripe",
  },
  {
    q: "¿Qué pasa si cancelo?",
    a: "Tu cuenta baja al plan Básico",
  },
] as const;

export function PricingFaq({ className }: { className?: string }) {
  return (
    <section className={cn("bg-white py-16 sm:py-20", className)}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Preguntas frecuentes
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-lg text-muted-foreground">
          Respuestas rápidas antes de que empieces tu prueba.
        </p>
        <ul className="mt-12 space-y-4">
          {faqs.map(({ q, a }) => (
            <li key={q}>
              <Card className="border-border/80 shadow-sm shadow-black/[0.03]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold leading-snug">{q}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-base text-foreground/80">{a}</CardDescription>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
