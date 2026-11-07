"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/utils/supabaseClient";
import BannerCarousel from '@/components/BannerCarousel';
import BannerPopularDivider from '@/components/dapay/BannerPopularDivider';
import ProductSection, { BrandItem } from '@/components/ProductSection';
import { useI18n } from "@/lib/i18n/context";
import { localizeHref } from "@/lib/i18n/config";
import { CURATED_SANDBOX_BRANDS } from "@/lib/sandbox/curated-catalog";

interface CatalogSection {
  title: string;
  titleKey?: string;
  category: string;
  id: string;
  brands: BrandItem[];
}

const LANDING_CATEGORY_CONFIG = [
  { slug: 'game', title: 'Game Top Up', titleKey: 'categories.game', domId: 'game' },
  { slug: 'voucher & gift card', title: 'Voucher & Gift Card', titleKey: 'categories.voucher', domId: 'voucher' },
  { slug: 'entertainment & subscription', title: 'Entertainment & Subscription', titleKey: 'categories.entertainment', domId: 'entertainment' },
  { slug: 'pulsa & data seluler', title: 'Pulsa & Data Seluler', titleKey: 'categories.pulsa', domId: 'pulsa' },
  { slug: 'tagihan prabayar', title: 'Tagihan Prabayar', titleKey: 'categories.prabayar', domId: 'prabayar' },
  { slug: 'tagihan pascabayar', title: 'Tagihan Pascabayar', titleKey: 'categories.pascabayar', domId: 'pascabayar' },
  { slug: 'e-wallet & saldo', title: 'E-Wallet & Saldo', titleKey: 'categories.emoney', domId: 'e-money' },
  { slug: 'marketplace', title: 'Marketplace', titleKey: 'categories.marketplace', domId: 'marketplace' },
  { slug: 'social & konten', title: 'Sosial & Konten', titleKey: 'categories.social', domId: 'social' },
  { slug: 'productivity & software', title: 'Produktivitas & Software', titleKey: 'categories.productivity', domId: 'productivity' },
  { slug: 'travel', title: 'Travel & Perjalanan', titleKey: 'categories.travel', domId: 'travel' },
  { slug: 'digital services', title: 'Digital Services', titleKey: 'categories.digital', domId: 'digital' }
];

const POPULAR_BRAND_SLUGS = [
  'mobile-legends', 'free-fire', 'google-play', 'netflix',
  'telkomsel', 'indosat', 'xl', 'axis', 'tri', 'valorant'
];

interface RawBrandRow {
  id: number | string;
  name: string;
  slug: string;
  image_url: string | null;
  categories: {
    slug: string;
    name: string;
  } | null;
}

interface ActiveProductRow {
  id: number | string;
  sku: string;
  name: string;
  price: number;
  discount: number | null;
  brand_id: number | string | null;
  promo_label?: string | null;
}

interface ValidBrandInfo {
  id: number | string;
  name: string;
  slug: string;
  image_url: string | null;
  categorySlug: string;
  is_hot?: boolean;
}

interface RepeatPurchaseItem {
  groupKey: string;
  orderId: string;
  brandSlug: string;
  brandName: string;
  brandImageUrl: string | null;
  variantLabel: string;
  sku: string;
  targetId: string;
  zoneId: string;
  maskedDestination: string;
  paymentMethod: string;
  currentPrice: number;
  priceLabelType: "current_price" | "last_bill";
}

interface RawHistoricalOrder {
  id?: string | number;
  order_id?: string;
  sku?: string | null;
  product_name?: string | null;
  customer_no?: string | null;
  status?: string | null;
  payment_method?: string | null;
  price?: number | string | null;
  raw_tagihan?: number | string | null;
  unique_code?: number | string | null;
  total_amount?: number | string | null;
  desc?: unknown;
  category?: string | null;
  created_at?: string | null;
  is_sandbox?: boolean | null;
}

interface ShortcutCategoryItem {
  id: number;
  name: string;
  slug: string;
  is_shortcut?: boolean;
}

import MaintenancePage from "@/utils/MaintenancePage";
import { Loader2, Clock, Headset, CheckCircle2, XCircle } from "lucide-react";
import ContactModal from "@/components/ContactModal";
import { getWhatsAppUrl } from "@/utils/storeConfig";

function parseCustomerDestination(rawCustomerNo: unknown): {
  targetId: string;
  zoneId: string;
  normalizedKey: string;
} {
  const raw = String(rawCustomerNo ?? "").trim();
  if (!raw) {
    return { targetId: "", zoneId: "", normalizedKey: "" };
  }
  const parenMatch = raw.match(/^(.+?)\(([^()]+)\)$/);
  if (parenMatch) {
    const targetId = parenMatch[1].trim();
    const zoneId = parenMatch[2].trim();
    return {
      targetId,
      zoneId,
      normalizedKey: `${targetId.toLowerCase()}(${zoneId.toLowerCase()})`,
    };
  }
  return {
    targetId: raw,
    zoneId: "",
    normalizedKey: raw.toLowerCase(),
  };
}

function formatMaskedDestination(targetId: string, zoneId: string): string {
  const cleanTarget = targetId.trim();
  const cleanZone = zoneId.trim();
  if (!cleanTarget) return "";

  if (cleanZone) {
    const maskedTarget =
      cleanTarget.length > 4
        ? `${cleanTarget.slice(0, 4)}••••`
        : `${cleanTarget.slice(0, Math.max(1, cleanTarget.length - 1))}••`;
    return `ID: ${maskedTarget} (${cleanZone})`;
  }

  if (/^(08|\+?628)\d{6,}$/.test(cleanTarget)) {
    if (cleanTarget.length >= 8) {
      return `${cleanTarget.slice(0, 4)}••••${cleanTarget.slice(-4)}`;
    }
    return `${cleanTarget.slice(0, 3)}••••`;
  }

  if (cleanTarget.length >= 9) {
    return `${cleanTarget.slice(0, 4)}••••${cleanTarget.slice(-3)}`;
  }

  if (cleanTarget.length > 4) {
    return `ID: ${cleanTarget.slice(0, 4)}••••`;
  }

  return `ID: ${cleanTarget.slice(0, Math.max(1, cleanTarget.length - 1))}••`;
}

function formatVariantLabel(productName: string, brandName: string): string {
  const cleanProduct = String(productName || "").trim();
  const cleanBrand = String(brandName || "").trim();
  if (!cleanProduct) return cleanBrand;
  if (!cleanBrand) return cleanProduct;

  if (cleanProduct.toLowerCase().startsWith(cleanBrand.toLowerCase())) {
    const stripped = cleanProduct
      .slice(cleanBrand.length)
      .replace(/^[\s\-–—:|]+/, "")
      .trim();
    if (stripped.length > 0) {
      return stripped;
    }
  }

  const dashMatch = cleanProduct.match(/^([^:\-–—]+?)\s*[\-–—:]\s*(.+)$/);
  if (dashMatch) {
    const prefixNorm = dashMatch[1].toLowerCase().replace(/[^a-z0-9]/g, "");
    const brandNorm = cleanBrand.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (
      prefixNorm.length >= 3 &&
      (brandNorm.startsWith(prefixNorm) || prefixNorm.startsWith(brandNorm))
    ) {
      const rest = dashMatch[2].trim();
      if (rest.length > 0) {
        return rest;
      }
    }
  }

  return cleanProduct;
}

function getBrandInitials(brandName: string): string {
  const words = String(brandName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "DP";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function isPlnPascabayarItem(
  brand: ValidBrandInfo,
  product: ActiveProductRow,
  order: RawHistoricalOrder
): boolean {
  const brandSlug = String(brand.slug || "").trim().toLowerCase();
  const brandName = String(brand.name || "").trim().toLowerCase();
  const categorySlug = String(brand.categorySlug || order.category || "").trim().toLowerCase();
  const prodSku = String(product.sku || order.sku || "").trim().toLowerCase();
  const prodName = String(product.name || order.product_name || "").trim().toLowerCase();

  if (brandSlug === "pln-pascabayar" || prodSku === "pln") {
    return true;
  }
  if (
    categorySlug.includes("pascabayar") &&
    (brandName.includes("pln") || prodName.includes("pln"))
  ) {
    return true;
  }
  return false;
}

function resolvePlnHistoricalBillAmount(order: RawHistoricalOrder): number {
  if (order.desc) {
    try {
      const parsed =
        typeof order.desc === "string" ? JSON.parse(order.desc) : order.desc;
      const detail0 = (
        parsed as { detail?: Array<{ nilai_tagihan?: unknown }> } | null
      )?.detail?.[0];
      const nilaiTagihan = Number(detail0?.nilai_tagihan);
      if (Number.isFinite(nilaiTagihan) && nilaiTagihan > 0) {
        return Math.floor(nilaiTagihan);
      }
    } catch {
      // Ignore malformed desc JSON
    }
  }

  const rawTagihan = Number(order.raw_tagihan);
  if (Number.isFinite(rawTagihan) && rawTagihan > 0) {
    return Math.floor(rawTagihan);
  }

  const orderPrice = Number(order.price);
  if (Number.isFinite(orderPrice) && orderPrice > 0) {
    return Math.floor(orderPrice);
  }

  return 0;
}

// --- KOMPONEN BARU: BANNER PENDING DENGAN TIMER REALTIME & AUTO-SYNC ---
function PendingPaymentBanner({
  order,
  router,
  onResolved,
}: {
  order: RawHistoricalOrder;
  router: ReturnType<typeof useRouter>;
  onResolved: (status: string) => void;
}) {
  const { t, locale } = useI18n();
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);
  const [isResolved, setIsResolved] = useState(false);

  // 1. Logika Timer 2 Jam Mutlak
  useEffect(() => {
    if (!order?.created_at) return;
    const rawTime = new Date(order.created_at).getTime();
    const createdMs = isNaN(rawTime) ? new Date(`${order.created_at}Z`).getTime() : rawTime;
    const expiryTime = (isNaN(createdMs) ? Date.now() : createdMs) + 7200000;

    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = expiryTime - now;

      if (isNaN(distance) || distance <= 0) {
        setIsExpired(true);
        setTimeLeft("00:00:00");
        return;
      }

      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [order]);

  // 2. Auto-Sync Ringan Tiap 10 Detik via API Backend (Tembus RLS)
  useEffect(() => {
    if (!order?.order_id || isExpired || isResolved) return;

    const checkPaymentStatus = async () => {
      try {
        // Minta bantuan API Invoice agar aman dari blokir keamanan Supabase
        const res = await fetch('/api/orders/invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: order.order_id })
        });

        if (res.ok) {
          const json = await res.json();
          const data = json.data;

          if (data && data.status) {
            const currentStatus = data.status.toLowerCase();

            if (currentStatus !== 'pending') {
              // Update cache browser lokal terlebih dahulu sebelum callback
              const guestCache = localStorage.getItem('dapay_guest_history');
              if (guestCache) {
                const history = JSON.parse(guestCache) as RawHistoricalOrder[];
                const orderIndex = history.findIndex((o) => o.order_id === order.order_id);
                if (orderIndex !== -1) {
                  history[orderIndex].status = data.status;
                  localStorage.setItem('dapay_guest_history', JSON.stringify(history));
                }
              }

              setIsResolved(true); // Sembunyikan banner instan
              onResolved(data.status); // Luncurkan pop-up Toast!
            }
          }
        }
      } catch {
        // Silently fail
      }
    };

    checkPaymentStatus(); // 🚀 JALANKAN SEKETIKA SAAT RELOAD! (Tanpa nunggu 10 detik)
    const syncInterval = setInterval(checkPaymentStatus, 10000);
    return () => clearInterval(syncInterval);
  }, [order, isExpired, isResolved, onResolved]);

  // Hilangkan dari UI jika expired atau sudah sukses/gagal
  if (isExpired || isResolved) return null;

  return (
    <div className="fixed top-18 md:top-20 right-4 sm:right-6 z-50 animate-in fade-in slide-in-from-top-3 duration-300 max-w-85 sm:max-w-sm select-none">
      <div className="backdrop-blur-2xl bg-slate-900/95 border border-amber-500/40 rounded-2xl p-2.5 sm:p-3 shadow-2xl shadow-black/80 flex items-center gap-3">
        <div className="relative p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
          <div className="absolute inset-0 bg-amber-500/30 rounded-xl animate-ping" />
          <Clock className="w-4 h-4 relative z-10" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400 text-[10px] sm:text-[11px] font-black uppercase tracking-wider">
              {t("checkout.waitingPayment")}
            </span>
            <span className="text-amber-300/80 font-mono font-bold text-[10px]">
              • {timeLeft || "00:00:00"}
            </span>
          </div>
          <p className="text-white text-xs font-semibold truncate mt-0.5">
            {order.product_name}
          </p>
        </div>
        <button
          onClick={() => router.push(localizeHref(`/checkout/pay/${order.order_id}`, locale))}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] sm:text-xs px-3 py-1.5 rounded-lg shrink-0 transition-all active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer"
        >
          {t("home.payNow")}
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shortcutCategories, setShortcutCategories] = useState<ShortcutCategoryItem[]>([]);
  const [recentOrders, setRecentOrders] = useState<RepeatPurchaseItem[]>([]);
  const [pendingOrder, setPendingOrder] = useState<RawHistoricalOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSupportMenuOpen, setIsSupportMenuOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<{title: string, desc: string, type: 'success' | 'error'} | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogSections, setCatalogSections] = useState<CatalogSection[]>([]);
  const [isBannerRolling, setIsBannerRolling] = useState(true);

  const catalogMapsRef = useRef<{
    productBySku: Map<string, ActiveProductRow>;
    brandById: Map<string, ValidBrandInfo>;
  } | null>(null);

  const resolveRepeatAndPendingOrders = useCallback(
    (
      ordersToProcess: RawHistoricalOrder[],
      isUserStaff: boolean,
      productBySku: Map<string, ActiveProductRow>,
      brandById: Map<string, ValidBrandInfo>
    ) => {
      if (!Array.isArray(ordersToProcess)) {
        setPendingOrder(null);
        setRecentOrders([]);
        return;
      }

      // Filter ketat: hilangkan seluruh order dummy / sandbox / test
      const liveOrders = ordersToProcess.filter((o) => {
        if (!o || o.is_sandbox === true) return false;
        const skuUpper = String(o.sku || "").trim().toUpperCase();
        const orderIdUpper = String(o.order_id || "").trim().toUpperCase();
        return !skuUpper.startsWith("TEST-") && !orderIdUpper.startsWith("TEST-");
      });

      // 1. Cari transaksi yang masih pending (Staff tidak pernah melihat pengingat konsumen)
      const pending = !isUserStaff
        ? liveOrders.find(
            (o) => String(o.status || "").trim().toLowerCase() === "pending"
          )
        : null;

      setPendingOrder(pending || null);

      if (isUserStaff) {
        setRecentOrders([]);
        return;
      }

      // 2. Resolusi kanonik untuk "Beli Lagi Yuk":
      //    Hanya status === "Berhasil", dipetakan melalui SKU aktif -> product_unified_view -> brand aktif,
      //    dikelompokkan berdasarkan brandSlug + normalizedDestination (maksimal 4 kartu).
      const seenGroups = new Set<string>();
      const repeatItems: RepeatPurchaseItem[] = [];

      for (const order of liveOrders) {
        const normalizedStatus = String(order.status || "").trim().toLowerCase();
        if (normalizedStatus !== "berhasil") {
          continue;
        }

        const rawSku = String(order.sku || "").trim();
        if (!rawSku) {
          continue;
        }

        const matchedProduct = productBySku.get(rawSku.toLowerCase());
        if (!matchedProduct || matchedProduct.brand_id === null || matchedProduct.brand_id === undefined) {
          continue;
        }

        const matchedBrand = brandById.get(String(matchedProduct.brand_id));
        if (!matchedBrand || !matchedBrand.slug) {
          continue;
        }

        const { targetId, zoneId, normalizedKey } = parseCustomerDestination(order.customer_no);
        if (!targetId || !normalizedKey) {
          continue;
        }

        const groupKey = `${matchedBrand.slug.toLowerCase()}::${normalizedKey}`;
        if (seenGroups.has(groupKey)) {
          continue;
        }

        const isPlnPasca = isPlnPascabayarItem(matchedBrand, matchedProduct, order);
        let displayPrice = 0;

        if (isPlnPasca) {
          displayPrice = resolvePlnHistoricalBillAmount(order);
        } else {
          const rawPrice = Number(matchedProduct.price) || 0;
          const discountPct = Number(matchedProduct.discount) || 0;
          displayPrice =
            discountPct > 0
              ? Math.floor(rawPrice * (1 - discountPct / 100))
              : rawPrice;
        }

        if (displayPrice <= 0) {
          continue;
        }

        const displayBrandName = isPlnPasca ? "PLN / Listrik" : matchedBrand.name;
        const displayVariantLabel = isPlnPasca
          ? "PLN Pascabayar"
          : formatVariantLabel(matchedProduct.name, matchedBrand.name);
        const paymentMethod = String(order.payment_method || "").trim();

        seenGroups.add(groupKey);
        repeatItems.push({
          groupKey,
          orderId: String(order.order_id || order.id || groupKey),
          brandSlug: matchedBrand.slug,
          brandName: displayBrandName,
          brandImageUrl: matchedBrand.image_url,
          variantLabel: displayVariantLabel,
          sku: matchedProduct.sku,
          targetId,
          zoneId,
          maskedDestination: formatMaskedDestination(targetId, zoneId),
          paymentMethod,
          currentPrice: displayPrice,
          priceLabelType: isPlnPasca ? "last_bill" : "current_price",
        });

        if (repeatItems.length >= 4) {
          break;
        }
      }

      setRecentOrders(repeatItems);
    },
    []
  );

  // Helper untuk Auto-hide Toast (Diperlama jadi 12 detik agar sempat dibaca)
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(null), 12000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  useEffect(() => {
    let isCancelled = false;

    const checkMaintenanceAndData = async () => {
      try {
        // 1. Consolidated Fetch: Maintenance, Shortcuts, Active Brands, Active Storefront Products
        const [settingsRes, shortcutCatsRes, brandsRes, activeProdsRes] = await Promise.all([
          supabase.from('store_settings').select('is_maintenance').single(),
          supabase.from('categories').select('id, name, slug, is_shortcut').eq('is_shortcut', true).order('name', { ascending: true }),
          supabase.from('brands').select('id, name, slug, image_url, categories!inner(slug, name)').eq('active', true).order('name', { ascending: true }),
          supabase
            .from('product_unified_view')
            .select('id, sku, name, price, discount, brand_id, promo_label')
            .eq('is_active', true)
            .eq('is_storefront_eligible', true)
        ]);

        if (isCancelled) return;

        if (settingsRes.data) setIsMaintenance(settingsRes.data.is_maintenance);
        if (shortcutCatsRes.data) setShortcutCategories(shortcutCatsRes.data);

        const activeProductRows = (activeProdsRes.data as ActiveProductRow[] | null) || [];
        const productBySku = new Map<string, ActiveProductRow>();
        const activeBrandIds = new Set<string>();

        // Authoritative HOT detection from active products and curated catalog
        const hotBrandIds = new Set<string>();

        for (const prod of activeProductRows) {
          if (prod.brand_id !== null && prod.brand_id !== undefined) {
            activeBrandIds.add(String(prod.brand_id));
            if (prod.promo_label && String(prod.promo_label).toUpperCase().includes("HOT")) {
              hotBrandIds.add(String(prod.brand_id));
            }
          }
          // Jangan masukkan SKU internal "Cek Username" sebagai produk pembelian ulang
          if (String(prod.name || "").toLowerCase().includes("cek username")) {
            continue;
          }
          const skuKey = String(prod.sku || "").trim().toLowerCase();
          if (skuKey && !productBySku.has(skuKey)) {
            productBySku.set(skuKey, prod);
          }
        }

        const curatedHotSlugs = new Set(
          CURATED_SANDBOX_BRANDS
            .filter((c) => String(c.badge || '').toUpperCase() === 'HOT')
            .map((c) => c.brandKey.toLowerCase())
        );

        // Filter: Hanya brand aktif yang memiliki minimal 1 produk aktif dari product_unified_view
        const validBrands: ValidBrandInfo[] = ((brandsRes.data as unknown as RawBrandRow[] | null) || [])
          .filter((b) => activeBrandIds.has(String(b.id)))
          .map((b) => ({
            id: b.id,
            name: b.name,
            slug: b.slug,
            image_url: b.image_url,
            categorySlug: b.categories?.slug || '',
            is_hot: hotBrandIds.has(String(b.id)) || curatedHotSlugs.has(String(b.slug).toLowerCase()),
          }));

        const brandById = new Map<string, ValidBrandInfo>();
        for (const brand of validBrands) {
          brandById.set(String(brand.id), brand);
        }

        catalogMapsRef.current = { productBySku, brandById };

        const builtSections: CatalogSection[] = [];

        // Seksi 1: Populer Sekarang (Hanya brand populer yang valid dan memiliki produk aktif)
        const popularBrands = validBrands.filter((b) => POPULAR_BRAND_SLUGS.includes(b.slug));
        if (popularBrands.length > 0) {
          builtSections.push({
            title: 'Populer Sekarang',
            titleKey: 'home.popularTitle',
            category: 'popular',
            id: 'popular',
            brands: popularBrands
          });
        }

        // Seksi Kategori Dinamis: Mengikuti konfigurasi urutan visual Landing Page
        for (const cat of LANDING_CATEGORY_CONFIG) {
          const catBrands = validBrands.filter((b) => b.categorySlug === cat.slug);
          if (catBrands.length > 0) {
            builtSections.push({
              title: cat.title,
              titleKey: cat.titleKey,
              category: cat.slug,
              id: cat.domId,
              brands: catBrands
            });
          }
        }

        setCatalogSections(builtSections);
        setCatalogLoading(false);
        // Lepas spinner utama segera setelah katalog siap (Non-Blocking Homepage Render)
        setLoading(false);

        // 2. Resolusi Transaksi Terakhir secara non-blocking
        const { data: { session } } = await supabase.auth.getSession();
        if (isCancelled) return;

        let isStaff = false;
        if (session?.user?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();
          const role = String(profile?.role || "").toLowerCase();
          if (role === 'admin' || role === 'manager') {
            isStaff = true;
          }
        }

        if (isCancelled) return;

        if (session?.user && session?.access_token) {
          if (isStaff) {
            resolveRepeatAndPendingOrders([], true, productBySku, brandById);
          } else {
            const res = await fetch('/api/user/orders?page=1&limit=20&sort=newest', {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            });
            if (!isCancelled && res.ok) {
              const json = await res.json();
              const ordersArray =
                Array.isArray(json?.data?.orders)
                  ? json.data.orders
                  : Array.isArray(json?.orders)
                    ? json.orders
                    : [];
              resolveRepeatAndPendingOrders(ordersArray, false, productBySku, brandById);
            }
          }
        } else {
          // GUEST LOGIC: Baca riwayat lokal yang aman (tanpa query Supabase device_id)
          const guestCache = localStorage.getItem('dapay_guest_history');
          if (guestCache) {
            try {
              const parsedCache = JSON.parse(guestCache);
              if (Array.isArray(parsedCache) && parsedCache.length > 0) {
                resolveRepeatAndPendingOrders(parsedCache, false, productBySku, brandById);
              }
            } catch (e) {
              console.error("Gagal baca cache lokal Guest", e);
            }
          }
        }
      } catch (err) {
        console.error("Load error", err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
          setCatalogLoading(false);
        }
      }
    };

    checkMaintenanceAndData();

    const {
      data: { subscription: authListener },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setPendingOrder(null);
        const guestCache = typeof window !== "undefined" ? localStorage.getItem("dapay_guest_history") : null;
        if (guestCache && catalogMapsRef.current) {
          try {
            const parsed = JSON.parse(guestCache);
            if (Array.isArray(parsed) && parsed.length > 0) {
              resolveRepeatAndPendingOrders(
                parsed,
                false,
                catalogMapsRef.current.productBySku,
                catalogMapsRef.current.brandById
              );
              return;
            }
          } catch {
            // ignore
          }
        }
        setRecentOrders([]);
      }
    });

    return () => {
      isCancelled = true;
      authListener.unsubscribe();
    };
  }, [resolveRepeatAndPendingOrders]);

  if (loading) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-500" size={40} />
    </div>
  );

  if (isMaintenance) {
    const userEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") : null;
    if (userEmail !== "admin1@gmail.com") return <MaintenancePage />;
  }

  const buildReorderHref = (item: RepeatPurchaseItem) => {
    const params = new URLSearchParams();
    if (item.targetId) params.set("target", item.targetId);
    if (item.zoneId) params.set("zone", item.zoneId);
    if (item.sku) params.set("sku", item.sku);
    const query = params.toString();
    return localizeHref(`/${item.brandSlug}${query ? `?${query}` : ""}`, locale);
  };

  const popularSection = catalogSections.find((sec) => sec.category === 'popular');
  const otherSections = catalogSections.filter((sec) => sec.category !== 'popular');

  return (
    <main className="min-h-screen bg-[#0f172a]">
      {/* Continuous Dark Hero Stage (Navbar Bottom -> Hero -> Divider) */}
      <div className="hero-stage-container w-full bg-[#080D1A] relative overflow-hidden">
        <BannerCarousel onAutoplayChange={setIsBannerRolling} />
        <BannerPopularDivider isPaused={!isBannerRolling} />
      </div>

      {/* --- BANNER PENGINGAT PEMBAYARAN PENDING --- */}
      {pendingOrder && (
        <PendingPaymentBanner
          order={pendingOrder}
          router={router}
          onResolved={(status) => {
            const normalized = status.toLowerCase();
            const isSuccess = normalized === 'berhasil' || normalized === 'success' || normalized === 'diproses';
            setToastMsg({
              title: isSuccess ? t("home.toastPaymentSuccessTitle") : t("home.toastPaymentCanceledTitle"),
              desc: isSuccess ? t("home.toastPaymentSuccessDesc") : t("home.toastPaymentCanceledDesc"),
              type: isSuccess ? 'success' : 'error'
            });
            setPendingOrder(null);

            // Sinkronisasi ulang riwayat Guest bila order yang baru selesai berstatus Berhasil
            if (catalogMapsRef.current) {
              try {
                const guestCache = localStorage.getItem('dapay_guest_history');
                if (guestCache) {
                  const parsed = JSON.parse(guestCache);
                  if (Array.isArray(parsed)) {
                    resolveRepeatAndPendingOrders(
                      parsed,
                      false,
                      catalogMapsRef.current.productBySku,
                      catalogMapsRef.current.brandById
                    );
                  }
                }
              } catch {
                // Ignore localStorage parse error
              }
            }
          }}
        />
      )}

      {/* --- SEKSI BELI LAGI YUK (REPEAT-PURCHASE ACTION SECTION) --- */}
      {recentOrders.length > 0 && (
        <section
          aria-label={t("home.buyAgainTitle")}
          className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-20 pt-1 sm:pt-1.5 pb-2 sm:pb-3 relative z-20"
        >
          {/* Section Header */}
          <div className="mb-3 sm:mb-3.5 flex items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-bold text-white leading-tight truncate">
              {t("home.buyAgainTitle")}
            </h2>
          </div>

          {/* Mobile: Horizontal Snap Rail (~1.3-1.5 cards visible) | Tablet: 2-Col Grid | Desktop: 4-Col Grid */}
          <div className="flex gap-3 overflow-x-auto pb-2 pt-0.5 custom-scrollbar snap-x snap-mandatory sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:pb-0 lg:grid-cols-4 lg:gap-3.5">
            {recentOrders.map((item) => {
              const targetHref = buildReorderHref(item);

              return (
                <div
                  key={item.groupKey}
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push(targetHref)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(targetHref);
                    }
                  }}
                  className="group shrink-0 w-58 min-[360px]:w-62.5 min-[410px]:w-68 sm:w-auto bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-3 sm:p-3.5 text-left transition-all duration-200 snap-start flex flex-col justify-between gap-2.5 shadow-md shadow-black/20 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer"
                >
                  {/* Top Row: Real Brand Artwork + Brand / Variant / Masked Destination */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-800 border border-slate-700/70 shrink-0 flex items-center justify-center shadow-inner">
                      {item.brandImageUrl ? (
                        <Image
                          src={item.brandImageUrl}
                          alt={item.brandName}
                          fill
                          sizes="48px"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <span className="text-xs font-bold text-blue-400 select-none">
                          {getBrandInitials(item.brandName)}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] sm:text-xs font-medium text-slate-400 truncate leading-tight">
                        {item.brandName}
                      </p>
                      <p
                        title={item.variantLabel}
                        className="text-[13px] sm:text-sm font-bold text-white truncate leading-snug mt-0.5 group-hover:text-blue-400 transition-colors"
                      >
                        {item.variantLabel}
                      </p>
                      <div className="mt-1 inline-flex items-center max-w-full bg-slate-800/90 border border-slate-700/70 rounded-md px-1.5 py-0.5">
                        <span className="text-[11px] font-mono text-slate-300 truncate leading-none">
                          {item.maskedDestination}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Current Active Catalog Price / Historical PLN Bill + Explicit Reorder CTA */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 leading-none mb-1 truncate">
                        {item.priceLabelType === "last_bill"
                          ? t("home.lastBill")
                          : t("home.currentPrice")}
                      </p>
                      <p className="text-[13px] sm:text-sm font-bold text-amber-400 leading-none truncate">
                        Rp {item.currentPrice.toLocaleString('id-ID')}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(targetHref);
                      }}
                      className="h-8 sm:h-9 px-3 sm:px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold text-[11px] sm:text-xs shrink-0 inline-flex items-center justify-center transition-all shadow-sm shadow-blue-600/25 cursor-pointer"
                    >
                      {t("home.buyAgainButton")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* --- SEKSI 1: POPULER SEKARANG (COMPACT APP-ICONS) --- */}
      <div>
        {catalogLoading ? (
          <ProductSection
            title={t("home.loadingCatalog")}
            category="popular"
            id="popular"
            brands={[]}
            isLoading={true}
            hasTopSection={recentOrders.length > 0}
          />
        ) : (
          popularSection && (
            <ProductSection
              key={popularSection.id}
              title={popularSection.titleKey ? t(popularSection.titleKey, popularSection.title) : popularSection.title}
              category={popularSection.category}
              id={popularSection.id}
              brands={popularSection.brands}
              isLoading={false}
              hasTopSection={recentOrders.length > 0}
            />
          )
        )}
      </div>

      {/* --- SEKSI KATALOG PRODUK LAINNYA --- */}
      {!catalogLoading &&
        otherSections.map((sec) => (
          <ProductSection
            key={sec.id}
            title={sec.titleKey ? t(sec.titleKey, sec.title) : sec.title}
            category={sec.category}
            id={sec.id}
            brands={sec.brands}
            isLoading={false}
          />
        ))}

      {/* Floating Support Button & Menu */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-40 flex flex-col items-end">
        {/* Menu Dropup */}
        {isSupportMenuOpen && (
          <div className="mb-2 w-36 md:w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-3 md:px-4 py-2.5 md:py-3 border-b border-slate-800 bg-slate-950/60">
              <span className="text-white font-bold text-[11px] md:text-sm">{t("home.contactCs")}</span>
            </div>
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => {
                  setIsSupportMenuOpen(false);
                  setIsModalOpen(true);
                }}
                className="px-3 md:px-4 py-2.5 md:py-3 text-left text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-[11px] md:text-sm border-b border-slate-800"
              >
                Email
              </button>
              <a
                href={getWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 md:px-4 py-2.5 md:py-3 text-left text-slate-300 hover:text-emerald-400 hover:bg-slate-800 transition-colors text-[11px] md:text-sm"
              >
                WhatsApp
              </a>
            </div>
          </div>
        )}

        {/* Tombol Utama Harmonized DaPay */}
        <button
          type="button"
          onClick={() => setIsSupportMenuOpen(!isSupportMenuOpen)}
          className="flex items-center gap-1.5 md:gap-2 bg-slate-900/95 hover:bg-slate-800 text-white border border-blue-500/40 px-3.5 py-2 md:px-4 md:py-2.5 rounded-xl shadow-xl shadow-black/40 transition-all duration-200 active:scale-95"
          aria-label={t("home.contactCs")}
        >
          <Headset className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
          <span className="font-bold text-[10px] md:text-xs tracking-wider">{t("home.contactCs").toUpperCase()}</span>
        </button>
      </div>

      {/* Panggil Modalnya di sini */}
      <ContactModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* --- TOAST NOTIFICATION REALTIME --- */}
      {toastMsg && (
        <div
          onClick={() => setToastMsg(null)}
          className="fixed top-20 right-4 md:right-8 z-9999 animate-in slide-in-from-top-5 fade-in duration-500 cursor-pointer"
        >
          {/* Animasi CSS Ringan Khusus Progress Bar */}
          <style>{`
            @keyframes shrink-bar {
              0% { width: 100%; }
              100% { width: 0%; }
            }
            .animate-shrink-bar {
              animation: shrink-bar 12s linear forwards;
            }
          `}</style>

          {/* Container Toast Dibikin Lebih Kecil (Kompak) dan overflow-hidden agar bar rapi di bawah */}
          <div className={`relative flex items-center gap-2.5 px-3.5 py-3 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border transition-transform active:scale-95 overflow-hidden ${
            toastMsg.type === 'success' ? 'bg-[#F0FDF4] border-[#A7F3D0]' : 'bg-[#FEF2F2] border-[#FECACA]'
          }`}>

            {/* Icon Diperkecil Sedikit */}
            {toastMsg.type === 'success' ? (
              <div className="bg-[#10B981] text-white rounded-full p-0.5 shrink-0"><CheckCircle2 size={14} /></div>
            ) : (
              <div className="bg-[#EF4444] text-white rounded-full p-0.5 shrink-0"><XCircle size={14} /></div>
            )}

            {/* Teks Lebih Padat */}
            <div className="flex flex-col min-w-0 pr-2">
              <span className={`text-[11px] font-black italic uppercase tracking-tight leading-none mb-0.5 ${toastMsg.type === 'success' ? 'text-[#047857]' : 'text-[#B91C1C]'}`}>
                {toastMsg.title}
              </span>
              <span className="text-[9px] font-bold text-slate-500 leading-tight">
                {toastMsg.desc}
              </span>
            </div>

            {/* --- Progress Bar Horizontal 12 Detik --- */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-black/5">
              <div className={`h-full animate-shrink-bar ${toastMsg.type === 'success' ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`}></div>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}
