import { NextResponse } from "next/server";
import { requireAdminOrManager } from "@/utils/serverAuth";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const EXPORT_LIMIT = 5000;
const RECOGNIZED_TYPES = [
  "Deposit",
  "Payment",
  "Withdraw",
  "Refund",
  "Cashback",
  "Referral",
  "Bonus",
  "AdminAdjustment",
  "Upgrade",
] as const;
const SUMMARY_CATEGORIES = [
  "ALL",
  ...RECOGNIZED_TYPES,
  "Other",
] as const;
const LOG_FIELDS =
  "id, created_at, type, description, amount, initial_balance, final_balance";

type RouteContext = { params: Promise<{ userId: string }> };
type SummaryCategory = (typeof SUMMARY_CATEGORIES)[number];
type MutationSummaryMetric = {
  count: string;
  totalIn: string;
  totalOut: string;
  netAmount: string;
};
type MutationSummary = {
  total: MutationSummaryMetric;
  byType: Record<Exclude<SummaryCategory, "ALL">, MutationSummaryMetric>;
};
type MutationSummaryRpcRow = {
  category: string;
  mutation_count: string;
  total_in: string;
  total_out: string;
  net_amount: string;
};

function parsePositiveInteger(value: string | null, fallback: number, maximum: number) {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= maximum
    ? parsed
    : null;
}

function parseDate(value: string | null) {
  if (value === null || value === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function escapePostgrestValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function nextUtcDay(date: Date) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function isDecimalInteger(value: unknown): value is string {
  return typeof value === "string" && /^-?\d+$/.test(value);
}

function parseMutationSummary(value: unknown): MutationSummary | null {
  if (!Array.isArray(value) || value.length !== SUMMARY_CATEGORIES.length) {
    return null;
  }

  const rows = value as MutationSummaryRpcRow[];
  const byCategory = new Map(rows.map((row) => [row.category, row]));

  if (byCategory.size !== SUMMARY_CATEGORIES.length) return null;

  const toMetric = (category: SummaryCategory): MutationSummaryMetric | null => {
    const row = byCategory.get(category);
    if (!row || !isDecimalInteger(row.mutation_count) || !isDecimalInteger(row.total_in) || !isDecimalInteger(row.total_out) || !isDecimalInteger(row.net_amount)) {
      return null;
    }
    return {
      count: row.mutation_count,
      totalIn: row.total_in,
      totalOut: row.total_out,
      netAmount: row.net_amount,
    };
  };

  const total = toMetric("ALL");
  if (!total) return null;

  const byType = {} as MutationSummary["byType"];
  const detailCategories = SUMMARY_CATEGORIES.slice(1) as Exclude<
    SummaryCategory,
    "ALL"
  >[];

  for (const category of detailCategories) {
    const metric = toMetric(category);
    if (!metric) return null;
    byType[category] = metric;
  }

  return { total, byType };
}

export async function GET(request: Request, context: RouteContext) {
  const authorization = await requireAdminOrManager(request);

  if (!authorization.ok) {
    return NextResponse.json(
      { error: authorization.message },
      { status: authorization.status },
    );
  }

  const { userId } = await context.params;
  if (!UUID_PATTERN.test(userId)) {
    return NextResponse.json({ error: "ID member tidak valid." }, { status: 400 });
  }

  const searchParams = new URL(request.url).searchParams;
  const page = parsePositiveInteger(searchParams.get("page"), 1, 1_000_000);
  const pageSize = parsePositiveInteger(
    searchParams.get("pageSize"),
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
  );
  const type = searchParams.get("type") ?? "ALL";
  const sort = searchParams.get("sort") ?? "newest";
  const exportAll = searchParams.get("export") === "all";
  const includeSummary = searchParams.get("summary") === "1";
  const dateFrom = parseDate(searchParams.get("dateFrom"));
  const dateTo = parseDate(searchParams.get("dateTo"));
  const search = searchParams.get("search")?.trim() ?? "";

  if (
    page === null ||
    pageSize === null ||
    dateFrom === undefined ||
    dateTo === undefined ||
    (type !== "ALL" && type !== "OTHER" && !RECOGNIZED_TYPES.includes(type as (typeof RECOGNIZED_TYPES)[number])) ||
    (sort !== "newest" && sort !== "oldest") ||
    search.length > 100
  ) {
    return NextResponse.json({ error: "Filter mutasi saldo tidak valid." }, { status: 400 });
  }

  if (dateFrom && dateTo && dateFrom > dateTo) {
    return NextResponse.json({ error: "Rentang tanggal tidak valid." }, { status: 400 });
  }

  try {
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, role, member_type, balance")
      .eq("id", userId)
      .maybeSingle();

    if (targetError) {
      throw targetError;
    }

    if (!targetProfile) {
      return NextResponse.json({ error: "Member tidak ditemukan." }, { status: 404 });
    }

    if (["manager", "admin"].includes(targetProfile.role?.toLowerCase() ?? "")) {
      return NextResponse.json(
        { error: "Riwayat saldo hanya tersedia untuk member." },
        { status: 403 },
      );
    }

    let summary: MutationSummary | undefined;

    if (includeSummary) {
      // types/supabase.ts predates migration 191000; validate the RPC result below.
      const { data: summaryData, error: summaryError } = await supabaseAdmin.rpc(
        "get_member_balance_mutation_summary" as never,
        { p_user_id: targetProfile.id } as never,
      );

      if (summaryError) throw summaryError;

      const parsedSummary = parseMutationSummary(summaryData);
      if (!parsedSummary) throw new Error("RINGKASAN_MUTASI_TIDAK_VALID");
      summary = parsedSummary;
    }

    const trustedEmail = escapePostgrestValue(targetProfile.email);
    const memberLogScope = `user_id.eq.${targetProfile.id},user_email.eq."${trustedEmail}"`;

    let query = supabaseAdmin
      .from("balance_logs")
      .select(LOG_FIELDS, { count: "exact" })
      .or(memberLogScope);

    if (type !== "ALL") {
      query =
        type === "OTHER"
          ? query.not("type", "in", `(${RECOGNIZED_TYPES.map((knownType) => `"${knownType}"`).join(",")})`)
          : query.eq("type", type);
    }
    if (dateFrom) query = query.gte("created_at", dateFrom.toISOString());
    if (dateTo) query = query.lt("created_at", nextUtcDay(dateTo).toISOString());
    if (search) query = query.ilike("description", `%${search.replace(/[\\%_]/g, "\\$&")}%`);

    query = query.order("created_at", { ascending: sort === "oldest", nullsFirst: false });

    const from = exportAll ? 0 : (page - 1) * pageSize;
    const to = exportAll ? EXPORT_LIMIT : from + pageSize - 1;
    const { data, error, count } = await query.range(from, to);

    if (error) {
      throw error;
    }

    const total = count ?? 0;
    if (exportAll && total > EXPORT_LIMIT) {
      return NextResponse.json(
        { error: `Export dibatasi maksimal ${EXPORT_LIMIT} mutasi. Persempit filter lalu coba lagi.` },
        { status: 413 },
      );
    }

    const uniqueLogs = Array.from(
      new Map((data ?? []).map((log) => [log.id, log])).values(),
    );
    const effectivePageSize = exportAll ? Math.max(uniqueLogs.length, 1) : pageSize;

    return NextResponse.json({
      member: {
        id: targetProfile.id,
        full_name: targetProfile.full_name,
        email: targetProfile.email,
        member_type: targetProfile.member_type,
        balance: targetProfile.balance,
      },
      logs: uniqueLogs,
      page: exportAll ? 1 : page,
      pageSize: effectivePageSize,
      total,
      ...(summary ? { summary } : {}),
      totalPages: Math.max(1, Math.ceil(total / effectivePageSize)),
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal memuat mutasi saldo." },
      { status: 500 },
    );
  }
}
