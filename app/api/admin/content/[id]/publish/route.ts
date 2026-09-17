import { NextResponse } from "next/server";
import { requireAdminOrManager } from "@/utils/serverAuth";
import { publishContent } from "@/lib/cms/content-service";
import { mapCmsErrorToResponse, revalidatePublicContentRoutes } from "../../routeHelper";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/content/[id]/publish
 * Transitions content to PUBLISHED (if publish time <= now) or SCHEDULED (if future).
 * Enforces publisher identity from authenticated session.
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
    let customPublishAt: string | null = null;

    try {
      const body = await req.json();
      if (body?.published_at) {
        customPublishAt = String(body.published_at);
      }
    } catch {
      // Empty body is valid: defaults to immediate publish or existing published_at
    }

    const result = await publishContent(id, auth.user.id, customPublishAt);

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
