"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Gift,
  Loader2,
  Minus,
  Plus,
  Stamp,
} from "lucide-react";
import { toast } from "sonner";

import type { CardType } from "@/lib/types";

type ScanData = {
  customerCard: { id: string; purchases: number; gift_available: boolean };
  customer: { id: string; name: string; email: string; phone: string | null };
  card: {
    id: string;
    name: string;
    type: CardType;
    target_purchases: number;
    reward_description: string;
    config: Record<string, unknown>;
    design: { program_name: string; bg_color: string; text_color: string; stamp_icon: string };
  };
};

export function CardAction({ data }: { data: ScanData }) {
  const router = useRouter();
  const { customerCard, customer, card } = data;

  const [quantity, setQuantity] = useState(1);
  const [amount, setAmount]     = useState("");
  const [note]                  = useState("");
  const [loading, setLoading]   = useState(false);
  const [confirm, setConfirm]   = useState(false);
  const [result, setResult]     = useState<"stamped" | "redeemed" | null>(null);
  const [updatedCard, setUpdatedCard] = useState(customerCard);

  const target   = card.target_purchases || 1;
  const stamps   = updatedCard.purchases;
  const missing  = Math.max(0, target - stamps);
  const hasGift  = updatedCard.gift_available;

  async function stamp() {
    setLoading(true);
    try {
      const res = await fetch("/api/operator/stamp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_card_id: customerCard.id,
          quantity,
          amount: amount ? parseFloat(amount) : undefined,
          note: note || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "No se pudo registrar");
        return;
      }
      setUpdatedCard(json.customer_card);
      setResult("stamped");
      setConfirm(false);
    } finally {
      setLoading(false);
    }
  }

  async function redeem() {
    setLoading(true);
    try {
      const res = await fetch("/api/operator/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_card_id: customerCard.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error ?? "No se pudo canjear");
        return;
      }
      setUpdatedCard((prev) => ({ ...prev, gift_available: false }));
      setResult("redeemed");
      setConfirm(false);
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <SuccessScreen
        type={result}
        reward={card.reward_description}
        stamped={quantity}
        onDone={() => router.push("/escanear")}
        stampIcon={card.design.stamp_icon}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0f172a]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-5">
        <button
          onClick={() => router.push("/escanear")}
          className="flex size-9 items-center justify-center rounded-full border border-white/10 text-white/60 transition-colors hover:border-white/20 hover:text-white"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{customer.name}</p>
          <p className="truncate text-xs text-white/40">{customer.email}</p>
        </div>
      </div>

      {/* Card type badge */}
      <div className="px-4">
        <div
          className="relative overflow-hidden rounded-2xl p-5 shadow-xl"
          style={{ backgroundColor: card.design.bg_color }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest"
             style={{ color: card.design.text_color, opacity: 0.6 }}>
            {card.name}
          </p>
          <p className="mt-1 text-2xl font-bold" style={{ color: card.design.text_color }}>
            {card.design.program_name}
          </p>

          {/* Stamps / loyalty progress */}
          {["stamps", "loyalty"].includes(card.type) && (
            <div className="mt-4">
              <StampGrid
                total={target}
                filled={stamps}
                icon={card.design.stamp_icon}
                color={card.design.text_color}
              />
              <p className="mt-3 text-xs font-medium" style={{ color: card.design.text_color, opacity: 0.7 }}>
                {hasGift ? "¡Recompensa disponible!" : `${missing} sello${missing !== 1 ? "s" : ""} para la recompensa`}
              </p>
            </div>
          )}

          {/* Cashback */}
          {card.type === "cashback" && (
            <p className="mt-3 text-lg font-semibold" style={{ color: card.design.text_color }}>
              {stamps} compras registradas
            </p>
          )}

          {/* Coupon / discount */}
          {["coupon", "discount"].includes(card.type) && (
            <div className="mt-3">
              {card.config.discount_value ? (
                <p className="text-xl font-bold" style={{ color: card.design.text_color }}>
                  {card.config.discount_type === "pct"
                    ? `${card.config.discount_value}% descuento`
                    : `$${card.config.discount_value} descuento`}
                </p>
              ) : null}
              {card.config.promo_code ? (
                <p className="mt-1 font-mono text-sm" style={{ color: card.design.text_color, opacity: 0.8 }}>
                  Código: {String(card.config.promo_code)}
                </p>
              ) : null}
              {hasGift && (
                <p className="mt-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium"
                   style={{ color: card.design.text_color }}>
                  Ya canjeado
                </p>
              )}
            </div>
          )}

          {/* Gift card */}
          {card.type === "gift_card" && (
            <p className="mt-3 text-lg font-semibold" style={{ color: card.design.text_color }}>
              Tarjeta de regalo
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex-1 space-y-3 px-4">

        {/* Stamps / Loyalty */}
        {["stamps", "loyalty"].includes(card.type) && (
          <>
            {/* Quantity picker */}
            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-5 py-4">
              <span className="text-sm text-white/60">Cantidad de sellos</span>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-6 text-center text-lg font-semibold text-white">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => Math.min(target, q + 1))}
                  className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/15"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Amount (optional) */}
            <div className="rounded-2xl bg-white/5 px-5 py-4">
              <label className="mb-2 block text-xs text-white/40">Monto de compra (opcional)</label>
              <div className="flex items-center gap-2">
                <span className="text-white/40">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-transparent text-lg font-semibold text-white placeholder:text-white/20 focus:outline-none"
                />
                <span className="text-xs text-white/30">MXN</span>
              </div>
            </div>

            <button
              onClick={() => setConfirm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#3b82f6] py-4 text-base font-semibold text-white transition-all hover:bg-[#2563eb] active:scale-[0.98]"
            >
              <Stamp className="size-5" />
              Sellar {quantity > 1 ? `${quantity} sellos` : "1 sello"}
            </button>

            {hasGift && (
              <button
                onClick={() => redeem()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-4 text-base font-semibold text-white transition-all hover:bg-amber-400 active:scale-[0.98]"
              >
                {loading ? <Loader2 className="size-5 animate-spin" /> : <Gift className="size-5" />}
                Canjear recompensa
              </button>
            )}
          </>
        )}

        {/* Cashback */}
        {card.type === "cashback" && (
          <>
            <div className="rounded-2xl bg-white/5 px-5 py-4">
              <label className="mb-2 block text-xs text-white/40">Monto de compra *</label>
              <div className="flex items-center gap-2">
                <span className="text-white/40">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-transparent text-2xl font-bold text-white placeholder:text-white/20 focus:outline-none"
                />
                <span className="text-sm text-white/30">MXN</span>
              </div>
            </div>
            <button
              onClick={() => setConfirm(true)}
              disabled={!amount || parseFloat(amount) <= 0}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#3b82f6] py-4 text-base font-semibold text-white transition-all hover:bg-[#2563eb] active:scale-[0.98] disabled:opacity-40"
            >
              <Stamp className="size-5" />
              Registrar compra
            </button>
          </>
        )}

        {/* Coupon / Discount */}
        {["coupon", "discount"].includes(card.type) && (
          <button
            onClick={() => redeem()}
            disabled={hasGift || loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-base font-semibold text-white transition-all hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-40"
          >
            {loading ? <Loader2 className="size-5 animate-spin" /> : <Gift className="size-5" />}
            {hasGift ? "Ya fue canjeado" : "Canjear cupón"}
          </button>
        )}

        {/* Gift Card */}
        {card.type === "gift_card" && (
          <>
            <div className="rounded-2xl bg-white/5 px-5 py-4">
              <label className="mb-2 block text-xs text-white/40">Monto a cobrar *</label>
              <div className="flex items-center gap-2">
                <span className="text-white/40">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-transparent text-2xl font-bold text-white placeholder:text-white/20 focus:outline-none"
                />
                <span className="text-sm text-white/30">MXN</span>
              </div>
            </div>
            <button
              onClick={() => setConfirm(true)}
              disabled={!amount || parseFloat(amount) <= 0}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#3b82f6] py-4 text-base font-semibold text-white transition-all hover:bg-[#2563eb] active:scale-[0.98] disabled:opacity-40"
            >
              Cobrar saldo
            </button>
          </>
        )}
      </div>

      {/* Confirm dialog */}
      {confirm && (
        <ConfirmDialog
          label={["stamps", "loyalty"].includes(card.type)
            ? `Se le darán ${quantity} sello${quantity !== 1 ? "s" : ""} a ${customer.name}.`
            : `Se registrará la compra de $${amount} MXN para ${customer.name}.`}
          amount={amount}
          onCancel={() => setConfirm(false)}
          onAccept={stamp}
          loading={loading}
        />
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StampGrid({ total, filled, icon, color }: {
  total: number; filled: number; icon: string; color: string;
}) {
  const capped = Math.min(total, 30);
  const cols = Math.min(capped, 5);
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 36px)`, gap: 6 }}>
        {Array.from({ length: capped }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18,
              backgroundColor: i < filled ? `${color}30` : "rgba(255,255,255,0.08)",
              opacity: i < filled ? 1 : 0.45,
              border: i < filled ? `1.5px solid ${color}60` : "1.5px solid rgba(255,255,255,0.12)",
            }}
          >
            {icon}
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfirmDialog({ label, amount, onCancel, onAccept, loading }: {
  label: string;
  amount: string;
  onCancel: () => void;
  onAccept: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
         style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}>
      <div className="w-full max-w-sm rounded-t-3xl bg-[#1e293b] p-6 sm:rounded-3xl">
        <h3 className="text-lg font-semibold text-white">¿Estás seguro?</h3>
        <p className="mt-2 text-sm text-white/60">{label}</p>

        {amount && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs text-white/40">Monto de compra</p>
            <p className="mt-0.5 text-xl font-semibold text-white">${parseFloat(amount).toFixed(2)} MXN</p>
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-medium text-white/70 transition-colors hover:border-white/20"
          >
            Cancelar
          </button>
          <button
            onClick={onAccept}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#3b82f6] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2563eb]"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessScreen({ type, reward, stamped, onDone, stampIcon }: {
  type: "stamped" | "redeemed";
  reward: string;
  stamped: number;
  onDone: () => void;
  stampIcon: string;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0f172a] px-6 text-center">
      <div className="flex size-24 items-center justify-center rounded-full bg-emerald-500/15 text-5xl">
        {type === "stamped" ? stampIcon : "🎁"}
      </div>

      <h2 className="mt-6 text-2xl font-bold text-white">
        {type === "stamped"
          ? `${stamped} sello${stamped !== 1 ? "s" : ""} otorgado${stamped !== 1 ? "s" : ""}`
          : "¡Recompensa canjeada!"}
      </h2>

      {type === "redeemed" && reward && (
        <p className="mt-2 text-base text-white/60">{reward}</p>
      )}

      <button
        onClick={onDone}
        className="mt-10 flex items-center gap-2 rounded-2xl bg-[#3b82f6] px-8 py-4 text-base font-semibold text-white transition-all hover:bg-[#2563eb]"
      >
        Escanear otro cliente
      </button>
    </div>
  );
}
