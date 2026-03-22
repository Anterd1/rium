export const APP_NAME = "Rium";
export const APP_DESCRIPTION = "Plataforma de tarjetas digitales de lealtad";

export const PLANS = [
  {
    id: "basic" as const,
    name: "Básico",
    price: 399,
    currency: "MXN",
    features: [
      "1 tarjeta activa",
      "1 sucursal",
      "Notificaciones básicas",
      "Estadísticas",
      "Soporte por email",
    ],
    limits: { max_cards: 1, max_branches: 1 },
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: 599,
    currency: "MXN",
    popular: true,
    features: [
      "3 tarjetas activas",
      "3 sucursales",
      "Notificaciones avanzadas",
      "Estadísticas detalladas",
      "Soporte prioritario",
    ],
    limits: { max_cards: 3, max_branches: 3 },
  },
  {
    id: "enterprise" as const,
    name: "Empresarial",
    price: 749,
    currency: "MXN",
    features: [
      "10 tarjetas activas",
      "10 sucursales",
      "Notificaciones ilimitadas",
      "Estadísticas avanzadas + exportación",
      "Soporte prioritario + API",
    ],
    limits: { max_cards: 10, max_branches: 10 },
  },
];

export const NAV_ITEMS = [
  { label: "Tarjetas", href: "/dashboard/tarjetas", icon: "CreditCard" },
  { label: "Clientes", href: "/dashboard/clientes", icon: "Users" },
  { label: "Informes", href: "/dashboard/informes", icon: "BarChart3" },
  { label: "Notificaciones", href: "/dashboard/notificaciones", icon: "Bell" },
  { label: "Sucursales", href: "/dashboard/sucursales", icon: "MapPin" },
  { label: "Usuarios", href: "/dashboard/usuarios", icon: "UserCog" },
  { label: "Facturación", href: "/dashboard/facturacion", icon: "Receipt" },
  { label: "Configuración", href: "/dashboard/configuracion", icon: "Settings" },
] as const;
