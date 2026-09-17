import { supabaseAdmin } from "@/utils/supabaseAdmin";

/**
 * ============================================================================
 * DAPAY SANDBOX TELEMETRY FOUNDATION (PHASE 5A.1)
 * ============================================================================
 * Strictly server-only, privacy-minimized analytics helper.
 * Enforces server-authoritative taxonomy, zero financial data leakage,
 * strict metadata sanitization, and attribution parsing.
 */

// 1. EVENT TAXONOMY ALLOWLISTS

export const ALLOWED_STORED_EVENTS = [
  "sandbox_landing_view",
  "sandbox_cta_click",
  "sandbox_eligibility_evaluated",
  "sandbox_activation_success",
  "sandbox_catalog_view",
  "sandbox_margin_view",
  "sandbox_order_review",
] as const;

export type AllowedStoredEvent = (typeof ALLOWED_STORED_EVENTS)[number];

export const DERIVED_ONLY_EVENTS = [
  "sandbox_simulation_success",
  "sandbox_conversion_success",
] as const;

export type DerivedOnlyEvent = (typeof DERIVED_ONLY_EVENTS)[number];

export const MEANINGFUL_EVENTS = new Set<AllowedStoredEvent>([
  "sandbox_catalog_view",
  "sandbox_margin_view",
  "sandbox_order_review",
]);

// 2. METADATA KEYS ALLOWLIST & BLACKLIST

const APPROVED_METADATA_KEYS = new Set<string>([
  "category",
  "sku",
  "cta_location",
  "target_href",
  "result",
  "failure_category",
]);

const FORBIDDEN_METADATA_PATTERNS = [
  "password",
  "token",
  "authorization",
  "email",
  "phone",
  "bank",
  "balance",
  "amount",
  "payment",
  "secret",
  "jwt",
  "access_token",
  "refresh_token",
  "cookie",
  "session",
  "credential",
];

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

// 3. ANONYMOUS IDENTIFIER VALIDATOR

/**
 * Validates and normalizes dapay_anon_id cookie value.
 * Must be an opaque UUID string. Rejects empty, malformed, or PII strings.
 */
export function parseAnonymousId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  if (!UUID_REGEX.test(trimmed)) {
    return null;
  }
  return trimmed;
}

// 4. ATTRIBUTION PARSER (dapay_attr)

export interface ParsedAttribution {
  src: string;
  med: string;
  camp: string;
  ref: string;
  rfr: string;
  ts: number;
  first_src?: string | null;
  first_ts?: number | null;
}

function sanitizeSafeString(
  val: unknown,
  maxLen: number
): string | null {
  if (typeof val !== "string") return null;
  const cleaned = val.replace(/[^a-zA-Z0-9_\-.~]/g, "").slice(0, maxLen);
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Safely parses and validates the dapay_attr cookie value or header.
 * Enforces 30-day validity window, sanitizes all strings, and returns null on malformed input.
 */
export function parseAttributionCookie(
  cookieValue: string | null | undefined
): ParsedAttribution | null {
  if (!cookieValue || typeof cookieValue !== "string") {
    return null;
  }

  try {
    let raw = cookieValue.trim();
    // Handle cases where full cookie header is passed
    if (raw.includes("dapay_attr=")) {
      const match = raw.match(/dapay_attr=([^;]+)/);
      if (match && match[1]) {
        raw = decodeURIComponent(match[1].trim());
      }
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    const now = Date.now();
    const ts = Number(parsed.ts);
    if (
      !Number.isFinite(ts) ||
      ts > now + 60000 || // Future-dated (>1 min skew)
      ts < now - ATTRIBUTION_WINDOW_MS // Expired (>30 days)
    ) {
      return null;
    }

    const src = sanitizeSafeString(parsed.src, 64) || "direct";
    const med = sanitizeSafeString(parsed.med, 64) || "none";
    const camp = sanitizeSafeString(parsed.camp, 64) || "none";
    const ref = sanitizeSafeString(parsed.ref, 32) || "";
    const rfr = sanitizeSafeString(parsed.rfr, 128) || "";

    const first_src = sanitizeSafeString(parsed.first_src, 64);
    const first_ts = Number.isFinite(Number(parsed.first_ts))
      ? Number(parsed.first_ts)
      : null;

    return {
      src,
      med,
      camp,
      ref,
      rfr,
      ts,
      first_src: first_src || null,
      first_ts: first_ts || null,
    };
  } catch {
    return null;
  }
}

// 5. METADATA SANITIZER

/**
 * Strictly sanitizes metadata to ensure zero PII and zero financial context.
 * Strips unapproved keys, forbidden tokens, and values exceeding limits.
 */
export function sanitizeFunnelMetadata(
  input: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const cleaned: Record<string, unknown> = {};

  for (const [rawKey, val] of Object.entries(input)) {
    const key = rawKey.trim().toLowerCase();

    // Check blacklist
    if (FORBIDDEN_METADATA_PATTERNS.some((p) => key.includes(p))) {
      continue;
    }

    // Must be in approved keys
    if (!APPROVED_METADATA_KEYS.has(key)) {
      continue;
    }

    // Validate and sanitize values
    if (typeof val === "string") {
      const trimmed = val.trim();
      // Block email-like or JWT-like strings
      if (trimmed.includes("@") || trimmed.startsWith("Bearer ") || trimmed.startsWith("eyJ")) {
        continue;
      }
      cleaned[key] = trimmed.slice(0, 128);
    } else if (typeof val === "boolean") {
      cleaned[key] = val;
    } else if (typeof val === "number" && Number.isFinite(val)) {
      // Numbers are allowed for small counts, but restricted to safe integers
      if (Number.isSafeInteger(val) && val >= 0 && val <= 100000) {
        cleaned[key] = val;
      }
    }
  }

  // Ensure total serialized length is <= 1024 chars
  const serialized = JSON.stringify(cleaned);
  if (serialized.length > 1024 || Object.keys(cleaned).length === 0) {
    return Object.keys(cleaned).length === 0 ? null : { warning: "metadata_truncated" };
  }

  return cleaned;
}

// 6. SERVER-SIDE EVENT RECORDING HELPER

export interface RecordSandboxFunnelEventParams {
  userId?: string | null;
  anonymousId?: string | null;
  eventName: string;
  occurredAt?: Date | string;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  metadata?: Record<string, unknown> | null;
}

export type RecordSandboxFunnelEventResult =
  | { ok: true; eventId: string }
  | { ok: false; code: string; error: string };

/**
 * Server-authoritative helper to insert verified sandbox funnel events into public.sandbox_funnel_events.
 * Enforces taxonomy allowlists, derives is_meaningful, sanitizes metadata, and uses service_role client.
 */
export async function recordSandboxFunnelEvent(
  params: RecordSandboxFunnelEventParams
): Promise<RecordSandboxFunnelEventResult> {
  try {
    const { eventName, userId, anonymousId, source, medium, campaign, metadata } =
      params;

    // 1. Validate event name
    if (typeof eventName !== "string" || !eventName.trim()) {
      return {
        ok: false,
        code: "INVALID_EVENT_NAME",
        error: "Nama event wajib diisi.",
      };
    }

    const normalizedEvent = eventName.trim().toLowerCase();

    // Reject derived-only events (must not be directly stored)
    if (
      DERIVED_ONLY_EVENTS.includes(
        normalizedEvent as DerivedOnlyEvent
      )
    ) {
      return {
        ok: false,
        code: "DERIVED_EVENT_REJECTED",
        error: `Event '${normalizedEvent}' merupakan event turunan dan tidak dapat dicatat langsung ke tabel funnel events.`,
      };
    }

    // Must be in allowed stored events
    if (
      !ALLOWED_STORED_EVENTS.includes(
        normalizedEvent as AllowedStoredEvent
      )
    ) {
      return {
        ok: false,
        code: "EVENT_NAME_NOT_ALLOWED",
        error: `Event '${normalizedEvent}' tidak dikenali dalam taksonomi Sandbox.`,
      };
    }

    const validatedEvent = normalizedEvent as AllowedStoredEvent;

    // 2. Validate Identifiers (at least one must be present)
    let validatedUserId: string | null = null;
    let validatedAnonymousId: string | null = null;

    if (userId) {
      if (typeof userId === "string" && UUID_REGEX.test(userId.trim())) {
        validatedUserId = userId.trim().toLowerCase();
      } else {
        return {
          ok: false,
          code: "INVALID_USER_ID",
          error: "Format user ID tidak valid.",
        };
      }
    }

    if (anonymousId) {
      validatedAnonymousId = parseAnonymousId(anonymousId);
    }

    if (!validatedUserId && !validatedAnonymousId) {
      return {
        ok: false,
        code: "IDENTIFIER_REQUIRED",
        error: "Minimal salah satu dari user_id atau anonymous_id harus disertakan.",
      };
    }

    // 3. Derive meaningful status strictly on server
    const isMeaningful = MEANINGFUL_EVENTS.has(validatedEvent);

    // 4. Sanitize metadata
    const sanitizedMeta = sanitizeFunnelMetadata(metadata);

    // 5. Normalize attribution strings
    const safeSource = sanitizeSafeString(source, 64);
    const safeMedium = sanitizeSafeString(medium, 64);
    const safeCampaign = sanitizeSafeString(campaign, 64);

    // 6. Occurred At
    let occurredAtIso = new Date().toISOString();
    if (params.occurredAt) {
      const d =
        params.occurredAt instanceof Date
          ? params.occurredAt
          : new Date(params.occurredAt);
      if (!isNaN(d.getTime())) {
        occurredAtIso = d.toISOString();
      }
    }

    // 7. Database insertion via service_role client
    const { data, error } = await supabaseAdmin
      .from("sandbox_funnel_events")
      .insert([
        {
          user_id: validatedUserId,
          anonymous_id: validatedAnonymousId,
          event_name: validatedEvent,
          is_meaningful: isMeaningful,
          occurred_at: occurredAtIso,
          source: safeSource,
          medium: safeMedium,
          campaign: safeCampaign,
          metadata: sanitizedMeta,
        },
      ])
      .select("id")
      .single();

    if (error) {
      console.error(
        "[SANDBOX_TELEMETRY] Failed to record event:",
        validatedEvent,
        error.message
      );
      return {
        ok: false,
        code: "DATABASE_INSERT_FAILED",
        error: "Gagal mencatat event telemetri ke database.",
      };
    }

    return {
      ok: true,
      eventId: data.id,
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Kesalahan server internal.";
    console.error("[SANDBOX_TELEMETRY] Exception recording event:", msg);
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      error: "Terjadi kesalahan saat memproses event telemetri.",
    };
  }
}
