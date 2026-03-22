"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function LandingHeader({ className }: { className?: string }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-white/15 bg-sky-600/70 backdrop-blur-md shadow-sm"
          : "bg-transparent",
        className
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-white transition-opacity hover:opacity-80"
        >
          Rium
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-white/90 hover:bg-white/10 hover:text-white"
            render={<Link href="/login" />}
            nativeButton={false}
          >
            Iniciar sesión
          </Button>
          <Button
            size="sm"
            className="rounded-2xl bg-white font-semibold text-slate-900 shadow-sm hover:bg-white/90"
            render={<Link href="/register" />}
            nativeButton={false}
          >
            Registrarse
          </Button>
        </nav>
      </div>
    </header>
  );
}
