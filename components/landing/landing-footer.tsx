import Link from "next/link";
import { cn } from "@/lib/utils";

export function LandingFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "border-t border-border/80 bg-white py-10 text-sm text-muted-foreground",
        className
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:flex-row sm:px-6 lg:px-8">
        <p className="text-center sm:text-left">
          © {2026} Rium. Todos los derechos reservados.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <Link
            href="/terms"
            className="font-medium text-foreground/80 transition-colors hover:text-primary"
          >
            Términos
          </Link>
          <Link
            href="/privacy"
            className="font-medium text-foreground/80 transition-colors hover:text-primary"
          >
            Privacidad
          </Link>
        </div>
      </div>
    </footer>
  );
}
