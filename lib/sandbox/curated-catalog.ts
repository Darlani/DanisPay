/**
 * CURATED SANDBOX CATALOG CONFIGURATION & BRAND WHITELIST
 *
 * Phase 6 — Rebased Batch 1:
 * - product_unified_view is the authoritative SOURCE OF TRUTH for Sandbox Catalog items.
 * - This file defines:
 *   1. Category definitions (Game, Pulsa & Data, PLN, E-Wallet)
 *   2. Brand whitelist configuration & educational metadata/tips
 *   3. Backwards-compatible legacy exports for components pending Batch 2/3 refactors
 */

export type SandboxCategoryKey = "game" | "pulsa-data" | "pln" | "emoney";

export interface CuratedCategoryConfig {
  key: SandboxCategoryKey;
  displayName: string;
  description: string;
  iconName: string;
  databaseCategoryNames: string[];
}

export interface CuratedSandboxBrandConfig {
  brandName: string; // Exact match against product_unified_view.brand_name
  brandKey: string; // URL-safe identifier
  categoryKey: SandboxCategoryKey;
  displayName: string;
  badge?: string;
  educationalTip?: string;
  imageUrl?: string;
}

/**
 * Curated categories displayed in the Sandbox environment.
 */
export const CURATED_SANDBOX_CATEGORIES_CONFIG: CuratedCategoryConfig[] = [
  {
    key: "game",
    displayName: "Game",
    description: "Top-up game online terpopuler dengan harga distributor real-time",
    iconName: "Gamepad2",
    databaseCategoryNames: ["game"],
  },
  {
    key: "pulsa-data",
    displayName: "Pulsa & Data",
    description: "Isi ulang pulsa dan paket kuota internet all operator",
    iconName: "Smartphone",
    databaseCategoryNames: ["pulsa & data seluler"],
  },
  {
    key: "pln",
    displayName: "Listrik PLN",
    description: "Token listrik PLN prabayar 24 jam instan",
    iconName: "Zap",
    databaseCategoryNames: ["tagihan prabayar"],
  },
  {
    key: "emoney",
    displayName: "E-Wallet",
    description: "Top-up saldo dompet digital DANA, GoPay, OVO, ShopeePay",
    iconName: "Wallet",
    databaseCategoryNames: ["e-wallet & saldo"],
  },
];

/**
 * Whitelist of curated brands featured in the Sandbox simulation catalog.
 * Variants inside these brands are loaded dynamically from public.product_unified_view.
 */
export const CURATED_SANDBOX_BRANDS: CuratedSandboxBrandConfig[] = [
  // --- Category: game ---
  {
    brandName: "MOBILE LEGENDS",
    brandKey: "mobile-legends",
    categoryKey: "game",
    displayName: "Mobile Legends",
    badge: "POPULER",
    educationalTip: "Diamond MLBB memiliki perputaran tercepat dengan varian nominal sangat lengkap.",
    imageUrl: "/images/mlbb-1.jpg",
  },
  {
    brandName: "FREE FIRE",
    brandKey: "free-fire",
    categoryKey: "game",
    displayName: "Free Fire",
    badge: "HOT",
    educationalTip: "Game favorit di segmen mobile dan pelajar dengan volume transaksi harian tinggi.",
    imageUrl: "/images/ff-1.jpg",
  },
  {
    brandName: "PUBG MOBILE",
    brandKey: "pubg-mobile",
    categoryKey: "game",
    displayName: "PUBG Mobile",
    badge: "KOMPETITIF",
    educationalTip: "Pembelian UC melonjak signifikan terutama saat pergantian season Royale Pass.",
    imageUrl: "/images/pubg-1.jpg",
  },
  {
    brandName: "Valorant",
    brandKey: "valorant",
    categoryKey: "game",
    displayName: "Valorant",
    badge: "FAVORIT",
    educationalTip: "Segmen PC gaming dengan loyalitas pembelian Valorant Points (VP) dan skin bundle yang kuat.",
    imageUrl: "/images/valorant-1.jpg",
  },

  // --- Category: pulsa-data ---
  {
    brandName: "TELKOMSEL",
    brandKey: "telkomsel",
    categoryKey: "pulsa-data",
    displayName: "Telkomsel",
    badge: "JARINGAN TERLUAS",
    educationalTip: "Operator dengan penetrasi terluas di Indonesia, perputaran pulsa & data sangat konsisten.",
    imageUrl: "/images/telkomsel-1.jpg",
  },
  {
    brandName: "XL",
    brandKey: "xl",
    categoryKey: "pulsa-data",
    displayName: "XL Axiata",
    badge: "DATA COMBO",
    educationalTip: "Populer untuk paket data kuota internet Xtra Combo dan perpanjangan masa aktif.",
    imageUrl: "/images/xl.jpg",
  },
  {
    brandName: "AXIS",
    brandKey: "axis",
    categoryKey: "pulsa-data",
    displayName: "AXIS",
    badge: "HEMAT",
    educationalTip: "Paket kuota hemat mingguan dan warnet paling banyak digemari segmen muda.",
    imageUrl: "/images/axis.jpg",
  },
  {
    brandName: "TRI",
    brandKey: "tri",
    categoryKey: "pulsa-data",
    displayName: "Tri",
    badge: "KUOTA BESAR",
    educationalTip: "Keunggulan masa aktif panjang dan akumulasi sisa kuota menarik pelanggan loyal.",
    imageUrl: "/images/tri.jpg",
  },
  {
    brandName: "by.U",
    brandKey: "byu",
    categoryKey: "pulsa-data",
    displayName: "by.U",
    badge: "DIGITAL TELCO",
    educationalTip: "Digital telco dari Telkomsel dengan kustomisasi kuota fleksibel sesuai budget user.",
    imageUrl: "/images/byU.webp",
  },
  {
    brandName: "INDOSAT",
    brandKey: "indosat",
    categoryKey: "pulsa-data",
    displayName: "Indosat Ooredoo",
    badge: "FREEDOM INTERNET",
    educationalTip: "Pilihan favorit untuk paket kuota internet utama tanpa pembagian zona dan waktu.",
    imageUrl: "/images/indosat-1.jpg",
  },

  // --- Category: pln ---
  {
    brandName: "PLN",
    brandKey: "pln",
    categoryKey: "pln",
    displayName: "Token Listrik",
    badge: "KEBUTUHAN POKOK",
    educationalTip: "Kebutuhan harian rumah tangga dengan frekuensi repeat order tinggi dan pasti setiap bulan.",
    imageUrl: "/images/token-listrik-1.jpg",
  },

  // --- Category: emoney ---
  {
    brandName: "DANA",
    brandKey: "dana",
    categoryKey: "emoney",
    displayName: "DANA",
    badge: "RETAIL UMKM",
    educationalTip: "Dompet digital terpopuler untuk pembayaran transaksi ritel warung dan merchant UMKM.",
    imageUrl: "/payment/dana.png",
  },
  {
    brandName: "GO PAY",
    brandKey: "gopay",
    categoryKey: "emoney",
    displayName: "GoPay",
    badge: "EKOSISTEM SUPERAPP",
    educationalTip: "Kebutuhan harian untuk transportasi, layanan pesan makanan GoFood, dan transaksi digital.",
    imageUrl: "/payment/gopay.png",
  },
  {
    brandName: "OVO",
    brandKey: "ovo",
    categoryKey: "emoney",
    displayName: "OVO",
    badge: "MERCHANT NETWORK",
    educationalTip: "Banyak digunakan untuk pembayaran parkir, transaksi e-commerce, dan merchant rekanan.",
    imageUrl: "/payment/ovo.png",
  },
  {
    brandName: "SHOPEE PAY",
    brandKey: "shopeepay",
    categoryKey: "emoney",
    displayName: "ShopeePay",
    badge: "BELANJA ONLINE",
    educationalTip: "Favorit pengguna marketplace untuk diskon belanja online dan kupon potongan harga.",
    imageUrl: "/payment/shopeepay.png",
  },
];

/**
 * Returns image URL for a given brand name, brand key, or product name.
 */
export function getBrandImageUrl(brandIdentifier?: string | null): string {
  if (!brandIdentifier) return "/images/mlbb-1.jpg";
  const lower = brandIdentifier.toLowerCase().trim();

  if (lower.includes("mobile legend") || lower.includes("mlbb") || lower.includes("diamond ml")) {
    return "/images/mlbb-1.jpg";
  }
  if (lower.includes("free fire") || lower.includes("ff")) {
    return "/images/ff-1.jpg";
  }
  if (lower.includes("pubg")) {
    return "/images/pubg-1.jpg";
  }
  if (lower.includes("valorant")) {
    return "/images/valorant-1.jpg";
  }
  if (lower.includes("telkomsel") || lower.includes("simpati") || lower.includes("kartu as")) {
    return "/images/telkomsel-1.jpg";
  }
  if (lower.includes("indosat") || lower.includes("im3") || lower.includes("ooredoo")) {
    return "/images/indosat-1.jpg";
  }
  if (lower.includes("tri") || lower.includes("three") || lower === "3") {
    return "/images/tri.jpg";
  }
  if (lower.includes("xl") || lower.includes("axiata")) {
    return "/images/xl.jpg";
  }
  if (lower.includes("axis")) {
    return "/images/axis.jpg";
  }
  if (lower.includes("by.u") || lower.includes("byu")) {
    return "/images/byU.webp";
  }
  if (lower.includes("pln") || lower.includes("listrik") || lower.includes("token")) {
    return "/images/token-listrik-1.jpg";
  }
  if (lower.includes("dana")) {
    return "/payment/dana.png";
  }
  if (lower.includes("gopay") || lower.includes("go-pay") || lower.includes("go pay")) {
    return "/payment/gopay.png";
  }
  if (lower.includes("ovo")) {
    return "/payment/ovo.png";
  }
  if (lower.includes("shopee")) {
    return "/payment/shopeepay.png";
  }
  if (lower.includes("linkaja") || lower.includes("link aja")) {
    return "/payment/linkaja.png";
  }

  const found = CURATED_SANDBOX_BRANDS.find(
    (b) => b.brandName.toLowerCase() === lower || b.brandKey.toLowerCase() === lower
  );
  return found?.imageUrl || "/images/mlbb-1.jpg";
}

/**
 * Returns brand metadata config by brandName or brandKey.
 */
export function getCuratedBrandConfig(brandIdentifier: string): CuratedSandboxBrandConfig | undefined {
  if (!brandIdentifier) return undefined;
  const normalized = brandIdentifier.trim().toLowerCase();
  return CURATED_SANDBOX_BRANDS.find(
    (b) => b.brandName.toLowerCase() === normalized || b.brandKey.toLowerCase() === normalized,
  );
}

/**
 * Returns all curated brand configs for a given category key.
 */
export function getCuratedBrandsByCategory(categoryKey: SandboxCategoryKey): CuratedSandboxBrandConfig[] {
  return CURATED_SANDBOX_BRANDS.filter((b) => b.categoryKey === categoryKey);
}

/**
 * Returns category config for a given category key.
 */
export function getCuratedCategoryConfig(categoryKey: SandboxCategoryKey): CuratedCategoryConfig | undefined {
  return CURATED_SANDBOX_CATEGORIES_CONFIG.find((c) => c.key === categoryKey);
}

// =============================================================================
// BACKWARDS-COMPATIBILITY EXPORTS
// Retained to prevent compile errors in SandboxCatalogView.tsx & simulate-transaction
// pending upcoming Batch 2 & Batch 3 refactors.
// =============================================================================

export interface CuratedSandboxProduct {
  id: string;
  sku: string;
  canonicalSku?: string;
  canonicalProductId?: string;
  name: string;
  category: "pulsa" | "data" | "pln" | "emoney" | "game";
  categoryLabel: string;
  brand: string;
  demoPrice: number;
  buyPrice: number;
  cashback: number;
  suggestedSellingPrice: number;
  description: string;
  isSandbox: true;
  badge: "DEMO • SIMULASI";
  provider: string;
}

export interface CuratedSandboxCategory {
  id: string;
  label: string;
}

export const CURATED_SANDBOX_CATEGORIES: CuratedSandboxCategory[] = [
  { id: "all", label: "Semua Produk" },
  { id: "game", label: "Game" },
  { id: "pulsa-data", label: "Pulsa & Data" },
  { id: "pln", label: "Listrik PLN" },
  { id: "emoney", label: "E-Wallet" },
  { id: "pulsa", label: "Pulsa" },
  { id: "data", label: "Paket Data" },
];

/**
 * @deprecated Static baseline products retained for backward compatibility.
 * Authoritative catalog items are resolved dynamically from public.product_unified_view
 * via getDynamicSandboxCatalog() in dynamic-catalog-service.ts.
 */
export const CURATED_SANDBOX_PRODUCTS: CuratedSandboxProduct[] = [
  // Pulsa Seluler
  {
    id: "sim-prod-01",
    sku: "SIM-PULSA-TSEL-10K",
    canonicalSku: "Tlk10",
    canonicalProductId: "948e4161-86de-4fe7-bb96-51686fdecaf2",
    name: "Telkomsel Pulsa Reguler Rp 10.000",
    category: "pulsa",
    categoryLabel: "Pulsa Seluler",
    brand: "Telkomsel",
    demoPrice: 10500,
    buyPrice: 9800,
    cashback: 150,
    suggestedSellingPrice: 12000,
    description: "Pulsa reguler Telkomsel masa aktif 30 hari (Simulasi)",
    isSandbox: true,
    badge: "DEMO • SIMULASI",
    provider: "Simulasi Internal DaPay",
  },
  {
    id: "sim-prod-02",
    sku: "SIM-PULSA-TSEL-25K",
    canonicalSku: "Tlk25",
    canonicalProductId: "b8562c77-c1e1-401e-b9a7-f624a0fcc6c4",
    name: "Telkomsel Pulsa Reguler Rp 25.000",
    category: "pulsa",
    categoryLabel: "Pulsa Seluler",
    brand: "Telkomsel",
    demoPrice: 25200,
    buyPrice: 24000,
    cashback: 300,
    suggestedSellingPrice: 27000,
    description: "Pulsa reguler Telkomsel masa aktif 30 hari (Simulasi)",
    isSandbox: true,
    badge: "DEMO • SIMULASI",
    provider: "Simulasi Internal DaPay",
  },
  {
    id: "sim-prod-03",
    sku: "SIM-PULSA-ISAT-10K",
    name: "Indosat IM3 Pulsa Reguler Rp 10.000",
    category: "pulsa",
    categoryLabel: "Pulsa Seluler",
    brand: "Indosat",
    demoPrice: 10450,
    buyPrice: 9800,
    cashback: 150,
    suggestedSellingPrice: 12000,
    description: "Pulsa reguler Indosat Ooredoo masa aktif 30 hari (Simulasi)",
    isSandbox: true,
    badge: "DEMO • SIMULASI",
    provider: "Simulasi Internal DaPay",
  },
  {
    id: "sim-prod-04",
    sku: "SIM-PULSA-XL-10K",
    canonicalSku: "x10",
    canonicalProductId: "d225a2c7-3f6f-4987-af5f-fe78be2d3b66",
    name: "XL Axiata Pulsa Reguler Rp 10.000",
    category: "pulsa",
    categoryLabel: "Pulsa Seluler",
    brand: "XL Axiata",
    demoPrice: 10500,
    buyPrice: 9800,
    cashback: 150,
    suggestedSellingPrice: 12000,
    description: "Pulsa reguler XL Axiata masa aktif 30 hari (Simulasi)",
    isSandbox: true,
    badge: "DEMO • SIMULASI",
    provider: "Simulasi Internal DaPay",
  },

  // Paket Data
  {
    id: "sim-prod-05",
    sku: "SIM-DATA-TSEL-5GB",
    canonicalSku: "pre30083793",
    canonicalProductId: "52f122d0-dc30-4407-be2c-7028161eb0bc",
    name: "Telkomsel Data Flash 5 GB / 30 Hari",
    category: "data",
    categoryLabel: "Paket Data",
    brand: "Telkomsel",
    demoPrice: 28000,
    buyPrice: 25000,
    cashback: 500,
    suggestedSellingPrice: 32000,
    description: "Kuota utama 5 GB berlaku 24 jam di semua jaringan (Simulasi)",
    isSandbox: true,
    badge: "DEMO • SIMULASI",
    provider: "Simulasi Internal DaPay",
  },
  {
    id: "sim-prod-06",
    sku: "SIM-DATA-TSEL-10GB",
    canonicalSku: "pre30168538",
    canonicalProductId: "338a9bee-88f8-4ff8-9629-8b72a4f6ad2b",
    name: "Telkomsel Data Flash 10 GB / 30 Hari",
    category: "data",
    categoryLabel: "Paket Data",
    brand: "Telkomsel",
    demoPrice: 48000,
    buyPrice: 43000,
    cashback: 800,
    suggestedSellingPrice: 55000,
    description: "Kuota utama 10 GB berlaku 24 jam di semua jaringan (Simulasi)",
    isSandbox: true,
    badge: "DEMO • SIMULASI",
    provider: "Simulasi Internal DaPay",
  },
  {
    id: "sim-prod-07",
    sku: "SIM-DATA-ISAT-7GB",
    name: "Indosat Freedom Internet 7 GB / 30 Hari",
    category: "data",
    categoryLabel: "Paket Data",
    brand: "Indosat",
    demoPrice: 32000,
    buyPrice: 28500,
    cashback: 600,
    suggestedSellingPrice: 37000,
    description: "Kuota utama 7 GB 24 jam tanpa pembagian waktu (Simulasi)",
    isSandbox: true,
    badge: "DEMO • SIMULASI",
    provider: "Simulasi Internal DaPay",
  },

  // Token Listrik PLN
  {
    id: "sim-prod-08",
    sku: "SIM-PLN-20K",
    canonicalSku: "pre30082353",
    canonicalProductId: "e6ad41b1-090e-4afe-8fc7-bfd88c60f051",
    name: "PLN Token Listrik Prabayar Rp 20.000",
    category: "pln",
    categoryLabel: "Token Listrik PLN",
    brand: "PLN",
    demoPrice: 20500,
    buyPrice: 19800,
    cashback: 200,
    suggestedSellingPrice: 22500,
    description: "Simulasi pembelian 20 digit token listrik PLN prabayar",
    isSandbox: true,
    badge: "DEMO • SIMULASI",
    provider: "Simulasi Internal DaPay",
  },
  {
    id: "sim-prod-09",
    sku: "SIM-PLN-50K",
    canonicalSku: "pre30082354",
    canonicalProductId: "f2a96a4c-3eeb-423c-805f-0c0f3f17fb09",
    name: "PLN Token Listrik Prabayar Rp 50.000",
    category: "pln",
    categoryLabel: "Token Listrik PLN",
    brand: "PLN",
    demoPrice: 50500,
    buyPrice: 49500,
    cashback: 300,
    suggestedSellingPrice: 53000,
    description: "Simulasi pembelian 20 digit token listrik PLN prabayar",
    isSandbox: true,
    badge: "DEMO • SIMULASI",
    provider: "Simulasi Internal DaPay",
  },
  {
    id: "sim-prod-10",
    sku: "SIM-PLN-100K",
    canonicalSku: "pre30082357",
    canonicalProductId: "2b6dfcfb-8c51-492c-aa2a-1b72fd8ad24d",
    name: "PLN Token Listrik Prabayar Rp 100.000",
    category: "pln",
    categoryLabel: "Token Listrik PLN",
    brand: "PLN",
    demoPrice: 100500,
    buyPrice: 99000,
    cashback: 500,
    suggestedSellingPrice: 103000,
    description: "Simulasi pembelian 20 digit token listrik PLN prabayar",
    isSandbox: true,
    badge: "DEMO • SIMULASI",
    provider: "Simulasi Internal DaPay",
  },

  // Saldo E-Wallet
  {
    id: "sim-prod-11",
    sku: "SIM-DANA-20K",
    canonicalSku: "dana20",
    canonicalProductId: "f01ad829-7d26-4900-a112-18401926cc40",
    name: "Top Up Saldo DANA Rp 20.000",
    category: "emoney",
    categoryLabel: "Saldo E-Wallet",
    brand: "DANA",
    demoPrice: 20500,
    buyPrice: 19800,
    cashback: 200,
    suggestedSellingPrice: 22000,
    description: "Simulasi pengisian saldo dompet digital DANA",
    isSandbox: true,
    badge: "DEMO • SIMULASI",
    provider: "Simulasi Internal DaPay",
  },
  {
    id: "sim-prod-12",
    sku: "SIM-DANA-50K",
    canonicalSku: "dana50",
    canonicalProductId: "58dcb2a2-9042-4c05-aab1-703d18c1d72a",
    name: "Top Up Saldo DANA Rp 50.000",
    category: "emoney",
    categoryLabel: "Saldo E-Wallet",
    brand: "DANA",
    demoPrice: 50500,
    buyPrice: 49500,
    cashback: 300,
    suggestedSellingPrice: 52500,
    description: "Simulasi pengisian saldo dompet digital DANA",
    isSandbox: true,
    badge: "DEMO • SIMULASI",
    provider: "Simulasi Internal DaPay",
  },
  {
    id: "sim-prod-13",
    sku: "SIM-GOPAY-20K",
    name: "Top Up Saldo GoPay Rp 20.000",
    category: "emoney",
    categoryLabel: "Saldo E-Wallet",
    brand: "GoPay",
    demoPrice: 20500,
    buyPrice: 19800,
    cashback: 200,
    suggestedSellingPrice: 22000,
    description: "Simulasi pengisian saldo dompet digital GoPay",
    isSandbox: true,
    badge: "DEMO • SIMULASI",
    provider: "Simulasi Internal DaPay",
  },
  {
    id: "sim-prod-14",
    sku: "SIM-OVO-20K",
    name: "Top Up Saldo OVO Rp 20.000",
    category: "emoney",
    categoryLabel: "Saldo E-Wallet",
    brand: "OVO",
    demoPrice: 20500,
    buyPrice: 19800,
    cashback: 200,
    suggestedSellingPrice: 22000,
    description: "Simulasi pengisian saldo dompet digital OVO",
    isSandbox: true,
    badge: "DEMO • SIMULASI",
    provider: "Simulasi Internal DaPay",
  },
];

export function getCuratedSandboxProducts(category?: string): CuratedSandboxProduct[] {
  if (!category || category === "all") {
    return CURATED_SANDBOX_PRODUCTS;
  }
  return CURATED_SANDBOX_PRODUCTS.filter((item) => item.category === category);
}

export function calculateSimulatedMargin(costPrice: number, sellingPrice: number) {
  const marginAmount = sellingPrice - costPrice;
  const marginPercent = costPrice > 0 ? (marginAmount / costPrice) * 100 : 0;
  return {
    marginAmount,
    marginPercent: Number(marginPercent.toFixed(1)),
  };
}
