import type { SupabaseClient } from "@supabase/supabase-js";
import {
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
  subYears,
} from "date-fns";
import { es } from "date-fns/locale";

export interface ReportData {
  kpis: {
    customers: number;
    cards: number;
    purchases: number;
    redemptions: number;
  };
  monthly: { month: string; purchases: number; redemptions: number }[];
  customerGrowth: { month: string; count: number }[];
}

export function parsePeriod(period: string | null | undefined): Date {
  const now = new Date();
  switch (period) {
    case "7d":
      return subDays(now, 7);
    case "30d":
      return subDays(now, 30);
    case "3m":
      return subMonths(now, 3);
    case "6m":
      return subMonths(now, 6);
    case "1y":
      return subYears(now, 1);
    default:
      return subMonths(now, 6);
  }
}

function bucketGranularity(period: string | null | undefined): "day" | "month" {
  if (period === "7d" || period === "30d") return "day";
  return "month";
}

export async function getReportData(
  supabase: SupabaseClient,
  businessId: string,
  options: {
    period: string | null | undefined;
    branchId: string | null | undefined;
  }
): Promise<ReportData> {
  const { period, branchId } = options;
  const from = parsePeriod(period);
  const to = new Date();
  const fromIso = from.toISOString();
  const toIso = to.toISOString();
  const granularity = bucketGranularity(period);

  const [{ count: cardsCount }, { count: customersCount }] = await Promise.all([
    supabase
      .from("cards")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("active", true),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .gte("created_at", fromIso)
      .lte("created_at", toIso),
  ]);

  const { data: businessCards } = await supabase
    .from("cards")
    .select("id")
    .eq("business_id", businessId);

  const cardIds = businessCards?.map((c) => c.id) ?? [];

  let purchases: { created_at: string }[] = [];
  let redemptions: { created_at: string }[] = [];

  if (cardIds.length > 0) {
    const { data: customerCards } = await supabase
      .from("customer_cards")
      .select("id")
      .in("card_id", cardIds);

    const ccIds = customerCards?.map((cc) => cc.id) ?? [];

    if (ccIds.length > 0) {
      let pQ = supabase
        .from("purchases")
        .select("created_at")
        .in("customer_card_id", ccIds)
        .gte("created_at", fromIso)
        .lte("created_at", toIso);

      let rQ = supabase
        .from("redemptions")
        .select("created_at")
        .in("customer_card_id", ccIds)
        .gte("created_at", fromIso)
        .lte("created_at", toIso);

      if (branchId) {
        pQ = pQ.eq("branch_id", branchId);
        rQ = rQ.eq("branch_id", branchId);
      }

      const [pRes, rRes] = await Promise.all([pQ, rQ]);
      purchases = pRes.data ?? [];
      redemptions = rRes.data ?? [];
    }
  }

  const purchaseDates = purchases.map((p) => new Date(p.created_at));
  const redemptionDates = redemptions.map((r) => new Date(r.created_at));

  const { data: allCustomerRows } = await supabase
    .from("customers")
    .select("created_at")
    .eq("business_id", businessId);

  const customerDates = (allCustomerRows ?? []).map((c) => new Date(c.created_at));

  let buckets: { start: Date; end: Date; label: string }[] = [];

  if (granularity === "month") {
    const start = startOfMonth(from);
    const end = startOfMonth(to);
    const months = eachMonthOfInterval({ start, end });
    buckets = months.map((m) => ({
      start: startOfMonth(m),
      end: endOfMonth(m),
      label: format(m, "MMM yyyy", { locale: es }),
    }));
  } else {
    const start = startOfDay(from);
    const end = endOfDay(to);
    const days = eachDayOfInterval({ start, end });
    buckets = days.map((d) => ({
      start: startOfDay(d),
      end: endOfDay(d),
      label: format(d, "d MMM", { locale: es }),
    }));
  }

  const monthly = buckets.map((b) => {
    const p = purchaseDates.filter((d) => d >= b.start && d <= b.end).length;
    const r = redemptionDates.filter((d) => d >= b.start && d <= b.end).length;
    return { month: b.label, purchases: p, redemptions: r };
  });

  const customerGrowth = buckets.map((b) => {
    const count = customerDates.filter((d) => d <= b.end).length;
    return { month: b.label, count };
  });

  return {
    kpis: {
      customers: customersCount ?? 0,
      cards: cardsCount ?? 0,
      purchases: purchases.length,
      redemptions: redemptions.length,
    },
    monthly,
    customerGrowth,
  };
}
