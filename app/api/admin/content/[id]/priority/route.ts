import { NextResponse } from "next/server";
import { requireAdminOrManager } from "@/utils/serverAuth";
import { updateContentPriority } from "@/lib/cms/content-service";
import { mapCmsErrorToResponse, revalidatePublicContentRoutes } from "../../routeHelper";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/content/[id]/priority
 * Updates manual ranking priority (integer).
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

    if (body?.priority === undefined || !Number.isSafeInteger(Number(body.priority))) {
      return NextResponse.json(
        { ok: false, error: "Field priority (integer) wajib disediakan dan berupa angka valid." },
        { status: 400 }
      );
    }

    const result = await updateContentPriority(id, Number(body.priority));

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
