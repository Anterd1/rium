"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { CARD_TYPE_LABELS } from "@/lib/types";
import type { BarcodeType, Card } from "@/lib/types";

type Platform = "android" | "ios";

type CardPreviewProps = {
  card: Pick<Card, "name" | "reward_description" | "target_purchases" | "type" | "design">;
  businessLogoUrl?: string | null;
  className?: string;
  showToggle?: boolean;
};

export function CardPreview({
  card,
  businessLogoUrl,
  className,
  showToggle = false,
}: CardPreviewProps) {
  const [platform, setPlatform] = useState<Platform>("android");
  const logoSrc = card.design.logo_url ?? businessLogoUrl ?? null;

  return (
    <div className={cn("space-y-3", className)}>
      {showToggle && (
        <div className="flex items-center gap-1 rounded-xl border border-border bg-muted p-1">
          {(["android", "ios"] as Platform[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium transition-all",
                platform === p
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p === "android" ? (
                <><AndroidIcon className="size-3.5" />Android</>
              ) : (
                <><AppleIcon className="size-3.5" />iOS</>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex justify-center">
        {platform === "android" ? (
          <GoogleWalletCard card={card} logoSrc={logoSrc} />
        ) : (
          <AppleWalletCard card={card} logoSrc={logoSrc} />
        )}
      </div>
    </div>
  );
}

// ─── Google Wallet Card ────────────────────────────────────────────────────────
// Matches real Google Wallet loyalty pass:
// • Portrait orientation (2:3)
// • Slim header: circular logo + program name
// • Large program title + points label/value
// • Large QR centered
// • Hero image strip at bottom

function GoogleWalletCard({
  card,
  logoSrc,
}: {
  card: CardPreviewProps["card"];
  logoSrc: string | null;
}) {
  const { design } = card;
  const isStamps = card.type === "stamps" || card.type === "loyalty";
  const filledStamps = Math.round(card.target_purchases * 0.4); // mock: 40% filled

  return (
    <div
      className="relative overflow-hidden shadow-2xl"
      style={{
        backgroundColor: design.bg_color,
        color: design.text_color,
        width: 260,
        borderRadius: 20,
        fontFamily: "'Google Sans', 'Roboto', sans-serif",
      }}
    >
      {/* ── Header: logo + name ── */}
      <div
        className="flex items-center gap-2 px-4"
        style={{ paddingTop: 14, paddingBottom: 10 }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            backgroundColor: "rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          {logoSrc ? (
            <img src={logoSrc} alt="" style={{ width: 18, height: 18, objectFit: "contain" }} />
          ) : (
            <span style={{ fontSize: 11, fontWeight: 700, color: design.text_color, opacity: 0.7 }}>
              R
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            opacity: 0.85,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {design.program_name || card.name || "Mi Programa"}
        </span>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: "6px 16px 16px" }}>
        {/* Large title */}
        <p
          style={{
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1.2,
            marginBottom: 16,
          }}
        >
          {design.program_name || card.name || "Mi Programa"}
        </p>

        {/* Stamps grid or label+value */}
        <div style={{ marginBottom: 18 }}>
          {isStamps ? (
            <StampGrid
              total={card.target_purchases}
              filled={filledStamps}
              icon={design.stamp_icon ?? "⭐"}
              filledColor={design.text_color}
              emptyOpacity={0.22}
            />
          ) : (
            <>
              <p style={{ fontSize: 12, fontWeight: 500, opacity: 0.7, marginBottom: 2 }}>
                {CARD_TYPE_LABELS[card.type] ?? "Beneficio"}
              </p>
              <p style={{ fontSize: 14, fontWeight: 600, opacity: 0.9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {card.reward_description || "—"}
              </p>
            </>
          )}
        </div>

        {/* QR Code */}
        {design.barcode_type !== "NONE" && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 12,
                padding: 12,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              }}
            >
              <RealisticBarcode type={design.barcode_type} size={110} />
            </div>
          </div>
        )}
      </div>

      {/* ── Hero image strip ── */}
      <div style={{ height: 90, overflow: "hidden", marginTop: 4 }}>
        {design.hero_url ? (
          <img
            src={design.hero_url}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: `linear-gradient(to bottom, ${design.bg_color}, rgba(0,0,0,0.35))`,
              opacity: 0.5,
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Apple Wallet Card ─────────────────────────────────────────────────────────
// Matches real Apple Wallet StoreCard/Coupon pass:
// • Portrait orientation
// • Colored header strip: logo left + card name right
// • White body with structured field rows
// • Large barcode centered

function AppleWalletCard({
  card,
  logoSrc,
}: {
  card: CardPreviewProps["card"];
  logoSrc: string | null;
}) {
  const { design } = card;
  const isStamps = card.type === "stamps" || card.type === "loyalty";
  const filledStamps = Math.round(card.target_purchases * 0.4);

  return (
    <div
      className="overflow-hidden shadow-2xl"
      style={{
        width: 260,
        borderRadius: 20,
        fontFamily: "-apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif",
        boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
      }}
    >
      {/* ── Header strip ── */}
      <div
        style={{
          backgroundColor: design.bg_color,
          color: design.text_color,
          padding: "14px 16px 12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          {/* Logo */}
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              backgroundColor: "rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            {logoSrc ? (
              <img src={logoSrc} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} />
            ) : (
              <span style={{ fontSize: 14, fontWeight: 700, color: design.text_color, opacity: 0.6 }}>
                R
              </span>
            )}
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.06em",
                opacity: 0.7,
                textTransform: "uppercase",
              }}
            >
              {CARD_TYPE_LABELS[card.type]}
            </p>
            <p
              style={{
                fontSize: 15,
                fontWeight: 700,
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {design.program_name || card.name || "Mi Programa"}
            </p>
          </div>
        </div>

        {/* Hero strip image */}
        {design.hero_url && (
          <div
            style={{
              height: 70,
              borderRadius: 8,
              overflow: "hidden",
              marginTop: 4,
            }}
          >
            <img
              src={design.hero_url}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        )}
      </div>

      {/* ── White body ── */}
      <div style={{ backgroundColor: "#ffffff", padding: "14px 16px 18px" }}>
        {/* Fields grid */}
        {isStamps ? (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <AppleField label="SELLOS" value={`${filledStamps} / ${card.target_purchases}`} />
              <AppleField label="VENCIMIENTO" value="Sin vencimiento" align="right" />
            </div>
            <StampGrid
              total={card.target_purchases}
              filled={filledStamps}
              icon={design.stamp_icon ?? "⭐"}
              filledColor="#1c1c1e"
              emptyOpacity={0.18}
              bgFilled="#1c1c1e"
              bgEmpty="#e5e5ea"
            />
            {card.reward_description && (
              <div style={{ marginTop: 8 }}>
                <AppleField label="RECOMPENSA" value={card.reward_description} wide />
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px 8px",
              marginBottom: 16,
            }}
          >
            <AppleField label="TIPO" value={CARD_TYPE_LABELS[card.type]} />
            <AppleField label="BENEFICIO" value={card.reward_description || "—"} align="right" />
          </div>
        )}

        {/* Barcode */}
        {design.barcode_type !== "NONE" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <RealisticBarcode type={design.barcode_type} size={100} />
            <p style={{ fontSize: 10, color: "#8e8e93", letterSpacing: "0.12em" }}>
              A1B2·C3D4·E5F6
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Stamp Grid ───────────────────────────────────────────────────────────────

function StampGrid({
  total,
  filled,
  icon,
  filledColor,
  emptyOpacity,
  bgFilled,
  bgEmpty,
}: {
  total: number;
  filled: number;
  icon: string;
  filledColor: string;
  emptyOpacity: number;
  bgFilled?: string;
  bgEmpty?: string;
}) {
  const capped = Math.min(total, 50);
  const cols = Math.min(capped, 5); // max 5 per row
  const MAX_CELL = 42; // px — maximum stamp size

  return (
    // Center the whole grid; each cell is capped at MAX_CELL px
    <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, minmax(0, ${MAX_CELL}px))`,
          gap: 6,
        }}
      >
        {Array.from({ length: capped }).map((_, i) => {
          const isFilled = i < filled;
          return (
            <div
              key={i}
              style={{
                width: MAX_CELL,
                height: MAX_CELL,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                lineHeight: 1,
                backgroundColor: isFilled
                  ? (bgFilled ?? filledColor)
                  : (bgEmpty ?? `rgba(128,128,128,${emptyOpacity})`),
                opacity: isFilled ? 1 : 0.55,
              }}
            >
              {icon}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function AppleField({
  label,
  value,
  align = "left",
  wide = false,
}: {
  label: string;
  value: string;
  align?: "left" | "right";
  wide?: boolean;
}) {
  return (
    <div style={{ gridColumn: wide ? "1 / -1" : undefined, textAlign: align }}>
      <p style={{ fontSize: 9, fontWeight: 600, color: "#8e8e93", letterSpacing: "0.08em", marginBottom: 2 }}>
        {label}
      </p>
      <p
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#1c1c1e",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </p>
    </div>
  );
}

// ─── Realistic Barcode Graphics ────────────────────────────────────────────────

function RealisticBarcode({ type, size }: { type: BarcodeType; size: number }) {
  if (type === "QR_CODE" || type === "AZTEC") {
    return <RealisticQR size={size} aztec={type === "AZTEC"} />;
  }
  if (type === "PDF_417") {
    return <PDF417Barcode width={size * 1.8} height={size * 0.45} />;
  }
  // CODE_128
  return <Code128Barcode width={size * 1.8} height={size * 0.45} />;
}

// 21×21 QR code — finder patterns + timing + realistic data modules
const QR_GRID: number[] = [
  1,1,1,1,1,1,1,0,1,0,0,1,0,0,1,1,1,1,1,1,1,
  1,0,0,0,0,0,1,0,0,0,1,0,1,0,1,0,0,0,0,0,1,
  1,0,1,1,1,0,1,0,1,1,0,1,0,0,1,0,1,1,1,0,1,
  1,0,1,1,1,0,1,0,0,0,1,0,1,0,1,0,1,1,1,0,1,
  1,0,1,1,1,0,1,0,1,0,0,1,0,0,1,0,1,1,1,0,1,
  1,0,0,0,0,0,1,0,0,1,1,0,1,0,1,0,0,0,0,0,1,
  1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1,
  0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,0,0,0,0,0,0,
  1,1,0,1,0,1,1,1,0,1,1,0,0,1,1,0,1,0,1,1,0,
  0,0,1,0,0,0,0,0,1,0,0,1,1,0,0,1,0,1,0,0,1,
  1,1,0,1,1,1,1,0,0,0,1,0,0,1,1,0,1,0,0,1,0,
  0,1,0,0,0,1,0,1,1,1,0,0,1,0,0,0,1,1,0,0,1,
  1,0,1,1,1,0,1,0,0,0,1,1,0,1,1,0,0,0,1,0,0,
  0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,1,1,0,0,1,1,
  1,1,1,1,1,1,1,0,0,0,1,1,0,1,1,0,1,1,0,0,1,
  1,0,0,0,0,0,1,0,1,0,0,0,1,0,0,1,0,0,1,1,0,
  1,0,1,1,1,0,1,0,0,1,1,0,0,1,0,0,1,0,0,0,1,
  1,0,1,1,1,0,1,1,0,0,1,1,0,0,1,1,0,1,1,0,0,
  1,0,1,1,1,0,1,0,1,0,0,0,1,0,0,0,1,0,0,1,0,
  1,0,0,0,0,0,1,0,0,1,1,0,0,1,0,1,0,0,1,0,1,
  1,1,1,1,1,1,1,0,1,0,0,1,1,0,1,0,1,1,0,1,1,
];

function RealisticQR({ size, aztec }: { size: number; aztec?: boolean }) {
  const cells = 21;
  const cell = size / cells;

  if (aztec) {
    // Aztec has concentric diamond/square patterns
    const cx = size / 2;
    const cy = size / 2;
    const layers = [
      { r: size * 0.08, fill: "black" },
      { r: size * 0.16, fill: "white" },
      { r: size * 0.24, fill: "black" },
      { r: size * 0.32, fill: "white" },
      { r: size * 0.40, fill: "black" },
    ];
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect width={size} height={size} fill="white" />
        {layers.reverse().map((l, i) => (
          <rect
            key={i}
            x={cx - l.r}
            y={cy - l.r}
            width={l.r * 2}
            height={l.r * 2}
            rx={2}
            fill={l.fill}
          />
        ))}
        {/* scattered data bits around */}
        {[...Array(40)].map((_, i) => {
          const angle = (i / 40) * Math.PI * 2;
          const dist = size * 0.44 + (i % 3) * cell * 1.2;
          const x = cx + Math.cos(angle) * dist - cell * 0.5;
          const y = cy + Math.sin(angle) * dist - cell * 0.5;
          return i % 2 === 0 ? (
            <rect key={`d${i}`} x={x} y={y} width={cell} height={cell} rx={0.5} fill="black" />
          ) : null;
        })}
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill="white" />
      {QR_GRID.map((on, idx) => {
        if (!on) return null;
        const col = idx % cells;
        const row = Math.floor(idx / cells);
        return (
          <rect
            key={idx}
            x={col * cell}
            y={row * cell}
            width={cell - 0.3}
            height={cell - 0.3}
            fill="black"
          />
        );
      })}
    </svg>
  );
}

function PDF417Barcode({ width, height }: { width: number; height: number }) {
  const rows = 5;
  const rowH = height / rows;
  // Alternating bar patterns per row
  const patterns = [
    [2,1,1,2,3,1,1,2,1,2],
    [1,3,2,1,1,2,2,1,1,1],
    [3,1,1,1,2,1,1,3,2,1],
    [1,2,3,1,1,1,2,1,1,3],
    [2,1,1,2,1,3,1,1,2,1],
  ];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <rect width={width} height={height} fill="white" />
      {patterns.map((row, ri) => {
        let x = 0;
        const totalW = row.reduce((s, v) => s + v, 0);
        const scale = width / totalW;
        return row.map((w, ci) => {
          const barX = x;
          x += w * scale;
          return ci % 2 === 0 ? (
            <rect key={`${ri}-${ci}`} x={barX} y={ri * rowH + 1} width={w * scale - 0.5} height={rowH - 2} fill="black" />
          ) : null;
        });
      })}
    </svg>
  );
}

function Code128Barcode({ width, height }: { width: number; height: number }) {
  const bars = [2,1,2,2,1,1,3,1,1,1,2,2,1,3,1,1,2,1,1,2,2,3,1,1,2,1,3,1,2,1];
  const totalW = bars.reduce((s, v) => s + v, 0);
  const scale = width / totalW;
  let x = 0;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <rect width={width} height={height} fill="white" />
      {bars.map((w, i) => {
        const bx = x;
        x += w * scale;
        return i % 2 === 0 ? (
          <rect key={i} x={bx} y={0} width={w * scale - 0.4} height={height - 8} fill="black" />
        ) : null;
      })}
    </svg>
  );
}

// ─── Platform Icons ────────────────────────────────────────────────────────────

function AndroidIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.523 15.341a1.15 1.15 0 0 1-1.149 1.15 1.15 1.15 0 0 1-1.149-1.15 1.15 1.15 0 0 1 1.149-1.15 1.15 1.15 0 0 1 1.149 1.15m-9.897 0a1.15 1.15 0 0 1-1.149 1.15 1.15 1.15 0 0 1-1.149-1.15 1.15 1.15 0 0 1 1.149-1.15 1.15 1.15 0 0 1 1.149 1.15M17.7 9H6.3C5.034 9 4 10.034 4 11.3v5.4C4 17.966 5.034 19 6.3 19h11.4c1.266 0 2.3-1.034 2.3-2.3V11.3C20 10.034 18.966 9 17.7 9M8.1 5.5l-1.4-2.4a.3.3 0 0 0-.4-.1.3.3 0 0 0-.1.4L7.6 5.9A7.3 7.3 0 0 0 4 12h16a7.3 7.3 0 0 0-3.6-6.1l1.4-2.4a.3.3 0 0 0-.1-.4.3.3 0 0 0-.4.1L15.9 5.5A7.3 7.3 0 0 0 12 4.7c-1.4 0-2.7.3-3.9.8" />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}
