import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { CmsServiceError } from "@/lib/cms/types";

/**
 * Maps internal CmsErrorCode to standard HTTP status codes.
 */
export function mapCmsErrorToResponse(err: CmsServiceError) {
  let status = 500;
  switch (err.code) {
    case "VALIDATION_ERROR":
      status = 400;
      break;
    case "FORBIDDEN":
      status = 403;
      break;
    case "NOT_FOUND":
      status = 404;
      break;
    case "CONFLICT":
      status = 409;
      break;
    case "DATABASE_ERROR":
    default:
      status = 500;
      break;
  }

  return NextResponse.json({ ok: false, error: err.message }, { status });
}

/**
 * Triggers Next.js public route cache invalidation for published content changes.
 */
export function revalidatePublicContentRoutes(slug?: string) {
  try {
    revalidatePath("/news");
    revalidatePath("/promo");
    if (slug?.trim()) {
      revalidatePath(`/news/${slug.trim()}`);
    }
  } catch {
    // Non-fatal if revalidation fails in preview/non-ISR context
  }
}
