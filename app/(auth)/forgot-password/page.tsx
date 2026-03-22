"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${origin}/auth/callback`,
      }
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message || "No se pudo enviar el enlace.");
      return;
    }

    setSent(true);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Recupera tu contraseña
        </h1>
        <p className="text-sm text-white/45">
          Te enviaremos un enlace para restablecerla
        </p>
      </div>

      {sent ? (
        <div className="space-y-6">
          <div
            role="status"
            className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-300"
          >
            Si existe una cuenta con{" "}
            <span className="font-semibold text-emerald-200">{email.trim()}</span>,
            recibirás un correo con instrucciones en unos minutos.
          </div>
          <Link
            href="/login"
            className="flex h-12 w-full items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-white/50">
              Correo electrónico
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tu@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/25 focus-visible:border-white/30 focus-visible:ring-1 focus-visible:ring-white/15"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="mt-2 h-12 w-full rounded-xl bg-[#0066cc] font-semibold text-white hover:bg-[#0057b0]"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Enviando…
              </>
            ) : (
              "Enviar enlace"
            )}
          </Button>

          <p className="text-center text-sm text-white/35">
            <Link
              href="/login"
              className="font-semibold text-white/70 underline-offset-4 hover:text-white hover:underline"
            >
              Volver al inicio de sesión
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
