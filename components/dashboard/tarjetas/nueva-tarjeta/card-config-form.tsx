"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Info,
  Plus,
  Trash2,
} from "lucide-react";

import { CardPreview } from "@/components/dashboard/tarjetas/card-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  CARD_TYPE_LABELS,
  type BarcodeType,
  type CardType,
  type CashbackLevel,
  type DiscountValueType,
  type RedemptionChannel,
  type ValidityType,
} from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type DesignState = {
  program_name: string;
  bg_color: string;
  text_color: string;
  label_color: string;
  barcode_type: BarcodeType;
  fine_print: string;
  homepage_url: string;
  stamp_icon: string;
};

type ConfigState = {
  // Stamps / Loyalty
  target_purchases: number;
  reward_description: string;
  // Coupon / Discount
  discount_type: DiscountValueType;
  discount_value: string;
  promo_code: string;
  redemption_channel: RedemptionChannel;
  // Cashback
  cashback_levels: CashbackLevel[];
  // Gift Card
  initial_balance: string;
  currency: string;
  has_pin: boolean;
  // Shared
  validity_type: ValidityType;
  validity_value: string;
  quantity_limited: boolean;
  quantity_max: string;
};

type Props = {
  type: CardType;
  businessLogoUrl: string | null;
  saving: boolean;
  onBack: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
};

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_PALETTES: Record<CardType, { bg: string; text: string; label: string }> = {
  stamps:   { bg: "#1e3a5f", text: "#ffffff", label: "#93c5fd" },
  cashback: { bg: "#064e3b", text: "#ffffff", label: "#6ee7b7" },
  coupon:   { bg: "#4c1d95", text: "#ffffff", label: "#c4b5fd" },
  gift_card:{ bg: "#7c2d12", text: "#ffffff", label: "#fdba74" },
  discount: { bg: "#881337", text: "#ffffff", label: "#fda4af" },
  loyalty:  { bg: "#0f172a", text: "#f8fafc", label: "#94a3b8" },
  event:    { bg: "#0f172a", text: "#f8fafc", label: "#94a3b8" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CardConfigForm({ type, businessLogoUrl, saving, onBack, onSave }: Props) {
  const palette = DEFAULT_PALETTES[type];
  const [name, setName] = useState("");

  const [design, setDesign] = useState<DesignState>({
    program_name: "",
    bg_color: palette.bg,
    text_color: palette.text,
    label_color: palette.label,
    barcode_type: "QR_CODE",
    fine_print: "",
    homepage_url: "",
    stamp_icon: "⭐",
  });

  const [config, setConfig] = useState<ConfigState>({
    target_purchases: 10,
    reward_description: "",
    discount_type: "pct",
    discount_value: "",
    promo_code: "",
    redemption_channel: "instore",
    cashback_levels: [{ name: "Nivel 1", spending_target: 500, cashback_pct: 5 }],
    initial_balance: "",
    currency: "MXN",
    has_pin: false,
    validity_type: "unlimited",
    validity_value: "",
    quantity_limited: false,
    quantity_max: "",
  });

  const [designOpen, setDesignOpen] = useState(true);
  const [walletOpen, setWalletOpen] = useState(false);

  const previewCard = {
    name: name || "Nombre de la tarjeta",
    type: type === "stamps" || type === "loyalty" ? ("loyalty" as const) : ("event" as const),
    target_purchases: config.target_purchases,
    reward_description: config.reward_description || "Descripción de recompensa",
    design: {
      bg_color: design.bg_color,
      text_color: design.text_color,
      label_color: design.label_color,
      logo_url: null,
      hero_url: null,
      program_name: design.program_name || name || "Mi Programa",
      barcode_type: design.barcode_type,
      fine_print: design.fine_print,
      homepage_url: design.homepage_url,
      stamp_icon: design.stamp_icon,
    },
    config: {},
  };

  function patchConfig(patch: Partial<ConfigState>) {
    setConfig((prev) => ({ ...prev, ...patch }));
  }

  function patchDesign(patch: Partial<DesignState>) {
    setDesign((prev) => ({ ...prev, ...patch }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const configPayload: Record<string, unknown> = {
      validity_type: config.validity_type,
      validity_value: config.validity_value || null,
      quantity_limited: config.quantity_limited,
      quantity_max: config.quantity_limited ? Number(config.quantity_max) || null : null,
    };

    if (type === "cashback") {
      configPayload.cashback_levels = config.cashback_levels;
    }
    if (type === "coupon" || type === "discount") {
      configPayload.discount_type = config.discount_type;
      configPayload.discount_value = parseFloat(config.discount_value) || 0;
      configPayload.promo_code = config.promo_code;
      configPayload.redemption_channel = config.redemption_channel;
    }
    if (type === "gift_card") {
      configPayload.initial_balance = parseFloat(config.initial_balance) || 0;
      configPayload.currency = config.currency;
      configPayload.has_pin = config.has_pin;
    }

    await onSave({
      name: name.trim(),
      target_purchases: config.target_purchases,
      reward_description: config.reward_description,
      design,
      config: configPayload,
    });
  }

  const isStamps = type === "stamps" || type === "loyalty";

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
      {/* Left: form */}
      <div className="space-y-5">
        {/* Back + type */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Cambiar tipo
          </button>
          <Badge variant="secondary" className="capitalize">
            {CARD_TYPE_LABELS[type]}
          </Badge>
        </div>

        {/* Basic info */}
        <Section title="Información básica">
          <Field label="Nombre de la tarjeta *">
            <Input
              required
              placeholder={`Ej. ${CARD_TYPE_LABELS[type]} Rium`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label='Nombre del programa (aparece en Wallet)'>
            <Input
              placeholder={name || "Mi Programa de Lealtad"}
              value={design.program_name}
              onChange={(e) => patchDesign({ program_name: e.target.value })}
            />
          </Field>
        </Section>

        {/* Type-specific config */}
        {isStamps && <StampsConfig config={config} patchConfig={patchConfig} design={design} patchDesign={patchDesign} />}
        {type === "cashback" && <CashbackConfig config={config} patchConfig={patchConfig} />}
        {(type === "coupon" || type === "discount") && (
          <CouponDiscountConfig type={type} config={config} patchConfig={patchConfig} />
        )}
        {type === "gift_card" && <GiftCardConfig config={config} patchConfig={patchConfig} />}

        {/* Validity & Quantity */}
        <Section title="Vigencia y disponibilidad">
          <Field label="Vigencia">
            <Select
              value={config.validity_type}
              onValueChange={(v) => patchConfig({ validity_type: v as ValidityType })}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unlimited">Ilimitada</SelectItem>
                <SelectItem value="fixed_date">Fecha fija de vencimiento</SelectItem>
                <SelectItem value="days_from_issue">Días a partir de la emisión</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {config.validity_type === "fixed_date" && (
            <Field label="Fecha de vencimiento">
              <Input
                type="date"
                value={config.validity_value as string}
                onChange={(e) => patchConfig({ validity_value: e.target.value })}
              />
            </Field>
          )}
          {config.validity_type === "days_from_issue" && (
            <Field label="Días de vigencia (desde la emisión)">
              <Input
                type="number"
                min={1}
                placeholder="365"
                value={config.validity_value as string}
                onChange={(e) => patchConfig({ validity_value: e.target.value })}
              />
            </Field>
          )}
          <Field label="Cantidad de tarjetas">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.quantity_limited}
                  onChange={(e) => patchConfig({ quantity_limited: e.target.checked })}
                  className="h-4 w-4 rounded border-border"
                />
                Limitar cantidad de tarjetas
              </label>
            </div>
            {config.quantity_limited && (
              <Input
                type="number"
                min={1}
                placeholder="Cantidad máxima"
                value={config.quantity_max}
                onChange={(e) => patchConfig({ quantity_max: e.target.value })}
                className="mt-2"
              />
            )}
          </Field>
        </Section>

        {/* Design */}
        <Collapsible
          title="Diseño visual"
          open={designOpen}
          onToggle={() => setDesignOpen((p) => !p)}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Color de fondo">
              <ColorInput
                value={design.bg_color}
                onChange={(v) => patchDesign({ bg_color: v })}
              />
            </Field>
            <Field label="Color del texto">
              <ColorInput
                value={design.text_color}
                onChange={(v) => patchDesign({ text_color: v })}
              />
            </Field>
            <Field label="Color de etiquetas">
              <ColorInput
                value={design.label_color}
                onChange={(v) => patchDesign({ label_color: v })}
              />
            </Field>
            <Field label="Tipo de código de barras">
              <Select
                value={design.barcode_type}
                onValueChange={(v) => patchDesign({ barcode_type: v as BarcodeType })}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QR_CODE">QR Code (recomendado)</SelectItem>
                  <SelectItem value="PDF_417">PDF-417 (Apple estándar)</SelectItem>
                  <SelectItem value="AZTEC">Aztec</SelectItem>
                  <SelectItem value="CODE_128">Code 128</SelectItem>
                  <SelectItem value="NONE">Sin código de barras</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </Collapsible>

        {/* Wallet advanced */}
        <Collapsible
          title="Propiedades avanzadas de Wallet"
          open={walletOpen}
          onToggle={() => setWalletOpen((p) => !p)}
          badge="Google & Apple"
        >
          <div className="space-y-4">
            <InfoBox>
              Estos campos se usan directamente en Google Wallet (
              <code className="text-[11px]">linksModuleData</code>,{" "}
              <code className="text-[11px]">fine_print</code>) y Apple Wallet (
              <code className="text-[11px]">backFields</code>).
            </InfoBox>
            <Field label="Sitio web (se muestra en la tarjeta)">
              <Input
                type="url"
                placeholder="https://tunegocio.com"
                value={design.homepage_url}
                onChange={(e) => patchDesign({ homepage_url: e.target.value })}
              />
            </Field>
            <Field label="Términos y condiciones / Letra pequeña">
              <textarea
                rows={3}
                placeholder="Ej. Válido únicamente en sucursales participantes. No acumulable con otras promociones."
                value={design.fine_print}
                onChange={(e) => patchDesign({ fine_print: e.target.value })}
                className={cn(
                  "w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm",
                  "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50",
                  "dark:bg-input/30"
                )}
              />
            </Field>
          </div>
        </Collapsible>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onBack}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? "Creando…" : "Crear tarjeta"}
          </Button>
        </div>
      </div>

      {/* Right: live preview */}
      <div className="lg:sticky lg:top-20 space-y-3 self-start">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Vista previa en tiempo real
        </p>
        <CardPreview
          card={previewCard}
          businessLogoUrl={businessLogoUrl}
          showToggle
        />
        <p className="text-center text-[11px] text-muted-foreground">
          Compatible con Google Wallet y Apple Wallet
        </p>
      </div>
    </form>
  );
}

// ─── Type-specific sub-forms ───────────────────────────────────────────────────

const STAMP_ICONS = [
  { emoji: "⭐", label: "Estrella" },
  { emoji: "☕", label: "Café" },
  { emoji: "🍕", label: "Pizza" },
  { emoji: "🍔", label: "Hamburguesa" },
  { emoji: "🌮", label: "Taco" },
  { emoji: "🍣", label: "Sushi" },
  { emoji: "🛍️", label: "Compras" },
  { emoji: "💎", label: "Diamante" },
  { emoji: "❤️", label: "Corazón" },
  { emoji: "🔥", label: "Fuego" },
  { emoji: "🎁", label: "Regalo" },
  { emoji: "✂️", label: "Tijeras" },
  { emoji: "💅", label: "Belleza" },
  { emoji: "🏋️", label: "Gym" },
  { emoji: "🎯", label: "Diana" },
  { emoji: "🌟", label: "Brillante" },
];

function StampsConfig({
  config,
  patchConfig,
  design,
  patchDesign,
}: {
  config: ConfigState;
  patchConfig: (p: Partial<ConfigState>) => void;
  design: DesignState;
  patchDesign: (p: Partial<DesignState>) => void;
}) {
  return (
    <Section title="Programa de sellos">
      <Field label="Sellos necesarios para la recompensa *">
        <Input
          type="number"
          min={1}
          max={50}
          required
          value={config.target_purchases}
          onChange={(e) => patchConfig({ target_purchases: Number(e.target.value) })}
        />
      </Field>
      <Field label="Descripción de la recompensa">
        <Input
          placeholder="Ej. Un café gratis al completar 10 sellos"
          value={config.reward_description}
          onChange={(e) => patchConfig({ reward_description: e.target.value })}
        />
      </Field>

      <Field label="Ícono del sello">
        <div className="flex flex-wrap gap-2">
          {STAMP_ICONS.map(({ emoji, label }) => (
            <button
              key={emoji}
              type="button"
              title={label}
              onClick={() => patchDesign({ stamp_icon: emoji })}
              className={cn(
                "flex size-10 items-center justify-center rounded-xl border text-xl transition-all",
                design.stamp_icon === emoji
                  ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/30"
                  : "border-border bg-background hover:border-primary/40 hover:bg-muted"
              )}
            >
              {emoji}
            </button>
          ))}
          {/* Custom emoji input */}
          <div className="relative flex items-center">
            <input
              type="text"
              maxLength={2}
              value={STAMP_ICONS.some((s) => s.emoji === design.stamp_icon) ? "" : design.stamp_icon}
              placeholder="✏️"
              onChange={(e) => {
                if (e.target.value) patchDesign({ stamp_icon: e.target.value });
              }}
              className={cn(
                "size-10 rounded-xl border text-center text-xl transition-all focus:outline-none focus:ring-2 focus:ring-ring",
                !STAMP_ICONS.some((s) => s.emoji === design.stamp_icon)
                  ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                  : "border-border bg-background"
              )}
            />
          </div>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Escribe cualquier emoji personalizado en el último campo
        </p>
      </Field>
    </Section>
  );
}

function CashbackConfig({
  config,
  patchConfig,
}: {
  config: ConfigState;
  patchConfig: (p: Partial<ConfigState>) => void;
}) {
  function updateLevel(idx: number, patch: Partial<CashbackLevel>) {
    const levels = config.cashback_levels.map((l, i) =>
      i === idx ? { ...l, ...patch } : l
    );
    patchConfig({ cashback_levels: levels });
  }

  function addLevel() {
    const last = config.cashback_levels[config.cashback_levels.length - 1];
    patchConfig({
      cashback_levels: [
        ...config.cashback_levels,
        {
          name: `Nivel ${config.cashback_levels.length + 1}`,
          spending_target: (last?.spending_target ?? 0) + 500,
          cashback_pct: (last?.cashback_pct ?? 0) + 2,
        },
      ],
    });
  }

  function removeLevel(idx: number) {
    patchConfig({
      cashback_levels: config.cashback_levels.filter((_, i) => i !== idx),
    });
  }

  return (
    <Section title="Niveles de cashback">
      <InfoBox>
        Cada nivel define el gasto mínimo acumulado para activarlo y el porcentaje de reembolso.
        Puedes agregar varios niveles (Bronce, Plata, Oro, etc.).
      </InfoBox>
      <div className="space-y-3">
        {config.cashback_levels.map((level, idx) => (
          <div
            key={idx}
            className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end rounded-lg border border-border bg-muted/30 p-3"
          >
            <Field label="Nombre del nivel">
              <Input
                placeholder="Bronce"
                value={level.name ?? ""}
                onChange={(e) => updateLevel(idx, { name: e.target.value })}
              />
            </Field>
            <Field label="Gasto mínimo (MXN)">
              <Input
                type="number"
                min={0}
                placeholder="500"
                value={level.spending_target}
                onChange={(e) => updateLevel(idx, { spending_target: Number(e.target.value) })}
              />
            </Field>
            <Field label="% de cashback">
              <Input
                type="number"
                min={0}
                max={100}
                step={0.5}
                placeholder="5"
                value={level.cashback_pct}
                onChange={(e) => updateLevel(idx, { cashback_pct: Number(e.target.value) })}
              />
            </Field>
            <button
              type="button"
              onClick={() => removeLevel(idx)}
              disabled={config.cashback_levels.length <= 1}
              className="mb-0.5 flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={addLevel}
      >
        <Plus className="size-3.5" />
        Agregar nivel
      </Button>
    </Section>
  );
}

function CouponDiscountConfig({
  type,
  config,
  patchConfig,
}: {
  type: "coupon" | "discount";
  config: ConfigState;
  patchConfig: (p: Partial<ConfigState>) => void;
}) {
  return (
    <Section title={type === "coupon" ? "Detalles del cupón" : "Detalles del descuento"}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Tipo de descuento">
          <Select
            value={config.discount_type}
            onValueChange={(v) => patchConfig({ discount_type: v as DiscountValueType })}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pct">Porcentaje (%)</SelectItem>
              <SelectItem value="fixed">Monto fijo ($)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label={config.discount_type === "pct" ? "Porcentaje de descuento" : "Monto de descuento (MXN)"}>
          <Input
            type="number"
            min={0}
            max={config.discount_type === "pct" ? 100 : undefined}
            step={config.discount_type === "pct" ? 1 : 0.01}
            placeholder={config.discount_type === "pct" ? "20" : "100"}
            value={config.discount_value}
            onChange={(e) => patchConfig({ discount_value: e.target.value })}
          />
        </Field>
      </div>
      {type === "coupon" && (
        <Field label="Código promocional (opcional)">
          <Input
            placeholder="SAVE20"
            value={config.promo_code}
            onChange={(e) => patchConfig({ promo_code: e.target.value.toUpperCase() })}
          />
        </Field>
      )}
      <Field label="Canal de redención">
        <Select
          value={config.redemption_channel}
          onValueChange={(v) => patchConfig({ redemption_channel: v as RedemptionChannel })}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="instore">Sólo en tienda</SelectItem>
            <SelectItem value="online">Sólo en línea</SelectItem>
            <SelectItem value="both">Tienda y en línea</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Descripción / recompensa mostrada en Wallet">
        <Input
          placeholder="Ej. 20% de descuento en tu próxima compra"
          value={config.reward_description}
          onChange={(e) => patchConfig({ reward_description: e.target.value })}
        />
      </Field>
    </Section>
  );
}

function GiftCardConfig({
  config,
  patchConfig,
}: {
  config: ConfigState;
  patchConfig: (p: Partial<ConfigState>) => void;
}) {
  return (
    <Section title="Detalles de la tarjeta de regalo">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Saldo inicial">
          <Input
            type="number"
            min={0}
            step={0.01}
            placeholder="500"
            value={config.initial_balance}
            onChange={(e) => patchConfig({ initial_balance: e.target.value })}
          />
        </Field>
        <Field label="Moneda">
          <Select
            value={config.currency}
            onValueChange={(v) => patchConfig({ currency: v })}
          >
            <SelectTrigger className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MXN">MXN — Peso mexicano</SelectItem>
              <SelectItem value="USD">USD — Dólar</SelectItem>
              <SelectItem value="EUR">EUR — Euro</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Descripción mostrada en Wallet">
        <Input
          placeholder="Ej. Tarjeta de regalo $500"
          value={config.reward_description}
          onChange={(e) => patchConfig({ reward_description: e.target.value })}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          checked={config.has_pin}
          onChange={(e) => patchConfig({ has_pin: e.target.checked })}
          className="h-4 w-4 rounded border-border"
        />
        Requiere PIN para redimir
      </label>
    </Section>
  );
}

// ─── UI helpers ────────────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

function Collapsible({
  title,
  open,
  onToggle,
  badge,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {badge && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {badge}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>
      {open && <div className="border-t border-border px-5 py-4 space-y-4">{children}</div>}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-10 cursor-pointer rounded-lg border border-input bg-transparent p-0.5"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="#000000"
        className="font-mono text-sm"
      />
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
      <Info className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
