import { NextResponse } from "next/server";
import { requireAdminOrManager } from "@/utils/serverAuth";
import {
  listContents,
  createContentDraft,
} from "@/lib/cms/content-service";
import type {
  ContentType,
  ContentStatus,
  CreateContentDraftInput,
  ListContentsFilter,
} from "@/lib/cms/types";
import { CONTENT_TYPES, CONTENT_STATUSES } from "@/lib/cms/types";
import { mapCmsErrorToResponse } from "./routeHelper";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/content
 * Lists contents for management dashboard with filtering, search, and pagination.
 */
export async function GET(req: Request) {
  const auth = await requireAdminOrManager(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);

    const typeParam = searchParams.get("type");
    const statusParam = searchParams.get("status");
    const categoryParam = searchParams.get("category");
    const tagParam = searchParams.get("tag");
    const searchParam = searchParams.get("search");
    const isFeaturedParam = searchParams.get("is_featured");
    const sortByParam = searchParams.get("sort_by");
    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    const limitParam = parseInt(searchParams.get("limit") || "20", 10);

    const filter: ListContentsFilter = {};

    if (typeParam && CONTENT_TYPES.includes(typeParam as ContentType)) {
      filter.type = typeParam as ContentType;
    }
    if (statusParam && CONTENT_STATUSES.includes(statusParam as ContentStatus)) {
      filter.status = statusParam as ContentStatus;
    }
    if (categoryParam?.trim()) {
      filter.category = categoryParam.trim();
    }
    if (tagParam?.trim()) {
      filter.tag = tagParam.trim();
    }
    if (searchParam?.trim()) {
      filter.search = searchParam.trim();
    }
    if (isFeaturedParam !== null) {
      filter.is_featured = isFeaturedParam === "true";
    }

    if (
      sortByParam === "priority_desc" ||
      sortByParam === "published_desc" ||
      sortByParam === "created_desc"
    ) {
      filter.sortBy = sortByParam;
    }

    const page = Number.isSafeInteger(pageParam) && pageParam > 0 ? pageParam : 1;
    const limit = Number.isSafeInteger(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 20;

    filter.limit = limit;
    filter.offset = (page - 1) * limit;

    const result = await listContents(filter, false);

    if (result.isError) {
      return mapCmsErrorToResponse(result);
    }

    return NextResponse.json({
      ok: true,
      data: {
        items: result.data.items,
        total: result.data.total,
        page,
        limit,
        totalPages: Math.ceil(result.data.total / limit),
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/**
 * POST /api/admin/content
 * Creates a new content draft. Status is strictly DRAFT, created_by enforced from auth token.
 */
export async function POST(req: Request) {
  const auth = await requireAdminOrManager(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  try {
    const body = await req.json();

    // Enforce CreateContentDraftInput contract
    const input: CreateContentDraftInput = {
      title: body.title,
      slug: body.slug,
      type: body.type,
      body: body.body,
      excerpt: body.excerpt,
      cover_image_url: body.cover_image_url,
      category: body.category,
      tags: body.tags,
      published_at: body.published_at,
      expired_at: body.expired_at,
      event_start_at: body.event_start_at,
      event_end_at: body.event_end_at,
      cta_label: body.cta_label,
      cta_url: body.cta_url,
      cta_target: body.cta_target,
      is_featured: body.is_featured,
      priority: body.priority,
      related_brand_slug: body.related_brand_slug,
      banner_id: body.banner_id,
    };

    const result = await createContentDraft(input, auth.user.id);

    if (result.isError) {
      return mapCmsErrorToResponse(result);
    }

    return NextResponse.json({ ok: true, data: result.data }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
