import { NextResponse } from "next/server";
import { requireAdminOrManager } from "@/utils/serverAuth";
import { reorderSections } from "@/lib/cms/content-service";
import { mapCmsErrorToResponse, revalidatePublicContentRoutes } from "../../routeHelper";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/content/sections/reorder
 * Batch updates order_position for sections on a page.
 */
export async function POST(req: Request) {
  const auth = await requireAdminOrManager(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.message }, { status: auth.status });
  }

  try {
    const body = await req.json();

    if (!Array.isArray(body?.orders) || body.orders.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Array 'orders' berisi { id: string, order_position: number } wajib disediakan." },
        { status: 400 }
      );
    }

    // Validate no duplicate IDs in reorder payload
    const seenIds = new Set<string>();
    for (const item of body.orders) {
      if (!item?.id || typeof item.id !== "string") {
        return NextResponse.json(
          { ok: false, error: "Setiap item order harus memiliki ID valid." },
          { status: 400 }
        );
      }
      if (!Number.isSafeInteger(Number(item.order_position)) || Number(item.order_position) < 0) {
        return NextResponse.json(
          { ok: false, error: "Nilai order_position harus berupa bilangan bulat positif." },
          { status: 400 }
        );
      }
      if (seenIds.has(item.id)) {
        return NextResponse.json(
          { ok: false, error: `Duplikasi ID '${item.id}' ditemukan dalam data reorder.` },
          { status: 400 }
        );
      }
      seenIds.add(item.id);
    }

    const result = await reorderSections(body.orders);

    if (result.isError) {
      return mapCmsErrorToResponse(result);
    }

    revalidatePublicContentRoutes();

    return NextResponse.json({ ok: true, data: { success: true } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
