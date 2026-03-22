"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LottiePlayer } from "@/components/ui/lottie-player";

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

function LoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 overflow-hidden"
      style={{ background: "#0d2d52" }}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="heysis-blob-a absolute -left-20 -top-20 h-[480px] w-[480px] rounded-full blur-[100px]"
          style={{ background: "rgba(77,160,232,0.55)" }}
        />
        <div
          className="heysis-blob-b absolute -bottom-24 -right-16 h-[420px] w-[420px] rounded-full blur-[110px]"
          style={{ background: "rgba(29,78,216,0.45)" }}
        />
        <div
          className="heysis-blob-c absolute left-1/2 top-1/2 h-[280px] w-[280px] rounded-full blur-[70px]"
          style={{ background: "rgba(125,211,252,0.30)" }}
        />
      </div>

      <p className="heysis-logo-in relative z-10 select-none text-2xl font-extrabold tracking-[0.18em] text-white/95">
        RIUM
      </p>

      <LottiePlayer
        src="https://lottie.host/78284f30-bca5-491e-b297-50c7dc53a43e/HjVEbsxhER.lottie"
        className="relative z-10 h-72 w-72"
      />
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!redirecting) return;
    const t = setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1600);
    return () => clearTimeout(t);
  }, [redirecting, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const raw = email.trim();
    const resolvedEmail = raw.includes("@") ? raw : `op_${raw.toLowerCase().replace(/\s/g, "")}@rium.internal`;

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password,
    });

    if (signInError) {
      setLoading(false);
      const message = signInError.message || "No se pudo iniciar sesión.";
      setError(message);
      toast.error(message);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const currentUser = userData.user;
    if (currentUser) {
      const { data: existingProfile, error: profileError } = await supabase
        .from("users")
        .select("id")
        .eq("id", currentUser.id)
        .maybeSingle();

      const profileMissing =
        !existingProfile &&
        (!profileError || profileError.code === "PGRST116");

      if (profileMissing) {
        const metadata = currentUser.user_metadata ?? {};
        const businessName =
          typeof metadata.business_name === "string" &&
          metadata.business_name.trim().length > 0
            ? metadata.business_name.trim()
            : "Mi negocio";
        const fullName =
          typeof metadata.full_name === "string" && metadata.full_name.trim().length > 0
            ? metadata.full_name.trim()
            : currentUser.email?.split("@")[0] ?? "Usuario";
        const baseSlug = businessNameToSlug(businessName);

        const slugExists = async (candidate: string) => {
          const { data } = await supabase
            .from("businesses")
            .select("id")
            .eq("slug", candidate)
            .maybeSingle();
          return Boolean(data?.id);
        };

        const slug = await getAvailableSlug(baseSlug, slugExists);

        const { data: businessRow, error: businessError } = await supabase
          .from("businesses")
          .insert({ name: businessName, slug })
          .select("id")
          .single();

        if (businessError) {
          setLoading(false);
          const message =
            businessError.message ||
            "No se pudo completar el perfil de negocio. Intenta de nuevo.";
          setError(message);
          toast.error(message);
          return;
        }

        const { error: insertUserError } = await supabase.from("users").insert({
          id: currentUser.id,
          business_id: businessRow.id,
          email: currentUser.email ?? resolvedEmail,
          name: fullName,
          role: "admin",
          active: true,
        });

        if (insertUserError) {
          setLoading(false);
          const message =
            insertUserError.message ||
            "No se pudo crear tu perfil de usuario. Intenta de nuevo.";
          setError(message);
          toast.error(message);
          return;
        }
      }
    }

    // Show loading animation before navigating
    setRedirecting(true);
  }

  if (redirecting) return <LoadingScreen />;

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Bienvenido de vuelta
        </h1>
        <p className="text-sm text-white/45">
          Entra con tu correo y contraseña
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
          <Label htmlFor="email" className="text-xs font-medium text-white/50">
            Usuario o correo electrónico
          </Label>
          <Input
            id="email"
            name="email"
            type="text"
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-medium text-white/50">
              Contraseña
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs text-white/40 underline-offset-4 hover:text-white/70 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          {loading ? "Verificando…" : "Entrar"}
        </Button>
      </form>

      <p className="text-center text-sm text-white/35">
        ¿No tienes cuenta?{" "}
        <Link
          href="/register"
          className="font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline"
        >
          Regístrate
        </Link>
      </p>
    </div>
  );
}
