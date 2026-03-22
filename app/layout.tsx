import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-heading", weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: "Rium — Tarjetas Digitales de Lealtad",
  description:
    "Plataforma SaaS para crear y gestionar tarjetas de lealtad digitales con Apple Wallet y Google Wallet",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background antialiased", inter.variable, dmSans.variable, "font-sans")}>
        <TooltipProvider>
          {children}
        </TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
