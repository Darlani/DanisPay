import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { order_id } = await req.json();

    if (!order_id) {
      return NextResponse.json({ error: "Invoice wajib diisi!" }, { status: 400 });
    }

    // Gunakan Kunci Master untuk menembus RLS dan ambil data komplit
    const { data: liveData, error: liveError } = await supabaseAdmin
      .from("orders")
      .select("id, order_id, status, payment_method, created_at, total_amount, sku, category, user_id, sn, qris_string, customer_no, item_label, user_contact, customer_name, desc, used_balance, stand_meter, segment_power, raw_tagihan, unique_code, product_name, price, notes")
      .eq("order_id", order_id)
      .maybeSingle();

    let data: Record<string, unknown> | null = null;
    let fetchError = liveError;

    if (liveData) {
      data = { ...liveData, is_sandbox: false };
    } else {
      // Periksa tabel sandbox_orders jika tidak ditemukan di orders LIVE
      const { data: sandboxData, error: sbError } = await supabaseAdmin
        .from("sandbox_orders")
        .select("id, order_id, status, payment_method, created_at, total_amount, sku, category, user_id, sn, qris_string, customer_no, item_label, user_contact, customer_name, desc, used_balance, stand_meter, segment_power, raw_tagihan, unique_code, product_name, price, notes")
        .eq("order_id", order_id)
        .maybeSingle();

      if (sandboxData) {
        data = { ...sandboxData, is_sandbox: true };
        fetchError = null;
      } else if (sbError) {
        fetchError = sbError;
      }
    }

    if (fetchError || !data) {
      return NextResponse.json({ error: "Invoice tidak ditemukan!" }, { status: 404 });
    }

    // Auto-Reconcile: Jika pesanan masih Pending dan waktu >= 2 jam, ubah langsung di database jadi Gagal
    const createdAtTs = new Date(String(data.created_at)).getTime();
    const isExpired =
      !Number.isNaN(createdAtTs) && Date.now() >= createdAtTs + 2 * 60 * 60 * 1000;

    if (data.status === "Pending" && isExpired) {
      const table = data.is_sandbox ? "sandbox_orders" : "orders";
      const isMixed =
        Boolean(data.used_balance) &&
        Number(data.used_balance) > 0 &&
        Boolean(data.total_amount) &&
        Number(data.total_amount) > 0;

      if (!data.is_sandbox && isMixed && data.id) {
        try {
          await supabaseAdmin.rpc("refund_expired_mixed_order_atomic", {
            p_order_id: data.id,
          });
        } catch (rpcErr) {
          console.error("Gagal refund mixed order saat invoice expire:", rpcErr);
        }
      } else {
        await supabaseAdmin
          .from(table)
          .update({
            status: "Gagal",
            updated_at: new Date().toISOString(),
            notes: "Batal Otomatis: Batas waktu pembayaran 2 jam telah habis.",
          })
          .eq("order_id", order_id)
          .eq("status", "Pending");
      }
      data.status = "Gagal";
    }

    // Ambil brand resmi & logo produk terkait
    let productLogo: string | null = null;
    let cleanBrandName: string | null = null;

    if (data.sku) {
      const { data: prod } = await supabaseAdmin
        .from("product_unified_view")
        .select("brand_name, brand_id")
        .eq("sku", data.sku)
        .limit(1)
        .maybeSingle();

      if (prod?.brand_name) {
        cleanBrandName = prod.brand_name;
      }

      if (prod?.brand_id) {
        const { data: brandById } = await supabaseAdmin
          .from("brands")
          .select("name, image_url")
          .eq("id", prod.brand_id)
          .maybeSingle();

        if (brandById?.image_url) {
          productLogo = brandById.image_url;
        }
        if (brandById?.name) {
          cleanBrandName = brandById.name;
        }
      }
    }

    if (!cleanBrandName && data.product_name) {
      const rawProdName = String(data.product_name).trim();
      const { data: allBrands } = await supabaseAdmin
        .from("brands")
        .select("name, image_url");

      if (allBrands && allBrands.length > 0) {
        const matched = allBrands
          .filter((b) =>
            b.name &&
            (rawProdName.toLowerCase() === b.name.toLowerCase() ||
              rawProdName.toLowerCase().startsWith(b.name.toLowerCase() + " ") ||
              rawProdName.toLowerCase().startsWith(b.name.toLowerCase() + "-"))
          )
          .sort((a, b) => b.name.length - a.name.length)[0];

        if (matched) {
          cleanBrandName = matched.name;
          if (!productLogo && matched.image_url) {
            productLogo = matched.image_url;
          }
        }
      }
    }

    if (!productLogo && data.product_name) {
      const cleanName = String(data.product_name).trim();
      const { data: brandByName } = await supabaseAdmin
        .from("brands")
        .select("image_url")
        .ilike("name", cleanName)
        .limit(1)
        .maybeSingle();

      if (brandByName?.image_url) {
        productLogo = brandByName.image_url;
      } else {
        const { data: brandLike } = await supabaseAdmin
          .from("brands")
          .select("image_url")
          .ilike("name", `%${cleanName}%`)
          .limit(1)
          .maybeSingle();
        if (brandLike?.image_url) {
          productLogo = brandLike.image_url;
        }
      }
    }

    const finalBrandName =
      cleanBrandName ||
      (typeof data.product_name === "string"
        ? data.product_name
            .replace(/\s+\d+([.,]\d+)*\s*(diamonds?|dm|uc|cp|koin|coins?|rb|k|vip|pass)?$/i, "")
            .trim()
        : null);

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        brand_name: finalBrandName,
        clean_product_name: finalBrandName,
        product_logo: productLogo,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal memproses permintaan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}