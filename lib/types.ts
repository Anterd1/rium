export interface Business {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  plan: "basic" | "pro" | "enterprise";
  branding: {
    primary_color: string;
    secondary_color: string;
    api_key?: string;
    webhook_url?: string;
  } | null;
  created_at: string;
}

export interface Branch {
  id: string;
  business_id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  active: boolean;
}

export interface User {
  id: string;
  business_id: string;
  email: string;
  name: string;
  username: string | null;
  role: "admin" | "operator";
  active: boolean;
  branch_id: string | null;
}

export type CardType =
  | "loyalty"
  | "event"
  | "stamps"
  | "coupon"
  | "cashback"
  | "gift_card"
  | "discount";

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  loyalty: "Lealtad",
  event: "Evento",
  stamps: "Tarjeta de Sellos",
  coupon: "Cupón",
  cashback: "Cashback",
  gift_card: "Tarjeta de Regalo",
  discount: "Descuento",
};

export type ValidityType = "unlimited" | "fixed_date" | "days_from_issue";
export type BarcodeType = "QR_CODE" | "PDF_417" | "AZTEC" | "CODE_128" | "NONE";
export type DiscountValueType = "pct" | "fixed";
export type RedemptionChannel = "instore" | "online" | "both";

export type CashbackLevel = {
  name?: string;
  spending_target: number;
  cashback_pct: number;
};

export type CardConfig = {
  // Validity
  validity_type: ValidityType;
  validity_value?: string | number | null; // ISO date string or number of days

  // Quantity
  quantity_limited: boolean;
  quantity_max?: number | null;

  // Coupon / Discount
  discount_type?: DiscountValueType;
  discount_value?: number;
  promo_code?: string;
  redemption_channel?: RedemptionChannel;

  // Cashback
  cashback_levels?: CashbackLevel[];

  // Gift Card
  initial_balance?: number;
  currency?: string;
  has_pin?: boolean;

  // Stamps (Lealtad / Sellos) — also uses top-level target_purchases + reward_description
};

export interface Card {
  id: string;
  business_id: string;
  name: string;
  type: CardType;
  target_purchases: number;
  reward_description: string;
  design: CardDesign;
  config: CardConfig;
  wallet_class_ids: {
    google?: string;
    apple?: string;
  } | null;
  active: boolean;
  created_at: string;
}

export interface CardDesign {
  bg_color: string;
  text_color: string;
  label_color: string;
  logo_url: string | null;
  hero_url: string | null;
  program_name: string;
  barcode_type: BarcodeType;
  fine_print: string;
  homepage_url: string;
  /** Emoji used as the stamp icon for loyalty/stamps cards */
  stamp_icon: string;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  email: string;
  phone: string | null;
  created_at: string;
}

export interface CustomerCard {
  id: string;
  customer_id: string;
  card_id: string;
  branch_id: string | null;
  purchases: number;
  gift_available: boolean;
  wallet_object_id: string | null;
  wallet_save_link: string | null;
  created_at: string;
  customer?: Customer;
  card?: Card;
}

export interface Purchase {
  id: string;
  customer_card_id: string;
  branch_id: string | null;
  registered_by: string | null;
  created_at: string;
}

export interface Redemption {
  id: string;
  customer_card_id: string;
  branch_id: string | null;
  registered_by: string | null;
  created_at: string;
}

export type CustomerDetailCardRow = CustomerCard & {
  card: Card | null;
  purchases: Purchase[];
  redemptions: Redemption[];
};

export type CustomerDetailData = Customer & {
  customer_cards: CustomerDetailCardRow[];
};

export interface Notification {
  id: string;
  business_id: string;
  title: string;
  body: string;
  type: "push" | "email" | "sms";
  targeting: {
    branch_ids?: string[];
    min_purchases?: number;
    gift_available?: boolean;
  } | null;
  sent_at: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  business_id: string;
  stripe_subscription_id: string;
  plan: "basic" | "pro" | "enterprise";
  status: "active" | "canceled" | "past_due" | "trialing";
  current_period_end: string;
}

export type PlanLimits = {
  max_cards: number;
  max_branches: number;
  price: number;
};

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  basic: { max_cards: 1, max_branches: 1, price: 399 },
  pro: { max_cards: 3, max_branches: 3, price: 599 },
  enterprise: { max_cards: 10, max_branches: 10, price: 749 },
};
