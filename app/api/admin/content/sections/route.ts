import { NextResponse } from "next/server";
import { requireAdminOrManager } from "@/utils/serverAuth";
import {
  listSectionsByPage,
  createSection,
} from "@/lib/cms/content-service";
import type { ContentSectionPage, CreateSectionInput } from "@/lib/cms/types";
import { CONTENT_SECTION_PAGES } from "@/lib/cms/types";
import { mapCmsErrorToResponse, revalidatePublicContentRoutes } from "../routeHelper";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/content/sections?page=PROMO|NEWS|HOME
 * Lists configured page sections.
 */
export async function GET(req: Request) {
  const auth = await requireAdminOrManager(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const pageParam = searchParams.get("page")?.toUpperCase() as ContentSectionPage | undefined;

    if (!pageParam || !CONTENT_SECTION_PAGES.includes(pageParam)) {
      return NextResponse.json(
        { ok: false, error: "Parameter page (PROMO, NEWS, atau HOME) wajib disediakan." },
        { status: 400 }
      );
    }

    const result = await listSectionsByPage(pageParam, false);

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
 * POST /api/admin/content/sections
 * Creates a new curated content section.
 */
export async function POST(req: Request) {
  const auth = await requireAdminOrManager(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  try {
    const body = await req.json();

    const input: CreateSectionInput = {
      page: body.page,
      section_key: body.section_key,
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

    const result = await createSection(input);

    if (result.isError) {
      return mapCmsErrorToResponse(result);
    }

    revalidatePublicContentRoutes();

    return NextResponse.json({ ok: true, data: result.data }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
