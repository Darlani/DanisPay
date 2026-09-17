import { supabaseAdmin } from "@/utils/supabaseAdmin";

/**
 * ============================================================================
 * DAPAY SANDBOX ANALYTICS SERVICE (PHASE 5B)
 * ============================================================================
 * Server-only calculation service that executes the analytical RPC via
 * supabaseAdmin, normalizes date parameters, and returns typed funnel metrics.
 */

export interface SandboxAnalyticsParams {
  period?: "all" | "7d" | "30d" | "custom";
  startDate?: string | null;
  endDate?: string | null;
  cohortStartDate?: string | null;
  cohortEndDate?: string | null;
}

export interface FunnelStageMetric {
  stage: string;
  label: string;
  uniqueUsers: number;
  conversionRate: number;
  dropOffRate: number;
}

export interface MatureCohortMetric {
  activatedUsers: number;
  retainedUsers: number;
  retentionRate: number;
}

export interface ImmatureCohortMetric {
  activatedUsers: number;
  activeSoFar: number;
  status: string;
}

export interface ActivityDaysDistribution {
  "1_day": number;
  "2_days": number;
  "3_to_5_days": number;
  "6_plus_days": number;
}

export interface AttributionMetric {
  source: string;
  medium: string;
  campaign: string;
  visitors: number;
  activations: number;
  firstValue: number;
  conversions: number;
  activationRate: number;
  conversionRate: number;
}

export interface TimeToValueMetric {
  medianTimeToFirstValueHours: number;
  averageTimeToFirstValueHours: number;
  medianTimeToConversionDays: number;
  averageTimeToConversionDays: number;
}

export interface CurrentPersonaState {
  currentRegularTesters: number;
  currentSpecialTesters: number;
}

export interface DataQualityMetrics {
  ambiguousAnonymousIds: number;
  unanchoredSimulations: number;
  unanchoredConversions: number;
  futureTimestampEvents: number;
}

export interface SandboxAnalyticsResponse {
  meta: {
    generatedAt: string;
    timezone: string;
    eventWindow: { start: string; end: string };
    cohortWindow: { start: string; end: string };
  };
  funnel: FunnelStageMetric[];
  retention: {
    matureCohort: MatureCohortMetric;
    immatureCohort: ImmatureCohortMetric;
    activityDaysDistribution: ActivityDaysDistribution;
  };
  attribution: AttributionMetric[];
  timeToValue: TimeToValueMetric;
  currentPersonaState: CurrentPersonaState;
  dataQuality: DataQualityMetrics;
}

export type GetSandboxFunnelAnalyticsResult =
  | { ok: true; data: SandboxAnalyticsResponse }
  | { ok: false; code: string; error: string };

function parseValidIsoDate(val: string | null | undefined): string | null {
  if (!val || typeof val !== "string") return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export interface ResolvedAnalyticsWindowsSuccess {
  ok: true;
  eventStartIso: string;
  eventEndIso: string;
  cohortStartIso: string;
  cohortEndIso: string;
}

export interface ResolvedAnalyticsWindowsError {
  ok: false;
  code: "INVALID_DATE_RANGE";
  error: string;
}

export type ResolvedAnalyticsWindows =
  | ResolvedAnalyticsWindowsSuccess
  | ResolvedAnalyticsWindowsError;

/**
 * Resolves window boundaries based on requested period or custom parameters.
 * Validates that startDate <= endDate and cohortStartDate <= cohortEndDate.
 */
export function resolveAnalyticsWindows(
  params: SandboxAnalyticsParams
): ResolvedAnalyticsWindows {
  const period = params.period || "30d";
  const now = new Date();

  let eventStartIso: string;
  let eventEndIso: string = now.toISOString();
  let cohortStartIso: string;
  let cohortEndIso: string = now.toISOString();

  if (period === "all") {
    eventStartIso = "1970-01-01T00:00:00.000Z";
    cohortStartIso = "1970-01-01T00:00:00.000Z";
  } else if (period === "7d") {
    const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    eventStartIso = d.toISOString();
    cohortStartIso = d.toISOString();
  } else if (period === "30d") {
    const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    eventStartIso = d.toISOString();
    cohortStartIso = d.toISOString();
  } else if (period === "custom") {
    const customEventStart = parseValidIsoDate(params.startDate);
    const customEventEnd = parseValidIsoDate(params.endDate);
    const customCohortStart = parseValidIsoDate(params.cohortStartDate);
    const customCohortEnd = parseValidIsoDate(params.cohortEndDate);

    // Validate raw user inputs when both bounds are supplied
    if (params.startDate && params.endDate && customEventStart && customEventEnd) {
      if (new Date(customEventStart).getTime() > new Date(customEventEnd).getTime()) {
        return {
          ok: false,
          code: "INVALID_DATE_RANGE",
          error: "Rentang tanggal event tidak valid: startDate harus lebih kecil atau sama dengan endDate.",
        };
      }
    }

    if (
      params.cohortStartDate &&
      params.cohortEndDate &&
      customCohortStart &&
      customCohortEnd
    ) {
      if (
        new Date(customCohortStart).getTime() > new Date(customCohortEnd).getTime()
      ) {
        return {
          ok: false,
          code: "INVALID_DATE_RANGE",
          error: "Rentang tanggal kohor tidak valid: cohortStartDate harus lebih kecil atau sama dengan cohortEndDate.",
        };
      }
    }

    eventStartIso =
      customEventStart ||
      new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    eventEndIso = customEventEnd || now.toISOString();

    cohortStartIso = customCohortStart || eventStartIso;
    cohortEndIso = customCohortEnd || eventEndIso;

    // Cross-check resolved window boundaries
    if (new Date(eventStartIso).getTime() > new Date(eventEndIso).getTime()) {
      return {
        ok: false,
        code: "INVALID_DATE_RANGE",
        error: "Rentang tanggal event tidak valid: tanggal mulai harus lebih kecil atau sama dengan tanggal akhir.",
      };
    }

    if (new Date(cohortStartIso).getTime() > new Date(cohortEndIso).getTime()) {
      return {
        ok: false,
        code: "INVALID_DATE_RANGE",
        error: "Rentang tanggal kohor tidak valid: tanggal mulai kohor harus lebih kecil atau sama dengan tanggal akhir kohor.",
      };
    }
  } else {
    // Default fallback: 30d
    const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    eventStartIso = d.toISOString();
    cohortStartIso = d.toISOString();
  }

  return {
    ok: true,
    eventStartIso,
    eventEndIso,
    cohortStartIso,
    cohortEndIso,
  };
}

/**
 * Server-authoritative function to fetch calculated Marketing Sandbox metrics.
 * Calls public.get_sandbox_funnel_analytics via service_role client.
 */
export async function getSandboxFunnelAnalytics(
  params: SandboxAnalyticsParams = {}
): Promise<GetSandboxFunnelAnalyticsResult> {
  try {
    const windows = resolveAnalyticsWindows(params);
    if (!windows.ok) {
      return {
        ok: false,
        code: windows.code,
        error: windows.error,
      };
    }

    const { eventStartIso, eventEndIso, cohortStartIso, cohortEndIso } = windows;

    const { data, error } = await supabaseAdmin.rpc(
      "get_sandbox_funnel_analytics",
      {
        p_event_start: eventStartIso,
        p_event_end: eventEndIso,
        p_cohort_start: cohortStartIso,
        p_cohort_end: cohortEndIso,
      }
    );

    if (error) {
      console.error(
        "[SANDBOX_ANALYTICS] RPC execution failure:",
        error.message
      );
      return {
        ok: false,
        code: "DATABASE_QUERY_FAILED",
        error: "Gagal menghitung analitik funnel Sandbox.",
      };
    }

    if (!data || typeof data !== "object") {
      return {
        ok: false,
        code: "EMPTY_RESULT",
        error: "Data analitik tidak ditemukan.",
      };
    }

    return {
      ok: true,
      data: data as SandboxAnalyticsResponse,
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Kesalahan server internal.";
    console.error("[SANDBOX_ANALYTICS] Unexpected exception:", msg);
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      error: "Terjadi kesalahan internal saat memproses analitik.",
    };
  }
}