import { NextResponse } from 'next/server';
import { requireAdminOrManager } from "@/utils/serverAuth";
import { supabaseAdmin } from '@/utils/supabaseAdmin';

export async function POST(req: Request) {
  try {
    const auth = await requireAdminOrManager(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const body = await req.json().catch(() => ({}));
    const { search, categoryId, globalCashback } = body;

    // Validate globalCashback
    let cb = 3.0;
    if (globalCashback !== undefined && globalCashback !== null) {
      const parsedCb = Number(globalCashback);
      if (Number.isFinite(parsedCb) && parsedCb >= 0) {
        cb = parsedCb;
      } else {
        return NextResponse.json(
          { error: "Invalid globalCashback: must be a non-negative finite number" },
          { status: 400 }
        );
      }
    }

    // Validate categoryId (must be null or valid UUID string)
    let catId: string | null = null;
    if (categoryId) {
      const trimmed = String(categoryId).trim();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(trimmed)) {
        return NextResponse.json(
          { error: "Invalid categoryId: must be a valid UUID format" },
          { status: 400 }
        );
      }
      catId = trimmed;
    }

    // Sanitize search
    const searchTerm = typeof search === 'string' && search.trim() !== '' ? search.trim() : null;

    const { data, error } = await supabaseAdmin.rpc('get_products_potential_profit', {
      p_search: searchTerm,
      p_category_id: catId,
      p_global_cashback: cb,
    });

    if (error) {
      console.error("RPC Error get_products_potential_profit:", error);
      return NextResponse.json({ error: "Failed to calculate potential profit" }, { status: 500 });
    }

    const row = data?.[0] || {};
    return NextResponse.json({
      totalModal: Number(row.total_modal) || 0,
      totalOmzet: Number(row.total_omzet) || 0,
      totalProfit: Number(row.total_profit) || 0,
      totalItems: Number(row.total_items) || 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Potential profit route exception:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
