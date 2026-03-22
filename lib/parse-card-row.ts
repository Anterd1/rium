import type {
  BarcodeType,
  Card,
  CardConfig,
  CardDesign,
  CardType,
  CashbackLevel,
  DiscountValueType,
  RedemptionChannel,
  ValidityType,
} from "@/lib/types";

export type CardRow = {
  id: string;
  business_id: string;
  name: string;
  type: string;
  target_purchases: number;
  reward_description: string;
  design: unknown;
  config: unknown;
  wallet_class_ids: unknown;
  active: boolean;
  created_at: string;
};

const VALID_TYPES: CardType[] = [
  "loyalty",
  "event",
  "stamps",
  "coupon",
  "cashback",
  "gift_card",
  "discount",
];

function isCardType(v: string): v is CardType {
  return (VALID_TYPES as string[]).includes(v);
}

function parseDesign(raw: unknown): CardDesign {
  const d =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const barcodeTypes: BarcodeType[] = ["QR_CODE", "PDF_417", "AZTEC", "CODE_128", "NONE"];
  return {
    bg_color: typeof d.bg_color === "string" ? d.bg_color : "#0f172a",
    text_color: typeof d.text_color === "string" ? d.text_color : "#f8fafc",
    label_color: typeof d.label_color === "string" ? d.label_color : "#94a3b8",
    logo_url: typeof d.logo_url === "string" ? d.logo_url : null,
    hero_url: typeof d.hero_url === "string" ? d.hero_url : null,
    program_name: typeof d.program_name === "string" && d.program_name.length > 0 ? d.program_name : "Programa",
    barcode_type:
      typeof d.barcode_type === "string" &&
      (barcodeTypes as string[]).includes(d.barcode_type)
        ? (d.barcode_type as BarcodeType)
        : "QR_CODE",
    fine_print: typeof d.fine_print === "string" ? d.fine_print : "",
    homepage_url: typeof d.homepage_url === "string" ? d.homepage_url : "",
    stamp_icon: typeof d.stamp_icon === "string" && d.stamp_icon.length > 0 ? d.stamp_icon : "⭐",
  };
}

function parseConfig(raw: unknown): CardConfig {
  const c =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

  const validityTypes: ValidityType[] = ["unlimited", "fixed_date", "days_from_issue"];
  const validityType: ValidityType =
    typeof c.validity_type === "string" &&
    (validityTypes as string[]).includes(c.validity_type)
      ? (c.validity_type as ValidityType)
      : "unlimited";

  const discountTypes: DiscountValueType[] = ["pct", "fixed"];
  const redemptionChannels: RedemptionChannel[] = ["instore", "online", "both"];

  const levels: CashbackLevel[] = Array.isArray(c.cashback_levels)
    ? (c.cashback_levels as unknown[]).map((l) => {
        const lv = l as Record<string, unknown>;
        return {
          name: typeof lv.name === "string" ? lv.name : undefined,
          spending_target: typeof lv.spending_target === "number" ? lv.spending_target : 0,
          cashback_pct: typeof lv.cashback_pct === "number" ? lv.cashback_pct : 0,
        };
      })
    : [];

  return {
    validity_type: validityType,
    validity_value:
      typeof c.validity_value === "string" || typeof c.validity_value === "number"
        ? c.validity_value
        : null,
    quantity_limited: c.quantity_limited === true,
    quantity_max:
      typeof c.quantity_max === "number" ? c.quantity_max : null,
    discount_type:
      typeof c.discount_type === "string" &&
      (discountTypes as string[]).includes(c.discount_type)
        ? (c.discount_type as DiscountValueType)
        : undefined,
    discount_value:
      typeof c.discount_value === "number" ? c.discount_value : undefined,
    promo_code:
      typeof c.promo_code === "string" ? c.promo_code : undefined,
    redemption_channel:
      typeof c.redemption_channel === "string" &&
      (redemptionChannels as string[]).includes(c.redemption_channel)
        ? (c.redemption_channel as RedemptionChannel)
        : undefined,
    cashback_levels: levels.length > 0 ? levels : undefined,
    initial_balance:
      typeof c.initial_balance === "number" ? c.initial_balance : undefined,
    currency: typeof c.currency === "string" ? c.currency : undefined,
    has_pin: c.has_pin === true,
  };
}

function parseWalletIds(raw: unknown): Card["wallet_class_ids"] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const google = typeof o.google === "string" ? o.google : undefined;
  const apple = typeof o.apple === "string" ? o.apple : undefined;
  if (google === undefined && apple === undefined) return null;
  return { google, apple };
}

export function rowToCard(row: CardRow): Card {
  return {
    id: row.id,
    business_id: row.business_id,
    name: row.name,
    type: isCardType(row.type) ? row.type : "loyalty",
    target_purchases: row.target_purchases,
    reward_description: row.reward_description,
    design: parseDesign(row.design),
    config: parseConfig(row.config),
    wallet_class_ids: parseWalletIds(row.wallet_class_ids),
    active: row.active,
    created_at: row.created_at,
  };
}
