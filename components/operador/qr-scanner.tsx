"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader, NotFoundException } from "@zxing/library";
import { CameraOff, LayoutDashboard, Loader2, LogOut, ScanLine } from "lucide-react";
import { toast } from "sonner";

export function QrScanner({ operatorName, isAdmin = false }: { operatorName: string; isAdmin?: boolean }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [scanning, setScanning] = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const lastScan = useRef<string>("");
  const cooldown = useRef(false);

  useEffect(() => {
    if (!scanning) return;

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader
      .decodeFromVideoDevice(null, videoRef.current!, (result, err) => {
        if (result) {
          const text = result.getText();
          if (cooldown.current || text === lastScan.current) return;

          lastScan.current = text;
          cooldown.current = true;

          // Extract UUID from the QR value (the QR encodes the customer_card_id directly)
          const uuid = extractUuid(text);
          if (!uuid) {
            toast.error("QR no reconocido");
            setTimeout(() => { cooldown.current = false; }, 2000);
            return;
          }

          setLoading(true);
          router.push(`/escanear/${uuid}`);
        }
        if (err && !(err instanceof NotFoundException)) {
          // NotFoundException is normal when no QR is in frame — suppress it
        }
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "No se pudo acceder a la cámara";
        setError(msg);
        setScanning(false);
      });

    return () => {
      reader.reset();
    };
  }, [scanning, router]);

  function extractUuid(text: string): string | null {
    // Support: plain UUID, or full URL ending in UUID
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = text.match(uuidRegex);
    return match ? match[0] : null;
  }

  async function signOut() {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-[#0f172a] px-4 pb-8 pt-safe">
      {/* Header */}
      <div className="flex w-full max-w-md items-center justify-between py-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-[#3b82f6]">Rium</p>
          <p className="mt-0.5 text-sm font-semibold text-white">{operatorName}</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/60 transition-colors hover:border-white/25 hover:text-white/80"
            >
              <LayoutDashboard className="size-3.5" />
              Dashboard
            </button>
          )}
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/60 transition-colors hover:border-white/25 hover:text-white/80"
          >
            <LogOut className="size-3.5" />
            Salir
          </button>
        </div>
      </div>

      {/* Camera viewport */}
      <div className="relative w-full max-w-md">
        <div className="relative overflow-hidden rounded-3xl bg-black shadow-2xl shadow-black/60"
             style={{ aspectRatio: "3/4" }}>

          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            muted
            playsInline
          />

          {/* Scanning overlay */}
          {scanning && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {/* Corner brackets */}
              <div className="relative size-56">
                <span className="absolute left-0 top-0 block h-10 w-10 rounded-tl-xl border-l-4 border-t-4 border-[#3b82f6]" />
                <span className="absolute right-0 top-0 block h-10 w-10 rounded-tr-xl border-r-4 border-t-4 border-[#3b82f6]" />
                <span className="absolute bottom-0 left-0 block h-10 w-10 rounded-bl-xl border-b-4 border-l-4 border-[#3b82f6]" />
                <span className="absolute bottom-0 right-0 block h-10 w-10 rounded-br-xl border-b-4 border-r-4 border-[#3b82f6]" />
                {/* Scan line animation */}
                <span className="scan-line absolute inset-x-4 top-0 block h-0.5 rounded-full bg-[#3b82f6] shadow-[0_0_8px_2px_#3b82f6]" />
              </div>
            </div>
          )}

          {/* Loading overlay after scan */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
              <Loader2 className="size-10 animate-spin text-[#3b82f6]" />
              <p className="mt-3 text-sm font-medium text-white">Cargando tarjeta…</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 p-6 text-center">
              <CameraOff className="size-12 text-red-400" />
              <p className="text-sm text-white/80">{error}</p>
              <button
                onClick={() => { setError(null); setScanning(true); }}
                className="rounded-xl bg-[#3b82f6] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Reintentar
              </button>
            </div>
          )}
        </div>

        {/* Instruction */}
        <div className="mt-5 flex items-center justify-center gap-2 text-sm text-white/50">
          <ScanLine className="size-4 text-[#3b82f6]" />
          Apunta la cámara al código QR del cliente
        </div>
      </div>

      {/* Manual input fallback */}
      <ManualEntry />

      <style>{`
        @keyframes scan {
          0%   { top: 0; opacity: 1; }
          90%  { opacity: 1; }
          100% { top: calc(100% - 2px); opacity: 0; }
        }
        .scan-line {
          animation: scan 2s ease-in-out infinite;
        }
        .pt-safe {
          padding-top: env(safe-area-inset-top, 16px);
        }
      `}</style>
    </div>
  );
}

function ManualEntry() {
  const router = useRouter();
  const [open, setOpen]   = useState(false);
  const [value, setValue] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    router.push(`/escanear/${trimmed}`);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-white/30 underline underline-offset-4 transition-colors hover:text-white/60"
      >
        Ingresar código manualmente
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-2">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Pega el ID de la tarjeta del cliente"
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#3b82f6] focus:outline-none"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-white/60 transition-colors hover:border-white/20"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 rounded-xl bg-[#3b82f6] py-2.5 text-sm font-semibold text-white"
        >
          Ir
        </button>
      </div>
    </form>
  );
}
