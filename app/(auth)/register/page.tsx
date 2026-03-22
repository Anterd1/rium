"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function businessNameToSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "business";
}

async function getAvailableSlug(
  baseSlug: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  if (!(await exists(baseSlug))) return baseSlug;
  for (let i = 1; i <= 20; i += 1) {
    const candidate = `${baseSlug}-${i}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export default function RegisterPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const slug = businessNameToSlug(businessName);

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          business_name: businessName.trim(),
        },
      },
    });

    if (signUpError) {
      setLoading(false);
      const message = signUpError.message || "No se pudo crear la cuenta.";
      setError(message);
      toast.error(message);
      return;
    }

    const user = authData.user;
    if (!user) {
      setLoading(false);
      const message =
        "Registro iniciado. Revisa tu correo si debes confirmar la cuenta.";
      setError(message);
      toast.message(message);
      return;
    }

    // If email confirmation is enabled, Supabase may return user without session.
    // In that case, we can't pass authenticated RLS checks yet.
    if (!authData.session) {
      setLoading(false);
      const message =
        "Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.";
      setError(message);
      toast.message(message);
      router.push("/login");
      return;
    }

    const slugExists = async (candidate: string) => {
      const { data } = await supabase
        .from("businesses")
        .select("id")
        .eq("slug", candidate)
        .maybeSingle();
      return Boolean(data?.id);
    };

    const availableSlug = await getAvailableSlug(slug, slugExists);

    const { data: businessRow, error: businessError } = await supabase
      .from("businesses")
      .insert({ name: businessName.trim(), slug: availableSlug })
      .select("id")
      .single();

    if (businessError) {
      setLoading(false);
      const message =
        businessError.message || "No se pudo crear el negocio. Intenta de nuevo.";
      setError(message);
      toast.error(message);
      return;
    }

    const { error: userRowError } = await supabase.from("users").insert({
      id: user.id,
      business_id: businessRow.id,
      email: email.trim(),
      name: fullName.trim(),
      role: "admin",
      active: true,
    });

    setLoading(false);

    if (userRowError) {
      const message =
        userRowError.message || "No se pudo guardar tu perfil. Contacta soporte.";
      setError(message);
      toast.error(message);
      return;
    }

    toast.success("Cuenta creada correctamente");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Crea tu cuenta
        </h1>
        <p className="text-sm text-white/45">
          Registra tu negocio y empieza en minutos
        </p>
      </div>

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
          <Label htmlFor="businessName" className="text-xs font-medium text-white/50">
            Nombre del negocio
          </Label>
          <Input
            id="businessName"
            name="businessName"
            type="text"
            autoComplete="organization"
            placeholder="Mi cafetería"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            disabled={loading}
            className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/25 focus-visible:border-white/30 focus-visible:ring-1 focus-visible:ring-white/15"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fullName" className="text-xs font-medium text-white/50">
            Nombre completo
          </Label>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            placeholder="María García"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            disabled={loading}
            className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/25 focus-visible:border-white/30 focus-visible:ring-1 focus-visible:ring-white/15"
          />
        </div>

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

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-medium text-white/50">
            Contraseña
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
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
              Creando cuenta…
            </>
          ) : (
            "Registrarse"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-white/35">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/login"
          className="font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline"
        >
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
