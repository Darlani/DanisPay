import { NextResponse } from "next/server";
import { requireAdminOrManager } from "@/utils/serverAuth";
import {
  updateSection,
  deleteSection,
} from "@/lib/cms/content-service";
import type { UpdateSectionInput } from "@/lib/cms/types";
import { mapCmsErrorToResponse, revalidatePublicContentRoutes } from "../../routeHelper";

export const dynamic = "force-dynamic";

/**
 * PUT /api/admin/content/sections/[id]
 * Updates an existing content section configuration.
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

    const input: UpdateSectionInput = {
      title: body.title,
      subtitle: body.subtitle,
      filter_type: body.filter_type,
      filter_category: body.filter_category,
      filter_tag: body.filter_tag,
      sort_by: body.sort_by,
      display_limit: body.display_limit,
      layout: body.layout,
      is_active: body.is_active,
      order_position: body.order_position,
    };

    const result = await updateSection(id, input);

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

/**
 * DELETE /api/admin/content/sections/[id]
 * Deletes a content section configuration.
 * Admin and Manager are allowed per CMS contract.
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
    const result = await deleteSection(id);

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
