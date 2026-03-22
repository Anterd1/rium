export const PLANS = [
  {
    id: "basic" as const,
    name: "Básico",
    price: 399,
    features: [
      "1 tarjeta activa",
      "1 sucursal",
      "Notificaciones básicas",
      "Estadísticas",
      "Soporte por email",
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: 599,
    features: [
      "3 tarjetas activas",
      "3 sucursales",
      "Notificaciones avanzadas",
      "Estadísticas detalladas",
      "Soporte prioritario",
    ],
  },
  {
    id: "enterprise" as const,
    name: "Empresarial",
    price: 749,
    features: [
      "10 tarjetas activas",
      "10 sucursales",
      "Notificaciones ilimitadas",
      "Estadísticas avanzadas + exportación",
      "Soporte prioritario + API",
    ],
  },
];

export type PlanId = (typeof PLANS)[number]["id"];

const PLACEHOLDER_BASIC = "price_placeholder_basic";
const PLACEHOLDER_PRO = "price_placeholder_pro";
const PLACEHOLDER_ENTERPRISE = "price_placeholder_enterprise";

export function stripePriceIdForPlan(plan: PlanId): string {
  switch (plan) {
    case "basic":
      return process.env.STRIPE_PRICE_BASIC ?? PLACEHOLDER_BASIC;
    case "pro":
      return process.env.STRIPE_PRICE_PRO ?? PLACEHOLDER_PRO;
    case "enterprise":
      return process.env.STRIPE_PRICE_ENTERPRISE ?? PLACEHOLDER_ENTERPRISE;
    default:
      return PLACEHOLDER_BASIC;
  }
}

export function planFromStripePriceId(priceId: string): PlanId {
  const basic = process.env.STRIPE_PRICE_BASIC ?? PLACEHOLDER_BASIC;
  const pro = process.env.STRIPE_PRICE_PRO ?? PLACEHOLDER_PRO;
  const ent = process.env.STRIPE_PRICE_ENTERPRISE ?? PLACEHOLDER_ENTERPRISE;
  if (priceId === basic) return "basic";
  if (priceId === pro) return "pro";
  if (priceId === ent) return "enterprise";
  return "basic";
}
