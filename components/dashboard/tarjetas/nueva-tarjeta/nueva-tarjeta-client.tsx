"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { CardTypePicker } from "./card-type-picker";
import { CardConfigForm } from "./card-config-form";
import type { CardType } from "@/lib/types";

type Props = {
  planKey: string;
  maxCards: number;
  currentCount: number;
  businessLogoUrl: string | null;
};

export function NuevaTarjetaClient({
  planKey,
  maxCards,
  currentCount,
  businessLogoUrl,
}: Props) {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<CardType | null>(null);
  const [saving, setSaving] = useState(false);

  const atLimit = currentCount >= maxCards;

  async function handleSave(data: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: selectedType, ...data }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        card?: { id: string };
      };
      if (!res.ok) {
        toast.error(body.error ?? "No se pudo crear la tarjeta.");
        return;
      }
      toast.success("Tarjeta creada con éxito.");
      router.push(body.card?.id ? `/dashboard/tarjetas/${body.card.id}?nuevo=1` : "/dashboard/tarjetas");
      router.refresh();
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/tarjetas"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Nueva tarjeta
          </h2>
          <p className="text-sm text-muted-foreground">
            {selectedType === null
              ? "Elige el tipo de programa para tus clientes"
              : "Personaliza tu tarjeta para Google Wallet y Apple Wallet"}
          </p>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-xs">
        <StepDot active={selectedType === null} done={selectedType !== null} label="1. Tipo" />
        <div className="h-px flex-1 bg-border" />
        <StepDot active={selectedType !== null} done={false} label="2. Configuración" />
      </div>

      {/* Content */}
      {selectedType === null ? (
        <CardTypePicker
          atLimit={atLimit}
          maxCards={maxCards}
          planKey={planKey}
          onSelect={setSelectedType}
        />
      ) : (
        <CardConfigForm
          type={selectedType}
          businessLogoUrl={businessLogoUrl}
          saving={saving}
          onBack={() => setSelectedType(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function StepDot({
  active,
  done,
  label,
}: {
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <span
      className={`font-medium transition-colors ${
        active
          ? "text-foreground"
          : done
          ? "text-primary"
          : "text-muted-foreground"
      }`}
    >
      {label}
    </span>
  );
}
