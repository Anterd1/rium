"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Copy, ExternalLink, Gift, Link2, Mail, Phone, QrCode, ShoppingBag, User } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { Card as CardModel, CustomerDetailData } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Branch } from "@/lib/types";

type CustomerDetailProps = {
  customer: CustomerDetailData;
  branches: Branch[];
  availableCards: CardModel[];
};

const NONE_BRANCH = "__none__";

export function CustomerDetail({ customer, branches, availableCards }: CustomerDetailProps) {
  const router = useRouter();
  const cards = useMemo(() => customer.customer_cards ?? [], [customer.customer_cards]);

  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [purchaseCardId, setPurchaseCardId] = useState(
    cards[0]?.id ?? ""
  );
  const [redeemCardId, setRedeemCardId] = useState("");
  const [purchaseBranch, setPurchaseBranch] = useState<string>(NONE_BRANCH);
  const [redeemBranch, setRedeemBranch] = useState<string>(NONE_BRANCH);
  const [loadingPurchase, setLoadingPurchase] = useState(false);
  const [loadingRedeem, setLoadingRedeem] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignCardId, setAssignCardId] = useState("");
  const [assignBranchId, setAssignBranchId] = useState<string>(NONE_BRANCH);
  const [assigning, setAssigning] = useState(false);
  const [issuingWalletCardId, setIssuingWalletCardId] = useState<string | null>(null);
  const [walletDialogOpen, setWalletDialogOpen] = useState(false);
  const [walletLink, setWalletLink] = useState("");
  const [walletQrDataUrl, setWalletQrDataUrl] = useState("");

  const giftCards = useMemo(
    () => cards.filter((c) => c.gift_available),
    [cards]
  );

  const timeline = useMemo(() => {
    type Row = {
      id: string;
      at: string;
      kind: "purchase" | "redemption";
      cardLabel: string;
    };
    const out: Row[] = [];
    for (const cc of cards) {
      const label = cc.card?.name ?? "Tarjeta";
      for (const p of cc.purchases ?? []) {
        out.push({
          id: `p-${p.id}`,
          at: p.created_at,
          kind: "purchase",
          cardLabel: label,
        });
      }
      for (const r of cc.redemptions ?? []) {
        out.push({
          id: `r-${r.id}`,
          at: r.created_at,
          kind: "redemption",
          cardLabel: label,
        });
      }
    }
    out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return out;
  }, [cards]);

  const openPurchaseDialog = () => {
    setPurchaseCardId(cards[0]?.id ?? "");
    setPurchaseBranch(NONE_BRANCH);
    setPurchaseOpen(true);
  };

  const openRedeemDialog = () => {
    const first = giftCards[0];
    setRedeemCardId(first?.id ?? "");
    setRedeemBranch(NONE_BRANCH);
    setRedeemOpen(true);
  };

  const branchPayload = (v: string) =>
    v === NONE_BRANCH || !v ? null : v;

  const registerPurchase = async () => {
    if (!purchaseCardId) {
      toast.error("Selecciona una tarjeta");
      return;
    }
    setLoadingPurchase(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_card_id: purchaseCardId,
          branch_id: branchPayload(purchaseBranch),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "No se registró la compra");
        return;
      }
      toast.success("Compra registrada");
      setPurchaseOpen(false);
      router.refresh();
    } finally {
      setLoadingPurchase(false);
    }
  };

  const redeemGift = async () => {
    if (!redeemCardId) {
      toast.error("Selecciona una tarjeta con regalo disponible");
      return;
    }
    setLoadingRedeem(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_card_id: redeemCardId,
          branch_id: branchPayload(redeemBranch),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "No se pudo canjear");
        return;
      }
      toast.success("Canje registrado");
      setRedeemOpen(false);
      router.refresh();
    } finally {
      setLoadingRedeem(false);
    }
  };

  const anyGift = giftCards.length > 0;
  const assignedCardIds = useMemo(() => new Set(cards.map((c) => c.card_id)), [cards]);
  const unassignedCards = useMemo(
    () => availableCards.filter((c) => !assignedCardIds.has(c.id)),
    [availableCards, assignedCardIds]
  );

  useEffect(() => {
    let active = true;
    async function makeQr() {
      if (!walletDialogOpen || !walletLink) {
        if (active) setWalletQrDataUrl("");
        return;
      }
      try {
        const QRCode = (await import("qrcode")).default;
        const dataUrl = await QRCode.toDataURL(walletLink, {
          width: 320,
          margin: 1,
        });
        if (active) setWalletQrDataUrl(dataUrl);
      } catch {
        if (active) setWalletQrDataUrl("");
      }
    }
    void makeQr();
    return () => {
      active = false;
    };
  }, [walletDialogOpen, walletLink]);

  const issueWalletPass = async (customerCardId: string, cardId: string) => {
    setIssuingWalletCardId(customerCardId);
    try {
      const classRes = await fetch("/api/wallet/google/class", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: cardId }),
      });
      const classData = await classRes.json().catch(() => ({}));
      if (!classRes.ok) {
        toast.error(
          typeof classData.error === "string"
            ? classData.error
            : "No se pudo preparar la tarjeta para Google Wallet"
        );
        return;
      }

      const passRes = await fetch("/api/wallet/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_card_id: customerCardId }),
      });
      const passData = await passRes.json().catch(() => ({}));
      if (!passRes.ok) {
        toast.error(
          typeof passData.error === "string"
            ? passData.error
            : "No se pudo generar el pase de Google Wallet"
        );
        return;
      }

      const link = typeof passData.saveLink === "string" ? passData.saveLink : "";
      if (!link) {
        toast.error("Se generó el pase pero no llegó el enlace para compartir");
        return;
      }

      setWalletLink(link);
      setWalletDialogOpen(true);
      toast.success("Enlace de Google Wallet generado");
      router.refresh();
    } finally {
      setIssuingWalletCardId(null);
    }
  };

  const copyWalletLink = async () => {
    if (!walletLink) return;
    try {
      await navigator.clipboard.writeText(walletLink);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  const openAssignDialog = () => {
    if (unassignedCards.length === 0) {
      toast.message("Este cliente ya tiene todas las tarjetas activas asignadas");
      return;
    }
    setAssignCardId(unassignedCards[0]?.id ?? "");
    setAssignBranchId(NONE_BRANCH);
    setAssignOpen(true);
  };

  const assignCard = async () => {
    if (!assignCardId) {
      toast.error("Selecciona una tarjeta");
      return;
    }
    setAssigning(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}/assign-card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: assignCardId,
          branch_id: assignBranchId === NONE_BRANCH ? null : assignBranchId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "No se pudo asignar la tarjeta");
        return;
      }
      if (data.already_assigned) {
        toast.message("La tarjeta ya estaba asignada");
      } else {
        toast.success("Tarjeta asignada al cliente");
      }
      setAssignOpen(false);
      router.refresh();
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {customer.name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Detalle del cliente y actividad.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={openAssignDialog}
            disabled={unassignedCards.length === 0}
          >
            <Link2 className="size-4" strokeWidth={1.75} aria-hidden />
            Asignar tarjeta
          </Button>
          <Button
            type="button"
            variant="default"
            className="gap-2"
            disabled={cards.length === 0}
            onClick={openPurchaseDialog}
          >
            <ShoppingBag className="size-4" strokeWidth={1.75} aria-hidden />
            Registrar compra
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="gap-2"
            disabled={!anyGift}
            onClick={openRedeemDialog}
          >
            <Gift className="size-4" strokeWidth={1.75} aria-hidden />
            Canjear regalo
          </Button>
        </div>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-base">Datos de contacto</CardTitle>
          <CardDescription>Información principal del cliente.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 pt-4 sm:grid-cols-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-muted p-2 text-muted-foreground">
              <User className="size-4" strokeWidth={1.75} aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Nombre
              </p>
              <p className="text-sm font-medium text-foreground">{customer.name}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-muted p-2 text-muted-foreground">
              <Mail className="size-4" strokeWidth={1.75} aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Correo
              </p>
              <p className="text-sm font-medium text-foreground">{customer.email}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-muted p-2 text-muted-foreground">
              <Phone className="size-4" strokeWidth={1.75} aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Teléfono
              </p>
              <p className="text-sm font-medium text-foreground">
                {customer.phone ?? "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Tarjetas de lealtad</h3>
          <p className="text-sm text-muted-foreground">
            Progreso hacia la recompensa de cada programa.
          </p>
        </div>
        {cards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-10 text-center text-sm text-muted-foreground">
            Este cliente aún no tiene tarjetas asignadas.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {cards.map((cc) => {
              const target = cc.card?.target_purchases ?? 0;
              const pct =
                target > 0
                  ? Math.min(100, Math.round((cc.purchases / target) * 100))
                  : 0;
              return (
                <Card key={cc.id} className="border shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">
                        {cc.card?.name ?? "Tarjeta"}
                      </CardTitle>
                      {cc.gift_available ? (
                        <Badge variant="secondary" className="shrink-0">
                          Regalo listo
                        </Badge>
                      ) : null}
                    </div>
                    {cc.card?.reward_description ? (
                      <CardDescription>{cc.card.reward_description}</CardDescription>
                    ) : null}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Progress
                      value={target > 0 ? pct : null}
                      className="flex-col items-stretch gap-2"
                    >
                      <div className="flex w-full items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground">Progreso</span>
                        <span className="font-medium tabular-nums text-foreground/80">
                          {cc.purchases} / {target > 0 ? target : "—"}
                        </span>
                      </div>
                    </Progress>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        disabled={!cc.card?.id || issuingWalletCardId === cc.id}
                        onClick={() =>
                          cc.card?.id ? issueWalletPass(cc.id, cc.card.id) : undefined
                        }
                      >
                        <QrCode className="size-4" strokeWidth={1.75} aria-hidden />
                        {issuingWalletCardId === cc.id
                          ? "Generando..."
                          : cc.wallet_save_link
                            ? "Actualizar QR Wallet"
                            : "Generar QR Wallet"}
                      </Button>
                      {cc.wallet_save_link ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="gap-2"
                          onClick={() => {
                            setWalletLink(cc.wallet_save_link ?? "");
                            setWalletDialogOpen(true);
                          }}
                        >
                          <ExternalLink className="size-4" strokeWidth={1.75} aria-hidden />
                          Ver QR / Enlace
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Historial</h3>
          <p className="text-sm text-muted-foreground">Compras y canjes ordenados por fecha.</p>
        </div>
        {timeline.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Sin movimientos todavía.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Tarjeta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timeline.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {format(new Date(ev.at), "dd/MM/yyyy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={ev.kind === "purchase" ? "outline" : "secondary"}
                        className={cn(
                          ev.kind === "purchase" && "border-emerald-200 text-emerald-800 dark:border-emerald-800 dark:text-emerald-300"
                        )}
                      >
                        {ev.kind === "purchase" ? "Compra" : "Canje"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{ev.cardLabel}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar compra</DialogTitle>
            <DialogDescription>
              Suma una compra al contador de la tarjeta seleccionada.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Tarjeta</Label>
              <Select
                value={purchaseCardId}
                onValueChange={(v) => setPurchaseCardId(v ?? "")}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cards.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.card?.name ?? "Tarjeta"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {branches.length > 0 ? (
              <div className="grid gap-2">
                <Label>Sucursal (opcional)</Label>
                <Select
                  value={purchaseBranch}
                  onValueChange={(v) => setPurchaseBranch(v ?? NONE_BRANCH)}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_BRANCH}>Sin sucursal</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setPurchaseOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={registerPurchase} disabled={loadingPurchase}>
              {loadingPurchase ? "Guardando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={redeemOpen} onOpenChange={setRedeemOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Canjear regalo</DialogTitle>
            <DialogDescription>
              Marca el regalo como entregado para la tarjeta indicada.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Tarjeta con regalo</Label>
              <Select
                value={redeemCardId}
                onValueChange={(v) => setRedeemCardId(v ?? "")}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {giftCards.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.card?.name ?? "Tarjeta"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {branches.length > 0 ? (
              <div className="grid gap-2">
                <Label>Sucursal (opcional)</Label>
                <Select
                  value={redeemBranch}
                  onValueChange={(v) => setRedeemBranch(v ?? NONE_BRANCH)}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_BRANCH}>Sin sucursal</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setRedeemOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={redeemGift} disabled={loadingRedeem}>
              {loadingRedeem ? "Procesando…" : "Confirmar canje"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={walletDialogOpen} onOpenChange={setWalletDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Compartir tarjeta digital</DialogTitle>
            <DialogDescription>
              Envía este QR o enlace al cliente para agregar la tarjeta a Google Wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex justify-center rounded-xl border border-border bg-card p-4">
              {walletQrDataUrl ? (
                <Image
                  src={walletQrDataUrl}
                  alt="QR para agregar a Google Wallet"
                  className="size-56 rounded-lg"
                  width={224}
                  height={224}
                />
              ) : (
                <div className="flex size-56 items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
                  Generando QR...
                </div>
              )}
            </div>
            <div className="rounded-lg border border-border bg-muted p-3 text-xs text-foreground/80 break-all font-mono">
              {walletLink || "Sin enlace disponible"}
            </div>
          </div>
          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button type="button" variant="outline" className="gap-2" onClick={copyWalletLink}>
              <Copy className="size-4" strokeWidth={1.75} aria-hidden />
              Copiar enlace
            </Button>
            <Button
              type="button"
              className="gap-2"
              onClick={() => {
                if (!walletLink) return;
                window.open(walletLink, "_blank", "noopener,noreferrer");
              }}
            >
              <ExternalLink className="size-4" strokeWidth={1.75} aria-hidden />
              Abrir enlace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar tarjeta al cliente</DialogTitle>
            <DialogDescription>
              Selecciona una tarjeta activa para este cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Tarjeta</Label>
              <Select value={assignCardId} onValueChange={(v) => setAssignCardId(v ?? "")}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {unassignedCards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {branches.length > 0 ? (
              <div className="grid gap-2">
                <Label>Sucursal inicial (opcional)</Label>
                <Select value={assignBranchId} onValueChange={(v) => setAssignBranchId(v ?? NONE_BRANCH)}>
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_BRANCH}>Sin sucursal</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
          <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={assignCard} disabled={assigning}>
              {assigning ? "Asignando..." : "Asignar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
