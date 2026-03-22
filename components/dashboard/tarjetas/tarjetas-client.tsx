"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, CreditCard, ExternalLink, Pencil, Plus, QrCode, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { CardPreview } from "@/components/dashboard/tarjetas/card-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CARD_TYPE_LABELS, type Card as CardModel } from "@/lib/types";

export type TarjetasClientProps = {
  cards: CardModel[];
  businessLogoUrl: string | null;
  planKey: string;
  maxCards: number;
};

export function TarjetasClient({
  cards,
  businessLogoUrl,
  planKey,
  maxCards,
}: TarjetasClientProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<CardModel | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [shareCard, setShareCard] = useState<CardModel | null>(null);
  const [shareQrDataUrl, setShareQrDataUrl] = useState("");

  const atLimit = cards.length >= maxCards;
  const shareUrl = useMemo(() => {
    if (!shareCard) return "";
    if (typeof window !== "undefined") {
      return `${window.location.origin}/registro/${shareCard.id}`;
    }
    return "";
  }, [shareCard]);

  useEffect(() => {
    let active = true;
    async function makeQr() {
      if (!shareCard || !shareUrl) {
        if (active) setShareQrDataUrl("");
        return;
      }
      try {
        const QRCode = (await import("qrcode")).default;
        const dataUrl = await QRCode.toDataURL(shareUrl, { width: 320, margin: 1 });
        if (active) setShareQrDataUrl(dataUrl);
      } catch {
        if (active) setShareQrDataUrl("");
      }
    }
    void makeQr();
    return () => {
      active = false;
    };
  }, [shareCard, shareUrl]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/cards/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(
          typeof body.error === "string" ? body.error : "No se pudo eliminar."
        );
        return;
      }
      toast.success("Tarjeta eliminada.");
      setDeleteTarget(null);
      router.refresh();
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setDeleting(false);
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Enlace de registro copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Tarjetas
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Programas digitales para Apple Wallet y Google Wallet. Plan actual:{" "}
            <span className="font-medium capitalize text-foreground/80">{planKey}</span>
            {" · "}
            {cards.length}/{maxCards} tarjetas
          </p>
        </div>
        <Button
          type="button"
          className="shrink-0"
          onClick={() => {
            if (atLimit) {
              toast.error(`Límite de tarjetas alcanzado (${maxCards}). Actualiza tu plan.`);
              return;
            }
            router.push("/dashboard/tarjetas/nueva");
          }}
        >
          <Plus className="size-4" strokeWidth={2} aria-hidden />
          Nueva Tarjeta
        </Button>
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-20 text-center shadow-sm">
          <div className="mb-6 flex size-20 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <CreditCard className="size-10 stroke-[1.25]" aria-hidden />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Aún no tienes tarjetas
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Crea tu primera tarjeta de lealtad o evento. Tus clientes la guardarán
            en la cartera y podrás seguir sellos y recompensas desde el panel.
          </p>
          <Button
            type="button"
            className="mt-8"
            onClick={() => router.push("/dashboard/tarjetas/nueva")}
          >
            <Plus className="size-4" aria-hidden />
            Crear tarjeta
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Card
              key={card.id}
              className="group/card-item overflow-hidden border bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              <Link
                href={`/dashboard/tarjetas/${card.id}`}
                className="block cursor-pointer"
              >
                <CardHeader className="space-y-3 pb-2">
                  <CardPreview
                    card={card}
                    businessLogoUrl={businessLogoUrl}
                    className="rounded-2xl transition-transform group-hover/card-item:scale-[1.01]"
                  />
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <h3 className="min-w-0 flex-1 truncate font-semibold text-foreground">
                      {card.name}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "font-medium",
                        card.type === "event" || card.type === "coupon" || card.type === "discount"
                          ? "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300"
                          : card.type === "cashback"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : card.type === "gift_card"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                          : "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300"
                      )}
                    >
                      {CARD_TYPE_LABELS[card.type]}
                    </Badge>
                    <Badge
                      variant={card.active ? "default" : "outline"}
                      className="font-medium"
                    >
                      {card.active ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pb-4 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground/80">Meta: </span>
                    {card.target_purchases} compras
                  </p>
                  <p className="line-clamp-2 leading-relaxed">
                    {card.reward_description || "Sin descripción"}
                  </p>
                </CardContent>
              </Link>
              <CardFooter className="flex justify-end gap-2 border-t border-border bg-muted/30">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setShareCard(card)}
                >
                  <QrCode className="size-3.5" aria-hidden />
                  QR Registro
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/dashboard/tarjetas/${card.id}/editar`)}
                >
                  <Pencil className="size-3.5" aria-hidden />
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setDeleteTarget(card)}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Eliminar
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent showCloseButton={!deleting}>
          <DialogHeader>
            <DialogTitle>¿Eliminar tarjeta?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Se eliminará «${deleteTarget.name}». Esta acción no se puede deshacer.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={shareCard !== null}
        onOpenChange={(open) => {
          if (!open) {
            setShareCard(null);
            setShareQrDataUrl("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Compartir registro de tarjeta</DialogTitle>
            <DialogDescription>
              Tus clientes escanean este QR, llenan formulario y agregan su tarjeta a Google Wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex justify-center rounded-xl border border-border bg-card p-4">
              {shareQrDataUrl ? (
                <Image
                  src={shareQrDataUrl}
                  alt="QR de registro de cliente"
                  width={224}
                  height={224}
                  className="size-56 rounded-lg"
                />
              ) : (
                <div className="flex size-56 items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
                  Generando QR...
                </div>
              )}
            </div>
            <div className="rounded-lg border border-border bg-muted p-3 text-xs text-foreground/80 break-all font-mono">
              {shareUrl || "Sin enlace disponible"}
            </div>
          </div>
          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button type="button" variant="outline" className="gap-2" onClick={copyShareUrl}>
              <Copy className="size-4" aria-hidden />
              Copiar enlace
            </Button>
            <Button
              type="button"
              className="gap-2"
              onClick={() => {
                if (!shareUrl) return;
                window.open(shareUrl, "_blank", "noopener,noreferrer");
              }}
            >
              <ExternalLink className="size-4" aria-hidden />
              Abrir página
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
