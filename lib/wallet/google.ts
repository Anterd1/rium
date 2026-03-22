import fs from "node:fs/promises";
import path from "node:path";

import type { JWT } from "google-auth-library";
import jwt from "jsonwebtoken";
import { google } from "googleapis";

import type { Card, CardType } from "@/lib/types";

const WALLET_SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer";

const DEFAULT_LOGO_URI =
  "https://www.gstatic.com/images/branding/product/2x/wallet_96dp.png";
const DEFAULT_HERO_URI =
  "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=1200&q=80";

// ─── Pass type routing ────────────────────────────────────────────────────────

type WalletPassType = "loyalty" | "offer" | "giftcard" | "generic";

function resolvePassType(cardType: CardType): WalletPassType {
  switch (cardType) {
    case "stamps":
    case "loyalty":
    case "cashback":
      return "loyalty";
    case "coupon":
    case "discount":
      return "offer";
    case "gift_card":
      return "giftcard";
    default:
      return "generic";
  }
}

/** Key used in the JWT save-to-wallet payload per pass type */
function jwtPayloadKey(passType: WalletPassType): string {
  switch (passType) {
    case "loyalty":  return "loyaltyObjects";
    case "offer":    return "offerObjects";
    case "giftcard": return "giftCardObjects";
    default:         return "genericObjects";
  }
}

// ─── Public params interface ──────────────────────────────────────────────────

export interface PassObjectParams {
  objectId: string;
  classId: string;
  card: Card;
  customerName: string;
  customerCardId: string;
  purchases: number;
  giftAvailable: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nonEmpty(value: string | undefined | null, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function rgbToHex(rgbString: string): string {
  const match = /rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/i.exec(
    rgbString || ""
  );
  if (!match) {
    const trimmed = rgbString?.trim() || "";
    if (/^#([0-9a-fA-F]{6})$/.test(trimmed)) return trimmed.toUpperCase();
    return "#0066CC";
  }
  const [r, g, b] = match.slice(1, 4).map((v) =>
    Number(v).toString(16).padStart(2, "0")
  );
  return `#${r}${g}${b}`.toUpperCase();
}

function logoImage(logoUrl: string | null | undefined, alt: string) {
  return {
    sourceUri: { uri: nonEmpty(logoUrl, DEFAULT_LOGO_URI) },
    contentDescription: {
      defaultValue: { language: "es", value: alt },
    },
  };
}

function heroImage(heroUrl: string | null | undefined) {
  return {
    sourceUri: { uri: nonEmpty(heroUrl, DEFAULT_HERO_URI) },
    contentDescription: {
      defaultValue: { language: "es", value: "Banner" },
    },
  };
}

function barcodeBlock(value: string) {
  return {
    type: "QR_CODE" as const,
    value,
    alternateText: value.slice(0, 8),
  };
}

// ─── Credentials & auth ───────────────────────────────────────────────────────

type ServiceAccountCredentials = {
  client_email: string;
  private_key: string;
};

function getIssuerId(): string {
  const id = process.env.GOOGLE_WALLET_ISSUER_ID?.trim();
  if (!id) {
    throw new Error(
      "Missing GOOGLE_WALLET_ISSUER_ID. Set it to your Google Pay API issuer ID from the Google Wallet console."
    );
  }
  return id;
}

export function sanitizeForId(value: string): string {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

export function buildGoogleClassId(cardId: string): string {
  const issuerId = getIssuerId();
  return `${issuerId}.${sanitizeForId(`card_${cardId}`)}`;
}

export function buildGoogleObjectId(customerCardId: string): string {
  const issuerId = getIssuerId();
  return `${issuerId}.${sanitizeForId(`cc_${customerCardId}`)}`;
}

async function loadServiceAccountCredentials(): Promise<ServiceAccountCredentials> {
  const jsonEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (jsonEnv) {
    try {
      const parsed = JSON.parse(jsonEnv) as unknown;
      if (
        !parsed ||
        typeof parsed !== "object" ||
        typeof (parsed as ServiceAccountCredentials).client_email !== "string" ||
        typeof (parsed as ServiceAccountCredentials).private_key !== "string"
      ) {
        throw new Error(
          "GOOGLE_SERVICE_ACCOUNT_JSON must be a JSON object with client_email and private_key."
        );
      }
      return parsed as ServiceAccountCredentials;
    } catch (e) {
      if (e instanceof SyntaxError) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.");
      throw e;
    }
  }

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!credPath) {
    throw new Error(
      "Google Wallet credentials are not configured. Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON file path, or set GOOGLE_SERVICE_ACCOUNT_JSON to the raw JSON string."
    );
  }

  const resolved = path.isAbsolute(credPath)
    ? credPath
    : path.resolve(process.cwd(), credPath);

  let raw: string;
  try {
    raw = await fs.readFile(resolved, "utf8");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not read GOOGLE_APPLICATION_CREDENTIALS at "${resolved}": ${msg}`);
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as ServiceAccountCredentials).client_email !== "string" ||
      typeof (parsed as ServiceAccountCredentials).private_key !== "string"
    ) {
      throw new Error("Credential file must contain client_email and private_key.");
    }
    return parsed as ServiceAccountCredentials;
  } catch (e) {
    if (e instanceof SyntaxError) throw new Error(`Credential file at "${resolved}" is not valid JSON.`);
    throw e;
  }
}

async function getAuthClient() {
  const credentials = await loadServiceAccountCredentials();
  const auth = new google.auth.GoogleAuth({ credentials, scopes: [WALLET_SCOPE] });
  const authClient = await auth.getClient();
  return { credentials, authClient };
}

async function getWalletClient() {
  const { authClient } = await getAuthClient();
  return google.walletobjects({ version: "v1", auth: authClient as JWT });
}

function isNotFound(err: unknown): boolean {
  const e = err as { code?: number; response?: { status?: number } };
  return e?.code === 404 || e?.response?.status === 404;
}

// ─── Loyalty class / object (stamps, loyalty, cashback) ───────────────────────

function buildLoyaltyClassBody(classId: string, card: Card) {
  const hexBackgroundColor = rgbToHex(card.design.bg_color);
  const programName = nonEmpty(card.design.program_name, card.name);

  const body: Record<string, unknown> = {
    id: classId,
    issuerName: programName,
    reviewStatus: "UNDER_REVIEW",
    hexBackgroundColor,
    programName,
    programLogo: logoImage(card.design.logo_url, programName),
    heroImage: heroImage(card.design.hero_url),
    rewardsTier: "Miembro",
    rewardsTierLabel: "Nivel",
    loyaltyPoints: {
      label: card.type === "cashback" ? "Cashback" : "Sellos",
      balance: { string: "" },
    },
    textModulesData: [
      {
        id: "reward",
        header: "Recompensa",
        body: nonEmpty(card.reward_description, "Completa los sellos para ganar tu recompensa"),
      },
    ],
  };

  if (card.design.homepage_url) {
    body.linksModuleData = {
      uris: [
        {
          uri: card.design.homepage_url,
          description: "Sitio web",
          id: "web",
        },
      ],
    };
  }

  return body;
}

function buildLoyaltyObjectBody(params: PassObjectParams) {
  const { card, objectId, classId, customerName, customerCardId, purchases, giftAvailable } = params;
  const target = Math.max(1, card.target_purchases || 1);
  const p = Math.min(purchases, target);

  const stampsLabel = card.type === "cashback"
    ? (() => {
        const levels = card.config.cashback_levels ?? [];
        const nextLevel = levels.find((l) => (card.config.cashback_levels ?? []).indexOf(l) >= p);
        return nextLevel ? `${p} — ${nextLevel.cashback_pct}% cashback` : `${p} compras`;
      })()
    : `${p}/${target}`;

  const rewardLine = giftAvailable
    ? `✓ Disponible — ${nonEmpty(card.reward_description, "Recompensa lista")}`
    : `Pendiente — ${nonEmpty(card.reward_description, "Completa los sellos")}`;

  return {
    id: objectId,
    classId,
    state: "ACTIVE" as const,
    accountId: customerCardId,
    accountName: nonEmpty(customerName, "Miembro"),
    loyaltyPoints: {
      balance: { string: stampsLabel },
      label: card.type === "cashback" ? "Cashback" : "Sellos",
    },
    barcode: barcodeBlock(customerCardId),
    textModulesData: [
      {
        id: "reward_status",
        header: "Estado de recompensa",
        body: rewardLine,
      },
    ],
  };
}

// ─── Offer class / object (coupon, discount) ──────────────────────────────────

function offerRedemptionChannel(
  channel: string | undefined
): "INSTORE" | "ONLINE" | "BOTH" | "INSTORE_ONLY" {
  switch (channel) {
    case "online": return "ONLINE";
    case "both":   return "BOTH";
    default:       return "INSTORE";
  }
}

function buildOfferClassBody(classId: string, card: Card) {
  const hexBackgroundColor = rgbToHex(card.design.bg_color);
  const programName = nonEmpty(card.design.program_name, card.name);

  const discountText = card.config.discount_value
    ? card.config.discount_type === "pct"
      ? `${card.config.discount_value}% de descuento`
      : `$${card.config.discount_value} de descuento`
    : programName;

  const body: Record<string, unknown> = {
    id: classId,
    issuerName: programName,
    title: discountText,
    provider: programName,
    redemptionChannel: offerRedemptionChannel(card.config.redemption_channel),
    reviewStatus: "UNDER_REVIEW",
    hexBackgroundColor,
    titleImage: logoImage(card.design.logo_url, programName),
    heroImage: heroImage(card.design.hero_url),
  };

  if (card.design.fine_print) {
    body.finePrint = card.design.fine_print;
  }

  return body;
}

function buildOfferObjectBody(params: PassObjectParams) {
  const { card, objectId, classId, customerCardId } = params;

  const textModules: { id: string; header: string; body: string }[] = [];

  if (card.config.promo_code) {
    textModules.push({ id: "promo_code", header: "Código", body: card.config.promo_code });
  }

  if (card.config.discount_value) {
    const label = card.config.discount_type === "pct"
      ? `${card.config.discount_value}%`
      : `$${card.config.discount_value} MXN`;
    textModules.push({ id: "discount", header: "Descuento", body: label });
  }

  return {
    id: objectId,
    classId,
    state: "ACTIVE" as const,
    barcode: barcodeBlock(card.config.promo_code ?? customerCardId),
    textModulesData: textModules.length > 0 ? textModules : undefined,
  };
}

// ─── Gift card class / object ─────────────────────────────────────────────────

function buildGiftCardClassBody(classId: string, card: Card) {
  const hexBackgroundColor = rgbToHex(card.design.bg_color);
  const programName = nonEmpty(card.design.program_name, card.name);
  const currency = nonEmpty(card.config.currency, "MXN");

  return {
    id: classId,
    issuerName: programName,
    merchantName: programName,
    reviewStatus: "UNDER_REVIEW",
    hexBackgroundColor,
    cardNumberLabel: "Número de tarjeta",
    eventNumberLabel: "Código",
    programLogo: logoImage(card.design.logo_url, programName),
    heroImage: heroImage(card.design.hero_url),
    textModulesData: [
      {
        id: "currency",
        header: "Moneda",
        body: currency,
      },
    ],
  };
}

function buildGiftCardObjectBody(params: PassObjectParams) {
  const { card, objectId, classId, customerCardId } = params;
  const currency = nonEmpty(card.config.currency, "MXN");
  const initialBalance = card.config.initial_balance ?? 0;

  return {
    id: objectId,
    classId,
    state: "ACTIVE" as const,
    cardNumber: customerCardId,
    balance: {
      micros: String(Math.round(initialBalance * 1_000_000)),
      currencyCode: currency,
    },
    barcode: barcodeBlock(customerCardId),
  };
}

// ─── Generic class / object (event, fallback) ─────────────────────────────────

function buildGenericClassBody(classId: string, card: Card) {
  const hexBackgroundColor = rgbToHex(card.design.bg_color);
  const programName = nonEmpty(card.design.program_name, card.name);

  return {
    id: classId,
    issuerName: programName,
    reviewStatus: "UNDER_REVIEW" as const,
    hexBackgroundColor,
    programName,
    classTemplateInfo: {
      cardTemplateOverride: {
        cardRowTemplateInfos: [
          {
            twoItems: {
              startItem: { firstValue: { fields: [{ fieldPath: "object.textModulesData['policy']" }] } },
              endItem: { firstValue: { fields: [{ fieldPath: "object.textModulesData['support']" }] } },
            },
          },
          {
            oneItem: {
              item: { firstValue: { fields: [{ fieldPath: "object.textModulesData['loyalty_progress']" }] } },
            },
          },
          {
            oneItem: {
              item: { firstValue: { fields: [{ fieldPath: "object.textModulesData['loyalty_gift']" }] } },
            },
          },
        ],
      },
    },
  };
}

function buildGenericObjectBody(params: PassObjectParams) {
  const { card, objectId, classId, customerName, customerCardId, purchases, giftAvailable } = params;
  const logoUri = nonEmpty(card.design.logo_url, DEFAULT_LOGO_URI);
  const heroUri = nonEmpty(card.design.hero_url, DEFAULT_HERO_URI);
  const programName = nonEmpty(card.design.program_name, card.name);
  const target = Math.max(1, card.target_purchases || 1);
  const p = Math.min(purchases, target);
  const dots = `${"●".repeat(p)}${"○".repeat(target - p)}`;
  const progress = `${dots} (${p}/${target})`;
  const giftLine = giftAvailable
    ? `Disponible — ${nonEmpty(card.reward_description, "Recompensa lista")}`
    : `Pendiente — ${nonEmpty(card.reward_description, "Completa los sellos")}`;

  return {
    id: objectId,
    classId,
    state: "ACTIVE" as const,
    cardTitle: { defaultValue: { language: "es", value: programName } },
    header: { defaultValue: { language: "es", value: nonEmpty(customerName, "Miembro") } },
    subheader: { defaultValue: { language: "es", value: programName } },
    logo: {
      sourceUri: { uri: logoUri },
      contentDescription: { defaultValue: { language: "es", value: "Logo" } },
    },
    heroImage: {
      sourceUri: { uri: heroUri },
      contentDescription: { defaultValue: { language: "es", value: "Banner" } },
    },
    barcode: barcodeBlock(customerCardId),
    textModulesData: [
      { id: "policy",          header: "ID de miembro",   body: customerCardId },
      { id: "support",         header: "Programa",        body: programName },
      { id: "loyalty_progress",header: "Progreso",        body: progress },
      { id: "loyalty_gift",    header: "Recompensa",      body: giftLine },
    ],
  };
}

// ─── Class dispatch ───────────────────────────────────────────────────────────

function buildClassBody(classId: string, card: Card) {
  const passType = resolvePassType(card.type);
  switch (passType) {
    case "loyalty":  return { passType, body: buildLoyaltyClassBody(classId, card) };
    case "offer":    return { passType, body: buildOfferClassBody(classId, card) };
    case "giftcard": return { passType, body: buildGiftCardClassBody(classId, card) };
    default:         return { passType, body: buildGenericClassBody(classId, card) };
  }
}

function buildObjectBody(params: PassObjectParams) {
  const passType = resolvePassType(params.card.type);
  switch (passType) {
    case "loyalty":  return { passType, body: buildLoyaltyObjectBody(params) };
    case "offer":    return { passType, body: buildOfferObjectBody(params) };
    case "giftcard": return { passType, body: buildGiftCardObjectBody(params) };
    default:         return { passType, body: buildGenericObjectBody(params) };
  }
}

// ─── CRUD helpers ─────────────────────────────────────────────────────────────

async function upsertClass(
  walletClient: Awaited<ReturnType<typeof getWalletClient>>,
  passType: WalletPassType,
  classId: string,
  classBody: Record<string, unknown>
) {
  const resource = passType === "loyalty"  ? walletClient.loyaltyclass
                 : passType === "offer"    ? walletClient.offerclass
                 : passType === "giftcard" ? walletClient.giftcardclass
                 :                          walletClient.genericclass;

  try {
    await resource.get({ resourceId: classId });
    await resource.update({ resourceId: classId, requestBody: classBody });
  } catch (err) {
    if (isNotFound(err)) {
      await resource.insert({ requestBody: classBody });
    } else {
      throw err;
    }
  }
}

async function upsertObject(
  walletClient: Awaited<ReturnType<typeof getWalletClient>>,
  passType: WalletPassType,
  objectId: string,
  objectBody: Record<string, unknown>
) {
  const resource = passType === "loyalty"  ? walletClient.loyaltyobject
                 : passType === "offer"    ? walletClient.offerobject
                 : passType === "giftcard" ? walletClient.giftcardobject
                 :                          walletClient.genericobject;

  try {
    await resource.get({ resourceId: objectId });
    await resource.update({ resourceId: objectId, requestBody: objectBody });
  } catch (err) {
    if (isNotFound(err)) {
      await resource.insert({ requestBody: objectBody });
    } else {
      throw err;
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Creates or updates the Google Wallet class for a card template. */
export async function ensureWalletClass(card: Card, classId: string): Promise<void> {
  const walletClient = await getWalletClient();
  const { passType, body } = buildClassBody(classId, card);
  await upsertClass(walletClient, passType, classId, body as Record<string, unknown>);
}

/** Creates or updates the Google Wallet object for a customer_card, and returns the save link. */
export async function createOrUpdatePass(params: PassObjectParams): Promise<{
  objectId: string;
  saveLink: string;
}> {
  const { authClient, credentials } = await getAuthClient();
  const walletClient = google.walletobjects({ version: "v1", auth: authClient as JWT });

  const { passType, body: classBody } = buildClassBody(params.classId, params.card);
  await upsertClass(walletClient, passType, params.classId, classBody as Record<string, unknown>);

  const { body: objectBody } = buildObjectBody(params);
  await upsertObject(walletClient, passType, params.objectId, objectBody as Record<string, unknown>);

  const claims = {
    iss: credentials.client_email,
    aud: "google",
    origins: [] as string[],
    typ: "savetowallet",
    payload: {
      [jwtPayloadKey(passType)]: [{ id: params.objectId }],
    },
  };
  const token = jwt.sign(claims, credentials.private_key, { algorithm: "RS256" });
  const saveLink = `https://pay.google.com/gp/v/save/${token}`;

  return { objectId: params.objectId, saveLink };
}
