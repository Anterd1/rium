"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Reveal, RevealItem, RevealStagger } from "@/components/layout/reveal";
import { cn } from "@/lib/utils";

export function HeroSection({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "relative overflow-hidden bg-[#4da0e8]",
        className
      )}
    >
      <div
        className="absolute inset-0 bg-cover bg-[center_20%]"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1556740714-a8395b3bf30f?auto=format&fit=crop&w=1800&q=80')",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-black/45"
        aria-hidden
      />

      <div className="relative mx-auto grid min-h-[92vh] max-w-6xl items-center gap-8 px-4 pb-20 pt-32 sm:px-6 sm:pt-36 lg:grid-cols-[1fr_1fr] lg:gap-6 lg:px-8">
        <RevealStagger className="z-10 max-w-xl">
          <RevealItem>
            <h1 className="text-[2.75rem] font-extrabold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Convierte a los compradores en tus clientes
            </h1>
          </RevealItem>
          <RevealItem>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-white/90 sm:text-xl">
              Crea tarjetas de lealtad digitales para Apple&nbsp;Wallet y Google&nbsp;Wallet.
              Simple, rápido, sin fricciones.
            </p>
          </RevealItem>
          <Reveal>
            <div className="mt-10">
              <Button
                size="lg"
                className="min-w-[12rem] bg-slate-900 text-base font-semibold text-white shadow-lg hover:bg-slate-800"
                render={<Link href="/register" />}
                nativeButton={false}
              >
                Comenzar gratis
              </Button>
            </div>
          </Reveal>
        </RevealStagger>

        <Reveal className="relative z-10 flex items-end justify-center lg:justify-end">
          <div className="w-full max-w-sm">
            <div className="rounded-2xl border border-white/30 bg-white/20 p-4 shadow-2xl backdrop-blur-lg">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Rium Wallet</span>
                <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-medium text-white">
                  Activa
                </span>
              </div>

              <div className="mb-5">
                <p className="text-xs font-medium uppercase tracking-wider text-white/70">
                  Puntos acumulados
                </p>
                <p className="mt-1 text-4xl font-bold text-white">4 / 5</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Café Gratis</p>
                      <p className="text-xs text-slate-500">Recompensa al completar</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-emerald-600">1 más</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                        <path
                          fillRule="evenodd"
                          d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Visita registrada</p>
                      <p className="text-xs text-slate-500">Hace 2 horas</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-blue-600">+1 pto</span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
