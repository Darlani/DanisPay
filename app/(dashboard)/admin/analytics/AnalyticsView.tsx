"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  FileSpreadsheet,
  FileText,
  Gift,
  Hourglass,
  Lightbulb,
  Loader2,
  Percent,
  RefreshCw,
  RotateCw,
  ShoppingCart,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/utils/supabaseClient";

type TimeRange = "TODAY" | "YESTERDAY" | "7D" | "30D" | "MONTH" | "LAST_MONTH" | "YEAR" | "CUSTOM" | "ALL";

type OrderRecord = {
  created_at: string | null;
  status: string | null;
  price: number | string | null;
  buy_price: number | string | null;
  email: string | null;
  user_id: string | null;
  cashback: number | string | null;
  referral_commission: number | string | null;
  category: string | null;
};

type WithdrawalRecord = {
  created_at: string | null;
  status: string | null;
  amount: number | string | null;
  admin_fee: number | string | null;
};

type BalanceLogRecord = {
  created_at: string | null;
  type: string | null;
  amount: number | string | null;
  upgrade_fee: number | string | null;
};

type DepositRecord = {
  created_at: string | null;
  status: string | null;
  amount: number | string | null;
};

type CategoryRecord = { name: string | null };
type ProfileRecord = { id: string; member_type: string | null };

type AnalyticsDataset = {
  orders: OrderRecord[];
  withdrawals: WithdrawalRecord[];
  balanceLogs: BalanceLogRecord[];
  deposits: DepositRecord[];
};

type CategoryMetric = {
  name: string;
  totalOrders: number;
  successfulOrders: number;
  omzet: number;
  vendorCost: number;
  grossMargin: number;
  successRate: number;
  marginRate: number;
};

type TrendPoint = {
  key: string;
  label: string;
  totalOrders: number;
  omzet: number;
  grossMargin: number;
};

type TrendGranularity = "hourly" | "daily" | "weekly" | "monthly";

type DateWindow = {
  start: Date;
  end: Date;
};

type BenchmarkPlan = {
  label: string;
  detail: string;
  windows: DateWindow[];
};

const FINAL_ORDER_STATUS = "Berhasil";
const WALLET_FLOW_SUCCESS_STATUS = "Success";

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatRupiah(value: unknown) {
  return `Rp ${Math.round(toNumber(value)).toLocaleString("id-ID")}`;
}

function formatSignedRupiah(value: unknown) {
  const amount = Math.round(toNumber(value));
  if (amount === 0) return "Rp 0";
  return `${amount > 0 ? "+" : "-"}${formatRupiah(Math.abs(amount))}`;
}

function formatCompactRupiah(value: unknown) {
  const amount = Math.abs(toNumber(value));
  if (amount >= 1_000_000_000) return `Rp${(amount / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}M`;
  if (amount >= 1_000_000) return `Rp${(amount / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}jt`;
  if (amount >= 1_000) return `Rp${(amount / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 0 })}k`;
  return `Rp${Math.round(amount).toLocaleString("id-ID")}`;
}

function isFinalOrder(status: unknown) {
  return status === FINAL_ORDER_STATUS;
}

function isSuccessfulWalletFlow(status: unknown) {
  return status === WALLET_FLOW_SUCCESS_STATUS;
}

function getRangeLabel(range: TimeRange) {
  switch (range) {
    case "TODAY":
      return "Hari Ini";
    case "YESTERDAY":
      return "Kemarin";
    case "7D":
      return "7 Hari Terakhir";
    case "30D":
      return "30 Hari Terakhir";
    case "MONTH":
      return "Bulan Ini";
    case "LAST_MONTH":
      return "Bulan Lalu";
    case "YEAR":
      return "Tahun Ini";
    case "CUSTOM":
      return "Rentang Tanggal";
    case "ALL":
      return "Semua Data";
  }
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value: Date, amount: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

function parseDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : startOfDay(date);
}

function toDateInputValue(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function formatRangeDate(value: Date) {
  return value.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function getRangeBounds(range: TimeRange, customStartValue = "", customEndValue = "") {
  const now = new Date();

  if (range === "ALL") {
    return { currentStart: null, currentEnd: null, previousStart: null, previousEnd: null };
  }

  let currentStart: Date;
  let currentEnd: Date;
  let previousStart: Date;
  let previousEnd: Date;

  if (range === "TODAY") {
    currentStart = startOfDay(now);
    currentEnd = now;
    previousStart = addDays(currentStart, -1);
    previousEnd = new Date(previousStart.getTime() + (currentEnd.getTime() - currentStart.getTime()));
    return { currentStart, currentEnd, previousStart, previousEnd };
  }

  if (range === "YESTERDAY") {
    currentEnd = startOfDay(now);
    currentStart = addDays(currentEnd, -1);
    previousEnd = currentStart;
    previousStart = addDays(previousEnd, -1);
    return { currentStart, currentEnd, previousStart, previousEnd };
  }

  if (range === "7D" || range === "30D") {
    const days = range === "7D" ? 7 : 30;
    currentEnd = now;
    currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    previousEnd = currentStart;
    previousStart = new Date(previousEnd.getTime() - days * 24 * 60 * 60 * 1000);
    return { currentStart, currentEnd, previousStart, previousEnd };
  }

  if (range === "MONTH") {
    currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
    currentEnd = now;
    previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
    previousEnd = new Date(previousStart.getTime() + (currentEnd.getTime() - currentStart.getTime()));
    if (previousEnd > previousMonthEnd) previousEnd = previousMonthEnd;
    return { currentStart, currentEnd, previousStart, previousEnd };
  }

  if (range === "LAST_MONTH") {
    currentStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    currentEnd = new Date(now.getFullYear(), now.getMonth(), 1);
    previousStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    previousEnd = currentStart;
    return { currentStart, currentEnd, previousStart, previousEnd };
  }

  if (range === "YEAR") {
    currentStart = new Date(now.getFullYear(), 0, 1);
    currentEnd = now;
    previousStart = new Date(now.getFullYear() - 1, 0, 1);
    const previousYearEnd = new Date(now.getFullYear(), 0, 1);
    previousEnd = new Date(previousStart.getTime() + (currentEnd.getTime() - currentStart.getTime()));
    if (previousEnd > previousYearEnd) previousEnd = previousYearEnd;
    return { currentStart, currentEnd, previousStart, previousEnd };
  }

  const customStart = parseDateInput(customStartValue);
  const customEndDay = parseDateInput(customEndValue);
  if (!customStart || !customEndDay || customEndDay < customStart) {
    return { currentStart: null, currentEnd: null, previousStart: null, previousEnd: null };
  }

  currentStart = customStart;
  currentEnd = addDays(customEndDay, 1);
  previousEnd = currentStart;
  previousStart = new Date(previousEnd.getTime() - (currentEnd.getTime() - currentStart.getTime()));
  return { currentStart, currentEnd, previousStart, previousEnd };
}

function formatClock(value: Date) {
  return value.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatClosedWindow(start: Date, endExclusive: Date) {
  const endInclusive = new Date(endExclusive.getTime() - 1);
  const startLabel = formatRangeDate(start);
  const endLabel = formatRangeDate(endInclusive);
  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
}

function getCurrentPeriodDateLabel(range: TimeRange, bounds: ReturnType<typeof getRangeBounds>) {
  if (range === "ALL") return "Seluruh riwayat data";
  if (!bounds.currentStart || !bounds.currentEnd) return "Pilih tanggal mulai dan selesai";

  if (range === "TODAY") {
    return `${formatRangeDate(bounds.currentStart)} · sampai ${formatClock(bounds.currentEnd)}`;
  }

  if (range === "YESTERDAY") {
    return formatRangeDate(bounds.currentStart);
  }

  if (range === "7D" || range === "30D" || range === "MONTH" || range === "YEAR") {
    return `${formatRangeDate(bounds.currentStart)} – ${formatRangeDate(bounds.currentEnd)}`;
  }

  return formatClosedWindow(bounds.currentStart, bounds.currentEnd);
}

function getSectionPeriodContext(
  range: TimeRange,
  bounds: ReturnType<typeof getRangeBounds>,
) {
  const currentStart = bounds.currentStart;
  const currentEnd = bounds.currentEnd;

  if (range === "ALL") return "Semua Data";
  if (!currentStart || !currentEnd) return "Periode belum dipilih";

  if (range === "TODAY") {
    const weekday = currentStart.toLocaleDateString("id-ID", { weekday: "long" });
    return `Hari ${weekday} · sampai ${formatClock(currentEnd)}`;
  }

  if (range === "YESTERDAY") {
    const weekday = currentStart.toLocaleDateString("id-ID", { weekday: "long" });
    return `Hari ${weekday}`;
  }

  if (range === "7D") return "7 Hari Terakhir";
  if (range === "30D") return "30 Hari Terakhir";

  if (range === "MONTH" || range === "LAST_MONTH") {
    const month = currentStart.toLocaleDateString("id-ID", { month: "long" });
    return `Bulan ${month}`;
  }

  if (range === "YEAR") {
    return `Tahun ${currentStart.getFullYear()}`;
  }

  if (range === "CUSTOM") {
    return `Rentang ${formatClosedWindow(currentStart, currentEnd)}`;
  }

  return getRangeLabel(range);
}

function getComparisonLabel(range: TimeRange) {
  switch (range) {
    case "TODAY":
      return "Kemarin sampai jam yang sama";
    case "YESTERDAY":
      return "1 Hari Sebelumnya";
    case "7D":
      return "7 Hari Sebelumnya";
    case "30D":
      return "30 Hari Sebelumnya";
    case "MONTH":
      return "Periode Setara Bulan Lalu";
    case "LAST_MONTH":
      return "Bulan Sebelumnya";
    case "YEAR":
      return "Periode Setara Tahun Lalu";
    case "CUSTOM":
      return "Rentang Sebelumnya";
    case "ALL":
      return "Tidak Ada Pembanding";
  }
}

function getComparisonDateLabel(range: TimeRange, bounds: ReturnType<typeof getRangeBounds>) {
  if (range === "ALL") return "Tidak digunakan untuk Semua Data";
  if (!bounds.previousStart || !bounds.previousEnd) return "Pembanding belum tersedia";

  if (range === "TODAY") {
    return `${formatRangeDate(bounds.previousStart)} · sampai ${formatClock(bounds.previousEnd)}`;
  }

  if (range === "YESTERDAY") {
    return formatRangeDate(bounds.previousStart);
  }

  if (range === "7D" || range === "30D" || range === "MONTH" || range === "YEAR") {
    return `${formatRangeDate(bounds.previousStart)} – ${formatRangeDate(bounds.previousEnd)}`;
  }

  return formatClosedWindow(bounds.previousStart, bounds.previousEnd);
}

function getBenchmarkPlan(range: TimeRange, bounds: ReturnType<typeof getRangeBounds>): BenchmarkPlan {
  if (range === "ALL") {
    return {
      label: "Rata-rata Bulanan Historis",
      detail: "Rata-rata bulan penuh yang tercatat sebelum bulan berjalan",
      windows: [],
    };
  }

  if (!bounds.currentStart || !bounds.currentEnd) {
    return {
      label: "Benchmark Belum Tersedia",
      detail: "Lengkapi rentang tanggal terlebih dahulu",
      windows: [],
    };
  }

  const duration = bounds.currentEnd.getTime() - bounds.currentStart.getTime();

  if (range === "TODAY" || range === "YESTERDAY") {
    const weekday = bounds.currentStart.toLocaleDateString("id-ID", { weekday: "long" });
    const windows = Array.from({ length: 4 }, (_, index) => {
      const start = addDays(bounds.currentStart!, -7 * (index + 1));
      const end = range === "TODAY"
        ? new Date(start.getTime() + duration)
        : addDays(start, 1);
      return { start, end };
    });

    const benchmarkDates = [...windows]
      .reverse()
      .map((window) => formatRangeDate(window.start))
      .join(", ");

    return {
      label: `Rata-rata ${weekday} 4 Minggu`,
      detail: range === "TODAY"
        ? `${benchmarkDates} · sampai ${formatClock(bounds.currentEnd)}`
        : benchmarkDates,
      windows,
    };
  }

  if (range === "7D" || range === "30D" || range === "CUSTOM") {
    const count = range === "7D" ? 4 : 3;
    const label = range === "7D"
      ? "Rata-rata 4 Periode 7-Harian"
      : range === "30D"
        ? "Rata-rata 3 Periode 30-Harian"
        : "Rata-rata 3 Rentang Setara";

    const windows = Array.from({ length: count }, (_, index) => {
      const end = new Date(bounds.currentStart!.getTime() - duration * index);
      const start = new Date(end.getTime() - duration);
      return { start, end };
    });

    return {
      label,
      detail: `${formatClosedWindow(windows[windows.length - 1].start, windows[0].end)} · rata-rata ${count} periode`,
      windows,
    };
  }

  if (range === "MONTH") {
    const fullPreviousMonthStart = new Date(bounds.currentStart.getFullYear(), bounds.currentStart.getMonth() - 1, 1);
    const fullPreviousMonthEnd = new Date(bounds.currentStart.getFullYear(), bounds.currentStart.getMonth(), 1);
    return {
      label: "Bulan Lalu Penuh",
      detail: formatClosedWindow(fullPreviousMonthStart, fullPreviousMonthEnd),
      windows: [{ start: fullPreviousMonthStart, end: fullPreviousMonthEnd }],
    };
  }

  if (range === "LAST_MONTH") {
    const windows = Array.from({ length: 3 }, (_, index) => {
      const end = new Date(bounds.currentStart!.getFullYear(), bounds.currentStart!.getMonth() - index, 1);
      const start = new Date(bounds.currentStart!.getFullYear(), bounds.currentStart!.getMonth() - index - 1, 1);
      return { start, end };
    });
    return {
      label: "Rata-rata 3 Bulan Sebelumnya",
      detail: `${formatClosedWindow(windows[2].start, windows[0].end)} · rata-rata 3 bulan`,
      windows,
    };
  }

  const previousYearStart = new Date(bounds.currentStart.getFullYear() - 1, 0, 1);
  const previousYearEnd = new Date(bounds.currentStart.getFullYear(), 0, 1);
  return {
    label: "Tahun Lalu Penuh",
    detail: formatClosedWindow(previousYearStart, previousYearEnd),
    windows: [{ start: previousYearStart, end: previousYearEnd }],
  };
}

function getBenchmarkQueryBounds(plan: BenchmarkPlan) {
  if (plan.windows.length === 0) return { start: null, end: null };
  return {
    start: new Date(Math.min(...plan.windows.map((window) => window.start.getTime()))),
    end: new Date(Math.max(...plan.windows.map((window) => window.end.getTime()))),
  };
}

function recordInWindow(record: { created_at: string | null }, window: DateWindow) {
  if (!record.created_at) return false;
  const createdAt = new Date(record.created_at);
  if (Number.isNaN(createdAt.getTime())) return false;
  return createdAt >= window.start && createdAt < window.end;
}

function filterDatasetByWindow(dataset: AnalyticsDataset, window: DateWindow): AnalyticsDataset {
  return {
    orders: dataset.orders.filter((record) => recordInWindow(record, window)),
    withdrawals: dataset.withdrawals.filter((record) => recordInWindow(record, window)),
    balanceLogs: dataset.balanceLogs.filter((record) => recordInWindow(record, window)),
    deposits: dataset.deposits.filter((record) => recordInWindow(record, window)),
  };
}

function getHistoricalFullMonthWindows(dataset: AnalyticsDataset) {
  const timestamps = [
    ...dataset.orders.map((record) => record.created_at),
    ...dataset.withdrawals.map((record) => record.created_at),
    ...dataset.balanceLogs.map((record) => record.created_at),
    ...dataset.deposits.map((record) => record.created_at),
  ]
    .filter((value): value is string => typeof value === "string")
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()));

  if (timestamps.length === 0) return [] as DateWindow[];

  const earliest = new Date(Math.min(...timestamps.map((value) => value.getTime())));
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  // Exclude the first recorded month because it may be a partial launch month.
  let cursor = new Date(earliest.getFullYear(), earliest.getMonth() + 1, 1);
  const windows: DateWindow[] = [];

  while (cursor < currentMonthStart) {
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    windows.push({ start: new Date(cursor), end });
    cursor = end;
  }

  return windows;
}

function getTrendGranularity(
  range: TimeRange,
  bounds: ReturnType<typeof getRangeBounds>,
): TrendGranularity {
  if (range === "TODAY" || range === "YESTERDAY") return "hourly";
  if (range === "YEAR" || range === "ALL") return "monthly";

  if (range === "CUSTOM" && bounds.currentStart && bounds.currentEnd) {
    const durationDays = Math.ceil(
      (bounds.currentEnd.getTime() - bounds.currentStart.getTime()) /
        (24 * 60 * 60 * 1000),
    );

    if (durationDays <= 31) return "daily";
    if (durationDays <= 120) return "weekly";
    return "monthly";
  }

  return "daily";
}

function getTrendGranularityLabel(granularity: TrendGranularity) {
  switch (granularity) {
    case "hourly":
      return "Per Jam";
    case "daily":
      return "Harian";
    case "weekly":
      return "Mingguan";
    case "monthly":
      return "Bulanan";
  }
}

function formatTrendShortDate(value: Date) {
  return value.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
  });
}

function getTrendBucket(
  value: string | null,
  granularity: TrendGranularity,
  rangeStart: Date | null,
  rangeEnd: Date | null,
) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  if (granularity === "hourly") {
    const hour = String(date.getHours()).padStart(2, "0");
    return {
      key: `${year}-${month}-${day}-${hour}`,
      label: `${hour}:00`,
    };
  }

  if (granularity === "daily") {
    return {
      key: `${year}-${month}-${day}`,
      label: date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
      }),
    };
  }

  if (granularity === "weekly") {
    const anchor = startOfDay(rangeStart ?? date);
    const currentDay = startOfDay(date);
    const elapsedDays = Math.max(
      0,
      Math.floor(
        (currentDay.getTime() - anchor.getTime()) /
          (24 * 60 * 60 * 1000),
      ),
    );
    const weekIndex = Math.floor(elapsedDays / 7);
    const bucketStart = addDays(anchor, weekIndex * 7);
    let bucketEnd = addDays(bucketStart, 6);

    if (rangeEnd) {
      const inclusiveRangeEnd = startOfDay(
        new Date(Math.max(rangeEnd.getTime() - 1, rangeStart?.getTime() ?? 0)),
      );
      if (bucketEnd > inclusiveRangeEnd) bucketEnd = inclusiveRangeEnd;
    }

    return {
      key: `${toDateInputValue(bucketStart)}-W`,
      label:
        bucketStart.toDateString() === bucketEnd.toDateString()
          ? formatTrendShortDate(bucketStart)
          : `${formatTrendShortDate(bucketStart)}–${formatTrendShortDate(bucketEnd)}`,
    };
  }

  return {
    key: `${year}-${month}`,
    label: date.toLocaleDateString("id-ID", {
      month: "short",
      year: "numeric",
    }),
  };
}

function getCategoryDisplayName(value: string) {
  const trimmed = value.trim();
  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!trimmed) return "Lainnya";
  if (uuidLike.test(trimmed)) return "Kategori Tidak Dikenali";
  return trimmed;
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function buildSummary(
  dataset: AnalyticsDataset,
  categories: CategoryRecord[],
  profiles: ProfileRecord[],
) {
  const { orders, deposits, withdrawals, balanceLogs } = dataset;
  const finalOrders = orders.filter((order) => isFinalOrder(order.status));
  const successfulDeposits = deposits.filter((deposit) => isSuccessfulWalletFlow(deposit.status));
  const successfulWithdrawals = withdrawals.filter((withdrawal) => isSuccessfulWalletFlow(withdrawal.status));

  const omzet = finalOrders.reduce((sum, order) => sum + toNumber(order.price), 0);
  const vendorCost = finalOrders.reduce((sum, order) => sum + toNumber(order.buy_price), 0);
  const grossMargin = omzet - vendorCost;
  const cashback = finalOrders.reduce((sum, order) => sum + toNumber(order.cashback), 0);
  const referral = finalOrders.reduce((sum, order) => sum + toNumber(order.referral_commission), 0);
  const orderContribution = grossMargin - cashback - referral;

  const memberOrders = orders.filter((order) => typeof order.user_id === "string" && order.user_id.trim().length > 0);
  const guestOrders = orders.filter((order) => !order.user_id || order.user_id.trim().length === 0);
  const profileTypeById = new Map(
    profiles.map((profile) => [profile.id, profile.member_type?.trim().toLowerCase() ?? ""]),
  );
  const regularOrders = memberOrders.filter((order) => order.user_id && profileTypeById.get(order.user_id) === "regular");
  const specialOrders = memberOrders.filter((order) => order.user_id && profileTypeById.get(order.user_id) === "special");

  const upgradeFee = balanceLogs
    .filter((log) => log.type === "Upgrade")
    .reduce((sum, log) => sum + Math.max(0, toNumber(log.upgrade_fee)), 0);
  const withdrawalAdminFee = successfulWithdrawals.reduce(
    (sum, withdrawal) => sum + Math.max(0, toNumber(withdrawal.admin_fee)),
    0,
  );
  const refundWallet = balanceLogs
    .filter((log) => log.type === "Refund" && toNumber(log.amount) > 0)
    .reduce((sum, log) => sum + toNumber(log.amount), 0);
  const adminAdjustmentNet = balanceLogs
    .filter((log) => log.type === "AdminAdjustment")
    .reduce((sum, log) => sum + toNumber(log.amount), 0);
  const depositFlow = successfulDeposits.reduce((sum, deposit) => sum + toNumber(deposit.amount), 0);
  const withdrawalFlow = successfulWithdrawals.reduce((sum, withdrawal) => sum + toNumber(withdrawal.amount), 0);

  const categoryMap = new Map<string, CategoryMetric>();
  categories.forEach((category) => {
    const name = category.name?.trim();
    if (!name) return;
    categoryMap.set(name.toUpperCase(), {
      name,
      totalOrders: 0,
      successfulOrders: 0,
      omzet: 0,
      vendorCost: 0,
      grossMargin: 0,
      successRate: 0,
      marginRate: 0,
    });
  });

  orders.forEach((order) => {
    const displayName = order.category?.trim() || "Lainnya";
    const key = displayName.toUpperCase();
    const current = categoryMap.get(key) ?? {
      name: displayName,
      totalOrders: 0,
      successfulOrders: 0,
      omzet: 0,
      vendorCost: 0,
      grossMargin: 0,
      successRate: 0,
      marginRate: 0,
    };

    current.totalOrders += 1;
    if (isFinalOrder(order.status)) {
      current.successfulOrders += 1;
      current.omzet += toNumber(order.price);
      current.vendorCost += toNumber(order.buy_price);
    }
    current.grossMargin = current.omzet - current.vendorCost;
    current.successRate = current.totalOrders === 0 ? 0 : (current.successfulOrders / current.totalOrders) * 100;
    current.marginRate = current.omzet === 0 ? 0 : (current.grossMargin / current.omzet) * 100;
    categoryMap.set(key, current);
  });

  const performanceByCategory = Array.from(categoryMap.values())
    .filter((category) => category.totalOrders > 0)
    .sort(
      (a, b) =>
        b.grossMargin - a.grossMargin ||
        b.totalOrders - a.totalOrders ||
        a.name.localeCompare(b.name, "id-ID"),
    );

  const statusCount = (status: string) => orders.filter((order) => order.status === status).length;
  const knownStatusCount = ["Berhasil", "Pending", "Diproses", "Gagal"].reduce(
    (sum, status) => sum + statusCount(status),
    0,
  );
  const successCount = finalOrders.length;

  return {
    totalOrders: orders.length,
    successCount,
    pendingCount: statusCount("Pending"),
    processingCount: statusCount("Diproses"),
    failedCount: statusCount("Gagal"),
    successRate: orders.length === 0 ? 0 : (successCount / orders.length) * 100,
    omzet,
    vendorCost,
    grossMargin,
    grossMarginRate: omzet === 0 ? 0 : (grossMargin / omzet) * 100,
    cashback,
    referral,
    orderContribution,
    orderContributionRate: omzet === 0 ? 0 : (orderContribution / omzet) * 100,
    memberOrderCount: memberOrders.length,
    guestOrderCount: guestOrders.length,
    regularOrderCount: regularOrders.length,
    specialOrderCount: specialOrders.length,
    upgradeFee,
    withdrawalAdminFee,
    refundWallet,
    adminAdjustmentNet,
    depositFlow,
    withdrawalFlow,
    performanceByCategory,
    statusDistribution: [
      { name: "Berhasil", value: statusCount("Berhasil"), color: "#10B981" },
      { name: "Pending", value: statusCount("Pending"), color: "#F59E0B" },
      { name: "Diproses", value: statusCount("Diproses"), color: "#3B82F6" },
      { name: "Gagal", value: statusCount("Gagal"), color: "#F43F5E" },
      { name: "Lainnya", value: Math.max(0, orders.length - knownStatusCount), color: "#94A3B8" },
    ].filter((item) => item.value > 0),
  };
}

type BenchmarkSummary = {
  totalOrders: number;
  successCount: number;
  successRate: number;
  omzet: number;
  grossMargin: number;
  depositFlow: number;
  withdrawalFlow: number;
  refundWallet: number;
  adminAdjustmentNet: number;
};

function averageBenchmarkSummaries(summaries: ReturnType<typeof buildSummary>[]): BenchmarkSummary | null {
  if (summaries.length === 0) return null;
  const average = (pick: (summary: ReturnType<typeof buildSummary>) => number) =>
    summaries.reduce((sum, summary) => sum + pick(summary), 0) / summaries.length;

  return {
    totalOrders: average((summary) => summary.totalOrders),
    successCount: average((summary) => summary.successCount),
    successRate: average((summary) => summary.successRate),
    omzet: average((summary) => summary.omzet),
    grossMargin: average((summary) => summary.grossMargin),
    depositFlow: average((summary) => summary.depositFlow),
    withdrawalFlow: average((summary) => summary.withdrawalFlow),
    refundWallet: average((summary) => summary.refundWallet),
    adminAdjustmentNet: average((summary) => summary.adminAdjustmentNet),
  };
}

function formatBenchmarkMetric(
  current: number,
  benchmark: number | null | undefined,
  kind: "count" | "money" | "rate",
  signed = false,
  showProgress = true,
) {
  if (benchmark === null || benchmark === undefined) return "Benchmark belum tersedia";

  if (kind === "rate") {
    const benchmarkRate = benchmark.toLocaleString("id-ID", { maximumFractionDigits: 1 });
    if (!showProgress) return `Benchmark ${benchmarkRate}%`;
    const delta = current - benchmark;
    return `Benchmark ${benchmarkRate}% · ${delta >= 0 ? "+" : ""}${delta.toFixed(1)} poin`;
  }

  const benchmarkLabel = kind === "money"
    ? signed
      ? formatSignedRupiah(benchmark)
      : formatRupiah(benchmark)
    : Math.round(benchmark).toLocaleString("id-ID");

  if (!showProgress) return `Benchmark ${benchmarkLabel}`;

  if (signed) {
    const delta = current - benchmark;
    return `Benchmark ${benchmarkLabel} · selisih ${formatSignedRupiah(delta)}`;
  }

  if (benchmark === 0) return `Benchmark ${benchmarkLabel}`;

  const progress = (current / benchmark) * 100;
  return `Benchmark ${benchmarkLabel} · ${progress.toLocaleString("id-ID", { maximumFractionDigits: 1 })}% dari benchmark`;
}

export default function AnalyticsView() {
  const [timeRange, setTimeRange] = useState<TimeRange>("MONTH");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustomRangePopup, setShowCustomRangePopup] = useState(false);
  const [customDraftStart, setCustomDraftStart] = useState("");
  const [customDraftEnd, setCustomDraftEnd] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentData, setCurrentData] = useState<AnalyticsDataset>({
    orders: [],
    withdrawals: [],
    balanceLogs: [],
    deposits: [],
  });
  const [previousData, setPreviousData] = useState<AnalyticsDataset>({
    orders: [],
    withdrawals: [],
    balanceLogs: [],
    deposits: [],
  });
  const [benchmarkData, setBenchmarkData] = useState<AnalyticsDataset>({
    orders: [],
    withdrawals: [],
    balanceLogs: [],
    deposits: [],
  });
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [profiles, setProfiles] = useState<ProfileRecord[]>([]);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const requestSequenceRef = useRef(0);

  const fetchData = useCallback(async () => {
    const requestSequence = ++requestSequenceRef.current;
    setLoading(true);
    setError(null);

    try {
      const rangeBounds = getRangeBounds(timeRange, customStart, customEnd);
      const { currentStart, currentEnd, previousStart, previousEnd } = rangeBounds;
      const benchmarkPlan = getBenchmarkPlan(timeRange, rangeBounds);
      const benchmarkBounds = getBenchmarkQueryBounds(benchmarkPlan);
      const currentStartIso = currentStart?.toISOString();
      const currentEndIso = currentEnd?.toISOString();
      const previousStartIso = previousStart?.toISOString();
      const previousEndIso = previousEnd?.toISOString();
      const benchmarkStartIso = benchmarkBounds.start?.toISOString();
      const benchmarkEndIso = benchmarkBounds.end?.toISOString();

      let currentOrdersQuery = supabase
        .from("orders")
        .select("created_at, status, price, buy_price, email, user_id, cashback, referral_commission, category")
        .order("created_at", { ascending: true });
      let currentWithdrawalsQuery = supabase
        .from("withdrawals")
        .select("created_at, status, amount, admin_fee")
        .order("created_at", { ascending: true });
      let currentLogsQuery = supabase
        .from("balance_logs")
        .select("created_at, type, amount, upgrade_fee")
        .order("created_at", { ascending: true });
      let currentDepositsQuery = supabase
        .from("deposits")
        .select("created_at, status, amount")
        .order("created_at", { ascending: true });

      let previousOrdersQuery = supabase
        .from("orders")
        .select("created_at, status, price, buy_price, email, user_id, cashback, referral_commission, category");
      let previousWithdrawalsQuery = supabase
        .from("withdrawals")
        .select("created_at, status, amount, admin_fee");
      let previousLogsQuery = supabase
        .from("balance_logs")
        .select("created_at, type, amount, upgrade_fee");
      let previousDepositsQuery = supabase
        .from("deposits")
        .select("created_at, status, amount");


      let benchmarkOrdersQuery = supabase
        .from("orders")
        .select("created_at, status, price, buy_price, email, user_id, cashback, referral_commission, category");
      let benchmarkWithdrawalsQuery = supabase
        .from("withdrawals")
        .select("created_at, status, amount, admin_fee");
      let benchmarkLogsQuery = supabase
        .from("balance_logs")
        .select("created_at, type, amount, upgrade_fee");
      let benchmarkDepositsQuery = supabase
        .from("deposits")
        .select("created_at, status, amount");

      if (currentStartIso) {
        currentOrdersQuery = currentOrdersQuery.gte("created_at", currentStartIso);
        currentWithdrawalsQuery = currentWithdrawalsQuery.gte("created_at", currentStartIso);
        currentLogsQuery = currentLogsQuery.gte("created_at", currentStartIso);
        currentDepositsQuery = currentDepositsQuery.gte("created_at", currentStartIso);
      }

      if (currentEndIso) {
        currentOrdersQuery = currentOrdersQuery.lt("created_at", currentEndIso);
        currentWithdrawalsQuery = currentWithdrawalsQuery.lt("created_at", currentEndIso);
        currentLogsQuery = currentLogsQuery.lt("created_at", currentEndIso);
        currentDepositsQuery = currentDepositsQuery.lt("created_at", currentEndIso);
      }

      if (previousStartIso && previousEndIso) {
        previousOrdersQuery = previousOrdersQuery.gte("created_at", previousStartIso).lt("created_at", previousEndIso);
        previousWithdrawalsQuery = previousWithdrawalsQuery.gte("created_at", previousStartIso).lt("created_at", previousEndIso);
        previousLogsQuery = previousLogsQuery.gte("created_at", previousStartIso).lt("created_at", previousEndIso);
        previousDepositsQuery = previousDepositsQuery.gte("created_at", previousStartIso).lt("created_at", previousEndIso);
      } else {
        previousOrdersQuery = previousOrdersQuery.limit(0);
        previousWithdrawalsQuery = previousWithdrawalsQuery.limit(0);
        previousLogsQuery = previousLogsQuery.limit(0);
        previousDepositsQuery = previousDepositsQuery.limit(0);
      }


      if (benchmarkStartIso && benchmarkEndIso) {
        benchmarkOrdersQuery = benchmarkOrdersQuery.gte("created_at", benchmarkStartIso).lt("created_at", benchmarkEndIso);
        benchmarkWithdrawalsQuery = benchmarkWithdrawalsQuery.gte("created_at", benchmarkStartIso).lt("created_at", benchmarkEndIso);
        benchmarkLogsQuery = benchmarkLogsQuery.gte("created_at", benchmarkStartIso).lt("created_at", benchmarkEndIso);
        benchmarkDepositsQuery = benchmarkDepositsQuery.gte("created_at", benchmarkStartIso).lt("created_at", benchmarkEndIso);
      } else {
        benchmarkOrdersQuery = benchmarkOrdersQuery.limit(0);
        benchmarkWithdrawalsQuery = benchmarkWithdrawalsQuery.limit(0);
        benchmarkLogsQuery = benchmarkLogsQuery.limit(0);
        benchmarkDepositsQuery = benchmarkDepositsQuery.limit(0);
      }

      const [
        currentOrdersResult,
        currentWithdrawalsResult,
        currentLogsResult,
        currentDepositsResult,
        previousOrdersResult,
        previousWithdrawalsResult,
        previousLogsResult,
        previousDepositsResult,
        benchmarkOrdersResult,
        benchmarkWithdrawalsResult,
        benchmarkLogsResult,
        benchmarkDepositsResult,
        categoriesResult,
        profilesResult,
      ] = await Promise.all([
        currentOrdersQuery,
        currentWithdrawalsQuery,
        currentLogsQuery,
        currentDepositsQuery,
        previousOrdersQuery,
        previousWithdrawalsQuery,
        previousLogsQuery,
        previousDepositsQuery,
        benchmarkOrdersQuery,
        benchmarkWithdrawalsQuery,
        benchmarkLogsQuery,
        benchmarkDepositsQuery,
        supabase.from("categories").select("name").order("name", { ascending: true }),
        supabase.from("profiles").select("id, member_type"),
      ]);

      const firstError = [
        currentOrdersResult.error,
        currentWithdrawalsResult.error,
        currentLogsResult.error,
        currentDepositsResult.error,
        previousOrdersResult.error,
        previousWithdrawalsResult.error,
        previousLogsResult.error,
        previousDepositsResult.error,
        benchmarkOrdersResult.error,
        benchmarkWithdrawalsResult.error,
        benchmarkLogsResult.error,
        benchmarkDepositsResult.error,
        categoriesResult.error,
        profilesResult.error,
      ].find(Boolean);

      if (firstError) throw firstError;
      if (requestSequence !== requestSequenceRef.current) return;

      setCurrentData({
        orders: (currentOrdersResult.data ?? []) as OrderRecord[],
        withdrawals: (currentWithdrawalsResult.data ?? []) as WithdrawalRecord[],
        balanceLogs: (currentLogsResult.data ?? []) as BalanceLogRecord[],
        deposits: (currentDepositsResult.data ?? []) as DepositRecord[],
      });
      setPreviousData({
        orders: (previousOrdersResult.data ?? []) as OrderRecord[],
        withdrawals: (previousWithdrawalsResult.data ?? []) as WithdrawalRecord[],
        balanceLogs: (previousLogsResult.data ?? []) as BalanceLogRecord[],
        deposits: (previousDepositsResult.data ?? []) as DepositRecord[],
      });
      setBenchmarkData({
        orders: (benchmarkOrdersResult.data ?? []) as OrderRecord[],
        withdrawals: (benchmarkWithdrawalsResult.data ?? []) as WithdrawalRecord[],
        balanceLogs: (benchmarkLogsResult.data ?? []) as BalanceLogRecord[],
        deposits: (benchmarkDepositsResult.data ?? []) as DepositRecord[],
      });
      setCategories((categoriesResult.data ?? []) as CategoryRecord[]);
      setProfiles((profilesResult.data ?? []) as ProfileRecord[]);
    } catch (fetchError) {
      if (requestSequence !== requestSequenceRef.current) return;
      console.error("Gagal memuat Analytics:", fetchError);
      setError("Data Analytics belum dapat dimuat. Silakan coba lagi.");
    } finally {
      if (requestSequence === requestSequenceRef.current) setLoading(false);
    }
  }, [customEnd, customStart, timeRange]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const summary = useMemo(
    () => buildSummary(currentData, categories, profiles),
    [categories, currentData, profiles],
  );
  const previousSummary = useMemo(
    () => buildSummary(previousData, categories, profiles),
    [categories, previousData, profiles],
  );
  const rangeBounds = useMemo(
    () => getRangeBounds(timeRange, customStart, customEnd),
    [customEnd, customStart, timeRange],
  );
  const rangeDateLabel = useMemo(
    () => getCurrentPeriodDateLabel(timeRange, rangeBounds),
    [rangeBounds, timeRange],
  );
  const activePeriodLabel = getRangeLabel(timeRange);
  const activePeriodContext = `${activePeriodLabel} · ${rangeDateLabel}`;
  const sectionPeriodContext = useMemo(
    () => getSectionPeriodContext(timeRange, rangeBounds),
    [rangeBounds, timeRange],
  );

  const comparisonLabel = useMemo(() => getComparisonLabel(timeRange), [timeRange]);
  const comparisonDateLabel = useMemo(
    () => getComparisonDateLabel(timeRange, rangeBounds),
    [rangeBounds, timeRange],
  );
  const benchmarkPlan = useMemo(
    () => getBenchmarkPlan(timeRange, rangeBounds),
    [rangeBounds, timeRange],
  );
  const historicalMonthWindows = useMemo(
    () => timeRange === "ALL" ? getHistoricalFullMonthWindows(currentData) : [],
    [currentData, timeRange],
  );
  const benchmarkWindows = timeRange === "ALL" ? historicalMonthWindows : benchmarkPlan.windows;
  const benchmarkSummaries = useMemo(
    () => benchmarkWindows.map((window) =>
      buildSummary(
        filterDatasetByWindow(timeRange === "ALL" ? currentData : benchmarkData, window),
        categories,
        profiles,
      )),
    [benchmarkData, benchmarkWindows, categories, currentData, profiles, timeRange],
  );
  const benchmarkSummary = useMemo(
    () => averageBenchmarkSummaries(benchmarkSummaries),
    [benchmarkSummaries],
  );
  const benchmarkDateLabel = timeRange === "ALL"
    ? benchmarkWindows.length > 0
      ? `${benchmarkWindows.length} bulan penuh historis`
      : "Belum ada bulan penuh historis"
    : benchmarkPlan.detail;
  const hasComparison = timeRange !== "ALL" && rangeBounds.previousStart !== null && rangeBounds.previousEnd !== null;

  const trendGranularity = useMemo(
    () => getTrendGranularity(timeRange, rangeBounds),
    [rangeBounds, timeRange],
  );
  const trendGranularityLabel = useMemo(
    () => getTrendGranularityLabel(trendGranularity),
    [trendGranularity],
  );

  const trendData = useMemo<TrendPoint[]>(() => {
    const grouped = new Map<string, TrendPoint>();

    currentData.orders.forEach((order) => {
      const bucket = getTrendBucket(
        order.created_at,
        trendGranularity,
        rangeBounds.currentStart,
        rangeBounds.currentEnd,
      );
      if (!bucket) return;

      const current = grouped.get(bucket.key) ?? {
        key: bucket.key,
        label: bucket.label,
        totalOrders: 0,
        omzet: 0,
        grossMargin: 0,
      };

      current.totalOrders += 1;
      if (isFinalOrder(order.status)) {
        current.omzet += toNumber(order.price);
        current.grossMargin +=
          toNumber(order.price) - toNumber(order.buy_price);
      }

      grouped.set(bucket.key, current);
    });

    return Array.from(grouped.values()).sort((a, b) =>
      a.key.localeCompare(b.key),
    );
  }, [
    currentData.orders,
    rangeBounds.currentEnd,
    rangeBounds.currentStart,
    trendGranularity,
  ]);

  const visibleCategories = showAllCategories
    ? summary.performanceByCategory
    : summary.performanceByCategory.slice(0, 5);
  const topCategory =
    summary.performanceByCategory.find((category) => category.successfulOrders > 0) ?? null;
  const topCategoryDisplayName = topCategory
    ? getCategoryDisplayName(topCategory.name)
    : null;
  const topCategoryOmzetShare =
    topCategory && summary.omzet > 0
      ? (topCategory.omzet / summary.omzet) * 100
      : 0;
  const topCategoryGrossMarginShare =
    topCategory && summary.grossMargin > 0
      ? (topCategory.grossMargin / summary.grossMargin) * 100
      : 0;
  const failedRate =
    summary.totalOrders === 0
      ? 0
      : (summary.failedCount / summary.totalOrders) * 100;
  const openOrderCount = summary.pendingCount + summary.processingCount;
  const openOrderRate =
    summary.totalOrders === 0
      ? 0
      : (openOrderCount / summary.totalOrders) * 100;
  const failedIsDominant =
    summary.failedCount > 0 &&
    summary.failedCount >=
      Math.max(
        summary.successCount,
        summary.pendingCount,
        summary.processingCount,
      );

  const changes = {
    totalOrders: hasComparison ? percentChange(summary.totalOrders, previousSummary.totalOrders) : null,
    successCount: hasComparison ? percentChange(summary.successCount, previousSummary.successCount) : null,
    successRate: hasComparison ? summary.successRate - previousSummary.successRate : null,
    omzet: hasComparison ? percentChange(summary.omzet, previousSummary.omzet) : null,
    grossMargin: hasComparison ? percentChange(summary.grossMargin, previousSummary.grossMargin) : null,
    depositFlow: hasComparison ? percentChange(summary.depositFlow, previousSummary.depositFlow) : null,
    withdrawalFlow: hasComparison ? percentChange(summary.withdrawalFlow, previousSummary.withdrawalFlow) : null,
    refundWallet: hasComparison ? percentChange(summary.refundWallet, previousSummary.refundWallet) : null,
    adminAdjustmentNet: hasComparison ? percentChange(Math.abs(summary.adminAdjustmentNet), Math.abs(previousSummary.adminAdjustmentNet)) : null,
    failedCount: hasComparison ? percentChange(summary.failedCount, previousSummary.failedCount) : null,
  };


  const showBenchmarkProgress = timeRange !== "ALL";
  const benchmarkLines = {
    totalOrders: formatBenchmarkMetric(summary.totalOrders, benchmarkSummary?.totalOrders, "count", false, showBenchmarkProgress),
    successCount: formatBenchmarkMetric(summary.successCount, benchmarkSummary?.successCount, "count", false, showBenchmarkProgress),
    successRate: formatBenchmarkMetric(summary.successRate, benchmarkSummary?.successRate, "rate", false, showBenchmarkProgress),
    omzet: formatBenchmarkMetric(summary.omzet, benchmarkSummary?.omzet, "money", false, showBenchmarkProgress),
    grossMargin: formatBenchmarkMetric(summary.grossMargin, benchmarkSummary?.grossMargin, "money", false, showBenchmarkProgress),
    depositFlow: formatBenchmarkMetric(summary.depositFlow, benchmarkSummary?.depositFlow, "money", false, showBenchmarkProgress),
    withdrawalFlow: formatBenchmarkMetric(summary.withdrawalFlow, benchmarkSummary?.withdrawalFlow, "money", false, showBenchmarkProgress),
    refundWallet: formatBenchmarkMetric(summary.refundWallet, benchmarkSummary?.refundWallet, "money", false, showBenchmarkProgress),
    adminAdjustmentNet: formatBenchmarkMetric(summary.adminAdjustmentNet, benchmarkSummary?.adminAdjustmentNet, "money", true, showBenchmarkProgress),
  };

  const openCustomRangePopup = () => {
    const today = new Date();
    const defaultStart = addDays(today, -6);
    setCustomDraftStart(customStart || toDateInputValue(defaultStart));
    setCustomDraftEnd(customEnd || toDateInputValue(today));
    setShowCustomRangePopup(true);
  };

  const handleTimeRangeChange = (nextRange: TimeRange) => {
    if (nextRange === "CUSTOM") {
      openCustomRangePopup();
      return;
    }

    setShowCustomRangePopup(false);
    setTimeRange(nextRange);
  };

  const customDraftIsValid =
    Boolean(customDraftStart) &&
    Boolean(customDraftEnd) &&
    customDraftEnd >= customDraftStart;

  const applyCustomRange = () => {
    if (!customDraftIsValid) return;
    setCustomStart(customDraftStart);
    setCustomEnd(customDraftEnd);
    setTimeRange("CUSTOM");
    setShowCustomRangePopup(false);
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const period = getRangeLabel(timeRange);

    const summaryRows = [
      ["DAPAY ANALYTICS — MANAGEMENT REPORT"],
      ["Periode", period],
      ["Rentang tanggal", rangeDateLabel],
      ["Pembanding pertumbuhan", `${comparisonLabel} · ${comparisonDateLabel}`],
      ["Benchmark bisnis", `${benchmarkPlan.label} · ${benchmarkDateLabel}`],
      ["Tanggal acuan", "tanggal order dibuat"],
      ["Final order", "status = Berhasil"],
      ["Tanggal export", new Date().toLocaleString("id-ID")],
      [],
      ["DAPAY OVERVIEW"],
      ["Total Order", summary.totalOrders],
      ["Order Berhasil", summary.successCount],
      ["Success Rate", summary.successRate / 100],
      ["Omzet", summary.omzet],
      ["Gross Margin", summary.grossMargin],
      [],
      ["PROFITABILITY"],
      ["Modal Vendor", summary.vendorCost],
      ["Cashback", summary.cashback],
      ["Referral", summary.referral],
      ["Order Contribution", summary.orderContribution],
      [],
      ["PLATFORM FEE"],
      ["Upgrade Fee", summary.upgradeFee],
      ["Withdrawal Admin Fee", summary.withdrawalAdminFee],
      [],
      ["MEMBER FUNDS — BUKAN P&L"],
      ["Deposit", summary.depositFlow],
      ["Withdrawal", summary.withdrawalFlow],
      ["Refund", summary.refundWallet],
      ["Adjustment Net", summary.adminAdjustmentNet],
    ];

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryRows), "Ringkasan");

    const categoryRows = [
      ["Kategori", "Total Order", "Order Berhasil", "Success Rate", "Omzet", "Modal Vendor", "Gross Margin", "Margin %"],
      ...summary.performanceByCategory.map((category) => [
        category.name,
        category.totalOrders,
        category.successfulOrders,
        category.successRate / 100,
        category.omzet,
        category.vendorCost,
        category.grossMargin,
        category.marginRate / 100,
      ]),
    ];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(categoryRows), "Performa Kategori");
    XLSX.writeFile(workbook, `DaPay_Analytics_${timeRange}_${Date.now()}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const period = getRangeLabel(timeRange);
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(17);
    doc.setFont("helvetica", "bold");
    doc.text("DAPAY ANALYTICS — MANAGEMENT REPORT", pageWidth / 2, 18, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Periode: ${period} (${rangeDateLabel}) | Final order: Berhasil`, pageWidth / 2, 25, { align: "center" });
    doc.setFontSize(7);
    doc.text(`Pembanding: ${comparisonLabel} (${comparisonDateLabel})`, pageWidth / 2, 29, { align: "center" });
    doc.text(`Benchmark: ${benchmarkPlan.label} (${benchmarkDateLabel})`, pageWidth / 2, 33, { align: "center" });

    autoTable(doc, {
      startY: 39,
      head: [["Ringkasan", "Nilai"]],
      body: [
        ["Total Order", summary.totalOrders.toLocaleString("id-ID")],
        ["Order Berhasil", summary.successCount.toLocaleString("id-ID")],
        ["Success Rate", `${summary.successRate.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`],
        ["Omzet", formatRupiah(summary.omzet)],
        ["Modal Vendor", formatRupiah(summary.vendorCost)],
        ["Gross Margin", formatRupiah(summary.grossMargin)],
        ["Cashback", formatRupiah(summary.cashback)],
        ["Referral", formatRupiah(summary.referral)],
        ["Order Contribution", formatRupiah(summary.orderContribution)],
      ],
      theme: "grid",
      headStyles: { fillColor: [15, 23, 42] },
    });

    const finalY = ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 39) + 10;
    autoTable(doc, {
      startY: finalY,
      head: [["Kategori", "Order", "Success", "Rate", "Omzet", "Gross Margin"]],
      body: summary.performanceByCategory.map((category) => [
        category.name,
        category.totalOrders,
        category.successfulOrders,
        `${category.successRate.toFixed(1)}%`,
        formatRupiah(category.omzet),
        formatRupiah(category.grossMargin),
      ]),
      theme: "striped",
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save(`DaPay_Analytics_${timeRange}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white text-slate-500">
        <Loader2 className="animate-spin text-blue-600" size={28} />
        <p className="text-sm font-medium">Memuat Analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-sm">
        <AlertCircle className="mx-auto text-rose-500" size={28} />
        <h2 className="mt-3 text-base font-bold text-slate-900">Analytics belum dapat dimuat</h2>
        <p className="mt-1 text-sm text-slate-500">{error}</p>
        <button onClick={() => void fetchData()} className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
          Coba lagi
        </button>
      </div>
    );
  }

  const insightItems = [
    {
      label: "Revenue Leader",
      tone: "emerald" as const,
      icon: <TrendingUp size={18} />,
      title:
        topCategory && topCategoryDisplayName
          ? `${topCategoryDisplayName} memimpin omzet untuk ${sectionPeriodContext}.`
          : `Belum ada kategori dengan omzet final untuk ${sectionPeriodContext}.`,
      detail:
        topCategory && topCategoryDisplayName && summary.omzet > 0
          ? `${formatRupiah(topCategory.omzet)} omzet · ${topCategoryOmzetShare.toFixed(1)}% dari total omzet final ${formatRupiah(summary.omzet)}.`
          : `Revenue leader akan muncul setelah tersedia order final Berhasil untuk ${sectionPeriodContext}.`,
    },
    {
      label: "Order Health",
      tone:
        summary.successRate >= failedRate
          ? ("emerald" as const)
          : ("amber" as const),
      icon: <CheckCircle2 size={18} />,
      title:
        summary.totalOrders > 0
          ? `${summary.successCount.toLocaleString("id-ID")} dari ${summary.totalOrders.toLocaleString("id-ID")} order berhasil (${summary.successRate.toFixed(1)}%).`
          : `Belum ada order untuk ${sectionPeriodContext}.`,
      detail:
        summary.totalOrders > 0
          ? `${summary.failedCount.toLocaleString("id-ID")} gagal (${failedRate.toFixed(1)}%) · ${openOrderCount.toLocaleString("id-ID")} masih Pending/Diproses (${openOrderRate.toFixed(1)}%).`
          : "Order Health akan terbentuk setelah ada transaksi.",
    },
    {
      label: "Margin Concentration",
      tone: "blue" as const,
      icon: <CircleDollarSign size={18} />,
      title:
        topCategory &&
        topCategoryDisplayName &&
        summary.grossMargin > 0
          ? `${topCategoryDisplayName} menyumbang ${topCategoryGrossMarginShare.toFixed(1)}% dari total Gross Margin.`
          : "Belum ada Gross Margin positif untuk dianalisis.",
      detail:
        topCategory &&
        topCategoryDisplayName &&
        summary.grossMargin > 0
          ? `${formatRupiah(topCategory.grossMargin)} dari total Gross Margin ${formatRupiah(summary.grossMargin)} untuk ${sectionPeriodContext}.`
          : `Insight konsentrasi margin akan muncul ketika tersedia order final Berhasil dengan Gross Margin positif untuk ${sectionPeriodContext}.`,
    },
    {
      label: "Needs Attention",
      tone:
        summary.failedCount > 0 && failedIsDominant
          ? ("rose" as const)
          : ("amber" as const),
      icon: <AlertCircle size={18} />,
      title:
        summary.failedCount > 0
          ? `${summary.failedCount.toLocaleString("id-ID")} order Gagal (${failedRate.toFixed(1)}%) perlu diperhatikan.`
          : `Tidak ada order Gagal untuk ${sectionPeriodContext}.`,
      detail:
        summary.failedCount === 0
          ? `Tidak ada kegagalan order yang perlu disorot untuk ${sectionPeriodContext}.`
          : `${failedIsDominant ? `Status Gagal menjadi status dominan untuk ${sectionPeriodContext}. ` : ""}${
              changes.failedCount === null
                ? "Pantau sumber kegagalan jika angkanya terus meningkat."
                : `Jumlah order gagal ${changes.failedCount > 0 ? "naik" : changes.failedCount < 0 ? "turun" : "tetap"} ${Math.abs(changes.failedCount).toFixed(1)}% dibanding ${comparisonDateLabel}.`
            }`,
    },
  ];

  return (
    <div className="space-y-3.5 pb-10 text-slate-600 md:space-y-4">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[18px] bg-[#081226] text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]">
            <Activity size={26} strokeWidth={2.1} />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-600">Business Performance</p>
            <h1 className="mt-0.5 text-[30px] font-black leading-none tracking-[0.01em] text-[#081226] md:text-[34px]">ANALYTICS</h1>
            <p className="mt-2 max-w-2xl text-[12px] leading-5 text-slate-500">
              Pantau kondisi bisnis DaPay secara menyeluruh dalam satu tampilan yang mudah dipahami.
            </p>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2.5 xl:w-auto xl:flex-nowrap">
          <label className="relative block w-full sm:w-60 xl:w-64">
            <select
              value={timeRange}
              onChange={(event) => handleTimeRangeChange(event.target.value as TimeRange)}
              className="peer h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-19 pr-10 text-xs font-semibold text-slate-800 outline-none shadow-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              aria-label="Pilih periode laporan Analytics"
            >
              <optgroup label="Periode cepat">
                <option value="TODAY">Hari Ini</option>
                <option value="YESTERDAY">Kemarin</option>
              </optgroup>
              <optgroup label="Periode analisa">
                <option value="7D">7 Hari Terakhir</option>
                <option value="30D">30 Hari Terakhir</option>
                <option value="MONTH">Bulan Ini</option>
                <option value="LAST_MONTH">Bulan Lalu</option>
                <option value="YEAR">Tahun Ini</option>
              </optgroup>
              <option value="CUSTOM">Rentang Tanggal...</option>
              <option value="ALL">Semua Data</option>
            </select>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-500">
              Periode
            </span>
            <ChevronDown
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              size={15}
            />
          </label>

          {timeRange === "CUSTOM" && (
            <button
              type="button"
              onClick={openCustomRangePopup}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-700 shadow-sm transition hover:bg-blue-100"
              aria-label="Ubah rentang tanggal"
              title="Ubah rentang tanggal"
            >
              <CalendarDays size={18} />
            </button>
          )}

          <button
            onClick={() => void fetchData()}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            aria-label="Muat ulang Analytics"
            title="Refresh data"
          >
            <RefreshCw size={18} />
          </button>

          <button
            onClick={exportToExcel}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
          >
            <FileSpreadsheet size={16} /> Export Excel
          </button>

          <button
            onClick={exportToPDF}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
          >
            <FileText size={16} /> Export PDF
          </button>
        </div>
      </header>

      {showCustomRangePopup && (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="custom-range-title">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setShowCustomRangePopup(false)}
            aria-label="Tutup pemilih rentang tanggal"
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-600">Periode Laporan</p>
                <h2 id="custom-range-title" className="mt-1 text-lg font-bold text-slate-950">Pilih Rentang Tanggal</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Pilih tanggal mulai dan tanggal selesai. Tanggal selesai ikut dihitung.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomRangePopup(false)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Tutup"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">
                Dari tanggal
                <input
                  type="date"
                  value={customDraftStart}
                  max={customDraftEnd || undefined}
                  onChange={(event) => setCustomDraftStart(event.target.value)}
                  className="mt-2 block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  autoFocus
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Sampai tanggal
                <input
                  type="date"
                  value={customDraftEnd}
                  min={customDraftStart || undefined}
                  onChange={(event) => setCustomDraftEnd(event.target.value)}
                  className="mt-2 block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] leading-4 text-slate-500">
                Pembanding dan benchmark akan menyesuaikan otomatis dengan rentang yang dipilih.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomRangePopup(false)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={applyCustomRange}
                  disabled={!customDraftIsValid}
                  className="h-10 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Terapkan Periode
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_3px_10px_rgba(15,23,42,0.04)]">
        <div className="grid gap-0 px-5 py-2.5 sm:grid-cols-3 sm:divide-x sm:divide-slate-200">
          <InfoItem
            icon={<CalendarDays size={15} />}
            label="Periode Laporan"
            value={`${getRangeLabel(timeRange)} · ${rangeDateLabel}`}
          />
          <InfoItem
            icon={<TrendingUp size={15} />}
            label="Pembanding Pertumbuhan"
            value={`${comparisonLabel} · ${comparisonDateLabel}`}
          />
          <InfoItem
            icon={<CircleDollarSign size={15} />}
            label="Benchmark Bisnis"
            value={`${benchmarkPlan.label} · ${benchmarkDateLabel}`}
          />
        </div>
      </div>

      <section className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-[0_3px_12px_rgba(15,23,42,0.04)]" aria-labelledby="current-condition-heading">
        <SectionTitle id="current-condition-heading">DAPAY OVERVIEW</SectionTitle>
        <p className="mt-1 text-[10px] text-slate-500">{sectionPeriodContext}</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            label="Total Order"
            value={summary.totalOrders.toLocaleString("id-ID")}
            icon={<ShoppingCart size={19} />}
            tone="blue"
            change={changes.totalOrders}
            comparisonLabel={comparisonDateLabel}
            benchmarkText={benchmarkLines.totalOrders}
          />
          <KpiCard
            label="Order Berhasil"
            value={summary.successCount.toLocaleString("id-ID")}
            icon={<CheckCircle2 size={19} />}
            tone="emerald"
            change={changes.successCount}
            comparisonLabel={comparisonDateLabel}
            benchmarkText={benchmarkLines.successCount}
          />
          <KpiCard
            label="Success Rate"
            value={`${summary.successRate.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`}
            icon={<Percent size={19} />}
            tone="violet"
            change={changes.successRate}
            changeUnit="poin"
            comparisonLabel={comparisonDateLabel}
            benchmarkText={benchmarkLines.successRate}
          />
          <KpiCard
            label="Omzet"
            value={formatRupiah(summary.omzet)}
            icon={<Wallet size={19} />}
            tone="emerald"
            change={changes.omzet}
            comparisonLabel={comparisonDateLabel}
            benchmarkText={benchmarkLines.omzet}
          />
          <KpiCard
            label="Gross Margin"
            value={formatRupiah(summary.grossMargin)}
            icon={<TrendingUp size={19} />}
            tone="amber"
            change={changes.grossMargin}
            comparisonLabel={comparisonDateLabel}
            benchmarkText={benchmarkLines.grossMargin}
          />
        </div>
      </section>

      <section className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-[0_3px_12px_rgba(15,23,42,0.04)]" aria-labelledby="attention-heading">
        <SectionTitle id="attention-heading">NEEDS ATTENTION</SectionTitle>
        <p className="mt-1 text-[10px] text-slate-500">Status operasional order · {sectionPeriodContext}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <AttentionCard
            label="Pending"
            value={summary.pendingCount}
            description="Menunggu pembayaran atau penyelesaian proses awal."
            icon={<Hourglass size={18} />}
            tone="amber"
          />
          <AttentionCard
            label="Diproses"
            value={summary.processingCount}
            description="Pembayaran diterima, fulfillment masih berjalan."
            icon={<RotateCw size={18} />}
            tone="blue"
          />
          <AttentionCard
            label="Gagal"
            value={summary.failedCount}
            description={`Order gagal pada ${activePeriodLabel}.`}
            icon={<XCircle size={18} />}
            tone="rose"
          />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-12">
        <section className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,0.04)] xl:col-span-5" aria-labelledby="trend-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="trend-heading" className="text-sm font-bold text-slate-950">BUSINESS TRENDS</h2>
              <p className="mt-1 text-[11px] text-slate-500">Order, omzet, dan Gross Margin · {sectionPeriodContext}</p>
            </div>
            <span className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-[10px] font-semibold text-slate-500">
              {trendGranularityLabel}
            </span>
          </div>
          <div className="mt-4 h-64 min-h-64">
            {trendData.length === 0 ? (
              <EmptyState message={`Belum ada order untuk ${sectionPeriodContext}.`} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData} margin={{ top: 8, right: 6, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="analyticsOmzetArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fill: "#64748b" }}
                    dy={8}
                    minTickGap={18}
                  />
                  <YAxis yAxisId="orders" axisLine={false} tickLine={false} allowDecimals={false} tick={{ fontSize: 9, fill: "#64748b" }} />
                  <YAxis yAxisId="money" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#64748b" }} tickFormatter={(value) => formatCompactRupiah(value).replace("Rp", "")} />
                  <RechartsTooltip
                    formatter={(value: unknown, name: unknown) => {
                      const metricName = String(name ?? "");
                      return metricName === "Total Order" ? [Number(value ?? 0).toLocaleString("id-ID"), metricName] : [formatRupiah(value), metricName];
                    }}
                    contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", boxShadow: "0 8px 24px rgba(15,23,42,.08)", fontSize: 11 }}
                  />
                  <Area yAxisId="money" type="monotone" name="Omzet" dataKey="omzet" stroke="#10B981" fill="url(#analyticsOmzetArea)" strokeWidth={2.1} />
                  <Line yAxisId="orders" type="monotone" name="Total Order" dataKey="totalOrders" stroke="#2563EB" strokeWidth={2.2} dot={{ r: 2.5 }} activeDot={{ r: 4 }} />
                  <Line yAxisId="money" type="monotone" name="Gross Margin" dataKey="grossMargin" stroke="#F59E0B" strokeWidth={2.1} dot={{ r: 2.4 }} activeDot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-5 border-t border-slate-100 pt-3 text-[10px] text-slate-500">
            <LegendDot color="bg-blue-600" label="Total Order" />
            <LegendDot color="bg-emerald-500" label="Omzet" />
            <LegendDot color="bg-amber-500" label="Gross Margin" />
          </div>
        </section>

        <section className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,0.04)] xl:col-span-4" aria-labelledby="profitability-heading">
          <h2 id="profitability-heading" className="text-sm font-bold text-slate-950">PROFITABILITY</h2>
          <p className="mt-1 text-[11px] text-slate-500">Order final Berhasil · {sectionPeriodContext}</p>
          <div className="mt-4 divide-y divide-slate-100">
            <FinancialRow label="Omzet" value={formatRupiah(summary.omzet)} strong />
            <FinancialRow label="Modal Vendor" value={formatRupiah(summary.vendorCost)} />
            <FinancialRow
              label="Gross Margin"
              value={`${formatRupiah(summary.grossMargin)} (${summary.grossMarginRate.toFixed(1)}%)`}
              accent="emerald"
              strong
            />
            <FinancialRow label="Cashback" value={`- ${formatRupiah(summary.cashback)}`} />
            <FinancialRow label="Referral" value={`- ${formatRupiah(summary.referral)}`} />
            <FinancialRow
              label="Order Contribution"
              value={`${formatRupiah(summary.orderContribution)} (${summary.orderContributionRate.toFixed(1)}%)`}
              accent="blue"
              strong
            />
          </div>
          <div className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-900">
            Order Contribution = Gross Margin setelah dikurangi Cashback &amp; Referral. Belum termasuk biaya operasional lain, jadi bukan keuntungan bersih DaPay.
          </div>
        </section>

        <section className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,0.04)] xl:col-span-3" aria-labelledby="order-performance-heading">
          <h2 id="order-performance-heading" className="text-sm font-bold text-slate-950">ORDER PERFORMANCE</h2>
          <p className="mt-1 text-[11px] text-slate-500">Komposisi status seluruh order · {sectionPeriodContext}</p>
          {summary.statusDistribution.length === 0 ? (
            <div className="mt-4"><EmptyState message={`Belum ada order untuk ${sectionPeriodContext}.`} /></div>
          ) : (
            <div className="mt-3">
              <div className="relative mx-auto h-48 min-h-48 w-full max-w-62.5">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={summary.statusDistribution} dataKey="value" innerRadius={50} outerRadius={72} paddingAngle={2}>
                      {summary.statusDistribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} stroke="#fff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-medium text-slate-400">Total</span>
                  <span className="text-xl font-black text-slate-950">{summary.totalOrders.toLocaleString("id-ID")}</span>
                </div>
              </div>

              <div className="mt-2 space-y-2 border-t border-slate-100 pt-3">
                {summary.statusDistribution.map((status) => {
                  const percentage = summary.totalOrders === 0 ? 0 : (status.value / summary.totalOrders) * 100;
                  return (
                    <div key={status.name} className="flex items-center justify-between gap-4 text-[10px]">
                      <span className="flex min-w-0 items-center gap-2 text-slate-600">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />
                        <span className="truncate">{status.name}</span>
                      </span>
                      <span className="shrink-0 font-semibold text-slate-900">
                        {status.value.toLocaleString("id-ID")} <span className="font-normal text-slate-400">({percentage.toFixed(1)}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <section
          className={`flex flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_3px_12px_rgba(15,23,42,0.04)] xl:col-span-8 ${
            showAllCategories ? "self-start" : "h-full"
          }`}
          aria-labelledby="category-heading"
        >
          <div className="border-b border-slate-100 px-4 py-3.5">
            <h2 id="category-heading" className="text-sm font-bold text-slate-950">CATEGORY PERFORMANCE</h2>
            <p className="mt-1 text-[11px] text-slate-500">Performa kategori berdasarkan order · {sectionPeriodContext}</p>
          </div>

          {summary.performanceByCategory.length === 0 ? (
            <div className="p-5"><EmptyState message={`Belum ada kategori untuk ${sectionPeriodContext}.`} /></div>
          ) : (
            <>
              {summary.successCount === 0 && (
                <div className="border-b border-slate-100 bg-amber-50/70 px-4 py-2.5 text-[10px] leading-4 text-amber-900">
                  Belum ada order Berhasil untuk <strong>{sectionPeriodContext}</strong>. Volume order per kategori tetap ditampilkan; Omzet dan Gross Margin akan bernilai Rp0 sampai ada order final Berhasil.
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full min-w-190 table-fixed text-left">
                  <colgroup>
                    <col className="w-[31%]" />
                    <col className="w-[9%]" />
                    <col className="w-[9%]" />
                    <col className="w-[13%]" />
                    <col className="w-[17%]" />
                    <col className="w-[21%]" />
                  </colgroup>
                  <thead className="bg-slate-50/80 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Kategori</th>
                      <th className="px-2 py-3 text-center">Order</th>
                      <th className="px-2 py-3 text-center">Berhasil</th>
                      <th className="px-2 py-3 text-center">Success Rate</th>
                      <th className="px-4 py-3 text-right">Omzet</th>
                      <th className="px-4 py-3 text-right">Gross Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleCategories.map((category, index) => (
                      <tr key={`${category.name}-${index}`} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 text-[11px] font-semibold text-slate-800">
                          {getCategoryDisplayName(category.name)}
                        </td>
                        <td className="px-2 py-3 text-center text-[11px] text-slate-600 tabular-nums">
                          {category.totalOrders.toLocaleString("id-ID")}
                        </td>
                        <td className="px-2 py-3 text-center text-[11px] font-semibold text-slate-800 tabular-nums">
                          {category.successfulOrders.toLocaleString("id-ID")}
                        </td>
                        <td className="px-2 py-3 text-center text-[11px] text-slate-600 tabular-nums">
                          {category.successRate.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-right text-[11px] font-semibold text-slate-900">
                          {formatRupiah(category.omzet)}
                        </td>
                        <td className="px-4 py-3 text-right text-[11px] font-semibold text-emerald-700">
                          {formatRupiah(category.grossMargin)}{" "}
                          <span className="font-normal text-slate-400">
                            ({category.marginRate.toFixed(1)}%)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {summary.performanceByCategory.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllCategories((current) => !current)}
                  className="mt-auto flex w-full items-center justify-center gap-2 border-t border-slate-100 px-4 py-3 text-[10px] font-semibold text-blue-600 transition hover:bg-blue-50"
                >
                  {showAllCategories ? "Tampilkan lebih sedikit" : "Lihat semua kategori"}
                  <ChevronDown
                    size={13}
                    className={`transition-transform ${showAllCategories ? "rotate-180" : ""}`}
                  />
                </button>
              )}
            </>
          )}
        </section>

        <div className="self-start space-y-4 xl:col-span-4">
          <section className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,0.04)]" aria-labelledby="customer-heading">
            <h2 id="customer-heading" className="text-sm font-bold text-slate-950">CUSTOMER</h2>
            <p className="mt-1 text-[11px] text-slate-500">Komposisi pelanggan berdasarkan seluruh order · {sectionPeriodContext}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              <MiniDonut
                title="Member vs Guest"
                total={summary.totalOrders}
                items={[
                  { label: "Member", value: summary.memberOrderCount, color: "#2563EB" },
                  { label: "Guest", value: summary.guestOrderCount, color: "#93C5FD" },
                ]}
              />
              <MiniDonut
                title="Regular vs Special"
                total={summary.regularOrderCount + summary.specialOrderCount}
                items={[
                  { label: "Regular", value: summary.regularOrderCount, color: "#10B981" },
                  { label: "Special", value: summary.specialOrderCount, color: "#A7F3D0" },
                ]}
              />
            </div>
          </section>

          <section className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,0.04)]" aria-labelledby="platform-fee-heading">
            <h2 id="platform-fee-heading" className="text-sm font-bold text-slate-950">PLATFORM FEE</h2>
            <p className="mt-1 text-[9px] text-slate-500">{sectionPeriodContext}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              <CompactMoneyCard label="Upgrade Fee" value={summary.upgradeFee} icon={<ArrowUpRight size={16} />} tone="blue" />
              <CompactMoneyCard label="Withdrawal Admin Fee" value={summary.withdrawalAdminFee} icon={<Wallet size={16} />} tone="violet" />
            </div>
          </section>
        </div>

        <section className="h-full rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,0.04)] xl:col-span-5" aria-labelledby="member-funds-heading">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <SectionTitle id="member-funds-heading">MEMBER FUNDS</SectionTitle>
              <p className="mt-1 text-[9px] text-slate-500">{sectionPeriodContext}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-medium text-slate-500">
              Di luar Omzet / Gross Margin
            </span>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MoneyFlowCard
              label="Deposit"
              value={summary.depositFlow}
              icon={<ArrowDownLeft size={18} />}
              tone="emerald"
              change={changes.depositFlow}
              comparisonLabel={comparisonDateLabel}
              benchmarkText={benchmarkLines.depositFlow}
            />
            <MoneyFlowCard
              label="Withdrawal"
              value={summary.withdrawalFlow}
              icon={<ArrowUpRight size={18} />}
              tone="amber"
              change={changes.withdrawalFlow}
              comparisonLabel={comparisonDateLabel}
              benchmarkText={benchmarkLines.withdrawalFlow}
            />
            <MoneyFlowCard
              label="Refund"
              value={summary.refundWallet}
              icon={<RefreshCw size={18} />}
              tone="blue"
              change={changes.refundWallet}
              comparisonLabel={comparisonDateLabel}
              benchmarkText={benchmarkLines.refundWallet}
            />
            <MoneyFlowCard
              label="Adjustment"
              value={summary.adminAdjustmentNet}
              icon={<SlidersHorizontal size={18} />}
              tone="violet"
              change={changes.adminAdjustmentNet}
              comparisonLabel={comparisonDateLabel}
              benchmarkText={benchmarkLines.adminAdjustmentNet}
              signed
            />
          </div>
        </section>

        <section className="h-full rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,0.04)] xl:col-span-7" aria-labelledby="insight-heading">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-700">
                <Lightbulb size={17} />
              </span>
              <h2 id="insight-heading" className="text-sm font-bold text-slate-950">QUICK INSIGHTS</h2>
            </div>
            <span
              className="hidden max-w-[60%] truncate rounded-full bg-slate-50 px-2.5 py-1 text-[9px] font-medium text-slate-500 sm:inline-flex"
              title={activePeriodContext}
            >
              {sectionPeriodContext}
            </span>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {insightItems.map((item, index) => (
              <InsightItem key={`${item.title}-${index}`} {...item} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 py-0.5 sm:px-3 sm:first:pl-0">
      <span className="text-slate-400">{icon}</span>
      <span className="text-[10px] text-slate-500"><strong className="font-semibold text-slate-700">{label}:</strong> {value}</span>
    </div>
  );
}

function SectionTitle({ id, children }: { id?: string; children: React.ReactNode }) {
  return <h2 id={id} className="text-sm font-bold text-slate-950">{children}</h2>;
}

function KpiCard({
  label,
  value,
  icon,
  tone,
  change,
  changeUnit = "%",
  comparisonLabel,
  benchmarkText,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "blue" | "emerald" | "violet" | "amber";
  change: number | null;
  changeUnit?: "%" | "poin";
  comparisonLabel: string;
  benchmarkText: string;
}) {
  const tones = {
    blue: "bg-blue-100 text-blue-700",
    emerald: "bg-emerald-100 text-emerald-700",
    violet: "bg-violet-100 text-violet-700",
    amber: "bg-amber-100 text-amber-700",
  };
  const positive = change !== null && change >= 0;

  return (
    <div className="rounded-[15px] border border-slate-200 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.035)]">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tones[tone]}`}>{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-slate-500">{label}</p>
          <p className="mt-1 wrap-break-word text-xl font-black tracking-tight text-slate-950">{value}</p>
          <ComparisonLine change={change} unit={changeUnit} positive={positive} comparisonLabel={comparisonLabel} />
          <p className="mt-1 text-[9px] font-medium leading-4 text-blue-600/80">{benchmarkText}</p>
        </div>
      </div>
    </div>
  );
}

function ComparisonLine({
  change,
  unit,
  positive,
  comparisonLabel,
}: {
  change: number | null;
  unit: "%" | "poin";
  positive: boolean;
  comparisonLabel: string;
}) {
  if (change === null) {
    return <p className="mt-2 text-[9px] text-slate-400">Pembanding tidak tersedia</p>;
  }

  return (
    <p className={`mt-2 text-[9px] font-semibold ${positive ? "text-emerald-600" : "text-rose-600"}`}>
      {change >= 0 ? "+" : ""}{change.toFixed(1)}{unit === "%" ? "%" : ` ${unit}`} <span className="font-normal text-slate-400">vs {comparisonLabel}</span>
    </p>
  );
}

function AttentionCard({
  label,
  value,
  description,
  icon,
  tone,
}: {
  label: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  tone: "amber" | "blue" | "rose";
}) {
  const tones = {
    amber: "border-amber-200 bg-amber-50/45 text-amber-700",
    blue: "border-blue-200 bg-blue-50/45 text-blue-700",
    rose: "border-rose-200 bg-rose-50/45 text-rose-700",
  };

  return (
    <div className={`flex items-center gap-3 rounded-[14px] border px-4 py-3 ${tones[tone]}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/85 shadow-sm">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium text-slate-600">{label}</p>
        <p className="text-lg font-black leading-tight text-slate-950">{value.toLocaleString("id-ID")}</p>
        <p className="mt-0.5 text-[9px] leading-4 text-slate-500">{description}</p>
      </div>
      <ChevronDown className="-rotate-90 text-slate-400" size={14} />
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${color}`} />{label}</span>;
}

function FinancialRow({
  label,
  value,
  strong = false,
  accent = "slate",
}: {
  label: string;
  value: string;
  strong?: boolean;
  accent?: "slate" | "emerald" | "blue" | "rose";
}) {
  const accentClass = {
    slate: "text-slate-900",
    emerald: "text-emerald-700",
    blue: "text-blue-700",
    rose: "text-rose-700",
  }[accent];

  return (
    <div className="flex items-center justify-between gap-4 py-2.5 text-[11px]">
      <span className={strong ? "font-semibold text-slate-800" : "text-slate-500"}>{label}</span>
      <span className={`${strong ? "font-bold" : "font-semibold"} text-right ${accentClass}`}>{value}</span>
    </div>
  );
}

function MiniDonut({
  title,
  total,
  items,
}: {
  title: string;
  total: number;
  items: Array<{ label: string; value: number; color: string }>;
}) {
  const visibleItems = items.filter((item) => item.value > 0);
  return (
    <div className="rounded-[14px] border border-slate-100 bg-slate-50/45 p-3">
      <p className="text-[10px] font-semibold text-slate-700">{title}</p>
      <div className="mt-2 grid grid-cols-[78px_1fr] items-center gap-2">
        <div className="h-20 min-h-20">
          {visibleItems.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-full border border-slate-200 text-[9px] text-slate-400">0</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={visibleItems} dataKey="value" innerRadius={22} outerRadius={34} paddingAngle={2}>
                  {visibleItems.map((entry) => <Cell key={entry.label} fill={entry.color} stroke="#fff" strokeWidth={1.5} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="space-y-1.5">
          {items.map((item) => {
            const percentage = total === 0 ? 0 : (item.value / total) * 100;
            return (
              <div key={item.label} className="text-[9px]">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.label}
                </div>
                <p className="mt-0.5 pl-3.5 font-semibold text-slate-900">{item.value.toLocaleString("id-ID")} <span className="font-normal text-slate-400">({percentage.toFixed(1)}%)</span></p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CompactMoneyCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "blue" | "violet";
}) {
  const toneClass = tone === "blue" ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700";
  return (
    <div className="flex items-center gap-2.5 rounded-[14px] border border-slate-100 bg-slate-50/50 p-3">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] text-slate-500">{label}</p>
        <p className="mt-0.5 wrap-break-word text-[11px] font-bold text-slate-900">{formatRupiah(value)}</p>
      </div>
    </div>
  );
}

function InsightItem({
  icon,
  label,
  title,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  detail: string;
  tone: "emerald" | "blue" | "amber" | "rose";
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
  };

  return (
    <div className="flex min-h-33 gap-3 rounded-[14px] border border-slate-200 bg-slate-50/35 p-3.5">
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-slate-400">
          {label}
        </p>
        <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-900">
          {title}
        </p>
        <p className="mt-1.5 text-[9px] leading-4 text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

function MoneyFlowCard({
  label,
  value,
  icon,
  tone,
  change,
  comparisonLabel,
  benchmarkText,
  signed = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "emerald" | "amber" | "blue" | "violet";
  change: number | null;
  comparisonLabel: string;
  benchmarkText: string;
  signed?: boolean;
}) {
  const tones = {
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    violet: "bg-violet-100 text-violet-700",
  };
  const positive = change !== null && change >= 0;

  return (
    <div className="flex min-h-33 items-start gap-3 rounded-[14px] border border-slate-200 bg-slate-50/20 p-3.5">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tones[tone]}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-slate-500">{label}</p>
        <p className="mt-1 wrap-break-word text-[16px] font-black leading-tight text-slate-950">{signed ? formatSignedRupiah(value) : formatRupiah(value)}</p>
        <ComparisonLine change={change} unit="%" positive={positive} comparisonLabel={comparisonLabel} />
        <p className="mt-1 text-[9px] font-medium leading-4 text-blue-600/80">{benchmarkText}</p>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-32 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 text-center">
      <p className="text-[11px] font-medium text-slate-400">{message}</p>
    </div>
  );
}
