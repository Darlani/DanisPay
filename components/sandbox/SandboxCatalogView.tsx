"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  FlaskConical,
  Smartphone,
  Zap,
  Wallet,
  Gamepad2,
  CheckCircle2,
  X,
  TrendingUp,
  RotateCcw,
  Loader2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Search,
  Tag,
  RefreshCw,
  Layers,
  Check,
  Plus,
  Minus,
  Trash2,
  Gem,
  Users,
  Box,
  Gift,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Info,
  Copy,
  CheckCheck,
  Receipt,
  SlidersHorizontal,
} from "lucide-react";
import { supabase } from "@/utils/supabaseClient";
import { fetchTesterSessionDeduplicated } from "@/components/sandbox/SandboxSessionControl";
import SandboxConversionModal from "@/components/sandbox/SandboxConversionModal";
import CounterCartReceiptModal from "@/components/sandbox/CounterCartReceiptModal";
import {
  CURATED_SANDBOX_PRODUCTS,
  calculateSimulatedMargin,
  getBrandImageUrl,
} from "@/lib/sandbox/curated-catalog";
import type {
  DynamicCatalogCategory,
  DynamicCatalogBrand,
  DynamicCatalogVariant,
  DynamicSandboxCatalogResponse,
} from "@/lib/sandbox/dynamic-catalog-service";

/**
 * Formats brand / product names to maximum 2 words (e.g. 'Mobile Legends', 'Free Fire', 'Token Listrik').
 */
function formatTwoWordsName(text?: string | null): string {
  if (!text) return "";
  const lower = text.toLowerCase().trim();
  if (lower === "pln" || lower.includes("listrik pln") || lower.includes("token listrik")) {
    return "Token Listrik";
  }
  const cleaned = text
    .replace(/:\s*Bang Bang/gi, "")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/Token Prabayar/gi, "")
    .trim();
  const words = cleaned.split(/\s+/);
  return words.slice(0, 2).join(" ");
}

/**
 * Resolves color themes for brand and category badges based on category key.
 */
function getCategoryBadgeTheme(categoryKey?: string) {
  switch (categoryKey?.toLowerCase()) {
    case "game":
      return {
        brand: "bg-sky-50 text-sky-800 border-sky-200/90",
        category: "bg-violet-50 text-violet-800 border-violet-200/90",
      };
    case "pln":
      return {
        brand: "bg-amber-50 text-amber-900 border-amber-300/90",
        category: "bg-yellow-50 text-yellow-900 border-yellow-200/90",
      };
    case "pulsa-data":
    case "pulsa":
    case "data":
      return {
        brand: "bg-indigo-50 text-indigo-900 border-indigo-200/90",
        category: "bg-blue-50 text-blue-800 border-blue-200/90",
      };
    case "ewallet":
    case "e-wallet":
      return {
        brand: "bg-emerald-50 text-emerald-900 border-emerald-200/90",
        category: "bg-teal-50 text-teal-800 border-teal-200/90",
      };
    default:
      return {
        brand: "bg-orange-50 text-orange-900 border-orange-200/90",
        category: "bg-rose-50 text-rose-800 border-rose-200/90",
      };
  }
}

/**
 * Removes redundant brand name prefixes from variant names (e.g. 'Mobile Legends - 3 Diamonds' -> '3 Diamonds').
 */
function formatCleanVariantName(productName: string, brandDisplayName?: string): string {
  if (!productName) return "";
  let clean = productName.trim();

  // 1. Check for standard separators
  if (clean.includes(" - ")) {
    const parts = clean.split(" - ");
    if (parts.length > 1 && parts[parts.length - 1].trim()) {
      clean = parts.slice(1).join(" - ").trim();
    }
  } else if (clean.includes(" : ")) {
    const parts = clean.split(" : ");
    if (parts.length > 1 && parts[parts.length - 1].trim()) {
      clean = parts.slice(1).join(" : ").trim();
    }
  } else if (clean.includes(" – ")) {
    const parts = clean.split(" – ");
    if (parts.length > 1 && parts[parts.length - 1].trim()) {
      clean = parts.slice(1).join(" – ").trim();
    }
  }

  // 2. Remove brand prefix if brandDisplayName is provided
  if (brandDisplayName) {
    const brandTrimmed = brandDisplayName.trim();
    const brandRegex = new RegExp(`^${brandTrimmed.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\s*[-:–]?\\s*`, "i");
    clean = clean.replace(brandRegex, "");

    const compactBrand = brandTrimmed.replace(/\s+/g, "");
    const compactRegex = new RegExp(`^${compactBrand}\\s*[-:–]?\\s*`, "i");
    clean = clean.replace(compactRegex, "");

    const firstWord = brandTrimmed.split(/\s+/)[0];
    if (firstWord && firstWord.length > 3) {
      const firstWordRegex = new RegExp(`^${firstWord}\\s*[-:–]?\\s*`, "i");
      clean = clean.replace(firstWordRegex, "");
    }
  }

  return clean.trim() || productName;
}

interface SandboxCatalogViewProps {
  isSidebarExpanded?: boolean;
  onMarginView?: () => void;
  isSimulationQuotaExhausted?: boolean;
}

interface SimulatedTransactionOutcome {
  success: boolean;
  status: string;
  orderId: string;
  productName: string;
  customerNo: string;
  amount: number;
  cashbackAwarded?: number;
  simulatedMemberType?: string;
  remainingBalance: number;
  remainingCoin?: number;
  sn: string | null;
  message: string;
}

interface BulkTransactionLine {
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  cashback: number;
}

interface BulkTransactionOutcome {
  success: boolean;
  status: string;
  orderId: string;
  totalItems: number;
  totalQuantity: number;
  amount: number;
  cashbackAwarded: number;
  remainingBalance: number;
  remainingCoin?: number;
  simulatedMemberType?: string;
  sn?: string | null;
  lines: BulkTransactionLine[];
  message: string;
}

/**
 * Phase 7: Sandbox Counter Cart ("Keranjang Konter") Line Item
 * Represents a single transaction intent in the multi-product reseller cart.
 */
export interface SandboxCounterCartItem {
  cartItemId: string;            // Unique identifier per line item
  productId: string;             // Unified product UUID
  sku: string;                   // Internal provider SKU
  productName: string;           // Formatted product / variant name
  brandKey: string;              // Brand slug (e.g. "telkomsel", "free-fire")
  brandDisplayName: string;      // Formatted brand title
  categoryKey: string;           // Category slug (e.g. "pulsa-data", "game", "pln")
  categoryDisplayName: string;   // Category label
  customerNo: string;            // Target destination (phone, meter, or game account ID)
  unitPrice: number;             // Modal price per unit (effectivePrice)
  sellingPrice: number;          // Reseller selling price for margin calculation
  cashbackPerUnit: number;       // Reward Koin Sandbox per unit
  quantity: number;              // Transaction unit count (1-100)
  isManualPrice?: boolean;       // Phase 8.7.4: Flag indicating whether user manually adjusted selling price
}

/**
 * Phase 8.7.4: Global Reseller Selling-Price Markup Rule
 */
export interface SandboxGlobalPricingRule {
  type: "nominal" | "percent";
  value: number; // e.g. 1000 for +Rp1.000 nominal or 10 for +10%
}

export const DEFAULT_GLOBAL_PRICING_RULE: SandboxGlobalPricingRule = {
  type: "nominal",
  value: 1000,
};

export const GLOBAL_PRICING_STORAGE_KEY = "dapay_sandbox_global_pricing_rule";

export function getStoredGlobalPricingRule(): SandboxGlobalPricingRule {
  if (typeof window === "undefined") return DEFAULT_GLOBAL_PRICING_RULE;
  try {
    const raw = localStorage.getItem(GLOBAL_PRICING_STORAGE_KEY);
    if (!raw) return DEFAULT_GLOBAL_PRICING_RULE;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      (parsed.type === "nominal" || parsed.type === "percent") &&
      typeof parsed.value === "number" &&
      parsed.value >= 0 &&
      Number.isFinite(parsed.value)
    ) {
      return {
        type: parsed.type,
        value: Math.round(parsed.value),
      };
    }
  } catch {
    // ignore storage read failure
  }
  return DEFAULT_GLOBAL_PRICING_RULE;
}

export function saveStoredGlobalPricingRule(rule: SandboxGlobalPricingRule): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GLOBAL_PRICING_STORAGE_KEY, JSON.stringify(rule));
  } catch {
    // ignore storage write failure
  }
}

export function calculateDefaultSellingPrice(
  purchasePrice: number,
  rule: SandboxGlobalPricingRule
): number {
  if (typeof purchasePrice !== "number" || purchasePrice <= 0) return 0;
  let markup = 0;
  if (rule.type === "nominal") {
    markup = Math.max(0, rule.value);
  } else if (rule.type === "percent") {
    markup = Math.round((purchasePrice * Math.max(0, rule.value)) / 100);
  }
  return purchasePrice + markup;
}

/**
 * Sub-Batch 7D: Struk Kasir & Counter Cart Receipt Data Contracts
 */
export interface CounterCartReceiptLine {
  lineId: string;
  productId: string;
  productName: string;
  customerNo: string;
  quantity: number;
  modalUnitPrice: number;
  modalLineTotal: number;
  sellingPrice: number;
  salesLineTotal: number;
  estimatedMargin: number;
  lineCashback: number;
  simulatedSn: string;
  simulatedSns?: string[];
}

export interface CounterCartReceiptData {
  orderId: string;
  status: string;
  totalModal: number;
  totalSimulatedSales: number;
  totalEstimatedMargin: number;
  totalCashbackCoin: number;
  lines: CounterCartReceiptLine[];
  resolvedAt?: string;
  simulatedMemberType?: string;
  remainingBalance?: number;
  remainingCoin?: number;
  message?: string;
}

/**
 * Generates formatted plain text for copying to WhatsApp.
 * Conforms strictly to Sub-Batch 7D specifications:
 * - Clear SIMULASI SANDBOX and Bukan transaksi riil disclaimers
 * - Zero internal SKU / provider metadata
 * - Clean itemized lines with simulated SN and estimated margin
 */
function generateWhatsAppReceiptText(receipt: CounterCartReceiptData): string {
  const dateObj = receipt.resolvedAt ? new Date(receipt.resolvedAt) : new Date();
  const dateStr = dateObj.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = dateObj.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const timeDisplay = `${dateStr} ${timeStr} WIB`;

  const marginSign = receipt.totalEstimatedMargin > 0 ? "+" : receipt.totalEstimatedMargin < 0 ? "-" : "";
  const formattedMargin = `${marginSign}Rp${Math.abs(receipt.totalEstimatedMargin).toLocaleString("id-ID")}`;

  const linesFormatted = receipt.lines
    .map((line, idx) => {
      const lineMarginSign = line.estimatedMargin > 0 ? "+" : line.estimatedMargin < 0 ? "-" : "";
      const lineFormattedMargin = `${lineMarginSign}Rp${Math.abs(line.estimatedMargin).toLocaleString("id-ID")}`;
      const qtyLine = line.quantity > 1 ? `\nQty: ${line.quantity}` : `\nQty: 1`;
      return `${idx + 1}. ${line.productName}
Tujuan: ${line.customerNo}${qtyLine}
SN Simulasi: ${line.simulatedSn}
Harga Jual: Rp${line.salesLineTotal.toLocaleString("id-ID")}
Perkiraan Margin: ${lineFormattedMargin}`;
    })
    .join("\n\n────────────────────\n\n");

  const cashbackSection =
    receipt.totalCashbackCoin > 0
      ? `\nReward Koin Sandbox: +${receipt.totalCashbackCoin.toLocaleString("id-ID")} Koin`
      : "";

  return `*STRUK SIMULASI DAPAY*

Status: BERHASIL
Simulasi Sandbox — Bukan transaksi riil

Invoice: #${receipt.orderId}
Waktu: ${timeDisplay}

────────────────────

${linesFormatted}

────────────────────

Total Harga Beli: Rp${receipt.totalModal.toLocaleString("id-ID")}
Total Harga Jual: Rp${receipt.totalSimulatedSales.toLocaleString("id-ID")}
Total Perkiraan Margin: ${formattedMargin}${cashbackSection}

Simulasi Sandbox DaPay — Bukan transaksi riil.`;
}

export default function SandboxCatalogView({
  onMarginView,
  isSimulationQuotaExhausted = false,
}: SandboxCatalogViewProps) {
  // Catalog Data & Fetch State
  const [catalogData, setCatalogData] = useState<DynamicSandboxCatalogResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Hierarchy Navigation State
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>("game");
  const [selectedBrandKey, setSelectedBrandKey] = useState<string | null>(null);
  const [variantSearch, setVariantSearch] = useState<string>("");

  // Active Product Modal State
  const [activeVariant, setActiveVariant] = useState<DynamicCatalogVariant | null>(null);
  const [activeBrandForModal, setActiveBrandForModal] = useState<DynamicCatalogBrand | null>(null);
  const [customSellingPrice, setCustomSellingPrice] = useState<number | null>(null);

  // Simulated Persona State (Regular vs Special)
  const [simulatedMemberType, setSimulatedMemberType] = useState<"regular" | "special">("regular");
  const [isSwitchingPersona, setIsSwitchingPersona] = useState<boolean>(false);

  // Simulated Transaction States
  const [targetNumber, setTargetNumber] = useState<string>("081234567890");
  const [isTransacting, setIsTransacting] = useState<boolean>(false);
  const [transactionResult, setTransactionResult] = useState<SimulatedTransactionOutcome | null>(null);
  const [transactionError, setTransactionError] = useState<string | null>(null);

  // Bulk Simulation Mode & Selection States (Phase 6 - Batch 4B)
  const [simulationMode, setSimulationMode] = useState<"single" | "bulk">("single");
  const [bulkQuantities, setBulkQuantities] = useState<Record<string, number>>({});
  const [isBulkReviewOpen, setIsBulkReviewOpen] = useState<boolean>(false);
  const [bulkCustomerNo, setBulkCustomerNo] = useState<string>("081234567890");
  const [isBulkTransacting, setIsBulkTransacting] = useState<boolean>(false);
  const [bulkResult, setBulkResult] = useState<BulkTransactionOutcome | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [virtualBalance, setVirtualBalance] = useState<number>(1_000_000);
  const [isViewAllVariants, setIsViewAllVariants] = useState<boolean>(false);

  // Phase 7: Global Counter Cart State ("Keranjang Konter")
  const [cartItems, setCartItems] = useState<SandboxCounterCartItem[]>([]);

  // Phase 8.7.4: Global Reseller Selling Price State
  const [globalPricingRule, setGlobalPricingRule] = useState<SandboxGlobalPricingRule>(DEFAULT_GLOBAL_PRICING_RULE);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState<boolean>(false);

  // Phase 8.7.5: Reset Selection & Cart Confirmation State
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);

  const manualOverrideCount = useMemo(
    () => cartItems.filter((it) => it.isManualPrice).length,
    [cartItems]
  );

  // Phase 8.7.4: Hydrate stored global pricing rule on client mount
  useEffect(() => {
    setGlobalPricingRule(getStoredGlobalPricingRule());
  }, []);

  // Sub-Batch 7D: Struk Kasir & Receipt State
  const [counterCartReceipt, setCounterCartReceipt] = useState<CounterCartReceiptData | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [isCopiedReceipt, setIsCopiedReceipt] = useState<boolean>(false);

  // Marketing Journey & Milestone States (Phase 4A & 5E)
  const [hasViewedMargin, setHasViewedMargin] = useState<boolean>(false);
  const [hasCompletedSimulation, setHasCompletedSimulation] = useState<boolean>(false);
  const [isConversionModalOpen, setIsConversionModalOpen] = useState<boolean>(false);
  const [isMilestoneDismissed, setIsMilestoneDismissed] = useState<boolean>(false);

  // Telemetry Activity Dispatcher (POST /api/tester/activity)
  const lastActivitySignalRef = useRef<Record<string, number>>({});

  const emitActivity = useCallback(
    async (
      action: "catalog_view" | "margin_view",
      meta?: { sku?: string; category?: string }
    ) => {
      const now = Date.now();
      const lastSent = lastActivitySignalRef.current[action] || 0;
      if (now - lastSent < 30_000) return;
      lastActivitySignalRef.current[action] = now;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        await fetch("/api/tester/activity", {
          method: "POST",
          headers,
          body: JSON.stringify({
            action,
            ...(meta?.category ? { category: meta.category } : {}),
            ...(meta?.sku ? { sku: meta.sku } : {}),
          }),
          credentials: "include",
        });
      } catch {
        // Telemetry failure must never affect catalog behavior or UI
      }
    },
    []
  );

  // Initial catalog mount telemetry
  const hasFiredCatalogMountRef = useRef(false);
  useEffect(() => {
    if (hasFiredCatalogMountRef.current) return;
    hasFiredCatalogMountRef.current = true;
    void emitActivity("catalog_view", {
      category: selectedCategoryKey,
    });
  }, [emitActivity, selectedCategoryKey]);

  // Fetch Dynamic Catalog from API
  const fetchCatalog = useCallback(async (isRefresh = false) => {
    setIsLoading(true);
    setCatalogError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const endpoint = isRefresh ? "/api/tester/catalog?refresh=true" : "/api/tester/catalog";
      let res = await fetch(endpoint, {
        method: "GET",
        headers,
        credentials: "include",
      });

      // If session cookie expired/missing, attempt auto-refresh of sandbox session once
      if (res.status === 403) {
        const checkErr = await res.clone().json().catch(() => null);
        if (checkErr?.code === "SANDBOX_SESSION_REQUIRED") {
          try {
            const sessionRes = await fetch("/api/tester/session", {
              method: "POST",
              headers,
              credentials: "include",
            });
            if (sessionRes.ok) {
              res = await fetch(endpoint, {
                method: "GET",
                headers,
                credentials: "include",
              });
            }
          } catch {
            // Ignore activation error, will fall through to error handling below
          }
        }
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        let errorMsg = "Gagal memuat katalog simulasi Sandbox.";
        if (res.status === 401 || errorData?.code === "AUTHENTICATION_REQUIRED") {
          errorMsg = "Sesi login diperlukan untuk mengakses katalog Sandbox. Silakan login kembali.";
        } else if (errorData?.code === "SANDBOX_SESSION_REQUIRED") {
          errorMsg = "Sesi Sandbox belum aktif atau telah berakhir. Silakan aktifkan sesi Sandbox Anda.";
        } else if (errorData?.code === "SANDBOX_ACCESS_DENIED") {
          errorMsg = "Akses Sandbox ditolak untuk akun manajemen / non-tester.";
        } else if (errorData?.error) {
          errorMsg = errorData.error;
        }

        console.warn(`[SandboxCatalogView] Failed to fetch catalog (${res.status}):`, errorData || res.statusText);
        setCatalogError(errorMsg);
        return;
      }

      const data: DynamicSandboxCatalogResponse = await res.json();
      if (!data.success || !Array.isArray(data.categories)) {
        console.warn("[SandboxCatalogView] Format respons katalog tidak sesuai:", data);
        setCatalogError("Format respons katalog tidak sesuai.");
        return;
      }

      setCatalogData(data);
      if (data.categories.length > 0) {
        setSelectedCategoryKey((prev) => {
          const exists = data.categories.some((c) => c.categoryKey === prev);
          return exists ? prev : data.categories[0].categoryKey;
        });
        setSelectedBrandKey(null);
      }
    } catch (err: unknown) {
      console.warn("[SandboxCatalogView] Network/client error:", err);
      setCatalogError("Gagal memuat katalog simulasi Sandbox. Silakan periksa koneksi internet Anda dan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCatalog();
  }, [fetchCatalog]);

  // Sync simulated member type and virtual balance from session
  const refreshPersona = useCallback(async () => {
    const session = await fetchTesterSessionDeduplicated(true);
    if (session?.simulatedMemberType) {
      setSimulatedMemberType(session.simulatedMemberType === "special" ? "special" : "regular");
    }
    if (typeof session?.sandboxBalance === "number") {
      setVirtualBalance(session.sandboxBalance);
    }
  }, []);

  useEffect(() => {
    void refreshPersona();
    const handleSync = () => {
      void refreshPersona();
    };
    window.addEventListener("sandboxSessionChanged", handleSync);
    return () => window.removeEventListener("sandboxSessionChanged", handleSync);
  }, [refreshPersona]);

  const handleTogglePersona = async (newType: "regular" | "special") => {
    if (simulatedMemberType === newType || isSwitchingPersona) return;
    setIsSwitchingPersona(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch("/api/tester/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ simulatedMemberType: newType }),
      });
      if (response.ok) {
        setSimulatedMemberType(newType);
        window.dispatchEvent(new Event("sandboxSessionChanged"));
      }
    } catch (err) {
      console.error("Failed to toggle persona:", err);
    } finally {
      setIsSwitchingPersona(false);
    }
  };

  const getCategoryIcon = (catKey: string) => {
    switch (catKey) {
      case "game":
        return <Gamepad2 size={15} className="shrink-0" />;
      case "pulsa-data":
      case "pulsa":
      case "data":
        return <Smartphone size={15} className="shrink-0" />;
      case "pln":
        return <Zap size={15} className="shrink-0" />;
      case "emoney":
        return <Wallet size={15} className="shrink-0" />;
      default:
        return <FlaskConical size={15} className="shrink-0" />;
    }
  };

  const handleSelectCategory = (catKey: string) => {
    setSelectedCategoryKey(catKey);
    setVariantSearch("");
    setSimulationMode("single");
    setBulkQuantities({});
    setSelectedBrandKey(null);
    void emitActivity("catalog_view", {
      category: catKey,
    });
  };

  // Collect all brands across categories with their category reference
  const allBrandsWithCategory = useMemo(() => {
    if (!catalogData) return [];
    const list: { brand: DynamicCatalogBrand; category: DynamicCatalogCategory }[] = [];
    catalogData.categories.forEach((cat) => {
      cat.brands.forEach((b) => {
        list.push({ brand: b, category: cat });
      });
    });
    return list;
  }, [catalogData]);

  // Find active brand across all brands if selectedBrandKey is set
  const activeBrandEntry = useMemo(() => {
    if (!allBrandsWithCategory.length || !selectedBrandKey) return null;
    return (
      allBrandsWithCategory.find((item) => item.brand.brandKey === selectedBrandKey) || null
    );
  }, [allBrandsWithCategory, selectedBrandKey]);

  const activeBrand = activeBrandEntry?.brand || null;
  const currentCategory = activeBrandEntry?.category || (catalogData?.categories.find((c) => c.categoryKey === selectedCategoryKey) || null);
  const activeBrands = currentCategory?.brands || [];

  // Filtered brands based on category selection
  const displayedBrands = useMemo(() => {
    if (!catalogData) return [];
    if (selectedCategoryKey === "all" || !selectedCategoryKey) {
      return allBrandsWithCategory;
    }
    return allBrandsWithCategory.filter((item) => item.category.categoryKey === selectedCategoryKey);
  }, [allBrandsWithCategory, selectedCategoryKey, catalogData]);

  // Carousel scroll ref and controls for horizontal brand cards row
  const brandScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollable = useCallback(() => {
    if (!brandScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = brandScrollRef.current;
    setCanScrollLeft(scrollLeft > 8);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8);
  }, []);

  useEffect(() => {
    const el = brandScrollRef.current;
    if (!el) return;
    // Reset scroll position on category switch
    el.scrollLeft = 0;
    // Check scrollability after render
    const t = setTimeout(() => {
      checkScrollable();
    }, 50);
    const handleResize = () => checkScrollable();
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", handleResize);
    };
  }, [displayedBrands, checkScrollable]);

  const handleScrollBrands = (direction: "left" | "right") => {
    if (!brandScrollRef.current) return;
    const scrollStep = 320;
    brandScrollRef.current.scrollBy({
      left: direction === "left" ? -scrollStep : scrollStep,
      behavior: "smooth",
    });
  };

  // Filter variants by search query and exclude check username / utility items
  const displayedVariants = activeBrand
    ? activeBrand.products.filter((p) => {
        const nameLower = p.name.toLowerCase();
        const skuLower = p.sku.toLowerCase();
        if (
          nameLower.includes("cek username") ||
          nameLower.includes("cek id") ||
          nameLower.includes("cek user") ||
          nameLower.includes("cek nickname") ||
          skuLower.includes("cek-username") ||
          skuLower.includes("cek_username") ||
          skuLower.includes("cek-id") ||
          skuLower.includes("cek_id")
        ) {
          return false;
        }
        if (!variantSearch.trim()) return true;
        const q = variantSearch.toLowerCase().trim();
        return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      })
    : [];

  // Bulk selection and quantity handlers (Phase 6 - Batch 4B)

  const handleIncrementBulkQuantity = (variantId: string, delta: number) => {
    setBulkQuantities((prev) => {
      const current = prev[variantId] || 1;
      const nextVal = Math.max(1, Math.min(100, current + delta));
      return {
        ...prev,
        [variantId]: nextVal,
      };
    });
  };

  const handleRemoveBulkItem = (variantId: string) => {
    setBulkQuantities((prev) => {
      const next = { ...prev };
      delete next[variantId];
      return next;
    });
  };

  // Bulk Computed Totals for Active Brand
  const selectedVariantEntries = activeBrand
    ? activeBrand.products.filter((p) => (bulkQuantities[p.id] ?? 0) > 0)
    : [];
  const bulkSelectedCount = selectedVariantEntries.length;
  const bulkTotalQuantity = selectedVariantEntries.reduce(
    (acc, p) => acc + (bulkQuantities[p.id] || 0),
    0
  );
  const bulkTotalCost = selectedVariantEntries.reduce(
    (acc, p) => acc + p.effectivePrice * (bulkQuantities[p.id] || 0),
    0
  );
  const bulkTotalCashback =
    simulatedMemberType === "special"
      ? selectedVariantEntries.reduce(
          (acc, p) => acc + (p.cashback || 0) * (bulkQuantities[p.id] || 0),
          0
        )
      : 0;

  // Helper for context-aware default customer/target number
  const resolveDefaultCustomerNo = (catKey?: string): string => {
    if (catKey === "pln") return "14023456789";
    if (catKey === "game") return "12345678 (2048)";
    return "081234567890";
  };

  // Phase 7: Counter Cart ("Keranjang Konter") Handlers
  const handleAddToCart = (
    variant: DynamicCatalogVariant,
    brand: DynamicCatalogBrand,
    cat: DynamicCatalogCategory | null
  ) => {
    const catKey = cat?.categoryKey || brand.categoryKey || "pulsa-data";
    const catName = cat?.displayName || "Pulsa & Data";
    const defaultSellingPrice = calculateDefaultSellingPrice(variant.effectivePrice, globalPricingRule);
    const newItem: SandboxCounterCartItem = {
      cartItemId: `cart_${variant.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productId: variant.id,
      sku: variant.sku,
      productName: variant.name,
      brandKey: brand.brandKey,
      brandDisplayName: brand.displayName,
      categoryKey: catKey,
      categoryDisplayName: catName,
      customerNo: resolveDefaultCustomerNo(catKey),
      unitPrice: variant.effectivePrice,
      sellingPrice: defaultSellingPrice,
      isManualPrice: false,
      cashbackPerUnit: variant.cashback || 0,
      quantity: 1,
    };

    setCartItems((prev) => {
      if (prev.length >= 30) {
        alert("Maksimal keranjang konter adalah 30 item transaksi.");
        return prev;
      }
      return [...prev, newItem];
    });
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    setCartItems((prev) => {
      const target = prev.find((item) => item.cartItemId === cartItemId);
      const remaining = prev.filter((item) => item.cartItemId !== cartItemId);
      if (target) {
        const hasOther = remaining.some((it) => it.productId === target.productId);
        if (!hasOther) {
          setBulkQuantities((bq) => {
            const next = { ...bq };
            delete next[target.productId];
            return next;
          });
        }
      }
      return remaining;
    });
  };

  const handleUpdateCartQuantity = (cartItemId: string, delta: number) => {
    setCartItems((prev) => {
      const target = prev.find((item) => item.cartItemId === cartItemId);
      if (!target) return prev;
      const nextQty = target.quantity + delta;
      if (nextQty <= 0) {
        const remaining = prev.filter((item) => item.cartItemId !== cartItemId);
        const hasOther = remaining.some((it) => it.productId === target.productId);
        if (!hasOther) {
          setBulkQuantities((bq) => {
            const next = { ...bq };
            delete next[target.productId];
            return next;
          });
        }
        return remaining;
      }
      return prev.map((item) => {
        if (item.cartItemId === cartItemId) {
          return { ...item, quantity: Math.min(100, nextQty) };
        }
        return item;
      });
    });
  };

  const handleUpdateCartCustomerNo = (cartItemId: string, customerNo: string) => {
    setCartItems((prev) =>
      prev.map((item) => (item.cartItemId === cartItemId ? { ...item, customerNo } : item))
    );
  };

  const handleUpdateCartSellingPrice = (cartItemId: string, sellingPrice: number) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.cartItemId === cartItemId
          ? { ...item, sellingPrice, isManualPrice: true }
          : item
      )
    );
  };

  // Phase 8.7.3: Tambah Tujuan Baru untuk Varian Produk yang Sama
  const handleAddDestinationForProduct = (sourceCartItemId: string) => {
    setCartItems((prev) => {
      if (prev.length >= 30) {
        alert("Maksimal keranjang konter adalah 30 item transaksi.");
        return prev;
      }
      const source = prev.find((it) => it.cartItemId === sourceCartItemId);
      if (!source) return prev;

      const newLine: SandboxCounterCartItem = {
        ...source,
        cartItemId: `cart_${source.productId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        customerNo: "", // Kosongkan agar pengguna memasukkan tujuan baru yang berbeda
        quantity: 1,    // Kuantitas awal independen 1
        sellingPrice: source.sellingPrice,
        isManualPrice: source.isManualPrice,
      };

      const sourceIndex = prev.findIndex((it) => it.cartItemId === sourceCartItemId);
      const next = [...prev];
      if (sourceIndex >= 0) {
        next.splice(sourceIndex + 1, 0, newLine);
      } else {
        next.push(newLine);
      }
      return next;
    });
  };

  // Phase 8.7.5: Authoritative Reset for All Counter/Massal Selections & Temporary Cart State
  const handleResetAllSelections = () => {
    setCartItems([]);
    setBulkQuantities({});
    setBulkCustomerNo("081234567890");
    setBulkError(null);
    setBulkResult(null);
    setTransactionError(null);
    setTransactionResult(null);
  };

  const handleClearCart = () => {
    handleResetAllSelections();
  };

  const handleConfirmReset = () => {
    handleResetAllSelections();
    setIsResetConfirmOpen(false);
  };

  // Phase 7 - Sub-Batch 7B: Check for duplicate product + destination combinations
  const duplicateLinesCount = useMemo(() => {
    const seen = new Set<string>();
    let duplicates = 0;
    for (const item of cartItems) {
      const trimmed = item.customerNo.trim().toLowerCase();
      if (!trimmed) continue;
      const key = `${item.productId}:::${trimmed}`;
      if (seen.has(key)) {
        duplicates++;
      } else {
        seen.add(key);
      }
    }
    return duplicates;
  }, [cartItems]);

  const isLineDuplicate = useCallback(
    (item: SandboxCounterCartItem) => {
      const trimmed = item.customerNo.trim().toLowerCase();
      if (!trimmed) return false;
      return (
        cartItems.filter(
          (ci) =>
            ci.productId === item.productId &&
            ci.customerNo.trim().toLowerCase() === trimmed
        ).length > 1
      );
    },
    [cartItems]
  );

  // Phase 7 - Sub-Batch 7B: Review Modal Keyboard ESC Listener
  useEffect(() => {
    if (!isBulkReviewOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isBulkTransacting) {
        setIsBulkReviewOpen(false);
        setBulkError(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isBulkReviewOpen, isBulkTransacting]);

  // Sub-Batch 7D: Struk Kasir Keyboard ESC Listener
  useEffect(() => {
    if (!isReceiptOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsReceiptOpen(false);
        setCounterCartReceipt(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isReceiptOpen]);

  // Sub-Batch 7D: Copy WhatsApp Receipt Handler
  const handleCopyWhatsAppReceipt = async () => {
    if (!counterCartReceipt) return;
    const text = generateWhatsAppReceiptText(counterCartReceipt);
    let copied = false;

    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch {
        copied = false;
      }
    }

    if (!copied && typeof document !== "undefined") {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        copied = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {
        copied = false;
      }
    }

    if (copied) {
      setIsCopiedReceipt(true);
      setTimeout(() => {
        setIsCopiedReceipt(false);
      }, 2500);
    }
  };

  // Massal Mode: Checklist / Unchecklist Toggle
  const handleToggleVariantInCart = (
    variant: DynamicCatalogVariant,
    brand: DynamicCatalogBrand,
    cat: DynamicCatalogCategory | null
  ) => {
    const isAlreadyInCart = cartItems.some((ci) => ci.productId === variant.id) || Boolean(bulkQuantities[variant.id]);
    if (isAlreadyInCart) {
      // Unchecklist: remove all items of this variant
      setCartItems((prev) => prev.filter((ci) => ci.productId !== variant.id));
      setBulkQuantities((prev) => {
        const next = { ...prev };
        delete next[variant.id];
        return next;
      });
    } else {
      // Checklist: add 1 item
      handleAddToCart(variant, brand, cat);
      setBulkQuantities((prev) => ({ ...prev, [variant.id]: 1 }));
    }
  };

  // Massal Mode: CTA - (Decrement / Remove)
  const handleDecrementVariantInCart = (variantId: string) => {
    setCartItems((prev) => {
      let lastIndex = -1;
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].productId === variantId) {
          lastIndex = i;
          break;
        }
      }
      if (lastIndex === -1) return prev;
      const target = prev[lastIndex];
      if (target.quantity > 1) {
        const updated = [...prev];
        updated[lastIndex] = { ...target, quantity: target.quantity - 1 };
        return updated;
      } else {
        return prev.filter((_, idx) => idx !== lastIndex);
      }
    });
    setBulkQuantities((prev) => {
      const current = prev[variantId] || 1;
      if (current <= 1) {
        const next = { ...prev };
        delete next[variantId];
        return next;
      }
      return { ...prev, [variantId]: current - 1 };
    });
  };

  // Massal Mode: CTA + (Increment quantity)
  const handleIncrementVariantInCart = (
    variant: DynamicCatalogVariant,
    brand: DynamicCatalogBrand,
    cat: DynamicCatalogCategory | null
  ) => {
    setCartItems((prev) => {
      const index = prev.findIndex((ci) => ci.productId === variant.id);
      if (index === -1) {
        const catKey = cat?.categoryKey || brand.categoryKey || "pulsa-data";
        const catName = cat?.displayName || "Pulsa & Data";
        const defaultSellingPrice = calculateDefaultSellingPrice(variant.effectivePrice, globalPricingRule);
        const newItem: SandboxCounterCartItem = {
          cartItemId: `cart_${variant.id}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          productId: variant.id,
          sku: variant.sku,
          productName: variant.name,
          brandKey: brand.brandKey,
          brandDisplayName: brand.displayName,
          categoryKey: catKey,
          categoryDisplayName: catName,
          customerNo: resolveDefaultCustomerNo(catKey),
          unitPrice: variant.effectivePrice,
          sellingPrice: defaultSellingPrice,
          isManualPrice: false,
          cashbackPerUnit: variant.cashback || 0,
          quantity: 1,
        };
        return [...prev, newItem];
      } else {
        const updated = [...prev];
        const target = updated[index];
        updated[index] = { ...target, quantity: Math.min(100, target.quantity + 1) };
        return updated;
      }
    });
    setBulkQuantities((prev) => ({
      ...prev,
      [variant.id]: Math.min(100, (prev[variant.id] || 0) + 1),
    }));
  };

  // Phase 7: Cart Computed Totals
  const cartLineCount = cartItems.length;
  const cartTotalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartTotalCost = cartItems.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const cartTotalSellingPrice = cartItems.reduce((acc, item) => acc + item.sellingPrice * item.quantity, 0);
  const cartTotalEstimatedMargin = cartTotalSellingPrice - cartTotalCost;
  const cartTotalCashback =
    simulatedMemberType === "special"
      ? cartItems.reduce((acc, item) => acc + (item.cashbackPerUnit || 0) * item.quantity, 0)
      : 0;

  // Phase 8.7.5: Active selections flag to enable/disable Reset action
  const hasActiveSelections = cartLineCount > 0 || bulkSelectedCount > 0;

  const handleOpenVariant = (
    variant: DynamicCatalogVariant,
    brand: DynamicCatalogBrand,
    cat: DynamicCatalogCategory | null
  ) => {
    setActiveVariant(variant);
    setActiveBrandForModal(brand);

    const defaultSellingPrice = calculateDefaultSellingPrice(variant.effectivePrice, globalPricingRule);
    setCustomSellingPrice(defaultSellingPrice);
    setTransactionResult(null);
    setTransactionError(null);
    setHasViewedMargin(true);

    if (cat?.categoryKey === "pln") {
      setTargetNumber("14023456789");
    } else if (cat?.categoryKey === "game") {
      setTargetNumber("12345678 (2048)");
    } else {
      setTargetNumber("081234567890");
    }

    onMarginView?.();
    void emitActivity("margin_view", {
      sku: variant.sku,
      category: cat?.categoryKey,
    });
  };

  const handleCloseModal = () => {
    setActiveVariant(null);
    setActiveBrandForModal(null);
    setTransactionResult(null);
    setTransactionError(null);
  };

  // Phase 8.7.4: Apply Global Selling-Price Rule to State, Storage, and Optional Cart/Modal Recalculation
  const handleApplyGlobalPricingRule = (
    newRule: SandboxGlobalPricingRule,
    applyToCart: boolean,
    overwriteManual: boolean
  ) => {
    setGlobalPricingRule(newRule);
    saveStoredGlobalPricingRule(newRule);

    if (applyToCart && cartItems.length > 0) {
      setCartItems((prev) =>
        prev.map((item) => {
          if (item.isManualPrice && !overwriteManual) {
            return item;
          }
          return {
            ...item,
            sellingPrice: calculateDefaultSellingPrice(item.unitPrice, newRule),
            isManualPrice: false,
          };
        })
      );
    }

    if (activeVariant) {
      setCustomSellingPrice(calculateDefaultSellingPrice(activeVariant.effectivePrice, newRule));
    }

    setIsPricingModalOpen(false);
  };

  // Margin Calculation for Active Product in Modal
  const isVariantPriceValid = activeVariant ? typeof activeVariant.effectivePrice === "number" && activeVariant.effectivePrice > 0 : false;
  const currentSellingPrice = activeVariant
    ? customSellingPrice ?? calculateDefaultSellingPrice(activeVariant.effectivePrice, globalPricingRule)
    : 0;

  const currentMargin = activeVariant && isVariantPriceValid
    ? calculateSimulatedMargin(activeVariant.effectivePrice, currentSellingPrice)
    : { marginAmount: 0, marginPercent: 0 };

  const handleExecuteSimulatedTransaction = async () => {
    if (!activeVariant || !isVariantPriceValid) return;
    if (!targetNumber.trim() || targetNumber.trim().length < 4) {
      setTransactionError("Nomor tujuan / ID pelanggan minimal 4 karakter.");
      return;
    }

    setIsTransacting(true);
    setTransactionError(null);

    // Bridge lookup to existing CURATED_SANDBOX_PRODUCTS for backwards compatibility
    const legacyMatch = CURATED_SANDBOX_PRODUCTS.find(
      (p) => p.canonicalProductId === activeVariant.id || p.canonicalSku === activeVariant.sku
    );
    const productIdToSend = legacyMatch ? legacyMatch.id : activeVariant.id;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch("/api/tester/simulate-transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          productId: productIdToSend,
          customerNo: targetNumber.trim(),
        }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || "Transaksi simulasi gagal.");
      }

      setTransactionResult(body as SimulatedTransactionOutcome);
      setHasCompletedSimulation(true);
      if (typeof (body as SimulatedTransactionOutcome).remainingBalance === "number") {
        setVirtualBalance((body as SimulatedTransactionOutcome).remainingBalance);
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("sandboxSessionChanged"));
      }
    } catch (err: unknown) {
      setTransactionError(err instanceof Error ? err.message : "Transaksi simulasi gagal diproses.");
    } finally {
      setIsTransacting(false);
    }
  };

  const handleExecuteBulkTransaction = async () => {
    const isCartActive = cartItems.length > 0;
    if (!isCartActive && selectedVariantEntries.length === 0) return;
    if (!isCartActive && (!bulkCustomerNo.trim() || bulkCustomerNo.trim().length < 4)) {
      setBulkError("Nomor tujuan / ID pelanggan minimal 4 karakter.");
      return;
    }

    setIsBulkTransacting(true);
    setBulkError(null);

    // Prepare strictly clean payload without forbidden fields (price, subtotal, etc.)
    const itemsPayload = isCartActive
      ? cartItems.map((item) => ({
          cartItemId: item.cartItemId,
          productId: item.productId,
          quantity: item.quantity,
          customerNo: item.customerNo.trim() || resolveDefaultCustomerNo(item.categoryKey),
          sellingPrice: item.sellingPrice,
        }))
      : selectedVariantEntries.map((p) => ({
          productId: p.id,
          quantity: bulkQuantities[p.id] || 1,
        }));

    const executionCustomerNo = isCartActive
      ? (cartItems[0]?.customerNo.trim() || "081234567890")
      : bulkCustomerNo.trim();

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const requestPayload = {
        items: itemsPayload,
        customerNo: executionCustomerNo,
      };

      let response = await fetch("/api/tester/simulate-bulk-transaction", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(requestPayload),
      });

      let data = await response.json().catch(() => ({}));

      // If server returns 401 AUTHENTICATION_REQUIRED, refresh session and retry exactly once
      if (response.status === 401 && data?.code === "AUTHENTICATION_REQUIRED") {
        try {
          const { data: refreshed, error: refErr } = await supabase.auth.refreshSession();
          if (!refErr && refreshed?.session?.access_token) {
            headers["Authorization"] = `Bearer ${refreshed.session.access_token}`;
            response = await fetch("/api/tester/simulate-bulk-transaction", {
              method: "POST",
              headers,
              credentials: "include",
              body: JSON.stringify(requestPayload),
            });
            data = await response.json().catch(() => ({}));
          }
        } catch {
          // If refresh fails, fall through to normal error handling below
        }
      }

      if (!response.ok) {
        let errMsg = data.error || "Simulasi massal gagal diproses.";
        if (data.code === "INSUFFICIENT_SANDBOX_BALANCE") {
          errMsg = "Saldo virtual Sandbox Anda tidak mencukupi untuk simulasi pembelian massal ini.";
        } else if (data.code === "MAX_SKU_EXCEEDED") {
          errMsg = "Maksimal pemilihan varian adalah 20 produk per simulasi.";
        } else if (data.code === "INVALID_QUANTITY") {
          errMsg = "Jumlah kuantitas per produk tidak valid (1-100 item).";
        } else if (data.code === "INVALID_TOTAL_QUANTITY") {
          errMsg = "Total kuantitas simulasi melebihi batas maksimal 500 item.";
        }
        throw new Error(errMsg);
      }

      if (typeof data.remainingBalance === "number") {
        setVirtualBalance(data.remainingBalance);
      }

      if (isCartActive) {
        const backendData = data.data;
        const mappedLines: CounterCartReceiptLine[] =
          Array.isArray(backendData?.lines) && backendData.lines.length > 0
            ? backendData.lines.map(
                (
                  l: {
                    lineId?: string;
                    productId: string;
                    productName?: string;
                    customerNo?: string;
                    quantity?: number;
                    modalUnitPrice?: number;
                    modalLineTotal?: number;
                    sellingPrice?: number;
                    salesLineTotal?: number;
                    estimatedMargin?: number;
                    lineCashback?: number;
                    simulatedSn?: string;
                    simulatedSns?: string[];
                  },
                  idx: number
                ) => {
                  const matchedCartItem =
                    cartItems.find((ci) => ci.cartItemId === l.lineId) ||
                    cartItems[idx] ||
                    cartItems.find((ci) => ci.productId === l.productId);
                  const validSns = Array.isArray(l.simulatedSns) && l.simulatedSns.length > 0
                    ? l.simulatedSns
                    : (l.simulatedSn ? [l.simulatedSn] : []);
                  return {
                    lineId: l.lineId || matchedCartItem?.cartItemId || `line_${idx}`,
                    productId: l.productId,
                    productName: l.productName || matchedCartItem?.productName || "Produk Digital",
                    customerNo: l.customerNo || matchedCartItem?.customerNo || "081234567890",
                    quantity: typeof l.quantity === "number" ? l.quantity : (matchedCartItem?.quantity || 1),
                    modalUnitPrice: typeof l.modalUnitPrice === "number" ? l.modalUnitPrice : (matchedCartItem?.unitPrice || 0),
                    modalLineTotal: typeof l.modalLineTotal === "number" ? l.modalLineTotal : ((matchedCartItem?.unitPrice || 0) * (matchedCartItem?.quantity || 1)),
                    sellingPrice: typeof l.sellingPrice === "number" ? l.sellingPrice : (matchedCartItem?.sellingPrice || 0),
                    salesLineTotal: typeof l.salesLineTotal === "number" ? l.salesLineTotal : ((matchedCartItem?.sellingPrice || 0) * (matchedCartItem?.quantity || 1)),
                    estimatedMargin: typeof l.estimatedMargin === "number" ? l.estimatedMargin : (((matchedCartItem?.sellingPrice || 0) - (matchedCartItem?.unitPrice || 0)) * (matchedCartItem?.quantity || 1)),
                    lineCashback: typeof l.lineCashback === "number" ? l.lineCashback : ((matchedCartItem?.cashbackPerUnit || 0) * (matchedCartItem?.quantity || 1)),
                    simulatedSn: l.simulatedSn || validSns[0] || "",
                    simulatedSns: validSns,
                  };
                }
              )
            : cartItems.map((item) => ({
                lineId: item.cartItemId,
                productId: item.productId,
                productName: item.productName,
                customerNo: item.customerNo,
                quantity: item.quantity,
                modalUnitPrice: item.unitPrice,
                modalLineTotal: item.unitPrice * item.quantity,
                sellingPrice: item.sellingPrice,
                salesLineTotal: item.sellingPrice * item.quantity,
                estimatedMargin: (item.sellingPrice - item.unitPrice) * item.quantity,
                lineCashback: (item.cashbackPerUnit || 0) * item.quantity,
                simulatedSn: "",
                simulatedSns: [],
              }));

        const receiptPayload: CounterCartReceiptData = {
          orderId: backendData?.orderId || data.orderId || `SIM-BULK-${Date.now()}`,
          status: backendData?.status || data.status || "Berhasil",
          totalModal:
            typeof backendData?.totalModal === "number"
              ? backendData.totalModal
              : (data.amount || cartTotalCost),
          totalSimulatedSales:
            typeof backendData?.totalSimulatedSales === "number"
              ? backendData.totalSimulatedSales
              : cartTotalSellingPrice,
          totalEstimatedMargin:
            typeof backendData?.totalEstimatedMargin === "number"
              ? backendData.totalEstimatedMargin
              : cartTotalEstimatedMargin,
          totalCashbackCoin:
            typeof backendData?.totalCashbackCoin === "number"
              ? backendData.totalCashbackCoin
              : (data.cashbackAwarded || 0),
          lines: mappedLines,
          resolvedAt: new Date().toISOString(),
          simulatedMemberType,
          remainingBalance: typeof data.remainingBalance === "number" ? data.remainingBalance : undefined,
          remainingCoin: typeof data.remainingCoin === "number" ? data.remainingCoin : undefined,
          message: data.message,
        };

        setCounterCartReceipt(receiptPayload);
        setIsReceiptOpen(true);
        setIsBulkReviewOpen(false);
        setCartItems([]);
        setBulkQuantities({});
      } else {
        setBulkResult(data as BulkTransactionOutcome);
        setBulkQuantities({});
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("sandboxSessionChanged"));
      }
    } catch (err: unknown) {
      setBulkError(err instanceof Error ? err.message : "Simulasi massal gagal diproses.");
    } finally {
      setIsBulkTransacting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
      {/* 1. Header Banner */}
      <div className="rounded-2xl border border-amber-300/80 bg-linear-to-r from-amber-500/10 via-orange-500/5 to-amber-500/10 p-4 sm:p-5 shadow-2xs backdrop-blur-md">
        <div className="flex items-start justify-between gap-2.5 sm:gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-900 border border-amber-300">
                <FlaskConical size={11} className="text-amber-700" />
                SANDBOX • SIMULASI
              </span>
              <span className="hidden sm:inline text-[10px] font-bold text-amber-800/80 uppercase tracking-wide">
                Katalog Dinamis & Simulasi
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Katalog Produk & Simulasi Transaksi Digital
            </h2>
            <p className="hidden md:block text-xs text-slate-600 max-w-2xl leading-relaxed">
              Jelajahi produk retail digital DaPay secara dinamis. Simulasikan transaksi menggunakan saldo virtual sandbox yang 100% terisolasi dari sistem LIVE.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
            {/* Phase 8.7.4: Pengaturan Harga Jual Global Button */}
            <button
              type="button"
              onClick={() => setIsPricingModalOpen(true)}
              title="Atur margin default harga jual reseller"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-white/90 border border-amber-200/90 text-xs font-semibold text-amber-900 shadow-2xs hover:bg-white transition cursor-pointer"
            >
              <SlidersHorizontal size={13} className="text-amber-700 shrink-0" />
              <span className="hidden sm:inline">Harga Jual</span>
              <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded-md border border-amber-200 shrink-0">
                {globalPricingRule.type === "nominal"
                  ? `+Rp${globalPricingRule.value.toLocaleString("id-ID")}`
                  : `+${globalPricingRule.value}%`}
              </span>
            </button>

            {/* Phase 7: Counter Cart Badge & Quick Trigger */}
            <button
              type="button"
              onClick={() => {
                setIsBulkReviewOpen(true);
                setBulkError(null);
                setBulkResult(null);
              }}
              title="Buka Keranjang"
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 rounded-xl border text-xs font-bold transition cursor-pointer shadow-2xs ${
                cartLineCount > 0
                  ? "bg-slate-900 border-slate-900 text-white hover:bg-slate-800"
                  : "bg-white/90 border-amber-200/90 text-amber-950 hover:bg-white"
              }`}
            >
              <ShoppingCart
                size={14}
                className={cartLineCount > 0 ? "text-amber-400" : "text-amber-700"}
              />
              <span>Keranjang</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                  cartLineCount > 0
                    ? "bg-amber-500 text-slate-950"
                    : "bg-amber-100 text-amber-900 border border-amber-200"
                }`}
              >
                {cartLineCount}
              </span>
              {cartLineCount > 0 && (
                <span className="hidden md:inline text-[11px] font-mono font-bold text-amber-300">
                  (Rp {cartTotalCost.toLocaleString("id-ID")})
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Description */}
        <p className="md:hidden mt-2.5 text-xs text-slate-600 leading-relaxed">
          Jelajahi produk retail digital DaPay secara dinamis. Simulasikan transaksi menggunakan saldo virtual sandbox yang 100% terisolasi dari sistem LIVE.
        </p>

        {/* Persona Simulation Switcher */}
        <div className="mt-3.5 pt-3 border-t border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-amber-950">Mode Simulasi Akun:</span>
            <div className="inline-flex items-center rounded-xl bg-white/90 p-1 border border-amber-200/90 shadow-2xs">
              <button
                type="button"
                onClick={() => void handleTogglePersona("regular")}
                disabled={isSwitchingPersona}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  simulatedMemberType === "regular"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Simulasi Reguler
              </button>
              <button
                type="button"
                onClick={() => void handleTogglePersona("special")}
                disabled={isSwitchingPersona}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  simulatedMemberType === "special"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-amber-900 hover:text-amber-950"
                }`}
              >
                Simulasi Special
              </button>
            </div>
          </div>
          <div className="flex flex-col sm:items-end gap-0.5 text-[11px] text-amber-900/90 font-medium">
            {simulatedMemberType === "special" ? (
              <span className="inline-flex items-center gap-1.5 text-amber-950 font-semibold">
                <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-black text-amber-900 border border-amber-300">
                  SPECIAL
                </span>
                Promo + Referral ✅ • <strong>Cashback Koin Sandbox ✅</strong>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-slate-700">
                <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-black text-slate-800 border border-slate-300">
                  REGULER
                </span>
                Promo + Referral ✅ • <span>Tanpa Cashback ❌</span>
              </span>
            )}
            <span className="text-[10px] text-amber-800/75 italic">
              *Hanya berlaku di Sandbox dan tidak mengubah tipe akun LIVE Anda.
            </span>
          </div>
        </div>
      </div>

      {/* 2. LEVEL 1: Category Selection Tabs */}
      {catalogData && catalogData.categories.length > 0 && (
        <div
          className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto px-1.5 py-1 -mx-1.5 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <button
            type="button"
            onClick={() => handleSelectCategory("all")}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              selectedCategoryKey === "all"
                ? "bg-slate-900 text-white shadow-sm ring-1 ring-slate-900"
                : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80"
            }`}
          >
            <FlaskConical size={15} className="shrink-0" />
            <span>Semua Produk</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                selectedCategoryKey === "all" ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-500"
              }`}
            >
              {allBrandsWithCategory.length}
            </span>
          </button>
          {catalogData.categories.map((cat) => {
            const isSelected = selectedCategoryKey === cat.categoryKey;
            return (
              <button
                key={cat.categoryKey}
                type="button"
                onClick={() => handleSelectCategory(cat.categoryKey)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-sm ring-1 ring-slate-900"
                    : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80"
                }`}
              >
                {getCategoryIcon(cat.categoryKey)}
                <span>{cat.displayName}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {cat.brands.length}
                  </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Milestone Banner: Displayed when user completed simulation & viewed margin */}
      {hasCompletedSimulation && hasViewedMargin && !isMilestoneDismissed && (
        <div className="relative rounded-2xl border border-emerald-300 bg-linear-to-r from-emerald-50 via-teal-50/70 to-emerald-50 p-4 shadow-2xs animate-in fade-in slide-in-from-top-2 duration-200">
          <button
            type="button"
            onClick={() => setIsMilestoneDismissed(true)}
            className="absolute top-3 right-3 rounded-full p-1 text-slate-400 hover:bg-emerald-200/50 hover:text-slate-700 transition cursor-pointer"
            aria-label="Tutup pemberitahuan simulasi selesai"
          >
            <X size={15} />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-7 sm:pr-0">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300">
                    Simulasi Selesai
                  </span>
                  <span className="text-xs font-black text-slate-900">
                    Eksplorasi Transaksi & Margin Selesai!
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 max-w-xl leading-relaxed">
                  Anda telah berhasil menguji alur transaksi digital dan margin retail di Sandbox. Siap bertransaksi riil dan meraih keuntungan bisnis nyata?
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsConversionModalOpen(true)}
              className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <span>Beralih ke Member LIVE</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl bg-white border border-slate-200/80 text-center space-y-3 shadow-2xs">
          <Loader2 size={32} className="animate-spin text-amber-600" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800">Memuat Katalog Dinamis Sandbox...</p>
            <p className="text-xs text-slate-500">Mengambil data produk terkini langsung dari sistem DaPay.</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {!isLoading && catalogError && (
        <div className="flex flex-col items-center justify-center py-12 px-4 rounded-2xl bg-rose-50/70 border border-rose-200 text-center space-y-3">
          <AlertCircle size={28} className="text-rose-600" />
          <div className="space-y-1 max-w-md">
            <p className="text-sm font-bold text-rose-900">{catalogError}</p>
            <p className="text-xs text-rose-700">Pastikan sesi Sandbox Anda aktif dan coba muat ulang.</p>
          </div>
          <button
            type="button"
            onClick={() => void fetchCatalog(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <RefreshCw size={13} />
            <span>Coba Lagi</span>
          </button>
        </div>
      )}

      {/* Empty State: No Categories */}
      {!isLoading && !catalogError && (!catalogData || catalogData.categories.length === 0) && (
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl bg-white border border-slate-200/80 text-center space-y-2">
          <FlaskConical size={32} className="text-slate-400" />
          <p className="text-sm font-bold text-slate-800">Katalog simulasi sedang tidak tersedia.</p>
          <p className="text-xs text-slate-500">Silakan periksa kembali nanti atau hubungi bantuan.</p>
        </div>
      )}

      {/* Empty State: Category Has No Brands */}
      {!isLoading && !catalogError && currentCategory && activeBrands.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl bg-white border border-slate-200/80 text-center space-y-2">
          <FlaskConical size={32} className="text-slate-400" />
          <p className="text-sm font-bold text-slate-800">Belum ada brand yang tersedia di kategori ini.</p>
          <p className="text-xs text-slate-500">Pilih kategori lain untuk melanjutkan eksplorasi produk.</p>
        </div>
      )}

      {/* 3. BRAND & VARIANT SELECTION (Mockup Aligned) */}
      {!isLoading && !catalogError && catalogData && (
        <div className="space-y-4">
          {/* Brand Cards Row (Taking images from public/ folder) with Transparent Nav Buttons */}
          <div className="relative group/carousel">
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => handleScrollBrands("left")}
                className="absolute left-0 sm:-left-2 top-12.5 sm:top-15 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/85 hover:bg-white text-slate-700 hover:text-amber-900 shadow-md shadow-black/10 hover:shadow-xl border border-white/90 hover:border-amber-300 backdrop-blur-md transition-all duration-200 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 group/arrow"
                aria-label="Geser brand ke kiri"
              >
                <ChevronLeft size={20} strokeWidth={2.5} className="transition-transform group-hover/arrow:-translate-x-0.5" />
              </button>
            )}

            <div
              ref={brandScrollRef}
              onScroll={checkScrollable}
              className="flex items-stretch gap-3 overflow-x-auto px-2.5 py-2 pb-3 -mx-2.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {displayedBrands.map((item) => {
                const isBrandSelected = activeBrand?.brandKey === item.brand.brandKey;
                const brandImg = getBrandImageUrl(item.brand.brandKey);
                const isLogo =
                  brandImg.startsWith("/payment/") || item.category.categoryKey === "emoney";

                return (
                  <button
                    key={item.brand.brandKey}
                    type="button"
                    onClick={() => {
                      setSelectedBrandKey((prev) => (prev === item.brand.brandKey ? null : item.brand.brandKey));
                      setSelectedCategoryKey(item.category.categoryKey);
                      setVariantSearch("");
                      setIsViewAllVariants(false);
                    }}
                    className={`group flex flex-col items-center justify-between rounded-2xl p-2.5 sm:p-3 transition-all cursor-pointer shrink-0 w-24 sm:w-28 text-center ${
                      isBrandSelected
                        ? "bg-white ring-2 ring-amber-500 border border-amber-500 shadow-md shadow-amber-500/15"
                        : "bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-2xs"
                    }`}
                  >
                    <div
                      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden flex items-center justify-center border relative ${
                        isLogo
                          ? "bg-white border-slate-200/90 shadow-2xs"
                          : "bg-slate-100 border-slate-100"
                      }`}
                    >
                      <img
                        src={brandImg}
                        alt={item.brand.displayName}
                        className={`w-full h-full transition-transform duration-200 group-hover:scale-105 ${
                          isLogo ? "object-contain p-2.5 sm:p-3" : "object-cover"
                        }`}
                      />
                      {isBrandSelected && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs z-10">
                          <Check size={10} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <span
                      className={`mt-2 text-[11px] sm:text-xs font-bold leading-tight line-clamp-1 ${
                        isBrandSelected ? "text-slate-950 font-black" : "text-slate-700"
                      }`}
                    >
                      {formatTwoWordsName(item.brand.displayName)}
                    </span>
                  </button>
                );
              })}
            </div>

            {canScrollRight && (
              <button
                type="button"
                onClick={() => handleScrollBrands("right")}
                className="absolute right-0 sm:-right-2 top-12.5 sm:top-15 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/85 hover:bg-white text-slate-700 hover:text-amber-900 shadow-md shadow-black/10 hover:shadow-xl border border-white/90 hover:border-amber-300 backdrop-blur-md transition-all duration-200 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 group/arrow"
                aria-label="Geser brand ke kanan"
              >
                <ChevronRight size={20} strokeWidth={2.5} className="transition-transform group-hover/arrow:translate-x-0.5" />
              </button>
            )}
          </div>

          {/* Dropdown / Popover Item Card for Active Brand (Only rendered when a brand is clicked) */}
          {activeBrand && (
            <div className="pt-1 flex flex-col lg:flex-row items-start gap-4 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="w-full lg:w-105 xl:w-115 shrink-0 rounded-2xl border border-slate-200/90 bg-white shadow-md p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                      {formatTwoWordsName(activeBrand.displayName)}
                    </h4>
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                      {displayedVariants.length} Varian
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Phase 8.7.5: Reset Counter/Massal Selections Button (Hanya tampil saat ada pilihan aktif, di samping Lihat Semua) */}
                    {hasActiveSelections && (
                      <button
                        type="button"
                        onClick={() => setIsResetConfirmOpen(true)}
                        disabled={!hasActiveSelections}
                        title={
                          hasActiveSelections
                            ? "Kosongkan semua pilihan dan keranjang simulasi"
                            : "Keranjang dan pilihan produk masih kosong"
                        }
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-rose-200 bg-rose-50/90 text-rose-700 hover:bg-rose-100 hover:border-rose-300 text-[10px] font-bold transition shadow-2xs cursor-pointer"
                      >
                        <RotateCcw size={10} className="text-rose-600" />
                        <span>Reset</span>
                      </button>
                    )}

                    {displayedVariants.length > 5 && (
                      <button
                        type="button"
                        onClick={() => setIsViewAllVariants(!isViewAllVariants)}
                        className="text-[11px] font-bold text-slate-500 hover:text-amber-800 flex items-center gap-1 transition cursor-pointer"
                      >
                        <span>{isViewAllVariants ? "Tampilkan Sedikit" : "Lihat Semua"}</span>
                        <ArrowRight size={12} className={isViewAllVariants ? "rotate-90 transition-transform" : ""} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedBrandKey(null)}
                      className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
                      title="Tutup dropdown"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Simulation Mode Toggle & Search */}
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/80 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSimulationMode("single")}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                        simulationMode === "single" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"
                      }`}
                    >
                      <FlaskConical size={12} className={simulationMode === "single" ? "text-amber-600" : "text-slate-400"} />
                      <span>Satuan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSimulationMode("bulk")}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                        simulationMode === "bulk" ? "bg-slate-900 text-white shadow-xs" : "text-slate-500"
                      }`}
                    >
                      <Layers size={12} className={simulationMode === "bulk" ? "text-amber-400" : "text-slate-400"} />
                      <span>Massal</span>
                      {cartLineCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-amber-500 text-slate-950 font-black">
                          {cartLineCount}
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="relative flex-1 max-w-42.5">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={variantSearch}
                      onChange={(e) => setVariantSearch(e.target.value)}
                      placeholder="Cari..."
                      className="w-full pl-7 pr-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-slate-50/70 text-slate-900 focus:bg-white focus:outline-hidden"
                    />
                    {variantSearch && (
                      <button
                        type="button"
                        onClick={() => setVariantSearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                </div>

                {/* List of Variant Items (Fixed 5-variant viewport height with vertical scrolling on Lihat Semua) */}
                <div className="space-y-1.5 max-h-73.75 overflow-y-auto pr-1 scrollbar-thin">
                  {displayedVariants.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Tidak ada varian produk yang ditemukan.
                    </div>
                  ) : (
                    (isViewAllVariants ? displayedVariants : displayedVariants.slice(0, 5)).map((variant) => {
                      const isPriceValid = typeof variant.effectivePrice === "number" && variant.effectivePrice > 0;
                      const isBulkMode = simulationMode === "bulk";
                      const itemsOfThisProductInCart = cartItems.filter((ci) => ci.productId === variant.id);
                      const qtyInCart = itemsOfThisProductInCart.reduce((sum, ci) => sum + ci.quantity, 0);
                      const isSelectedInLegacyBulk = Boolean(bulkQuantities[variant.id]);
                      const isSelectedInCart = qtyInCart > 0 || isSelectedInLegacyBulk;
                      const isCurrentInModal = activeVariant?.id === variant.id;
                      const isGame = activeBrand.categoryKey === "game";

                      return (
                        <div
                          key={variant.id}
                          onClick={
                            isBulkMode
                              ? undefined
                              : () => {
                                  if (!isPriceValid) return;
                                  handleOpenVariant(variant, activeBrand, currentCategory);
                                }
                          }
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                            isBulkMode ? "cursor-default" : "cursor-pointer"
                          } ${
                            isCurrentInModal
                              ? "border-amber-400 bg-amber-50/70 ring-1 ring-amber-300"
                              : isBulkMode && isSelectedInCart
                              ? "border-amber-500 bg-amber-50/30 ring-1 ring-amber-400/40"
                              : isBulkMode
                              ? "border-slate-100 bg-white"
                              : "border-slate-100 bg-white hover:border-amber-300/80 hover:bg-amber-50/30"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {isBulkMode ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isPriceValid) return;
                                  handleToggleVariantInCart(variant, activeBrand, currentCategory);
                                }}
                                title={isSelectedInCart ? "Batal pilih (hapus dari keranjang)" : "Centang untuk pilih"}
                                className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition cursor-pointer ${
                                  isSelectedInCart
                                    ? "bg-amber-600 border-amber-600 text-white shadow-2xs hover:bg-amber-700"
                                    : "border-slate-300 bg-white hover:border-amber-400"
                                }`}
                              >
                                {isSelectedInCart && (
                                  <Check size={12} strokeWidth={3} />
                                )}
                              </button>
                            ) : (
                              <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-500 shadow-2xs shrink-0">
                                {isGame ? (
                                  <Gem size={17} className="fill-sky-400/20 text-sky-500" />
                                ) : activeBrand.categoryKey === "pln" ? (
                                  <Zap size={17} className="text-amber-500 fill-amber-400/20" />
                                ) : (
                                  <Smartphone size={17} className="text-indigo-500" />
                                )}
                              </div>
                            )}

                            <div className="min-w-0 text-left">
                              <p className="text-xs font-black text-slate-900 truncate">
                                {variant.name}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 pl-2">
                            <div className="text-right">
                              <span className="text-xs sm:text-sm font-black text-slate-900 font-mono block">
                                Rp {variant.effectivePrice.toLocaleString("id-ID")}
                              </span>
                            </div>

                            {/* Stepper with - and + in Massal mode */}
                            {isBulkMode && (
                              <div className="flex items-center gap-1">
                                {isSelectedInCart && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDecrementVariantInCart(variant.id);
                                      }}
                                      title="Kurangi kuantitas"
                                      className="w-6 h-6 rounded-md bg-slate-100 hover:bg-rose-100 hover:text-rose-700 flex items-center justify-center text-slate-700 transition cursor-pointer border border-slate-200"
                                    >
                                      <Minus size={11} strokeWidth={2.5} />
                                    </button>
                                    <span className="w-5 text-center font-mono font-bold text-xs text-slate-900">
                                      {qtyInCart}
                                    </span>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isPriceValid) return;
                                    handleIncrementVariantInCart(variant, activeBrand, currentCategory);
                                  }}
                                  title="Tambah kuantitas"
                                  className={`w-6 h-6 rounded-md border flex items-center justify-center transition cursor-pointer ${
                                    isSelectedInCart
                                      ? "bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200"
                                      : "bg-slate-100/80 border-slate-200/80 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                                  }`}
                                >
                                  <Plus size={11} strokeWidth={2.5} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Integrated Keranjang Konter Mode Control Footer (Inside Active Brand Card) */}
                {simulationMode === "bulk" && (
                  <div className="pt-3 border-t border-slate-100 space-y-2.5">
                    {cartLineCount === 0 && bulkSelectedCount === 0 ? (
                      <div className="py-2 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200">
                        <p className="text-[11px] text-slate-500 font-medium">
                          Pilih produk di atas untuk memasukkan ke <strong>Keranjang</strong>.
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Mendukung transaksi berbagai brand dan nomor tujuan berbeda dalam satu checkout.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 animate-in fade-in duration-150">
                        <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 text-[10px] font-mono font-black">
                                {cartLineCount > 0 ? `${cartLineCount} Transaksi` : `${bulkSelectedCount} Produk`} • {cartLineCount > 0 ? cartTotalQuantity : bulkTotalQuantity} Item
                              </span>
                              {simulatedMemberType === "special" && (cartTotalCashback > 0 || bulkTotalCashback > 0) && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-300 font-mono">
                                  <Sparkles size={10} className="text-violet-400" />
                                  +{(cartTotalCashback || bulkTotalCashback).toLocaleString("id-ID")} Koin
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                handleClearCart();
                                setBulkQuantities({});
                              }}
                              className="text-[10px] font-bold text-slate-400 hover:text-rose-400 transition cursor-pointer"
                            >
                              Reset
                            </button>
                          </div>

                          <div className="flex items-baseline justify-between pt-1 border-t border-slate-800">
                            <span className="text-[11px] text-slate-400">Total Harga Beli:</span>
                            <span className="text-xs sm:text-sm font-black text-amber-400 font-mono">
                              Rp {(cartLineCount > 0 ? cartTotalCost : bulkTotalCost).toLocaleString("id-ID")}
                            </span>
                          </div>

                          {cartLineCount > 0 && (
                            <div className="flex items-baseline justify-between pt-1 border-t border-slate-800/60 text-[11px]">
                              <span className="text-slate-400">Perkiraan Margin:</span>
                              <span className="font-mono font-bold text-emerald-400">
                                +Rp {cartTotalEstimatedMargin.toLocaleString("id-ID")}
                              </span>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsBulkReviewOpen(true);
                            setBulkError(null);
                            setBulkResult(null);
                            if (currentCategory?.categoryKey === "pln") {
                              setBulkCustomerNo("14023456789");
                            } else if (currentCategory?.categoryKey === "game") {
                              setBulkCustomerNo("12345678 (2048)");
                            } else {
                              setBulkCustomerNo("081234567890");
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 text-xs font-black uppercase tracking-wider shadow-md shadow-amber-500/20 transition cursor-pointer active:scale-[0.99]"
                        >
                          <ShoppingCart size={14} />
                          <span>Tinjau Keranjang ({cartLineCount > 0 ? cartLineCount : bulkSelectedCount} Item)</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Active Brand Educational Tip if present */}
              {activeBrand?.educationalTip && (
                <div className="flex-1 rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4 sm:p-5 flex items-start gap-3 shadow-2xs">
                  <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-bold text-amber-950">
                      Wawasan Bisnis {activeBrand.displayName}:
                    </h5>
                    <p className="text-xs leading-relaxed text-amber-900/90">
                      {activeBrand.educationalTip}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. CENTERED MODAL FOR SINGLE SIMULATION ("POPUP DI TENGAH") */}
      {activeVariant && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isTransacting) handleCloseModal();
          }}
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-100 text-slate-900 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto space-y-4">
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={isTransacting}
              className="absolute right-3.5 top-3.5 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition disabled:opacity-50 cursor-pointer"
              aria-label="Tutup dialog transaksi"
            >
              <X size={18} />
            </button>

            {/* Modal Top Header Badge */}
            <div className="mb-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-900 border border-amber-300">
                <FlaskConical size={12} className="text-amber-600" />
                DEMO • SIMULASI SATUAN
              </span>
            </div>

            {/* Product Identity */}
            <div className="flex items-center gap-3.5">
                {(() => {
                  const drawerImg = getBrandImageUrl(activeBrandForModal?.brandKey || activeBrand?.brandKey);
                  const isDrawerLogo =
                    drawerImg.startsWith("/payment/") ||
                    activeBrandForModal?.categoryKey === "emoney" ||
                    activeBrand?.categoryKey === "emoney";

                  return (
                    <div
                      className={`w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center border shadow-2xs shrink-0 ${
                        isDrawerLogo ? "bg-white border-slate-200/90" : "bg-slate-100 border-slate-200"
                      }`}
                    >
                      <img
                        src={drawerImg}
                        alt={activeVariant.name}
                        className={`w-full h-full ${
                          isDrawerLogo ? "object-contain p-2" : "object-cover"
                        }`}
                      />
                    </div>
                  );
                })()}
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug truncate">
                    {activeVariant.name}
                  </h3>
                </div>
              </div>

              {/* Transaction Result Receipt or Checkout Form */}
              {transactionResult ? (
                <div className="my-2 space-y-3 animate-in zoom-in-95 duration-150">
                  <div
                    className={`p-4 rounded-2xl border text-center ${
                      transactionResult.status === "Berhasil"
                        ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                        : "bg-rose-50/80 border-rose-300 text-rose-950"
                    }`}
                  >
                    <div className="flex justify-center mb-2">
                      {transactionResult.status === "Berhasil" ? (
                        <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                          <CheckCircle2 size={22} />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                          <AlertCircle size={22} />
                        </div>
                      )}
                    </div>

                    <h4 className="text-sm font-black">
                      {transactionResult.status === "Berhasil"
                        ? "Transaksi Simulasi Berhasil!"
                        : "Transaksi Simulasi Gagal"}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">{transactionResult.message}</p>

                    <div className="mt-3.5 pt-3 border-t border-slate-200/70 space-y-1.5 text-xs text-left bg-white/80 p-3 rounded-xl">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Order ID:</span>
                        <span className="font-mono font-bold text-slate-800">#{transactionResult.orderId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">No. Tujuan:</span>
                        <span className="font-mono font-bold text-slate-800">{transactionResult.customerNo}</span>
                      </div>
                      {transactionResult.sn && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Serial Number (SN):</span>
                          <span className="font-mono font-black text-emerald-700">{transactionResult.sn}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-500">Saldo Virtual Terpotong:</span>
                        <span className="font-mono font-bold text-slate-900">
                          Rp {transactionResult.amount.toLocaleString("id-ID")}
                        </span>
                      </div>
                      {Boolean(transactionResult.cashbackAwarded && transactionResult.cashbackAwarded > 0) && (
                        <div className="flex justify-between text-violet-800 font-bold bg-violet-50 px-2 py-1 rounded-lg border border-violet-200">
                          <span className="flex items-center gap-1 text-[11px]">
                            <Sparkles size={12} className="text-violet-600" />
                            Cashback Koin Sandbox:
                          </span>
                          <span className="font-mono text-xs">+{transactionResult.cashbackAwarded} Koin</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-slate-200/70 pt-1.5 font-bold">
                        <span className="text-slate-600">Sisa Saldo Virtual:</span>
                        <span className="font-mono text-amber-700">
                          Rp {transactionResult.remainingBalance.toLocaleString("id-ID")}
                        </span>
                      </div>
                      {transactionResult.remainingCoin !== undefined && (
                        <div className="flex justify-between font-bold text-violet-900">
                          <span className="text-slate-600">Sisa Koin Sandbox:</span>
                          <span className="font-mono text-violet-700">
                            {(transactionResult.remainingCoin || 0).toLocaleString("id-ID")} KOIN
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setTransactionResult(null);
                        setTransactionError(null);
                      }}
                      className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Coba Produk Lain
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer"
                    >
                      Selesai & Tutup
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* 2x2 Specs Grid */}
                  <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <Users size={15} className="text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="block text-[10px] text-slate-400 font-medium">Kategori</span>
                        <span className="font-bold text-slate-800 truncate block">
                          {currentCategory?.displayName || "Game"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Tag size={15} className="text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="block text-[10px] text-slate-400 font-medium">Harga Katalog</span>
                        <span className="font-bold text-slate-900 font-mono truncate block">
                          Rp {activeVariant.effectivePrice.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Box size={15} className="text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="block text-[10px] text-slate-400 font-medium">Brand Provider</span>
                        <span className="font-bold text-slate-800 truncate block">
                          {formatTwoWordsName(activeBrandForModal?.displayName || activeBrand?.displayName)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Gift size={15} className="text-violet-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="block text-[10px] text-slate-400 font-medium">Reward Cashback</span>
                        <span className="font-bold text-violet-700 font-mono truncate block">
                          +{activeVariant.cashback} Koin Sandbox {simulatedMemberType === "special" ? "(AKTIF)" : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* PERKIRAAN MARGIN Card */}
                  {isVariantPriceValid && (
                    <div className="rounded-2xl border border-amber-300/80 bg-linear-to-br from-amber-50/90 via-orange-50/50 to-amber-100/40 p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wide text-emerald-950 flex items-center gap-1.5">
                          <TrendingUp size={14} className="text-emerald-600" />
                          PERKIRAAN MARGIN
                        </span>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full">
                          Ilustratif
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-white/90 p-2.5 rounded-xl border border-amber-200/80 text-center">
                        <div>
                          <p className="text-[8.5px] font-bold text-slate-400 uppercase">HARGA BELI</p>
                          <p className="text-xs font-black text-slate-900 font-mono mt-0.5">
                            Rp {activeVariant.effectivePrice.toLocaleString("id-ID")}
                          </p>
                        </div>
                        <div>
                          <p className="text-[8.5px] font-bold text-slate-400 uppercase">HARGA JUAL</p>
                          <p className="text-xs font-black text-slate-900 font-mono mt-0.5">
                            Rp {currentSellingPrice.toLocaleString("id-ID")}
                          </p>
                        </div>
                        <div>
                          <p className="text-[8.5px] font-bold text-emerald-700 uppercase">PERKIRAAN MARGIN</p>
                          <p className="text-xs font-black text-emerald-700 font-mono mt-0.5">
                            +Rp {currentMargin.marginAmount.toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-700">
                          <span>Opsi Harga Jual:</span>
                          <button
                            type="button"
                            onClick={() => setCustomSellingPrice(calculateDefaultSellingPrice(activeVariant.effectivePrice, globalPricingRule))}
                            className="text-[9.5px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw size={9} /> Reset
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[1000, 1500, 2000, 3000].map((delta) => {
                            const targetPrice = activeVariant.effectivePrice + delta;
                            const isActive = currentSellingPrice === targetPrice;
                            return (
                              <button
                                key={delta}
                                type="button"
                                onClick={() => {
                                  setCustomSellingPrice(targetPrice);
                                  setHasViewedMargin(true);
                                  onMarginView?.();
                                }}
                                className={`rounded-xl py-1.5 text-[10px] font-bold transition cursor-pointer ${
                                  isActive
                                    ? "bg-slate-900 text-white shadow-xs"
                                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                                }`}
                              >
                                +Rp {delta.toLocaleString("id-ID")}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <p className="text-[10px] text-amber-900/70 italic">
                        *Contoh margin bersifat ilustratif untuk latihan dan bukan jaminan keuntungan riil.
                      </p>
                    </div>
                  )}

                  {/* Form Input: User ID / ID Game Akun (Simulasi) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="customer-no-input-drawer"
                        className="block text-xs font-bold text-slate-900"
                      >
                        {currentCategory?.categoryKey === "pln"
                          ? "Nomor Meter / ID Pelanggan PLN:"
                          : currentCategory?.categoryKey === "game"
                          ? "User ID / ID Game Akun (Simulasi)"
                          : "Nomor HP / ID Tujuan (Simulasi)"}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (currentCategory?.categoryKey === "pln") {
                            setTargetNumber("14023456789");
                          } else if (currentCategory?.categoryKey === "game") {
                            setTargetNumber("12345678 (2048)");
                          } else {
                            setTargetNumber("081234567890");
                          }
                        }}
                        className="text-[10px] font-bold text-amber-800 bg-amber-100/90 hover:bg-amber-200 px-2 py-0.5 rounded-md border border-amber-300 transition cursor-pointer"
                      >
                        Nomor contoh simulasi
                      </button>
                    </div>
                    <input
                      id="customer-no-input-drawer"
                      type="text"
                      value={targetNumber}
                      onChange={(e) => setTargetNumber(e.target.value)}
                      placeholder={
                        currentCategory?.categoryKey === "pln"
                          ? "Contoh: 14023456789"
                          : currentCategory?.categoryKey === "game"
                          ? "12345678 (2048)"
                          : "081234567890"
                      }
                      disabled={isTransacting}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs font-mono font-medium focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500 bg-slate-50/50"
                    />
                    <p className="text-[10.5px] text-slate-500">
                      Gunakan nomor contoh untuk simulasi. Tidak ada pulsa atau voucher nyata yang dikirim.
                    </p>
                  </div>

                  {transactionError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{transactionError}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      onClick={handleExecuteSimulatedTransaction}
                      disabled={isTransacting || isSimulationQuotaExhausted || !isVariantPriceValid}
                      className="w-full py-3.5 rounded-xl bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs sm:text-sm shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                    >
                      {isTransacting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Memproses Transaksi Simulasi...</span>
                        </>
                      ) : isSimulationQuotaExhausted ? (
                        <>
                          <FlaskConical size={16} />
                          <span>Batas Kuota Tercapai (Coba Besok)</span>
                        </>
                      ) : !isVariantPriceValid ? (
                        <>
                          <FlaskConical size={16} />
                          <span>Harga Belum Tersedia</span>
                        </>
                      ) : (
                        <>
                          <FlaskConical size={16} />
                          <span>SIMULASI BELI (Rp {activeVariant.effectivePrice.toLocaleString("id-ID")})</span>
                        </>
                      )}
                    </button>
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        disabled={isTransacting}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                </>
              )}
          </div>
        </div>
      )}

      {/* 7. BULK SIMULATION REVIEW & RESULT MODAL (Phase 6 - Sub-Batch 4B) */}
      {isBulkReviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-review-modal-title"
            className="relative w-full max-w-xl sm:max-w-2xl rounded-2xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-100 text-slate-900 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
          >
            <button
              type="button"
              onClick={() => {
                setIsBulkReviewOpen(false);
                setBulkError(null);
              }}
              disabled={isBulkTransacting}
              className="absolute right-3.5 top-3.5 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition disabled:opacity-50 cursor-pointer"
              aria-label="Tutup modal tinjau keranjang"
            >
              <X size={18} />
            </button>

            {/* Bulk / Cart Simulation Badge */}
            <div className="mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-900 border border-amber-300">
                <ShoppingCart size={12} className="text-amber-700" />
                KERANJANG • RESELLER • SIMULASI
              </span>
            </div>

            {/* A. BULK RESULT VIEW (When simulation is complete) */}
            {bulkResult ? (
              <div className="space-y-4 animate-in zoom-in-95 duration-150">
                <div
                  className={`p-4 rounded-2xl border text-center ${
                    bulkResult.status === "Berhasil"
                      ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                      : "bg-rose-50/80 border-rose-300 text-rose-950"
                  }`}
                >
                  <div className="flex justify-center mb-2">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <CheckCircle2 size={22} />
                    </div>
                  </div>

                  <h4 className="text-sm font-black">
                    Simulasi Pembelian Massal Berhasil!
                  </h4>
                  <p className="text-xs text-slate-600 mt-1">{bulkResult.message}</p>

                  <div className="mt-3.5 pt-3 border-t border-slate-200/70 space-y-1.5 text-xs text-left bg-white/80 p-3 rounded-xl">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Order ID Massal:</span>
                      <span className="font-mono font-bold text-slate-800">#{bulkResult.orderId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">No. Tujuan / ID:</span>
                      <span className="font-mono font-bold text-slate-800">{bulkCustomerNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Varian Diproses:</span>
                      <span className="font-mono font-bold text-slate-800">{bulkResult.totalItems} Varian</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Kuantitas:</span>
                      <span className="font-mono font-bold text-slate-800">{bulkResult.totalQuantity} Item</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Saldo Virtual Terpotong:</span>
                      <span className="font-mono font-bold text-slate-900">
                        Rp {bulkResult.amount.toLocaleString("id-ID")}
                      </span>
                    </div>

                    {Boolean(bulkResult.cashbackAwarded && bulkResult.cashbackAwarded > 0) && (
                      <div className="flex justify-between text-violet-800 font-bold bg-violet-50 px-2 py-1 rounded-lg border border-violet-200">
                        <span className="flex items-center gap-1 text-[11px]">
                          <Sparkles size={12} className="text-violet-600" />
                          Cashback Koin Sandbox:
                        </span>
                        <span className="font-mono text-xs">+{bulkResult.cashbackAwarded.toLocaleString("id-ID")} Koin</span>
                      </div>
                    )}

                    <div className="flex justify-between border-t border-slate-200/70 pt-1.5 font-bold">
                      <span className="text-slate-600">Sisa Saldo Virtual:</span>
                      <span className="font-mono text-amber-700">
                        Rp {bulkResult.remainingBalance.toLocaleString("id-ID")}
                      </span>
                    </div>
                    {bulkResult.remainingCoin !== undefined && (
                      <div className="flex justify-between font-bold text-violet-900">
                        <span className="text-slate-600">Sisa Koin Sandbox:</span>
                        <span className="font-mono text-violet-700">
                          {(bulkResult.remainingCoin || 0).toLocaleString("id-ID")} KOIN
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Itemized Outcome Breakdown */}
                {Array.isArray(bulkResult.lines) && bulkResult.lines.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Rincian Item Yang Diproses ({bulkResult.lines.length} Varian):
                    </h5>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {bulkResult.lines.map((line, idx) => (
                        <div
                          key={line.productId || idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs"
                        >
                          <div className="space-y-0.5 max-w-[65%]">
                            <p className="font-bold text-slate-900 truncate">{line.productName}</p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {line.quantity} item @ Rp {line.unitPrice.toLocaleString("id-ID")}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-black text-slate-900 block">
                              Rp {line.subtotal.toLocaleString("id-ID")}
                            </span>
                            {line.cashback > 0 && (
                              <span className="text-[9.5px] font-bold text-violet-700 font-mono block">
                                +{line.cashback.toLocaleString("id-ID")} Koin
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkQuantities({});
                      setBulkResult(null);
                      setIsBulkReviewOpen(false);
                    }}
                    className="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer text-center"
                  >
                    Selesai & Reset Pilihan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBulkResult(null);
                      setIsBulkReviewOpen(false);
                    }}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer text-center"
                  >
                    Tutup Modal
                  </button>
                </div>
              </div>
            ) : (
              /* B. BULK & COUNTER CART REVIEW VIEW */
              <div className="space-y-4">
                <div>
                  <h3 id="cart-review-modal-title" className="text-base font-black text-slate-950 leading-tight">
                    Tinjau Keranjang
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {cartLineCount > 0 ? (
                      <span>
                        Total <strong>{cartLineCount} Baris Transaksi</strong> ({cartTotalQuantity} item) • Periksa tujuan dan harga jual sebelum eksekusi
                      </span>
                    ) : (
                      <span>
                        Brand: <span className="font-bold text-slate-800">{formatTwoWordsName(activeBrand?.displayName)}</span> • Kategori:{" "}
                        <span className="font-bold text-slate-800">{currentCategory?.displayName}</span>
                      </span>
                    )}
                  </p>
                </div>

                {/* Target Number Input (Only shown in legacy bulk mode when cartLineCount === 0) */}
                {cartLineCount === 0 && bulkSelectedCount > 0 && (
                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="bulk-customer-no-input"
                        className="block text-[11px] font-bold text-slate-800"
                      >
                        {currentCategory?.categoryKey === "pln"
                          ? "Nomor Meter / ID Pelanggan PLN:"
                          : currentCategory?.categoryKey === "game"
                          ? "User ID / ID Game Akun (Simulasi):"
                          : "Nomor HP / ID Tujuan (Simulasi):"}
                      </label>
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md border border-amber-300/80">
                        Contoh simulasi
                      </span>
                    </div>
                    <input
                      id="bulk-customer-no-input"
                      type="text"
                      value={bulkCustomerNo}
                      onChange={(e) => setBulkCustomerNo(e.target.value)}
                      placeholder={
                        currentCategory?.categoryKey === "pln"
                          ? "Contoh: 14023456789"
                          : currentCategory?.categoryKey === "game"
                          ? "Contoh: 12345678 (2048)"
                          : "Contoh: 081234567890"
                      }
                      disabled={isBulkTransacting}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-200"
                    />
                    <p className="text-[10.5px] text-slate-500 leading-snug">
                      Nomor tujuan contoh digunakan untuk identifikasi virtual transaksi massal.
                    </p>
                  </div>
                )}

                {/* Empty Cart State */}
                {cartLineCount === 0 && bulkSelectedCount === 0 && (
                  <div className="py-8 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 space-y-2.5">
                    <ShoppingCart size={30} className="mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-700">Keranjang masih kosong</p>
                    <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                      Pilih produk dari berbagai brand dan kategori di katalog dalam mode Massal untuk menambahkan transaksi ke keranjang.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsBulkReviewOpen(false)}
                      className="mt-1 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition cursor-pointer shadow-2xs"
                    >
                      Pilih Produk di Katalog
                    </button>
                  </div>
                )}

                {/* Selected Products Table / List (Sub-Batch 7B: Counter Cart Lines) */}
                {cartLineCount > 0 ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          Daftar Transaksi ({cartLineCount} Baris):
                        </span>
                        {duplicateLinesCount > 0 && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                            {duplicateLinesCount} duplikasi
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setIsPricingModalOpen(true)}
                          disabled={isBulkTransacting}
                          title="Ubah aturan margin harga jual global"
                          className="text-[11px] font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200/80 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <SlidersHorizontal size={11} className="text-amber-700" />
                          <span>Aturan Harga: {globalPricingRule.type === "nominal" ? `+Rp${globalPricingRule.value.toLocaleString("id-ID")}` : `+${globalPricingRule.value}%`}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleClearCart}
                          disabled={isBulkTransacting}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 size={12} /> Kosongkan Keranjang
                        </button>
                      </div>
                    </div>

                    {/* Duplicate Line Warning Banner (Non-blocking educational warning) */}
                    {duplicateLinesCount > 0 && (
                      <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-900 border border-amber-200/80">
                        <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                        <span className="leading-snug">
                          <strong>Catatan Simulasi:</strong> Produk dan tujuan yang sama muncul lebih dari sekali ({duplicateLinesCount} duplikasi terdeteksi). Setiap baris transaksi tetap diproses secara terpisah.
                        </span>
                      </div>
                    )}

                    <div className="max-h-90 overflow-y-auto space-y-3.5 p-0.5 pr-1 scrollbar-thin">
                      {cartItems.map((item, index) => {
                        const lineCost = item.unitPrice * item.quantity;
                        const lineSellingTotal = item.sellingPrice * item.quantity;
                        const lineMargin = (item.sellingPrice - item.unitPrice) * item.quantity;
                        const lineKoin = (item.cashbackPerUnit || 0) * item.quantity;
                        const isDuplicate = isLineDuplicate(item);
                        const badgeTheme = getCategoryBadgeTheme(item.categoryKey);
                        const cleanProductName = formatCleanVariantName(item.productName, item.brandDisplayName);

                        // Context-aware destination labels and examples
                        const isPln = item.categoryKey === "pln";
                        const isGame = item.categoryKey === "game";
                        const destLabel = isPln
                          ? "No. Meter / ID Pelanggan PLN"
                          : isGame
                          ? "User ID / ID Game Akun"
                          : "Nomor HP / ID Tujuan";
                        const destPlaceholder = isPln
                          ? "Contoh: 14023456789"
                          : isGame
                          ? "Contoh: 12345678 (2048)"
                          : "Contoh: 081234567890";
                        const destHelperVal = resolveDefaultCustomerNo(item.categoryKey);

                        return (
                          <div
                            key={item.cartItemId}
                            className={`p-3.5 sm:p-4 rounded-2xl border-2 transition text-xs space-y-3 ${
                              isDuplicate
                                ? "border-orange-400 bg-linear-to-b from-orange-50/50 via-white to-orange-50/20 shadow-md shadow-orange-500/15"
                                : "border-amber-300/90 hover:border-amber-500 bg-white shadow-xs hover:shadow-md shadow-amber-500/10"
                            }`}
                          >
                            {/* Row 1: Line Header (Index, Brand, Category, Name, Delete) */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1.5 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* Nomor 1 atau 2 tanpa tanda # */}
                                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-mono font-black text-[10.5px] flex items-center justify-center shrink-0 shadow-2xs">
                                    {index + 1}
                                  </span>
                                  {/* Brand & Category dengan warna khusus */}
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border shadow-2xs ${badgeTheme.brand}`}>
                                    {item.brandDisplayName}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${badgeTheme.category}`}>
                                    {item.categoryDisplayName}
                                  </span>
                                  {isDuplicate && (
                                    <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300 shadow-2xs">
                                      <AlertCircle size={10} />
                                      Duplikat Tujuan
                                    </span>
                                  )}
                                </div>
                                {/* Nama varian bersih tanpa pengulangan nama brand */}
                                <h4 className="font-black text-slate-950 text-sm truncate pl-0.5">
                                  {cleanProductName}
                                </h4>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCartItem(item.cartItemId)}
                                  disabled={isBulkTransacting}
                                  aria-label={`Hapus ${cleanProductName} dari keranjang`}
                                  title="Hapus baris ini dari keranjang"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer disabled:opacity-40"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>

                            {/* Row 2: Destination Field with 'Contoh' Helper & '+ Tambah Tujuan' */}
                            <div className="space-y-1 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/70">
                              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                <label
                                  htmlFor={`dest-${item.cartItemId}`}
                                  className="text-[10.5px] font-bold text-slate-700 truncate"
                                >
                                  {destLabel}:
                                </label>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleAddDestinationForProduct(item.cartItemId)}
                                    disabled={isBulkTransacting || cartItems.length >= 30}
                                    title="Tambah tujuan baru untuk produk ini (baris transaksi baru)"
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded-md border border-amber-300 transition cursor-pointer disabled:opacity-40"
                                  >
                                    <Plus size={10} strokeWidth={3} className="text-amber-800" />
                                    <span>Tambah Tujuan</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCartCustomerNo(item.cartItemId, destHelperVal)}
                                    disabled={isBulkTransacting}
                                    title={`Isi nomor contoh simulasi: ${destHelperVal}`}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-white hover:bg-slate-100 px-2 py-0.5 rounded-md border border-slate-300 transition cursor-pointer"
                                  >
                                    <Sparkles size={10} className="text-amber-700" />
                                    <span>Contoh</span>
                                  </button>
                                </div>
                              </div>
                              <input
                                id={`dest-${item.cartItemId}`}
                                type="text"
                                value={item.customerNo}
                                onChange={(e) => handleUpdateCartCustomerNo(item.cartItemId, e.target.value)}
                                placeholder={destPlaceholder}
                                disabled={isBulkTransacting}
                                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-400"
                              />
                              <p className="text-[10px] text-slate-500 leading-snug">
                                Nomor tujuan simulasi latihan. Tidak ada pulsa atau voucher nyata yang dikirim.
                              </p>
                            </div>

                            {/* Row 3: Financials & Stepper (Modal, Qty, Selling Price, Margin) */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 text-xs">
                              {/* A. Harga Beli */}
                              <div className="bg-slate-50/60 p-2 rounded-xl border border-slate-200/60 space-y-0.5">
                                <span className="text-[10px] font-semibold text-slate-500 block">
                                  Harga Beli
                                </span>
                                <span className="font-mono font-bold text-slate-800 block text-xs">
                                  Rp {item.unitPrice.toLocaleString("id-ID")}
                                </span>
                                <span className="text-[9.5px] text-slate-400 block font-mono">
                                  Subtotal: Rp {lineCost.toLocaleString("id-ID")}
                                </span>
                              </div>

                              {/* B. Jumlah / Qty Stepper */}
                              <div className="bg-slate-50/60 p-2 rounded-xl border border-slate-200/60 space-y-1">
                                <span className="text-[10px] font-semibold text-slate-500 block">
                                  Jumlah (Qty)
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCartQuantity(item.cartItemId, -1)}
                                    disabled={isBulkTransacting}
                                    title={item.quantity === 1 ? "Hapus dari keranjang" : "Kurangi kuantitas"}
                                    className="w-6 h-6 rounded-md bg-white hover:bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 transition cursor-pointer disabled:opacity-40"
                                  >
                                    <Minus size={11} strokeWidth={2.5} />
                                  </button>
                                  <span className="flex-1 text-center font-mono font-black text-xs text-slate-900">
                                    {item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCartQuantity(item.cartItemId, 1)}
                                    disabled={item.quantity >= 100 || isBulkTransacting}
                                    title="Tambah kuantitas"
                                    className="w-6 h-6 rounded-md bg-white hover:bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 transition cursor-pointer disabled:opacity-40"
                                  >
                                    <Plus size={11} strokeWidth={2.5} />
                                  </button>
                                </div>
                              </div>

                              {/* C. Harga Jual */}
                              <div className="bg-slate-50/60 p-2 rounded-xl border border-slate-200/60 space-y-1">
                                <label
                                  htmlFor={`price-${item.cartItemId}`}
                                  className="text-[10px] font-semibold text-slate-500 block truncate"
                                >
                                  Harga Jual
                                </label>
                                <div className="relative">
                                  <span className="absolute left-2 top-1.5 text-[10.5px] font-mono font-bold text-slate-400">
                                    Rp
                                  </span>
                                  <input
                                    id={`price-${item.cartItemId}`}
                                    type="number"
                                    min={0}
                                    step={500}
                                    value={item.sellingPrice}
                                    onChange={(e) =>
                                      handleUpdateCartSellingPrice(
                                        item.cartItemId,
                                        Math.max(0, parseInt(e.target.value) || 0)
                                      )
                                    }
                                    disabled={isBulkTransacting}
                                    className="w-full pl-7 pr-1.5 py-1 text-[11px] font-mono font-bold rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-400"
                                  />
                                </div>
                              </div>

                              {/* D. Perkiraan Margin */}
                              <div
                                className={`p-2 rounded-xl border space-y-0.5 ${
                                  lineMargin > 0
                                    ? "bg-emerald-50/70 border-emerald-200/80"
                                    : lineMargin === 0
                                    ? "bg-slate-50/70 border-slate-200/70"
                                    : "bg-amber-50/70 border-amber-200/80"
                                }`}
                              >
                                <span className="text-[10px] font-semibold text-slate-600 block">
                                  Perkiraan Margin
                                </span>
                                <div className="font-mono font-bold text-xs">
                                  {lineMargin > 0 ? (
                                    <span className="text-emerald-700">+Rp {lineMargin.toLocaleString("id-ID")}</span>
                                  ) : lineMargin === 0 ? (
                                    <span className="text-slate-600">Rp 0</span>
                                  ) : (
                                    <span className="text-rose-600">-Rp {Math.abs(lineMargin).toLocaleString("id-ID")}</span>
                                  )}
                                </div>
                                {lineMargin < 0 ? (
                                  <span className="text-[9px] font-medium text-amber-800 block leading-tight">
                                    Harga jual di bawah modal
                                  </span>
                                ) : lineKoin > 0 && simulatedMemberType === "special" ? (
                                  <span className="text-[9.5px] font-mono font-bold text-violet-700 block">
                                    +{lineKoin.toLocaleString("id-ID")} Koin
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-slate-400 block font-mono">
                                    Jual: Rp {lineSellingTotal.toLocaleString("id-ID")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  selectedVariantEntries.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          Daftar Varian Dipilih ({bulkSelectedCount} Varian):
                        </span>
                        <button
                          type="button"
                          onClick={() => setBulkQuantities({})}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 size={12} /> Hapus Semua
                        </button>
                      </div>

                      <div className="max-h-52 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
                        {selectedVariantEntries.map((variant) => {
                          const qty = bulkQuantities[variant.id] || 1;
                          const lineTotal = variant.effectivePrice * qty;
                          const lineKoin = (variant.cashback || 0) * qty;

                          return (
                            <div
                              key={variant.id}
                              className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-0.5 max-w-[55%]">
                                <p className="font-bold text-slate-900 truncate leading-snug">
                                  {variant.name}
                                </p>
                                <p className="text-[10.5px] text-slate-400 font-mono">
                                  Rp {variant.effectivePrice.toLocaleString("id-ID")} / item
                                </p>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleIncrementBulkQuantity(variant.id, -1)}
                                    disabled={qty <= 1 || isBulkTransacting}
                                    className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 disabled:opacity-40 transition cursor-pointer"
                                  >
                                    <Minus size={10} />
                                  </button>
                                  <span className="w-8 text-center font-mono font-bold text-xs">
                                    {qty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleIncrementBulkQuantity(variant.id, 1)}
                                    disabled={qty >= 100 || isBulkTransacting}
                                    className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 disabled:opacity-40 transition cursor-pointer"
                                  >
                                    <Plus size={10} />
                                  </button>
                                </div>

                                <div className="text-right min-w-18.75">
                                  <span className="font-mono font-black text-slate-900 block">
                                    Rp {lineTotal.toLocaleString("id-ID")}
                                  </span>
                                  {simulatedMemberType === "special" && lineKoin > 0 && (
                                    <span className="text-[9.5px] font-bold text-violet-700 font-mono block">
                                      +{lineKoin.toLocaleString("id-ID")} Koin
                                    </span>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveBulkItem(variant.id)}
                                  disabled={isBulkTransacting}
                                  className="text-slate-400 hover:text-rose-600 transition p-1 cursor-pointer disabled:opacity-40"
                                  title="Hapus varian"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                )}

                {/* Financial Summary & Balance Comparison Box (Section 13: Financial Recap) */}
                <div className="rounded-2xl border border-amber-200/90 bg-amber-50/60 p-3.5 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Saldo Virtual Sandbox Saat Ini:</span>
                    <span className="font-mono font-bold text-slate-900">
                      Rp {virtualBalance.toLocaleString("id-ID")}
                    </span>
                  </div>

                  <div className="border-t border-amber-200/60 pt-2 space-y-1.5">
                    {/* A. Harga Beli Total */}
                    <div className="flex justify-between items-center text-slate-800">
                      <span className="font-semibold">
                        Total Harga Beli ({cartLineCount > 0 ? cartTotalQuantity : bulkTotalQuantity} Item):
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        Rp {(cartLineCount > 0 ? cartTotalCost : bulkTotalCost).toLocaleString("id-ID")}
                      </span>
                    </div>

                    {/* B. Total Harga Jual */}
                    {cartLineCount > 0 && (
                      <div className="flex justify-between items-center text-slate-700">
                        <span className="font-semibold">Total Harga Jual:</span>
                        <span className="font-mono font-bold text-slate-900">
                          Rp {cartTotalSellingPrice.toLocaleString("id-ID")}
                        </span>
                      </div>
                    )}

                    {/* C. Educational Margin */}
                    {cartLineCount > 0 && (
                      <div
                        className={`flex justify-between items-center px-2.5 py-1.5 rounded-xl border font-bold ${
                          cartTotalEstimatedMargin > 0
                            ? "bg-emerald-100/70 border-emerald-200/80 text-emerald-900"
                            : cartTotalEstimatedMargin === 0
                            ? "bg-slate-100 border-slate-200 text-slate-700"
                            : "bg-amber-100/80 border-amber-300 text-amber-950"
                        }`}
                      >
                        <span className="flex items-center gap-1.5 text-[11px]">
                          <TrendingUp size={13} className={cartTotalEstimatedMargin >= 0 ? "text-emerald-700" : "text-amber-800"} />
                          Total Perkiraan Margin:
                        </span>
                        <span className="font-mono text-xs">
                          {cartTotalEstimatedMargin > 0
                            ? `+Rp ${cartTotalEstimatedMargin.toLocaleString("id-ID")}`
                            : cartTotalEstimatedMargin === 0
                            ? "Rp 0"
                            : `-Rp ${Math.abs(cartTotalEstimatedMargin).toLocaleString("id-ID")}`}
                        </span>
                      </div>
                    )}

                    {/* D. Reward Koin Sandbox */}
                    <div className="flex justify-between items-center text-violet-900 font-bold bg-violet-100/70 px-2.5 py-1.5 rounded-xl border border-violet-200/80">
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <Sparkles size={13} className="text-violet-600" />
                        Total Koin Sandbox:
                      </span>
                      <span className="font-mono text-xs">
                        {simulatedMemberType === "special" && (cartTotalCashback > 0 || bulkTotalCashback > 0)
                          ? `+${(cartLineCount > 0 ? cartTotalCashback : bulkTotalCashback).toLocaleString("id-ID")} Koin (Special)`
                          : "0 Koin (Reguler)"}
                      </span>
                    </div>
                  </div>

                  {/* E. Microcopy */}
                  <p className="text-[10px] text-slate-500 italic pt-0.5">
                    *Nilai penjualan dan margin hanya untuk simulasi edukasi reseller pemula.
                  </p>

                  {/* F. Comparison with Saldo Virtual */}
                  <div className="flex justify-between items-center border-t border-amber-200/60 pt-2 font-bold">
                    <span className="text-slate-700">Perkiraan Sisa Saldo Virtual:</span>
                    <span
                      className={`font-mono text-xs ${
                        virtualBalance >= (cartLineCount > 0 ? cartTotalCost : bulkTotalCost)
                          ? "text-emerald-700"
                          : "text-rose-600"
                      }`}
                    >
                      Rp {(virtualBalance - (cartLineCount > 0 ? cartTotalCost : bulkTotalCost)).toLocaleString("id-ID")}
                    </span>
                  </div>

                  {virtualBalance < (cartLineCount > 0 ? cartTotalCost : bulkTotalCost) && (
                    <div className="rounded-xl bg-rose-100/90 p-2.5 text-[11px] font-bold text-rose-800 border border-rose-200 flex items-center gap-1.5">
                      <AlertCircle size={14} className="text-rose-600 shrink-0" />
                      <span>
                        Saldo virtual tidak mencukupi (Kekurangan: Rp{" "}
                        {((cartLineCount > 0 ? cartTotalCost : bulkTotalCost) - virtualBalance).toLocaleString("id-ID")}).
                      </span>
                    </div>
                  )}
                </div>

                {/* Persona Context Education */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 text-[11px] text-slate-600">
                  {simulatedMemberType === "special" ? (
                    <p>
                      <strong className="text-violet-900 font-semibold">Mode Special Aktif:</strong> Transaksi keranjang ini
                      akan mengkreditkan reward simulasi sebesar{" "}
                      <span className="font-bold text-violet-700 font-mono">
                        +{(cartLineCount > 0 ? cartTotalCashback : bulkTotalCashback).toLocaleString("id-ID")} Koin Sandbox
                      </span>.
                    </p>
                  ) : (
                    <p>
                      <strong className="text-slate-800 font-semibold">Mode Reguler:</strong> Tidak ada reward koin. Anda
                      dapat menguji penerimaan reward koin dengan beralih ke Simulasi Special di bagian atas halaman.
                    </p>
                  )}
                </div>

                {/* Sandbox Isolation Notice */}
                <p className="text-[10.5px] text-slate-500 italic text-center">
                  *Semua transaksi hanya memotong saldo virtual Sandbox. 100% aman tanpa vendor riil atau potongan saldo LIVE.
                </p>

                {/* Error Banner */}
                {bulkError && (
                  <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-800 border border-rose-200">
                    <AlertCircle size={14} className="text-rose-500 shrink-0 mt-0.5" />
                    <span className="leading-snug">{bulkError}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleExecuteBulkTransaction}
                    disabled={
                      isBulkTransacting ||
                      (cartLineCount === 0 && bulkSelectedCount === 0) ||
                      virtualBalance < (cartLineCount > 0 ? cartTotalCost : bulkTotalCost) ||
                      (cartLineCount === 0 && (!bulkCustomerNo.trim() || bulkCustomerNo.trim().length < 4))
                    }
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 py-3 text-xs font-black uppercase tracking-wider text-slate-950 shadow-md shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600 transition cursor-pointer disabled:opacity-50"
                  >
                    {isBulkTransacting ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-slate-950" />
                        <span>Memproses Transaksi Keranjang ({cartLineCount > 0 ? cartTotalQuantity : bulkTotalQuantity} Item)...</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart size={14} />
                        <span>Eksekusi Keranjang (Rp {(cartLineCount > 0 ? cartTotalCost : bulkTotalCost).toLocaleString("id-ID")})</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsBulkReviewOpen(false);
                      setBulkError(null);
                    }}
                    disabled={isBulkTransacting}
                    className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer text-center"
                  >
                    Tutup & Lanjutkan Pilih Produk
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. CONVERSION MODAL */}
      <SandboxConversionModal
        isOpen={isConversionModalOpen}
        onClose={() => setIsConversionModalOpen(false)}
      />

      {/* 9. STRUK SIMULASI SANDBOX (REUSABLE MODAL — BATCH B) */}
      <CounterCartReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => {
          setIsReceiptOpen(false);
          setCounterCartReceipt(null);
        }}
        receipt={counterCartReceipt}
      />

      {/* 10. PENGATURAN HARGA JUAL RESELLER GLOBAL (Phase 8.7.4) */}
      {isPricingModalOpen && (
        <SandboxPricingSettingsModal
          isOpen={isPricingModalOpen}
          onClose={() => setIsPricingModalOpen(false)}
          currentRule={globalPricingRule}
          cartItemCount={cartItems.length}
          manualOverrideCount={manualOverrideCount}
          onApply={handleApplyGlobalPricingRule}
        />
      )}

      {/* 11. MODAL KONFIRMASI RESET SELEKSI / KERANJANG (Phase 8.7.5) */}
      {isResetConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsResetConfirmOpen(false);
          }}
        >
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <RotateCcw size={22} />
            </div>
            <div className="space-y-1">
              <h3 id="reset-confirm-title" className="text-sm font-black text-slate-900">
                Reset Pilihan & Keranjang?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Semua pilihan produk dan nomor tujuan dalam keranjang akan dikosongkan.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 rounded-xl border border-slate-300 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-600/20 transition cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Phase 8.7.4: Modal Pengaturan Harga Jual Reseller Global
 */
interface SandboxPricingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRule: SandboxGlobalPricingRule;
  cartItemCount: number;
  manualOverrideCount: number;
  onApply: (
    newRule: SandboxGlobalPricingRule,
    applyToCart: boolean,
    overwriteManual: boolean
  ) => void;
}

function SandboxPricingSettingsModal({
  isOpen,
  onClose,
  currentRule,
  cartItemCount,
  manualOverrideCount,
  onApply,
}: SandboxPricingSettingsModalProps) {
  const [ruleType, setRuleType] = useState<"nominal" | "percent">(currentRule.type);
  const [ruleValue, setRuleValue] = useState<number>(currentRule.value);
  const [applyToCart, setApplyToCart] = useState<boolean>(true);
  const [overwriteManual, setOverwriteManual] = useState<boolean>(false);

  if (!isOpen) return null;

  // Calculate live preview using a realistic benchmark: Rp 17.700 (e.g. Pulsa 15K / MLBB 50 Diamonds)
  const samplePurchase = 17700;
  const sampleMarkup =
    ruleType === "nominal"
      ? Math.max(0, ruleValue)
      : Math.round((samplePurchase * Math.max(0, ruleValue)) / 100);
  const sampleSelling = samplePurchase + sampleMarkup;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApply(
      {
        type: ruleType,
        value: Math.max(0, ruleValue),
      },
      applyToCart,
      overwriteManual
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pricing-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden space-y-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-linear-to-r from-amber-50/90 via-orange-50/60 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
              <SlidersHorizontal size={16} />
            </div>
            <div>
              <h3 id="pricing-modal-title" className="text-sm font-black text-slate-900 leading-tight">
                Pengaturan Harga Jual
              </h3>
              <p className="text-[11px] text-slate-500">
                Aturan margin default untuk seluruh katalog
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pengaturan harga"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 1. Aturan Harga Default (Radio Cards) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Aturan Margin Default:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRuleType("nominal");
                  if (ruleType !== "nominal") setRuleValue(1000);
                }}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  ruleType === "nominal"
                    ? "border-amber-500 bg-amber-50/70 ring-1 ring-amber-400"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Harga Beli + Nominal</span>
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    ruleType === "nominal" ? "border-amber-600 bg-amber-600" : "border-slate-300"
                  }`}>
                    {ruleType === "nominal" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Tambah nominal rupiah tetap</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRuleType("percent");
                  if (ruleType !== "percent") setRuleValue(10);
                }}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  ruleType === "percent"
                    ? "border-amber-500 bg-amber-50/70 ring-1 ring-amber-400"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Harga Beli + Persentase</span>
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    ruleType === "percent" ? "border-amber-600 bg-amber-600" : "border-slate-300"
                  }`}>
                    {ruleType === "percent" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Tambah margin persentase (%)</p>
              </button>
            </div>
          </div>

          {/* 2. Value Input & Preset Quick Pills */}
          <div className="space-y-1.5">
            <label htmlFor="markup-rule-value-input" className="text-xs font-bold text-slate-700 block">
              {ruleType === "nominal" ? "Nominal Markup Margin (Rp):" : "Persentase Markup Margin (%):"}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-mono font-bold text-slate-400">
                {ruleType === "nominal" ? "Rp" : "%"}
              </span>
              <input
                id="markup-rule-value-input"
                type="number"
                min={0}
                max={ruleType === "percent" ? 100 : 1_000_000}
                step={ruleType === "nominal" ? 500 : 1}
                value={ruleValue}
                onChange={(e) => setRuleValue(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full pl-9 pr-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-400"
                placeholder={ruleType === "nominal" ? "1000" : "10"}
              />
            </div>

            {/* Quick Pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              <span className="text-[10px] text-slate-400">Preset:</span>
              {ruleType === "nominal" ? (
                [500, 1000, 1500, 2000, 3000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRuleValue(val)}
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border transition cursor-pointer ${
                      ruleValue === val
                        ? "bg-slate-900 border-slate-900 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    +Rp {val.toLocaleString("id-ID")}
                  </button>
                ))
              ) : (
                [5, 10, 15, 20].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRuleValue(val)}
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border transition cursor-pointer ${
                      ruleValue === val
                        ? "bg-slate-900 border-slate-900 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    +{val}%
                  </button>
                ))
              )}
            </div>
          </div>

          {/* 3. Live Benchmark Preview Card */}
          <div className="p-3 rounded-xl border border-amber-200/80 bg-amber-50/40 space-y-1.5">
            <div className="flex items-center justify-between text-[10.5px]">
              <span className="font-bold text-amber-900 flex items-center gap-1">
                <Sparkles size={12} className="text-amber-700" />
                Simulasi Perhitungan Contoh:
              </span>
              <span className="text-slate-500 font-mono">Sampel Produk</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 bg-white p-2 rounded-lg border border-amber-200/60 text-center font-mono">
              <div>
                <p className="text-[9px] font-bold text-slate-400">HARGA BELI</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">Rp {samplePurchase.toLocaleString("id-ID")}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-400">HARGA JUAL</p>
                <p className="text-xs font-black text-slate-950 mt-0.5">Rp {sampleSelling.toLocaleString("id-ID")}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-emerald-700">MARGIN</p>
                <p className="text-xs font-black text-emerald-700 mt-0.5">+Rp {sampleMarkup.toLocaleString("id-ID")}</p>
              </div>
            </div>
          </div>

          {/* 4. Cart Re-Application Options */}
          {cartItemCount > 0 && (
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToCart}
                  onChange={(e) => setApplyToCart(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <div className="text-[11px] leading-tight">
                  <span className="font-bold text-slate-900">
                    Terapkan juga ke {cartItemCount} baris di keranjang
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Menghitung ulang harga jual seluruh item di keranjang mengikuti aturan baru.
                  </p>
                </div>
              </label>

              {applyToCart && manualOverrideCount > 0 && (
                <div className="pl-5 pt-1 border-t border-slate-200/80 space-y-1">
                  <div className="flex items-center gap-1 text-[10.5px] text-amber-800 font-semibold">
                    <Info size={12} className="shrink-0" />
                    <span>Ada {manualOverrideCount} baris dengan harga jual manual.</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overwriteManual}
                      onChange={(e) => setOverwriteManual(e.target.checked)}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="text-[10.5px] font-bold text-slate-800">
                      Timpa juga harga jual yang sudah diedit manual
                    </span>
                  </label>
                  {!overwriteManual && (
                    <p className="text-[9.5px] text-slate-500 italic">
                      (Default aman: harga manual tetap dipertahankan jika kotak ini tidak dicentang)
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <p className="text-[10px] text-slate-500 leading-relaxed">
            Aturan ini otomatis menjadi harga jual default saat produk baru dimasukkan ke keranjang maupun pada simulasi transaksi satuan.
          </p>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer text-center"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 py-2 text-xs font-black text-slate-950 shadow-md shadow-amber-500/20 transition cursor-pointer text-center"
            >
              Terapkan ke Katalog
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
