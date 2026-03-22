import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rium — Operador",
};

export default function OperadorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f172a]">
      {children}
    </div>
  );
}
