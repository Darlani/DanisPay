"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  Loader2,
  Search,
  Shield,
  Users,
  Wallet,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import type { MemberActivityStatus } from "@/lib/memberActivity";
import { supabase } from "@/utils/supabaseClient";

type AccountUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  member_type: string | null;
  balance: number | string | null;
  created_at: string | null;
  last_activity_at?: string | null;
  activity_status?: MemberActivityStatus;
  is_tester?: boolean | null;
};

type AccountDatabaseResponse = {
  users?: AccountUser[];
  error?: string;
};

type BalanceLog = {
  id: string;
  created_at: string | null;
  type: string;
  description: string | null;
  amount: number | string;
  initial_balance: number | string | null;
  final_balance: number | string | null;
};

type BalanceHistoryResponse = {
  member?: Pick<AccountUser, "id" | "full_name" | "email" | "member_type" | "balance">;
  logs?: BalanceLog[];
  page?: number;
  pageSize?: number;
  total?: number;
  summary?: MutationSummary;
  totalPages?: number;
  error?: string;
};

type MutationSummaryMetric = {
  count: string;
  totalIn: string;
  totalOut: string;
  netAmount: string;
};

type MutationSummaryCategory =
  | "Deposit"
  | "Payment"
  | "Withdraw"
  | "Refund"
  | "Cashback"
  | "Referral"
  | "Bonus"
  | "AdminAdjustment"
  | "Upgrade"
  | "Other";

type MutationSummary = {
  total: MutationSummaryMetric;
  byType: Record<MutationSummaryCategory, MutationSummaryMetric>;
};

type AccountTab = "members" | "team";
type ActivityFilter = "ALL" | MemberActivityStatus;
type SortOption =
  | "newest"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "balance-high"
  | "balance-low"
  | "activity-newest"
  | "activity-oldest";

const PAGE_SIZE = 10;
const SUMMARY_CATEGORIES: MutationSummaryCategory[] = [
  "Deposit", "Payment", "Withdraw", "Refund", "Cashback",
  "Referral", "Bonus", "AdminAdjustment", "Upgrade", "Other",
];

function isMemberOnlySort(sortOption: SortOption) {
  return ["balance-high", "balance-low", "activity-newest", "activity-oldest"].includes(sortOption);
}

function formatRupiah(value: AccountUser["balance"]) {
  const rawValue = value === null || value === undefined ? "0" : String(value);

  if (!/^-?\d+$/.test(rawValue)) return "Rp 0";

  const isNegative = rawValue.startsWith("-");
  const digits = isNegative ? rawValue.slice(1) : rawValue;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `Rp ${isNegative ? "-" : ""}${grouped}`;
}

function toBalanceBigInt(value: AccountUser["balance"]) {
  const rawValue = value === null || value === undefined ? "0" : String(value);

  try {
    return /^-?\d+$/.test(rawValue) ? BigInt(rawValue) : BigInt(0);
  } catch {
    return BigInt(0);
  }
}

function formatDate(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getActivityLabel(status: MemberActivityStatus) {
  switch (status) {
    case "ACTIVE":
      return "Aktif";
    case "PASSIVE":
      return "Pasif";
    case "INACTIVE":
      return "Tidak Aktif";
    case "DORMANT":
      return "Dormant";
    case "NEVER":
      return "Belum Transaksi";
  }
}

function getActivityStyle(status: MemberActivityStatus) {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "PASSIVE":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "INACTIVE":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "DORMANT":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "NEVER":
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function formatActivityRelative(value: string | null) {
  if (!value) return "Belum ada aktivitas";

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Tanggal tidak tersedia";

  const elapsed = Math.max(0, Date.now() - timestamp);
  const days = Math.floor(elapsed / (24 * 60 * 60 * 1000));

  return days === 0 ? "Hari ini" : `${days} hari lalu`;
}

function MemberActivityBadge({ user, centered = false }: { user: AccountUser; centered?: boolean }) {
  const status = user.activity_status ?? "NEVER";
  const exactDate = user.last_activity_at ? formatDateTime(user.last_activity_at) : undefined;

  return (
    <div title={exactDate} className={centered ? "flex flex-col items-center text-center" : undefined}>
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${getActivityStyle(status)}`}>
        <span className="size-1.5 rounded-full bg-current" />
        {getActivityLabel(status)}
      </span>
      <p className="mt-1 text-xs text-slate-500">{formatActivityRelative(user.last_activity_at ?? null)}</p>
    </div>
  );
}

function formatRelativeDateTime(value: string | null) {
  if (!value) return "";

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "";

  const elapsed = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(elapsed / (60 * 1000));
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

type AuthInfoResponse = {
  last_sign_in_at?: string | null;
  error?: string;
};

function MemberLastLogin({ user }: { user: AccountUser }) {
  const [state, setState] = useState<{
    loading: boolean;
    lastSignInAt: string | null;
    failed: boolean;
  }>({ loading: true, lastSignInAt: null, failed: false });

  useEffect(() => {
    let cancelled = false;

    const fetchAuthInfo = async () => {
      setState({ loading: true, lastSignInAt: null, failed: false });

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Sesi admin tidak tersedia.");

        const response = await fetch(`/api/admin/members/${user.id}/auth-info`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const result = (await response.json().catch(() => ({}))) as AuthInfoResponse;
        if (!response.ok) throw new Error(result.error || "Data login tidak tersedia.");

        if (!cancelled) {
          setState({
            loading: false,
            lastSignInAt: result.last_sign_in_at ?? null,
            failed: false,
          });
        }
      } catch {
        if (!cancelled) setState({ loading: false, lastSignInAt: null, failed: true });
      }
    };

    void fetchAuthInfo();

    return () => {
      cancelled = true;
    };
  }, [user.id]);

  if (state.loading) {
    return <p className="text-right text-sm font-medium text-slate-500">Memuat aktivitas login...</p>;
  }

  if (state.failed) {
    return <p className="text-right text-sm font-medium text-rose-600">Data login tidak tersedia</p>;
  }

  if (!state.lastSignInAt) {
    return <p className="text-right text-sm font-medium text-slate-600">Belum Pernah Login</p>;
  }

  return <div className="text-right"><p className="text-sm font-semibold text-slate-800">{formatDateTime(state.lastSignInAt)}</p><p className="mt-0.5 text-xs text-slate-500">{formatRelativeDateTime(state.lastSignInAt)}</p></div>;
}

function formatOptionalRupiah(value: number | string | null) {
  return value === null || value === undefined ? "—" : formatRupiah(value);
}

function getLogTypeStyle(type: string) {
  switch (type) {
    case "Deposit":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Refund":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "Cashback":
      return "border-teal-200 bg-teal-50 text-teal-700";
    case "Referral":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "Bonus":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "Payment":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "Withdraw":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "AdminAdjustment":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";
    case "Upgrade":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function formatLogType(type: string) {
  return type === "AdminAdjustment" ? "Admin Adjustment" : type;
}

function formatSignedRupiah(value: number | string) {
  const amount = toBalanceBigInt(value);
  return `${amount > BigInt(0) ? "+ " : amount < BigInt(0) ? "- " : ""}${formatRupiah((amount < BigInt(0) ? -amount : amount).toString())}`;
}

function formatSummarySignedRupiah(value: string) {
  const amount = toBalanceBigInt(value);
  if (amount === BigInt(0)) return "Rp 0";
  return `${amount > BigInt(0) ? "+" : "-"}${formatRupiah((amount < BigInt(0) ? -amount : amount).toString())}`;
}

function getSummaryCategoryLabel(category: MutationSummaryCategory) {
  return category === "AdminAdjustment" ? "Admin Adjustment" : category === "Other" ? "Lainnya" : category;
}

function toExcelMoneyCell(value: number | string | null) {
  if (value === null || value === undefined) return null;

  const amount = toBalanceBigInt(value);
  const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
  const minSafe = BigInt(Number.MIN_SAFE_INTEGER);

  return amount <= maxSafe && amount >= minSafe ? Number(amount) : amount.toString();
}

function getInitials(user: AccountUser) {
  const source = user.full_name || user.email || "DA";
  const initials = source
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return initials.toUpperCase() || "DA";
}

function isStaff(user: AccountUser) {
  const role = user.role?.toLowerCase();
  return role === "manager" || role === "admin";
}

function getIdentity(user: AccountUser) {
  const role = user.role?.toLowerCase();

  if (role === "manager") {
    return {
      jabatan: "Manager",
      role: "MANAGER",
      accent: "navy" as const,
    };
  }
  if (role === "admin") {
    return {
      jabatan: "Admin",
      role: "ADMIN",
      accent: "blue" as const,
    };
  }
  if (user.member_type?.toLowerCase() === "special") {
    return {
      jabatan: "Member",
      role: "MEMBER SPECIAL",
      accent: "amber" as const,
    };
  }
  return {
    jabatan: "Member",
    role: "MEMBER REGULAR",
    accent: "slate" as const,
  };
}

function AccountAvatar({ user, staff }: { user: AccountUser; staff: boolean }) {
  return (
    <div
      className={`flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        staff ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
      }`}
      aria-hidden="true"
    >
      {getInitials(user)}
    </div>
  );
}

function RoleBadge({ user }: { user: AccountUser }) {
  const identity = getIdentity(user);
  const styles = {
    navy: "border-slate-200 bg-slate-900 text-white",
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    slate: "border-slate-200 bg-slate-50 text-slate-600",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide ${styles[identity.accent]}`}
    >
      {identity.accent === "amber" && <Award size={12} />}
      {identity.role}
    </span>
  );
}

function MemberTypeBadge({ user }: { user: AccountUser }) {
  const isSpecial = user.member_type?.toLowerCase() === "special";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
        isSpecial
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {isSpecial && <Award size={12} />}
      {isSpecial ? "Special" : "Regular"}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent = "slate",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: "slate" | "blue" | "amber" | "emerald";
}) {
  const accents = {
    slate: "bg-slate-100 text-slate-600",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
  };

  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <span className={`rounded-2xl p-2.5 ${accents[accent]}`}>{icon}</span>
      </div>
    </div>
  );
}

function AccountDetailModal({
  user,
  onClose,
}: {
  user: AccountUser | null;
  onClose: () => void;
}) {
  if (!user) return null;

  const teamAccount = isStaff(user);
  const identity = getIdentity(user);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-label="Detail akun">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <AccountAvatar user={user} staff={teamAccount} />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Detail Akun</h3>
              <p className="text-sm text-slate-500">Informasi akun yang tersedia</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup detail akun">
            <X size={18} />
          </button>
        </div>

        {teamAccount ? (
          <dl className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-100 px-4">
            <div className="flex justify-between gap-6 py-3"><dt className="text-sm text-slate-500">Nama</dt><dd className="text-right text-sm font-semibold text-slate-800">{user.full_name || "-"}</dd></div>
            <div className="flex justify-between gap-6 py-3"><dt className="text-sm text-slate-500">Email</dt><dd className="max-w-[60%] truncate text-right text-sm font-semibold text-slate-800" title={user.email || undefined}>{user.email || "-"}</dd></div>
            <div className="flex justify-between gap-6 py-3"><dt className="text-sm text-slate-500">Jabatan</dt><dd className="text-right text-sm font-semibold text-slate-800">{identity.jabatan}</dd></div>
            <div className="flex justify-between gap-6 py-3"><dt className="text-sm text-slate-500">Role</dt><dd><RoleBadge user={user} /></dd></div>
            <div className="flex justify-between gap-6 py-3"><dt className="text-sm text-slate-500">Status Tester</dt><dd className="text-right text-sm font-semibold">{user.is_tester ? <span className="font-bold text-amber-600">Tester Sandbox</span> : <span className="text-slate-400">Non-Tester</span>}</dd></div>
            <div className="flex justify-between gap-6 py-3"><dt className="text-sm text-slate-500">Bergabung</dt><dd className="text-right text-sm font-semibold text-slate-800">{formatDate(user.created_at)}</dd></div>
          </dl>
        ) : (
          <div className="mt-6 space-y-4">
            <DetailSection title="Informasi Akun">
              <DetailRow label="Nama">{user.full_name || "-"}</DetailRow>
              <DetailRow label="Email" title={user.email || undefined}>{user.email || "-"}</DetailRow>
              <DetailRow label="Role"><RoleBadge user={user} /></DetailRow>
              <DetailRow label="Member Type"><MemberTypeBadge user={user} /></DetailRow>
              <DetailRow label="Status Tester">{user.is_tester ? <span className="font-bold text-amber-600">Tester Sandbox</span> : <span className="text-slate-400">Non-Tester</span>}</DetailRow>
              <DetailRow label="Bergabung">{formatDate(user.created_at)}</DetailRow>
            </DetailSection>
            <DetailSection title="Aktivitas Transaksi">
              <DetailRow label="Status Aktivitas">{getActivityLabel(user.activity_status ?? "NEVER")}</DetailRow>
              <DetailRow label="Aktivitas Terakhir"><div><p>{user.last_activity_at ? formatDateTime(user.last_activity_at) : "Belum ada aktivitas"}</p>{user.last_activity_at && <p className="mt-0.5 text-xs font-medium text-slate-500">{formatActivityRelative(user.last_activity_at)}</p>}</div></DetailRow>
            </DetailSection>
            <DetailSection title="Aktivitas Login">
              <DetailRow label="Last Login"><MemberLastLogin user={user} /></DetailRow>
            </DetailSection>
            <DetailSection title="Wallet">
              <DetailRow label="Saldo Saat Ini" accent="emerald">{formatRupiah(user.balance)}</DetailRow>
            </DetailSection>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-2xl border border-slate-100"><p className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</p><dl className="divide-y divide-slate-100 px-4">{children}</dl></section>;
}

function DetailRow({ label, children, title, accent = "slate" }: { label: string; children: React.ReactNode; title?: string; accent?: "slate" | "emerald" }) {
  return <div className="flex items-start justify-between gap-6 py-3"><dt className="shrink-0 text-sm text-slate-500">{label}</dt><dd title={title} className={`max-w-[62%] text-right text-sm font-semibold ${accent === "emerald" ? "text-emerald-600" : "text-slate-800"}`}>{children}</dd></div>;
}

function BalanceAdjustmentModal({
  user,
  onClose,
  onSuccess,
}: {
  user: AccountUser | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDelta("");
    setReason("");
    setError(null);
  }, [user]);

  if (!user) return null;

  const validDelta = /^-?(?:0|[1-9][0-9]*)$/.test(delta) && delta !== "0";
  const parsedDelta = validDelta ? toBalanceBigInt(delta) : null;
  const currentBalance = toBalanceBigInt(user.balance);
  const projectedBalance = parsedDelta === null ? null : currentBalance + parsedDelta;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validDelta || !reason.trim()) {
      setError("Masukkan penyesuaian bilangan bulat dan alasan.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sesi admin tidak valid. Silakan login kembali.");

      const response = await fetch(`/api/admin/members/${user.id}/balance-adjustments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ delta, reason: reason.trim() }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Gagal memproses penyesuaian saldo.");

      onSuccess();
      onClose();
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "Gagal memproses penyesuaian saldo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-label="Adjust saldo">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div><h3 className="text-lg font-bold text-slate-900">Adjust Saldo</h3><p className="mt-1 text-sm text-slate-500">{user.full_name || user.email || "Member"}</p></div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup adjust saldo"><X size={18} /></button>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-500">Saldo saat ini</span><span className="font-bold text-slate-900">{formatRupiah(user.balance)}</span></div>
          <div className="mt-3 flex justify-between gap-4"><span className="text-slate-500">Saldo setelah adjustment</span><span className="font-bold text-emerald-600">{projectedBalance === null ? "-" : formatRupiah(projectedBalance.toString())}</span></div>
        </div>

        <label className="mt-5 block text-sm font-semibold text-slate-700">Penyesuaian</label>
        <input value={delta} onChange={(event) => setDelta(event.target.value)} placeholder="+25000 atau -25000" inputMode="numeric" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        <label className="mt-4 block text-sm font-semibold text-slate-700">Alasan</label>
        <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="Contoh: koreksi saldo transaksi" className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Batal</button><button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{submitting && <Loader2 size={15} className="animate-spin" />}{submitting ? "Memproses" : "Simpan Adjustment"}</button></div>
      </form>
    </div>
  );
}

function MutationSummarySection({ summary }: { summary: MutationSummary }) {
  const primaryCards = [
    { label: "Total Mutasi", value: summary.total.count, tone: "text-slate-900", detail: "mutasi tercatat" },
    { label: "Total Masuk", value: formatRupiah(summary.total.totalIn), tone: "text-emerald-600", detail: "Masuk" },
    { label: "Total Keluar", value: formatRupiah(summary.total.totalOut), tone: "text-rose-600", detail: "Keluar" },
    { label: "Net Mutasi", value: formatSummarySignedRupiah(summary.total.netAmount), tone: toBalanceBigInt(summary.total.netAmount) > BigInt(0) ? "text-emerald-600" : toBalanceBigInt(summary.total.netAmount) < BigInt(0) ? "text-rose-600" : "text-slate-700", detail: "seluruh riwayat" },
  ];

  return (
    <section className="mt-5" aria-label="Ringkasan mutasi">
      <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">Ringkasan Mutasi</p><p className="mt-1 text-sm text-slate-500">Akumulasi seluruh riwayat wallet member.</p></div></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{primaryCards.map((card) => <div key={card.label} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm"><p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{card.label}</p><p className={`mt-1.5 text-base font-bold ${card.tone}`}>{card.value}</p><p className="mt-1 text-xs text-slate-500">{card.detail}</p></div>)}</div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{SUMMARY_CATEGORIES.map((category) => <MutationSummaryCategoryCard key={category} category={category} metric={summary.byType[category]} />)}</div>
    </section>
  );
}

function MutationSummaryCategoryCard({ category, metric }: { category: MutationSummaryCategory; metric: MutationSummaryMetric }) {
  const totalIn = toBalanceBigInt(metric.totalIn);
  const totalOut = toBalanceBigInt(metric.totalOut);
  const hasBothDirections = totalIn > BigInt(0) && totalOut > BigInt(0);
  const isEmptyCategory = metric.count === "0" && totalIn === BigInt(0) && totalOut === BigInt(0);

  return <div className={`min-w-0 rounded-xl p-3 ${isEmptyCategory ? "bg-slate-50/70" : "border border-slate-100 bg-white"}`}><p className={`truncate text-xs font-semibold ${isEmptyCategory ? "text-slate-500" : "text-slate-700"}`} title={getSummaryCategoryLabel(category)}>{getSummaryCategoryLabel(category)}</p><p className="mt-1 text-[11px] text-slate-500">{metric.count} mutasi</p>{totalIn > BigInt(0) && <p className="mt-2 text-xs font-semibold text-emerald-600">Masuk {formatRupiah(metric.totalIn)}</p>}{totalOut > BigInt(0) && <p className="mt-1 text-xs font-semibold text-rose-600">Keluar {formatRupiah(metric.totalOut)}</p>}{totalIn === BigInt(0) && totalOut === BigInt(0) && <p className="mt-2 text-xs text-slate-500">Rp 0</p>}{hasBothDirections && <p className="mt-1 text-xs text-slate-500">Net {formatSummarySignedRupiah(metric.netAmount)}</p>}</div>;
}

function BalanceHistoryModal({
  user,
  onClose,
}: {
  user: AccountUser | null;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState<BalanceLog[]>([]);
  const [member, setMember] = useState<BalanceHistoryResponse["member"]>();
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<MutationSummary | null>(null);
  const summaryLoadedForUserId = useRef<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [user?.id, debouncedSearch, type, dateFrom, dateTo, sort]);

  useEffect(() => {
    setSummary(null);
    summaryLoadedForUserId.current = null;
  }, [user?.id]);

  const buildParams = useCallback((requestedPage: number, exportAll = false, includeFilters = true, includeSummary = false) => {
    const params = new URLSearchParams({
      page: String(requestedPage),
      pageSize: "10",
      type,
      sort,
    });
    if (includeFilters && debouncedSearch) params.set("search", debouncedSearch);
    if (includeFilters && dateFrom) params.set("dateFrom", dateFrom);
    if (includeFilters && dateTo) params.set("dateTo", dateTo);
    if (!includeFilters) {
      params.set("type", "ALL");
      params.set("sort", "newest");
    }
    if (exportAll) params.set("export", "all");
    if (includeSummary) params.set("summary", "1");
    return params;
  }, [dateFrom, dateTo, debouncedSearch, sort, type]);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sesi admin tidak tersedia. Silakan login kembali.");

      const includeSummary = summaryLoadedForUserId.current !== user.id;
      const response = await fetch(
        `/api/admin/members/${user.id}/balance-history?${buildParams(page, false, true, includeSummary).toString()}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      const result = (await response.json().catch(() => ({}))) as BalanceHistoryResponse;
      if (!response.ok) throw new Error(result.error || "Gagal memuat mutasi saldo.");

      setLogs(Array.isArray(result.logs) ? result.logs : []);
      setMember(result.member);
      setTotal(typeof result.total === "number" ? result.total : 0);
      if (includeSummary) {
        if (!result.summary) throw new Error("Ringkasan mutasi tidak tersedia.");
        setSummary(result.summary);
        summaryLoadedForUserId.current = user.id;
      }
      setTotalPages(typeof result.totalPages === "number" ? result.totalPages : 1);
    } catch (historyError: unknown) {
      setLogs([]);
      if (summaryLoadedForUserId.current !== user.id) setSummary(null);
      setError(historyError instanceof Error ? historyError.message : "Gagal memuat mutasi saldo.");
    } finally {
      setLoading(false);
    }
  }, [buildParams, page, user]);

  useEffect(() => { void fetchHistory(); }, [fetchHistory]);

  const resetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setType("ALL");
    setDateFrom("");
    setDateTo("");
    setSort("newest");
  };

  const exportLogs = async (format: "xlsx" | "csv", scope: "filtered" | "all") => {
    if (!user) return;
    setExporting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sesi admin tidak tersedia. Silakan login kembali.");

      const response = await fetch(
        `/api/admin/members/${user.id}/balance-history?${buildParams(1, true, scope === "filtered").toString()}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      const result = (await response.json().catch(() => ({}))) as BalanceHistoryResponse;
      if (!response.ok) throw new Error(result.error || "Gagal menyiapkan file mutasi saldo.");

      const exportMember = result.member ?? member ?? user;
      const exportLogs = Array.isArray(result.logs) ? result.logs : [];
      const fileBase = `DaPay_Mutasi_${(exportMember.full_name || exportMember.email || "member").replace(/[^a-z0-9_-]+/gi, "_")}_${new Date().toISOString().slice(0, 10)}`;
      const rows = exportLogs.map((log, index) => {
        const amount = toBalanceBigInt(log.amount);
        return {
          No: index + 1,
          Waktu: formatDateTime(log.created_at),
          Jenis: formatLogType(log.type),
          Keterangan: log.description || "Tidak ada keterangan",
          Masuk: amount > BigInt(0) ? toExcelMoneyCell(amount.toString()) : null,
          Keluar: amount < BigInt(0) ? toExcelMoneyCell((-amount).toString()) : null,
          "Saldo Awal": toExcelMoneyCell(log.initial_balance),
          "Saldo Akhir": toExcelMoneyCell(log.final_balance),
        };
      });

      if (format === "csv") {
        const headers = ["Waktu", "Jenis", "Keterangan", "Masuk", "Keluar", "Saldo Awal", "Saldo Akhir"];
        const escapeCsv = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
        const csv = [headers, ...rows.map((row) => headers.map((header) => row[header as keyof typeof row]))]
          .map((row) => row.map(escapeCsv).join(","))
          .join("\r\n");
        const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${fileBase}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);
        return;
      }

      const metadata = [
        ["DAPAY — MUTASI SALDO MEMBER"],
        ["Nama", exportMember.full_name || "-"],
        ["Email", exportMember.email || "-"],
        ["Member Type", exportMember.member_type || "Regular"],
        ["Saldo Saat Ini", toExcelMoneyCell(exportMember.balance)],
        ["Periode", scope === "all" ? "Semua periode" : `${dateFrom || "Awal"} — ${dateTo || "Sekarang"}`],
        ["Filter Jenis", scope === "all" ? "ALL" : type],
        ["Tanggal Export", new Date().toLocaleString("id-ID")],
        [],
      ];
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(metadata);
      XLSX.utils.sheet_add_json(worksheet, rows, { origin: "A10" });
      worksheet["!cols"] = [{ wch: 6 }, { wch: 20 }, { wch: 20 }, { wch: 48 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(workbook, worksheet, "Mutasi Saldo");
      XLSX.writeFile(workbook, `${fileBase}.xlsx`);
    } catch (exportError: unknown) {
      setError(exportError instanceof Error ? exportError.message : "Gagal menyiapkan file mutasi saldo.");
    } finally {
      setExporting(false);
    }
  };

  if (!user) return null;
  const activeMember: AccountUser = member
    ? { ...member, role: null, created_at: null }
    : user;
  const hasFilters = Boolean(search || type !== "ALL" || dateFrom || dateTo || sort !== "newest");
  const rangeStart = total === 0 ? 0 : (page - 1) * 10 + 1;
  const rangeEnd = Math.min(page * 10, total);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 p-0 sm:flex sm:items-center sm:justify-center sm:p-5" role="dialog" aria-modal="true" aria-label="Mutasi saldo">
      <section className="flex h-full w-full flex-col bg-white sm:h-[92vh] sm:max-w-6xl sm:rounded-3xl sm:shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-7"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Wallet Member</p><h2 className="mt-1 text-xl font-bold text-slate-900">Mutasi Saldo</h2><p className="mt-1 text-sm text-slate-500">Riwayat perubahan saldo dan aktivitas wallet member.</p></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup mutasi saldo"><X size={20} /></button></header>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7"><div className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><AccountAvatar user={activeMember} staff={false} /><div><p className="font-semibold text-slate-800">{activeMember.full_name || "-"}</p><p className="text-sm text-slate-500">{activeMember.email || "-"}</p><div className="mt-1"><MemberTypeBadge user={activeMember} /></div></div></div><div className="rounded-2xl bg-white px-4 py-3 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Saldo Saat Ini</p><p className="mt-1 text-lg font-bold text-emerald-600">{formatRupiah(activeMember.balance)}</p><p className="mt-1 text-xs text-slate-500">{total} mutasi</p></div></div>

          {summary && <MutationSummarySection summary={summary} />}

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px_145px_145px_130px_auto]">
            <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari keterangan..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500" /></label>
            <select value={type} onChange={(event) => setType(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"><option value="ALL">Semua</option><option value="Deposit">Deposit</option><option value="Payment">Payment</option><option value="Withdraw">Withdraw</option><option value="Refund">Refund</option><option value="Cashback">Cashback</option><option value="Referral">Referral</option><option value="Bonus">Bonus</option><option value="AdminAdjustment">Admin Adjustment</option><option value="Upgrade">Upgrade</option><option value="OTHER">Lainnya</option></select>
            <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label="Dari tanggal" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500" />
            <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label="Sampai tanggal" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500" />
            <select value={sort} onChange={(event) => setSort(event.target.value as "newest" | "oldest")} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500"><option value="newest">Terbaru</option><option value="oldest">Terlama</option></select>
            <button type="button" onClick={resetFilters} disabled={!hasFilters} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40">Reset Filter</button>
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" disabled={loading || exporting || total === 0} onClick={() => void exportLogs("xlsx", "filtered")} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"><FileSpreadsheet size={16} />{exporting ? "Menyiapkan File..." : "Excel — Hasil Filter"}</button><button type="button" disabled={loading || exporting || !summary || summary.total.count === "0"} onClick={() => void exportLogs("xlsx", "all")} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"><FileSpreadsheet size={16} />Excel — Semua Mutasi</button><button type="button" disabled={loading || exporting || total === 0} onClick={() => void exportLogs("csv", "filtered")} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"><FileText size={16} />CSV — Hasil Filter</button><button type="button" disabled={loading || exporting || !summary || summary.total.count === "0"} onClick={() => void exportLogs("csv", "all")} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"><FileText size={16} />CSV — Semua Mutasi</button></div>

          {loading ? <MutationSkeleton /> : error ? <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50 p-5 text-center"><p className="text-sm font-semibold text-rose-700">Gagal memuat mutasi saldo.</p><button type="button" onClick={() => void fetchHistory()} className="mt-3 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm">COBA LAGI</button></div> : logs.length === 0 ? <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">{hasFilters ? "Tidak ada mutasi yang cocok dengan filter." : "Belum ada riwayat mutasi saldo untuk member ini."}</div> : <><div className="mt-5 hidden overflow-x-auto lg:block"><table className="w-full min-w-230 text-left"><thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400"><tr><th className="px-4 py-3">Waktu</th><th className="px-4 py-3">Jenis</th><th className="px-4 py-3">Keterangan</th><th className="px-4 py-3 text-right">Masuk</th><th className="px-4 py-3 text-right">Keluar</th><th className="px-4 py-3 text-right">Saldo Awal</th><th className="px-4 py-3 text-right">Saldo Akhir</th></tr></thead><tbody className="divide-y divide-slate-100">{logs.map((log) => <MutationDesktopRow key={log.id} log={log} />)}</tbody></table></div><div className="mt-5 space-y-3 lg:hidden">{logs.map((log) => <MutationMobileCard key={log.id} log={log} />)}</div><MutationPagination page={page} totalPages={totalPages} start={rangeStart} end={rangeEnd} total={total} onPageChange={setPage} /></>}
        </div>
      </section>
    </div>
  );
}

function MutationDesktopRow({ log }: { log: BalanceLog }) {
  const amount = toBalanceBigInt(log.amount);
  return <tr className="hover:bg-slate-50/80"><td className="px-4 py-3 text-sm text-slate-500">{formatDateTime(log.created_at)}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getLogTypeStyle(log.type)}`}>{formatLogType(log.type)}</span></td><td className="max-w-90 truncate px-4 py-3 text-sm text-slate-600" title={log.description || undefined}>{log.description || "Tidak ada keterangan"}</td><td className="px-4 py-3 text-right text-sm font-semibold text-emerald-600">{amount > BigInt(0) ? formatRupiah(amount.toString()) : "-"}</td><td className="px-4 py-3 text-right text-sm font-semibold text-rose-600">{amount < BigInt(0) ? formatRupiah((-amount).toString()) : "-"}</td><td className="px-4 py-3 text-right text-sm text-slate-600">{formatOptionalRupiah(log.initial_balance)}</td><td className="px-4 py-3 text-right text-sm text-slate-600">{formatOptionalRupiah(log.final_balance)}</td></tr>;
}

function MutationMobileCard({ log }: { log: BalanceLog }) {
  const amount = toBalanceBigInt(log.amount);
  return <article className="rounded-2xl border border-slate-100 p-4 shadow-sm"><div className="flex items-start justify-between gap-4"><div><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getLogTypeStyle(log.type)}`}>{formatLogType(log.type)}</span><p className="mt-2 text-xs text-slate-500">{formatDateTime(log.created_at)}</p></div><p className={`text-sm font-bold ${amount > BigInt(0) ? "text-emerald-600" : amount < BigInt(0) ? "text-rose-600" : "text-slate-600"}`}>{formatSignedRupiah(log.amount)}</p></div><p className="mt-3 text-sm text-slate-700">{log.description || "Tidak ada keterangan"}</p>{(log.initial_balance !== null || log.final_balance !== null) && <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">Saldo {formatOptionalRupiah(log.initial_balance)} → {formatOptionalRupiah(log.final_balance)}</p>}</article>;
}

function MutationSkeleton() {
  return <div className="mt-5 space-y-3">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-18 animate-pulse rounded-2xl bg-slate-100" />)}</div>;
}

function MutationPagination({ page, totalPages, start, end, total, onPageChange }: { page: number; totalPages: number; start: number; end: number; total: number; onPageChange: (page: number) => void }) {
  if (total <= 10) return <div className="mt-5 text-sm text-slate-500">Menampilkan {start}-{end} dari {total} mutasi</div>;
  return <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>Menampilkan {start}-{end} dari {total} mutasi</span><div className="flex items-center gap-1"><button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} className="rounded-lg p-2 disabled:opacity-40"><ChevronLeft size={17} /></button>{Array.from({ length: totalPages }, (_, index) => index + 1).map((value) => <button key={value} type="button" onClick={() => onPageChange(value)} className={`size-8 rounded-lg text-xs font-semibold ${page === value ? "bg-slate-900 text-white" : "hover:bg-slate-100"}`}>{value}</button>)}<button type="button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="rounded-lg p-2 disabled:opacity-40"><ChevronRight size={17} /></button></div></div>;
}

export default function AccountDatabaseManagement() {
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AccountTab>("team");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("newest");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("ALL");
  const [page, setPage] = useState(1);
  const [detailUser, setDetailUser] = useState<AccountUser | null>(null);
  const [mutationUser, setMutationUser] = useState<AccountUser | null>(null);
  const [adjustmentUser, setAdjustmentUser] = useState<AccountUser | null>(null);
  const [testerTogglingId, setTesterTogglingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sesi admin tidak tersedia. Silakan login kembali.");

      const response = await fetch("/api/admin/account-database/users", { headers: { Authorization: `Bearer ${session.access_token}` } });
      const result = (await response.json().catch(() => ({}))) as AccountDatabaseResponse;
      if (!response.ok) throw new Error(result.error || "Gagal memuat database akun.");

      setUsers(Array.isArray(result.users) ? result.users : []);
    } catch (fetchError: unknown) {
      setUsers([]);
      setError(fetchError instanceof Error ? fetchError.message : "Gagal memuat database akun.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggleTester = useCallback(async (targetUser: AccountUser) => {
    if (testerTogglingId) return;
    const newStatus = !targetUser.is_tester;
    setTesterTogglingId(targetUser.id);
    setUsers((prev) =>
      prev.map((u) => (u.id === targetUser.id ? { ...u, is_tester: newStatus } : u))
    );

    // Broadcast instantaneously (0ms) across all tabs in browser
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          "dapay_tester_realtime_event",
          JSON.stringify({ userId: targetUser.id, isTester: newStatus, ts: Date.now() })
        );
        if ("BroadcastChannel" in window) {
          const bc = new BroadcastChannel("dapay_tester_sync");
          bc.postMessage({ userId: targetUser.id, isTester: newStatus });
          bc.close();
        }
        window.dispatchEvent(
          new CustomEvent("sandboxSessionChanged", {
            detail: { userId: targetUser.id, isTester: newStatus }
          })
        );
      } catch {
        // ignore
      }
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sesi admin tidak tersedia.");

      const res = await fetch(`/api/admin/members/${targetUser.id}/tester`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ is_tester: newStatus }),
      });
      if (res.ok) {
        window.dispatchEvent(
          new CustomEvent("sandboxSessionChanged", {
            detail: { userId: targetUser.id, isTester: newStatus }
          })
        );
      } else {
        await fetchUsers();
      }
    } catch {
      await fetchUsers();
    } finally {
      setTesterTogglingId(null);
    }
  }, [testerTogglingId, fetchUsers]);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setPage(1); }, [activeTab, activityFilter, searchTerm, sortOption]);

  const memberUsers = useMemo(() => users.filter((user) => !isStaff(user)), [users]);
  const teamUsers = useMemo(() => users.filter(isStaff), [users]);
  const currentUsers = activeTab === "members" ? memberUsers : teamUsers;
  const specialCount = useMemo(() => memberUsers.filter((user) => user.member_type?.toLowerCase() === "special").length, [memberUsers]);
  const regularCount = useMemo(() => memberUsers.length - specialCount, [memberUsers, specialCount]);

  const sortedUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filtered = currentUsers.filter((user) => {
      const matchesSearch = !normalizedSearch
        || user.full_name?.toLowerCase().includes(normalizedSearch)
        || user.email?.toLowerCase().includes(normalizedSearch);
      const matchesActivity = activeTab !== "members"
        || activityFilter === "ALL"
        || user.activity_status === activityFilter;

      return matchesSearch && matchesActivity;
    });

    return [...filtered].sort((a, b) => {
      const nameA = a.full_name ?? a.email ?? "";
      const nameB = b.full_name ?? b.email ?? "";
      if (sortOption === "name-asc") return nameA.localeCompare(nameB, "id");
      if (sortOption === "name-desc") return nameB.localeCompare(nameA, "id");
      if (sortOption === "balance-high") return toBalanceBigInt(a.balance) > toBalanceBigInt(b.balance) ? -1 : toBalanceBigInt(a.balance) < toBalanceBigInt(b.balance) ? 1 : 0;
      if (sortOption === "balance-low") return toBalanceBigInt(a.balance) < toBalanceBigInt(b.balance) ? -1 : toBalanceBigInt(a.balance) > toBalanceBigInt(b.balance) ? 1 : 0;
      if (sortOption === "activity-newest" || sortOption === "activity-oldest") {
        const activityA = a.last_activity_at ? new Date(a.last_activity_at).getTime() : null;
        const activityB = b.last_activity_at ? new Date(b.last_activity_at).getTime() : null;

        if (activityA === null && activityB === null) return 0;
        if (sortOption === "activity-newest") return activityA === null ? 1 : activityB === null ? -1 : activityB - activityA;
        return activityA === null ? -1 : activityB === null ? 1 : activityA - activityB;
      }
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortOption === "oldest" ? timeA - timeB : timeB - timeA;
    });
  }, [activeTab, activityFilter, currentUsers, searchTerm, sortOption]);

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedUsers = useMemo(() => sortedUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), [safePage, sortedUsers]);
  const rangeStart = sortedUsers.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, sortedUsers.length);
  const sortOptions: { value: SortOption; label: string }[] = activeTab === "members" ? [
    { value: "newest", label: "Terbaru Bergabung" }, { value: "oldest", label: "Terlama Bergabung" }, { value: "name-asc", label: "Nama A-Z" }, { value: "name-desc", label: "Nama Z-A" }, { value: "balance-high", label: "Saldo Tertinggi" }, { value: "balance-low", label: "Saldo Terendah" }, { value: "activity-newest", label: "Aktivitas Terbaru" }, { value: "activity-oldest", label: "Paling Lama Tidak Aktif" },
  ] : [
    { value: "newest", label: "Terbaru" }, { value: "oldest", label: "Terlama" }, { value: "name-asc", label: "Nama A-Z" }, { value: "name-desc", label: "Nama Z-A" },
  ];

  return (
    <div className="w-full space-y-6 pb-16 pt-4 text-slate-800">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4"><div className="rounded-2xl bg-slate-900 p-3 text-white shadow-lg shadow-slate-900/15"><Users size={26} /></div><div><h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">ACCOUNT DATABASE</h1><p className="mt-1 text-sm text-slate-500">Kelola akun staff, member dan wallet DaPay dari satu pusat data.</p></div></div>
        <label className="relative w-full lg:max-w-md"><Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Cari nama atau email..." className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></label>
      </header>

      <div className="inline-flex rounded-2xl bg-slate-100 p-1.5"><button type="button" onClick={() => { setActiveTab("team"); if (isMemberOnlySort(sortOption)) setSortOption("newest"); }} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === "team" ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>TEAM <span className={`ml-1.5 rounded-full px-2 py-0.5 text-xs ${activeTab === "team" ? "bg-white/15 text-white" : "bg-white text-slate-500"}`}>{teamUsers.length}</span></button><button type="button" onClick={() => setActiveTab("members")} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === "members" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>MEMBERS <span className={`ml-1.5 rounded-full px-2 py-0.5 text-xs ${activeTab === "members" ? "bg-white/15 text-white" : "bg-white text-slate-500"}`}>{memberUsers.length}</span></button></div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4"><StatCard label="Total Akun" value={users.length} icon={<Users size={19} />} /><StatCard label="Team" value={teamUsers.length} icon={<BriefcaseBusiness size={19} />} accent="blue" /><StatCard label="Member Special" value={specialCount} icon={<Award size={19} />} accent="amber" /><StatCard label="Member Regular" value={regularCount} icon={<Wallet size={19} />} accent="emerald" /></section>

      <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-medium text-slate-500">{sortedUsers.length} {activeTab === "members" ? "member" : "akun team"}</p><div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">{activeTab === "members" && <label className="flex items-center gap-2">Aktivitas <select value={activityFilter} onChange={(event) => setActivityFilter(event.target.value as ActivityFilter)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500"><option value="ALL">Semua Aktivitas</option><option value="ACTIVE">Aktif</option><option value="PASSIVE">Pasif</option><option value="INACTIVE">Tidak Aktif</option><option value="DORMANT">Dormant</option><option value="NEVER">Belum Transaksi</option></select></label>}<label className="flex items-center gap-2">Urutkan <select value={sortOption} onChange={(event) => setSortOption(event.target.value as SortOption)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500">{sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div></div>

        {loading ? <AccountSkeleton /> : error ? <ErrorState onRetry={fetchUsers} /> : <>
          <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-250 text-left"><thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-4">Account</th><th className="px-5 py-4">Email</th>{activeTab === "members" ? <><th className="px-5 py-4">Member Type</th><th className="px-5 py-4">Bergabung</th><th className="px-5 py-4 text-center">Aktivitas</th><th className="px-5 py-4 text-right">Saldo</th></> : <><th className="px-5 py-4">Jabatan</th><th className="px-5 py-4">Role</th><th className="px-5 py-4">Bergabung</th></>}<th className="px-5 py-4 text-center">Tester</th><th className="px-5 py-4 text-center">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{paginatedUsers.map((user) => <DesktopRow key={user.id} user={user} member={activeTab === "members"} onDetail={setDetailUser} onMutation={setMutationUser} onAdjust={setAdjustmentUser} onToggleTester={handleToggleTester} togglingTester={testerTogglingId === user.id} />)}</tbody></table></div>
          <div className="space-y-3 p-4 md:hidden">{paginatedUsers.map((user) => <MobileCard key={user.id} user={user} member={activeTab === "members"} onDetail={setDetailUser} onMutation={setMutationUser} onAdjust={setAdjustmentUser} onToggleTester={handleToggleTester} togglingTester={testerTogglingId === user.id} />)}</div>
          {sortedUsers.length === 0 && <EmptyState tab={activeTab} hasSearch={Boolean(searchTerm.trim())} />}
          {sortedUsers.length > 0 && <Pagination page={safePage} totalPages={totalPages} start={rangeStart} end={rangeEnd} total={sortedUsers.length} onPageChange={setPage} />}
        </>}
      </section>

      <AccountDetailModal user={detailUser} onClose={() => setDetailUser(null)} />
      <BalanceHistoryModal user={mutationUser} onClose={() => setMutationUser(null)} />
      <BalanceAdjustmentModal user={adjustmentUser} onClose={() => setAdjustmentUser(null)} onSuccess={fetchUsers} />
    </div>
  );
}

function DesktopRow({
  user,
  member,
  onDetail,
  onMutation,
  onAdjust,
  onToggleTester,
  togglingTester,
}: {
  user: AccountUser;
  member: boolean;
  onDetail: (user: AccountUser) => void;
  onMutation: (user: AccountUser) => void;
  onAdjust: (user: AccountUser) => void;
  onToggleTester: (user: AccountUser) => void;
  togglingTester: boolean;
}) {
  const identity = getIdentity(user);
  return (
    <tr className="transition hover:bg-slate-50/80">
      <td className="px-5 py-4"><div className="flex items-center gap-3"><AccountAvatar user={user} staff={!member} /><div><p className="text-sm font-semibold text-slate-800">{user.full_name || "-"}</p><p className="mt-0.5 text-xs text-slate-400">{identity.jabatan}</p></div></div></td>
      <td className="max-w-55 truncate px-5 py-4 text-sm text-slate-500" title={user.email || undefined}>{user.email || "-"}</td>
      {member ? <>
        <td className="px-5 py-4"><MemberTypeBadge user={user} /></td>
        <td className="px-5 py-4 text-sm text-slate-500">{formatDate(user.created_at)}</td>
        <td className="px-5 py-4"><MemberActivityBadge user={user} centered /></td>
        <td className="px-5 py-4 text-right text-sm font-bold text-emerald-600">{formatRupiah(user.balance)}</td>
      </> : <>
        <td className="px-5 py-4"><span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">{identity.role === "MANAGER" ? <BriefcaseBusiness size={15} className="text-slate-700" /> : <Shield size={15} className="text-blue-600" />}{identity.jabatan}</span></td>
        <td className="px-5 py-4"><RoleBadge user={user} /></td>
        <td className="px-5 py-4 text-sm text-slate-500">{formatDate(user.created_at)}</td>
      </>}
      <td className="px-5 py-4 text-center">
        <button
          type="button"
          onClick={() => onToggleTester(user)}
          disabled={togglingTester}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
            user.is_tester
              ? "bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200"
          } ${togglingTester ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          title={user.is_tester ? "Klik untuk menonaktifkan status Tester" : "Klik untuk jadikan Tester Sandbox"}
        >
          {togglingTester ? (
            <Loader2 size={12} className="animate-spin text-slate-500" />
          ) : (
            <FlaskConical size={12} className={user.is_tester ? "text-amber-700" : "text-slate-400"} />
          )}
          <span>{user.is_tester ? "Tester" : "Non-Tester"}</span>
        </button>
      </td>
      <td className="px-5 py-4 text-center"><div className="flex justify-center gap-2"><button type="button" onClick={() => onDetail(user)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"><Eye size={15} /> Detail</button>{member && <><button type="button" onClick={() => onMutation(user)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"><Eye size={15} /> Mutasi Saldo</button><button type="button" onClick={() => onAdjust(user)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"><Wallet size={15} /> Adjust</button></>}</div></td>
    </tr>
  );
}

function MobileCard({
  user,
  member,
  onDetail,
  onMutation,
  onAdjust,
  onToggleTester,
  togglingTester,
}: {
  user: AccountUser;
  member: boolean;
  onDetail: (user: AccountUser) => void;
  onMutation: (user: AccountUser) => void;
  onAdjust: (user: AccountUser) => void;
  onToggleTester: (user: AccountUser) => void;
  togglingTester: boolean;
}) {
  const identity = getIdentity(user);
  return (
    <article className="rounded-2xl border border-slate-100 p-4 shadow-sm">
      <div className="flex gap-3">
        <AccountAvatar user={user} staff={!member} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-slate-800">{user.full_name || "-"}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500" title={user.email || undefined}>{user.email || "-"}</p>
        </div>
        {member ? <MemberTypeBadge user={user} /> : <RoleBadge user={user} />}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs">
        <div>
          <p className="text-slate-400">{member ? "Member Type" : "Jabatan"}</p>
          <p className="mt-1 font-semibold text-slate-700">{member ? (user.member_type?.toLowerCase() === "special" ? "Special" : "Regular") : identity.jabatan}</p>
        </div>
        {member && (
          <div>
            <p className="text-slate-400">Saldo</p>
            <p className="mt-1 font-bold text-emerald-600">{formatRupiah(user.balance)}</p>
          </div>
        )}
        <div>
          <p className="text-slate-400">Bergabung</p>
          <p className="mt-1 font-semibold text-slate-700">{formatDate(user.created_at)}</p>
        </div>
        {member && (
          <div>
            <p className="text-slate-400">Aktivitas</p>
            <div className="mt-1"><MemberActivityBadge user={user} /></div>
          </div>
        )}
        <div>
          <p className="text-slate-400">Status Tester</p>
          <button
            type="button"
            onClick={() => onToggleTester(user)}
            disabled={togglingTester}
            className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition ${
              user.is_tester
                ? "bg-amber-100 text-amber-800 border border-amber-300"
                : "bg-slate-100 text-slate-500 border border-slate-200"
            } ${togglingTester ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {togglingTester ? (
              <Loader2 size={10} className="animate-spin text-slate-500" />
            ) : (
              <FlaskConical size={10} className={user.is_tester ? "text-amber-700" : "text-slate-400"} />
            )}
            <span>{user.is_tester ? "Tester" : "Non-Tester"}</span>
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => onDetail(user)} className="min-w-25 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700">
          Detail
        </button>
        {member && (
          <>
            <button type="button" onClick={() => onMutation(user)} className="min-w-30 flex-1 rounded-xl border border-blue-200 px-3 py-2.5 text-xs font-semibold text-blue-700">
              Mutasi Saldo
            </button>
            <button type="button" onClick={() => onAdjust(user)} className="min-w-30 flex-1 rounded-xl bg-blue-600 px-2 py-2.5 text-xs font-semibold text-white">
              Adjust Saldo
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function AccountSkeleton() {
  return <div className="space-y-3 p-5">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}</div>;
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return <div className="flex flex-col items-center justify-center gap-3 p-12 text-center"><p className="text-sm font-semibold text-slate-700">Gagal memuat database akun.</p><button type="button" onClick={onRetry} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">COBA LAGI</button></div>;
}

function EmptyState({ tab, hasSearch }: { tab: AccountTab; hasSearch: boolean }) {
  return <div className="p-12 text-center text-sm text-slate-500">{hasSearch ? "Tidak ada akun yang cocok dengan pencarian." : tab === "members" ? "Belum ada member yang dapat ditampilkan." : "Belum ada akun team yang dapat ditampilkan."}</div>;
}

function Pagination({ page, totalPages, start, end, total, onPageChange }: { page: number; totalPages: number; start: number; end: number; total: number; onPageChange: (page: number) => void }) {
  if (total <= PAGE_SIZE) return <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">Menampilkan {start}-{end} dari {total} akun</div>;
  return <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>Menampilkan {start}-{end} dari {total} akun</span><div className="flex items-center gap-1"><button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} className="rounded-lg p-2 disabled:opacity-40"><ChevronLeft size={17} /></button>{Array.from({ length: totalPages }, (_, index) => index + 1).map((value) => <button key={value} type="button" onClick={() => onPageChange(value)} className={`size-8 rounded-lg text-xs font-semibold ${page === value ? "bg-slate-900 text-white" : "hover:bg-slate-100"}`}>{value}</button>)}<button type="button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="rounded-lg p-2 disabled:opacity-40"><ChevronRight size={17} /></button></div></div>;
}
