import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabaseAdmin";
import { authenticateRequest } from "@/utils/serverAuth";

export async function GET(req: Request) {
  try {
    const authentication = await authenticateRequest(req);

    if (!authentication.ok) {
      return NextResponse.json(
        { error: authentication.message },
        { status: authentication.status },
      );
    }

    const userId = authentication.user.id;
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const statusFilter = searchParams.get("status")?.trim() || "Semua";
    const categoryFilter = searchParams.get("category")?.trim() || "Semua";
    const paymentMethodFilter = searchParams.get("payment_method")?.trim() || "Semua";
    const sort = searchParams.get("sort")?.trim() || "newest";
    const search = searchParams.get("search")?.trim() || "";
    const date = searchParams.get("date")?.trim() || "";

    // 1. Base Query with Count
    let query = supabaseAdmin
      .from("orders")
      .select(
        "id, order_id, api_ref_id, sku, product_name, item_label, customer_no, customer_name, buy_price, price, discount, voucher_code, voucher_amount, cashback, payment_method, product_type, sn, category, status, used_balance, unique_code, total_amount, desc, created_at, updated_at",
        { count: "exact" },
      )
      .eq("user_id", userId);

    // 2. Status Filter
    if (statusFilter && statusFilter !== "Semua") {
      const lowerStatus = statusFilter.toLowerCase();
      if (lowerStatus === "berhasil" || lowerStatus === "success") {
        query = query.or("status.ilike.%berhasil%,status.ilike.%success%,status.ilike.%selesai%,status.ilike.%lunas%");
      } else if (lowerStatus === "proses" || lowerStatus === "diproses" || lowerStatus === "processing") {
        query = query.or("status.ilike.%proses%,status.ilike.%diproses%,status.ilike.%process%");
      } else if (lowerStatus === "pending") {
        query = query.ilike("status", "%pending%");
      } else if (lowerStatus === "expired" || lowerStatus === "kadaluarsa") {
        query = query.or("status.ilike.%expired%,status.ilike.%kadaluarsa%");
      } else if (lowerStatus === "gagal" || lowerStatus === "failed") {
        query = query.or("status.ilike.%gagal%,status.ilike.%failed%,status.ilike.%reject%,status.ilike.%refund%,status.ilike.%batal%");
      } else {
        query = query.ilike("status", `%${statusFilter}%`);
      }
    }

    // 3. Category Filter
    if (categoryFilter && categoryFilter !== "Semua") {
      query = query.eq("category", categoryFilter);
    }

    // 4. Payment Method Filter
    if (paymentMethodFilter && paymentMethodFilter !== "Semua") {
      query = query.ilike("payment_method", `%${paymentMethodFilter}%`);
    }

    // 5. Date Filter (YYYY-MM-DD)
    if (date) {
      const startDate = `${date}T00:00:00.000Z`;
      const endDate = `${date}T23:59:59.999Z`;
      query = query.gte("created_at", startDate).lte("created_at", endDate);
    }

    // 6. Search Filter
    if (search) {
      query = query.or(
        `order_id.ilike.%${search}%,product_name.ilike.%${search}%,item_label.ilike.%${search}%,customer_no.ilike.%${search}%,sn.ilike.%${search}%`,
      );
    }

    // 7. Sort Order
    if (sort === "oldest") {
      query = query.order("created_at", { ascending: true });
    } else if (sort === "highest_amount") {
      query = query.order("total_amount", { ascending: false, nullsFirst: false });
    } else if (sort === "lowest_amount") {
      query = query.order("total_amount", { ascending: true, nullsFirst: false });
    } else {
      // Default: newest
      query = query.order("created_at", { ascending: false });
    }

    // 8. Pagination Range
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // 9. Execute Main Query & Aggregate Query in Parallel
    const [ordersResult, summaryResult] = await Promise.all([
      query,
      supabaseAdmin
        .from("orders")
        .select("status, total_amount, price, category")
        .eq("user_id", userId),
    ]);

    if (ordersResult.error) {
      console.error("Orders API Error:", ordersResult.error);
      return NextResponse.json(
        { error: "Gagal memuat daftar transaksi." },
        { status: 500 },
      );
    }

    const ordersList = ordersResult.data || [];

    // Auto-resolve missing customer_name from cek_username_game table if available
    const missingCustomerNos = Array.from(
      new Set(
        ordersList
          .filter((o) => (!o.customer_name || o.customer_name === "-") && o.customer_no)
          .map((o) => o.customer_no as string),
      ),
    );

    if (missingCustomerNos.length > 0) {
      try {
        const { data: inqRecords } = await supabaseAdmin
          .from("cek_username_game")
          .select("customer_id, customer_name")
          .in("customer_id", missingCustomerNos)
          .not("customer_name", "is", null);

        if (inqRecords && inqRecords.length > 0) {
          const inqMap = new Map<string, string>();
          for (const item of inqRecords) {
            if (item.customer_id && item.customer_name && !inqMap.has(item.customer_id)) {
              inqMap.set(item.customer_id, item.customer_name);
            }
          }

          for (const ord of ordersList) {
            if ((!ord.customer_name || ord.customer_name === "-") && ord.customer_no && inqMap.has(ord.customer_no)) {
              ord.customer_name = inqMap.get(ord.customer_no);
            }
          }
        }
      } catch (inqErr) {
        console.warn("Inquiry lookup warning:", inqErr);
      }
    }

    const allOrders = summaryResult.data || [];
    let totalSpent = 0;
    let successCount = 0;
    let processingCount = 0;
    let failedCount = 0;
    let expiredCount = 0;
    let pendingCount = 0;
    const categoriesSet = new Set<string>();

    for (const ord of allOrders) {
      if (ord.category?.trim()) {
        categoriesSet.add(ord.category.trim());
      }

      const st = String(ord.status || "").toLowerCase().trim();
      const amount = Number(ord.total_amount ?? ord.price ?? 0) || 0;

      if (st.includes("berhasil") || st.includes("success") || st.includes("selesai") || st.includes("lunas")) {
        successCount++;
        totalSpent += amount;
      } else if (st.includes("expired") || st.includes("kadaluarsa")) {
        expiredCount++;
      } else if (st.includes("proses") || st.includes("diproses") || st.includes("processing") || st.includes("process")) {
        processingCount++;
      } else if (st.includes("pending")) {
        pendingCount++;
      } else if (st.includes("gagal") || st.includes("failed") || st.includes("reject") || st.includes("refund") || st.includes("batal")) {
        failedCount++;
      } else {
        pendingCount++;
      }
    }

    const totalFiltered = ordersResult.count || 0;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));

    return NextResponse.json({
      success: true,
      data: {
        orders: ordersList,
        pagination: {
          page,
          limit,
          total: totalFiltered,
          totalPages,
        },
        summary: {
          totalCount: allOrders.length,
          totalSpent,
          successCount,
          processingCount,
          failedCount,
          expiredCount,
          pendingCount,
          statusCounts: {
            semua: allOrders.length,
            pending: pendingCount,
            expired: expiredCount,
            proses: processingCount,
            berhasil: successCount,
            gagal: failedCount,
          },
        },
        categories: Array.from(categoriesSet).sort((a, b) => a.localeCompare(b, "id")),
      },
    });
  } catch (err: unknown) {
    console.error("User Orders API Exception:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server." },
      { status: 500 },
    );
  }
}

