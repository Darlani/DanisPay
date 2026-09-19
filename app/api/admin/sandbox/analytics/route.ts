import { NextResponse } from "next/server";
import { requireAdminOrManager } from "@/utils/serverAuth";
import {
  getSandboxFunnelAnalytics,
  type SandboxAnalyticsParams,
} from "@/lib/analytics/sandbox-analytics";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/sandbox/analytics
 * Protected Admin/Manager endpoint returning aggregated Marketing Sandbox metrics.
 * Rejects non-staff callers; never exposes individual customer identities or raw event rows.
 */
export async function GET(request: Request) {
  try {
    // 1. Authenticate and authorize staff caller
    const authorization = await requireAdminOrManager(request);
    if (!authorization.ok) {
      return NextResponse.json(
        { error: authorization.message },
        { status: authorization.status }
      );
    }

    // 2. Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const rawPeriod = searchParams.get("period")?.trim().toLowerCase();
    const period: SandboxAnalyticsParams["period"] =
      rawPeriod === "all" ||
      rawPeriod === "7d" ||
      rawPeriod === "30d" ||
      rawPeriod === "custom"
        ? rawPeriod
        : "30d";

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const cohortStartDate = searchParams.get("cohortStartDate");
    const cohortEndDate = searchParams.get("cohortEndDate");

    // 3. Execute aggregated database query
    const result = await getSandboxFunnelAnalytics({
      period,
      startDate,
      endDate,
      cohortStartDate,
      cohortEndDate,
    });

    if (!result.ok) {
      const status = result.code === "INVALID_DATE_RANGE" ? 400 : 500;
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status }
      );
    }

    // 4. Return aggregated metrics
    return NextResponse.json(result.data, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err: unknown) {
    console.error("[ADMIN_SANDBOX_ANALYTICS_ROUTE] Exception:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal pemrosesan analitik." },
      { status: 500 }
    );
  }
}

