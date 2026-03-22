"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Card } from "@/lib/types";

export type CardFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card?: Card;
  onSuccess: () => void;
};

const defaultDesign = {
  bg_color: "#0f172a",
  text_color: "#f8fafc",
  program_name: "",
};

export function CardFormDialog({
  open,
  onOpenChange,
  card,
  onSuccess,
}: CardFormDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"loyalty" | "event">("loyalty");
  const [targetPurchases, setTargetPurchases] = useState(5);
  const [rewardDescription, setRewardDescription] = useState("");
  const [bgColor, setBgColor] = useState(defaultDesign.bg_color);
  const [textColor, setTextColor] = useState(defaultDesign.text_color);
  const [programName, setProgramName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (card) {
      setName(card.name);
      setType(card.type);
      setTargetPurchases(card.target_purchases);
      setRewardDescription(card.reward_description);
      setBgColor(card.design.bg_color);
      setTextColor(card.design.text_color);
      setProgramName(card.design.program_name);
    } else {
      setName("");
      setType("loyalty");
      setTargetPurchases(5);
      setRewardDescription("");
      setBgColor(defaultDesign.bg_color);
      setTextColor(defaultDesign.text_color);
      setProgramName("");
    }
  }, [open, card]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("El nombre es obligatorio.");
      return;
    }
    const n = Number(targetPurchases);
    if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
      toast.error("La meta de compras debe ser un entero mayor o igual a 1.");
      return;
    }

    const payload = {
      name: trimmedName,
      type,
      target_purchases: n,
      reward_description: rewardDescription.trim(),
      design: {
        bg_color: bgColor,
        text_color: textColor,
        program_name: programName.trim(),
      },
    };

    setLoading(true);
    try {
      const url = card ? `/api/cards/${card.id}` : "/api/cards";
      const res = await fetch(url, {
        method: card ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!res.ok) {
        toast.error(
          typeof body.error === "string" ? body.error : "No se pudo guardar la tarjeta."
        );
        return;
      }

      toast.success(card ? "Tarjeta actualizada." : "Tarjeta creada.");
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{card ? "Editar tarjeta" : "Nueva tarjeta"}</DialogTitle>
            <DialogDescription>
              Define el programa, la recompensa y los colores que verán tus clientes en la cartera.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="card-name">Nombre</Label>
              <Input
                id="card-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Café recompensa"
                disabled={loading}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  if (v === "loyalty" || v === "event") setType(v);
                }}
                disabled={loading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="loyalty">Lealtad</SelectItem>
                  <SelectItem value="event">Evento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="target-purchases">Meta de compras</Label>
              <Input
                id="target-purchases"
                type="number"
                min={1}
                step={1}
                value={targetPurchases}
                onChange={(e) => setTargetPurchases(Number(e.target.value))}
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reward-desc">Descripción de la recompensa</Label>
              <Textarea
                id="reward-desc"
                value={rewardDescription}
                onChange={(e) => setRewardDescription(e.target.value)}
                placeholder="Ej. Café de cortesía al completar la tarjeta"
                disabled={loading}
                rows={3}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="bg-color">Color de fondo</Label>
                <div className="flex gap-2">
                  <Input
                    id="bg-color"
                    type="color"
                    className="h-10 w-14 cursor-pointer px-1 py-1"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    disabled={loading}
                  />
                  <Input
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    disabled={loading}
                    className="min-w-0 flex-1 font-mono text-xs"
                    placeholder="#0f172a"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="text-color">Color de texto</Label>
                <div className="flex gap-2">
                  <Input
                    id="text-color"
                    type="color"
                    className="h-10 w-14 cursor-pointer px-1 py-1"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    disabled={loading}
                  />
                  <Input
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    disabled={loading}
                    className="min-w-0 flex-1 font-mono text-xs"
                    placeholder="#f8fafc"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="program-name">Nombre del programa</Label>
              <Input
                id="program-name"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="Ej. Rium Rewards"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando…" : card ? "Guardar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
