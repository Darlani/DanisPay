import { NextResponse } from "next/server";
import { requireAdminOrManager } from "@/utils/serverAuth";
import { unpublishContent } from "@/lib/cms/content-service";
import { mapCmsErrorToResponse, revalidatePublicContentRoutes } from "../../routeHelper";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/content/[id]/unpublish
 * Transitions content status back to DRAFT (removes from public display).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminOrManager(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const result = await unpublishContent(id);

    if (result.isError) {
      return mapCmsErrorToResponse(result);
    }

    revalidatePublicContentRoutes(result.data.slug);

    return NextResponse.json({ ok: true, data: result.data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
