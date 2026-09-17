import { NextResponse } from "next/server";
import { requireAdminOrManager } from "@/utils/serverAuth";
import {
  getContentById,
  updateContent,
  deleteContentAdminOnly,
} from "@/lib/cms/content-service";
import type { UpdateContentInput } from "@/lib/cms/types";
import { mapCmsErrorToResponse, revalidatePublicContentRoutes } from "../routeHelper";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/content/[id]
 * Retrieves content detail for management editor.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminOrManager(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const result = await getContentById(id);

    if (result.isError) {
      return mapCmsErrorToResponse(result);
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/**
 * PUT /api/admin/content/[id]
 * Updates content fields.
 * Protected: Status transitions (publish/archive/unpublish) CANNOT be bypassed through PUT.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminOrManager(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    // Prevent bypassing status workflow and authorship injection
    const input: UpdateContentInput = {
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

    const result = await updateContent(id, input);

    if (result.isError) {
      return mapCmsErrorToResponse(result);
    }

    if (result.data.status === "PUBLISHED") {
      revalidatePublicContentRoutes(result.data.slug);
    }

    return NextResponse.json({ ok: true, data: result.data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/content/[id]
 * Permanently deletes a content item.
 * Strictly restricted to users with role 'admin'. Managers receive 403 Forbidden.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminOrManager(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await params;

    // Caller role enforced from verified database session
    const result = await deleteContentAdminOnly(id, auth.role);

    if (result.isError) {
      return mapCmsErrorToResponse(result);
    }

    revalidatePublicContentRoutes();

    return NextResponse.json({ ok: true, data: result.data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
