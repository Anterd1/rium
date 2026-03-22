"use client";

import { ArrowRight, Gift, Percent, RotateCcw, Stamp, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CardType } from "@/lib/types";

type CardTypeOption = {
  type: CardType;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  label: string;
  description: string;
  walletNote: string;
  badge?: string;
};

const CARD_TYPES: CardTypeOption[] = [
  {
    type: "stamps",
    icon: Stamp,
    iconColor: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-50 dark:bg-blue-950/50",
    label: "Tarjeta de Sellos",
    description:
      "Tus clientes acumulan sellos por cada compra y reciben una recompensa al completar la meta.",
    walletNote: "Google Loyalty · Apple StoreCard",
    badge: "Más popular",
  },
  {
    type: "cashback",
    icon: RotateCcw,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/50",
    label: "Cashback",
    description:
      "Regresa un porcentaje del gasto en cada compra. Define niveles y porcentajes de reembolso.",
    walletNote: "Google Loyalty · Apple StoreCard",
  },
  {
    type: "coupon",
    icon: Tag,
    iconColor: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-50 dark:bg-violet-950/50",
    label: "Cupón",
    description:
      "Ofrece un descuento de una sola vez con código o QR. Ideal para campañas y lanzamientos.",
    walletNote: "Google Offer · Apple Coupon",
  },
  {
    type: "gift_card",
    icon: Gift,
    iconColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-50 dark:bg-amber-950/50",
    label: "Tarjeta de Regalo",
    description:
      "Tarjeta con saldo preestablecido para que tus clientes o regalos rediman en tu negocio.",
    walletNote: "Google GiftCard · Apple StoreCard",
  },
  {
    type: "discount",
    icon: Percent,
    iconColor: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-50 dark:bg-rose-950/50",
    label: "Descuento",
    description:
      "Descuento permanente o por temporada vinculado a la tarjeta del cliente en Wallet.",
    walletNote: "Google Offer · Apple Coupon",
  },
];

type Props = {
  atLimit: boolean;
  maxCards: number;
  planKey: string;
  onSelect: (type: CardType) => void;
};

export function CardTypePicker({ atLimit, maxCards, planKey, onSelect }: Props) {
  return (
    <div className="space-y-4">
      {atLimit && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          Has alcanzado el límite de {maxCards} tarjeta{maxCards !== 1 ? "s" : ""} del plan{" "}
          <span className="font-semibold capitalize">{planKey}</span>. Actualiza tu plan para
          continuar.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CARD_TYPES.map((opt) => (
          <button
            key={opt.type}
            type="button"
            disabled={atLimit}
            onClick={() => onSelect(opt.type)}
            className={cn(
              "group relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 text-left",
              "shadow-sm transition-all duration-150",
              "hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:pointer-events-none disabled:opacity-40"
            )}
          >
            {opt.badge && (
              <span className="absolute right-4 top-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                {opt.badge}
              </span>
            )}

            <div
              className={cn(
                "flex size-11 items-center justify-center rounded-xl",
                opt.iconBg
              )}
            >
              <opt.icon className={cn("size-5", opt.iconColor)} strokeWidth={1.75} />
            </div>

            <div className="flex-1 space-y-1.5">
              <p className="font-semibold text-foreground">{opt.label}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {opt.description}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground/70">
                {opt.walletNote}
              </span>
              <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
