import { NextResponse } from "next/server";
import { requireAdminOrManager } from "@/utils/serverAuth";
import { archiveContent } from "@/lib/cms/content-service";
import { mapCmsErrorToResponse, revalidatePublicContentRoutes } from "../../routeHelper";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/content/[id]/archive
 * Transitions content to ARCHIVED status.
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
    const result = await archiveContent(id);

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
