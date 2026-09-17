import { NextResponse } from "next/server";
import { requireAdminOrManager } from "@/utils/serverAuth";
import { setContentFeatured } from "@/lib/cms/content-service";
import { mapCmsErrorToResponse, revalidatePublicContentRoutes } from "../../routeHelper";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/content/[id]/feature
 * Toggles is_featured flag for headline pinning.
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
    const body = await req.json();

    if (body?.is_featured === undefined) {
      return NextResponse.json(
        { ok: false, error: "Field is_featured (boolean) wajib disediakan." },
        { status: 400 }
      );
    }

    const result = await setContentFeatured(id, Boolean(body.is_featured));

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
