import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Acceso — Rium",
  description: "Inicia sesión o crea una cuenta en Rium",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className="dark relative min-h-screen overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 70% 55% at 8% 15%, rgba(37,99,235,0.30) 0%, transparent 65%), " +
          "radial-gradient(ellipse 50% 40% at 88% 88%, rgba(15,55,150,0.20) 0%, transparent 60%), " +
          "#0a1628",
      }}
    >
      <Link
        href="/"
        className="absolute left-5 top-5 z-10 text-[15px] font-bold tracking-tight text-white/90 transition-opacity hover:opacity-60 sm:left-7 sm:top-7"
      >
        Rium
      </Link>

      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-20 sm:px-6">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  );
}
