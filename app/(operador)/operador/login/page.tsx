"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

function usernameToEmail(username: string): string {
  return `op_${username.toLowerCase().trim()}@rium.internal`;
}

export default function OperadorLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const email = usernameToEmail(username.trim());

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (authError) {
      setError("Usuario o contraseña incorrectos");
      return;
    }

    router.push("/escanear");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 bg-[#0f172a]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-[#3b82f6] text-xl font-bold text-white shadow-lg shadow-[#3b82f6]/30">
            R
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-[#3b82f6]">Rium</p>
          <h1 className="mt-1 text-xl font-bold text-white">Acceso para operadores</h1>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider">
              Usuario
            </label>
            <input
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
              placeholder="juanperez"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/25 focus:border-[#3b82f6] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-white placeholder:text-white/25 focus:border-[#3b82f6] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/30 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute inset-y-0 right-4 flex items-center text-white/30 hover:text-white/60"
              >
                {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#3b82f6] py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#2563eb] active:scale-[0.98] disabled:opacity-60 mt-2"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            Entrar
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-white/20">
          ¿Eres administrador?{" "}
          <a href="/login" className="text-white/40 underline underline-offset-4 hover:text-white/60">
            Inicia sesión aquí
          </a>
        </p>
      </div>
    </div>
  );
}
