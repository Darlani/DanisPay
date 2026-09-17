import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabaseAdmin";
import {
  parseAnonymousId,
  parseAttributionCookie,
  recordSandboxFunnelEvent,
} from "@/lib/analytics/sandbox-telemetry";

export const dynamic = "force-dynamic";

/**
 * ============================================================================
 * DAPAY SANDBOX CLIENT TELEMETRY INGESTION (PHASE 5A.2)
 * ============================================================================
 * Ingests only approved public client telemetry events.
 * Enforces server-authoritative authentication, management exclusion,
 * server-controlled attribution, payload size capping, and rate limiting.
 */

const ALLOWED_CLIENT_EVENTS = [
  "sandbox_landing_view",
  "sandbox_cta_click",
] as const;

type AllowedClientEvent = (typeof ALLOWED_CLIENT_EVENTS)[number];

// Rate Limiting: 60 requests/minute per key
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 60;

function checkRateLimit(key: string): boolean {
  const now = Date.now();

  // Lazy memory cleanup if map grows large
  if (rateLimitMap.size > 2000) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (now > v.resetAt) {
        rateLimitMap.delete(k);
      }
    }
  }

  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false; // Not rate limited
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true; // Rate limited
  }

  entry.count += 1;
  return false;
}

// Canonical Auth extraction from headers/cookies
async function verifyToken(token: string): Promise<{ id: string; email?: string } | null> {
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return { id: user.id, email: user.email };
}

async function getAuthenticatedUser(
  req: Request
): Promise<{ id: string; email?: string } | null> {
  const authHeader =
    req.headers.get("Authorization") || req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();

  if (token) {
    return verifyToken(token);
  }

  const cookieStore = req.headers.get("cookie") || "";

  // 1. sb-access-token cookie
  const sbAccessTokenMatch = cookieStore.match(/sb-access-token=([^;]+)/i);
  if (sbAccessTokenMatch?.[1]) {
    try {
      const raw = decodeURIComponent(sbAccessTokenMatch[1]).trim();
      return verifyToken(raw);
    } catch {
      // ignore
    }
  }

  // 2. sb-*-auth-token cookie (Supabase standard)
  const tokenMatch = cookieStore.match(/sb-[a-z0-9]+-auth-token=([^;]+)/i);
  if (tokenMatch && tokenMatch[1]) {
    try {
      const decoded = decodeURIComponent(tokenMatch[1]);
      let parsed = JSON.parse(decoded);
      if (Array.isArray(parsed) && parsed[0]) parsed = parsed[0];
      const rawToken =
        typeof parsed === "string" ? parsed : parsed?.access_token;
      if (rawToken) {
        return verifyToken(rawToken);
      }
    } catch {
      // ignore
    }
  }

  return null;
}

function getCookieValue(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1].trim()) : null;
}

export async function POST(req: Request) {
  try {
    // 1. PAYLOAD SIZE GUARD (Max 2KB = 2048 bytes)
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 2048) {
      return NextResponse.json(
        { error: "Payload telemetri melebihi batas 2KB." },
        { status: 400 }
      );
    }

    const rawBody = await req.text();
    if (rawBody.length > 2048) {
      return NextResponse.json(
        { error: "Payload telemetri melebihi batas 2KB." },
        { status: 400 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Format JSON tidak valid." },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Payload harus berupa objek JSON." },
        { status: 400 }
      );
    }

    // 2. EVENT NAME ALLOWLIST CHECK
    const eventName = body.eventName;
    if (typeof eventName !== "string" || !eventName.trim()) {
      return NextResponse.json(
        { error: "Field eventName wajib diisi." },
        { status: 400 }
      );
    }

    const normalizedEvent = eventName.trim().toLowerCase();
    if (
      !ALLOWED_CLIENT_EVENTS.includes(normalizedEvent as AllowedClientEvent)
    ) {
      return NextResponse.json(
        {
          error: `Event '${eventName}' tidak diizinkan dikirim dari klien.`,
        },
        { status: 400 }
      );
    }

    // 3. METADATA VALIDATION (Strict whitelist, no arbitrary JSON)
    let sanitizedMetadata: Record<string, unknown> | null = null;

    if (normalizedEvent === "sandbox_landing_view") {
      // Landing view allows no extra metadata
      sanitizedMetadata = null;
    } else if (normalizedEvent === "sandbox_cta_click") {
      // CTA click only allows cta_location and target_href
      const rawMeta = body.metadata;
      if (rawMeta && typeof rawMeta === "object" && !Array.isArray(rawMeta)) {
        const metaObj = rawMeta as Record<string, unknown>;
        const ctaLocation =
          typeof metaObj.cta_location === "string"
            ? metaObj.cta_location.trim().slice(0, 32)
            : null;
        const targetHref =
          typeof metaObj.target_href === "string"
            ? metaObj.target_href.trim().slice(0, 128)
            : null;

        if (ctaLocation || targetHref) {
          sanitizedMetadata = {};
          if (ctaLocation) sanitizedMetadata.cta_location = ctaLocation;
          if (targetHref) sanitizedMetadata.target_href = targetHref;
        }
      }
    }

    // 4. AUTHENTICATION & MANAGEMENT EXCLUSION
    // Derives user_id from verified session token. NEVER trusts body.userId or body.role.
    const authenticatedUser = await getAuthenticatedUser(req);
    let verifiedUserId: string | null = null;

    if (authenticatedUser) {
      // Check management role in profiles
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", authenticatedUser.id)
        .maybeSingle();

      const role = (profile?.role || "").trim().toLowerCase();
      if (role === "admin" || role === "manager") {
        // Management activity MUST NEVER enter customer funnel metrics.
        // Safe no-op 200 response.
        return NextResponse.json({
          success: true,
          ignored: true,
          reason: "management_role",
        });
      }

      verifiedUserId = authenticatedUser.id;
    }

    // 5. ANONYMOUS IDENTIFIER RESOLUTION
    const cookieHeader = req.headers.get("cookie") || "";
    const cookieAnonId = parseAnonymousId(
      getCookieValue(cookieHeader, "dapay_anon_id")
    );
    const bodyAnonId = parseAnonymousId(body.anonymousId);

    // Prefer verified cookie over client-supplied body
    const finalAnonId = cookieAnonId || bodyAnonId || null;

    if (!verifiedUserId && !finalAnonId) {
      return NextResponse.json(
        {
          error:
            "Identitas pengunjung (user_id terverifikasi atau anonymous_id valid) diperlukan.",
        },
        { status: 400 }
      );
    }

    // 6. RATE LIMITING (Max 60 req/min)
    // Priority: 1. verified user id -> 2. anonymous id -> 3. trusted request IP
    let rateLimitKey: string;
    if (verifiedUserId) {
      rateLimitKey = `user:${verifiedUserId}`;
    } else if (finalAnonId) {
      rateLimitKey = `anon:${finalAnonId}`;
    } else {
      const forwardedFor = req.headers.get("x-forwarded-for");
      const clientIp = forwardedFor
        ? forwardedFor.split(",")[0].trim()
        : req.headers.get("x-real-ip") ||
          req.headers.get("cf-connecting-ip") ||
          "unknown";
      rateLimitKey = `ip:${clientIp}`;
    }

    if (checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan telemetri. Coba beberapa saat lagi." },
        { status: 429 }
      );
    }

    // 7. ATTRIBUTION RESOLUTION (Must come from server-controlled dapay_attr cookie)
    // Client-provided attribution fields are ignored.
    const parsedAttr = parseAttributionCookie(cookieHeader);
    const source = parsedAttr?.src || "direct";
    const medium = parsedAttr?.med || "none";
    const campaign = parsedAttr?.camp || "none";

    // 8. RECORD EVENT VIA SERVER ANALYTICS HELPER
    const recordResult = await recordSandboxFunnelEvent({
      userId: verifiedUserId,
      anonymousId: finalAnonId,
      eventName: normalizedEvent,
      source,
      medium,
      campaign,
      metadata: sanitizedMetadata,
    });

    if (!recordResult.ok) {
      // Return clean failure without exposing DB internals
      return NextResponse.json(
        {
          success: false,
          code: recordResult.code,
          error: recordResult.error,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      eventId: recordResult.eventId,
    });
  } catch (err: unknown) {
    console.error("[SANDBOX_TELEMETRY_ROUTE] Ingestion error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal pemrosesan telemetri." },
      { status: 500 }
    );
  }
}