export interface CuratedSandboxProduct {
  id: string;
  sku: string;
  name: string;
  category: "pulsa" | "data" | "pln" | "emoney";
  categoryLabel: string;
  brand: string;
  demoPrice: number;
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
  { id: "pulsa", label: "Pulsa Seluler" },
  { id: "data", label: "Paket Data" },
  { id: "pln", label: "Token Listrik PLN" },
  { id: "emoney", label: "Saldo E-Wallet" },
];

export const CURATED_SANDBOX_PRODUCTS: CuratedSandboxProduct[] = [
  // Pulsa Seluler
  {
    id: "sim-prod-01",
    sku: "SIM-PULSA-TSEL-10K",
    name: "Telkomsel Pulsa Reguler Rp 10.000",
    category: "pulsa",
    categoryLabel: "Pulsa Seluler",
    brand: "Telkomsel",
    demoPrice: 10500,
    suggestedSellingPrice: 12000,
    description: "Pulsa reguler Telkomsel masa aktif 30 hari (Simulasi)",
    isSandbox: true,
    badge: "DEMO • SIMULASI",
    provider: "Simulasi Internal DaPay",
  },
  {
    id: "sim-prod-02",
    sku: "SIM-PULSA-TSEL-25K",
    name: "Telkomsel Pulsa Reguler Rp 25.000",
    category: "pulsa",
    categoryLabel: "Pulsa Seluler",
    brand: "Telkomsel",
    demoPrice: 25200,
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
    suggestedSellingPrice: 12000,
    description: "Pulsa reguler Indosat Ooredoo masa aktif 30 hari (Simulasi)",
    isSandbox: true,
    badge: "DEMO • SIMULASI",
    provider: "Simulasi Internal DaPay",
  },
  {
    id: "sim-prod-04",
    sku: "SIM-PULSA-XL-10K",
    name: "XL Axiata Pulsa Reguler Rp 10.000",
    category: "pulsa",
    categoryLabel: "Pulsa Seluler",
    brand: "XL Axiata",
    demoPrice: 10500,
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
    name: "Telkomsel Data Flash 5 GB / 30 Hari",
    category: "data",
    categoryLabel: "Paket Data",
    brand: "Telkomsel",
    demoPrice: 28000,
    suggestedSellingPrice: 32000,
    description: "Kuota utama 5 GB berlaku 24 jam di semua jaringan (Simulasi)",
    isSandbox: true,
    badge: "DEMO • SIMULASI",
    provider: "Simulasi Internal DaPay",
  },
  {
    id: "sim-prod-06",
    sku: "SIM-DATA-TSEL-10GB",
    name: "Telkomsel Data Flash 10 GB / 30 Hari",
    category: "data",
    categoryLabel: "Paket Data",
    brand: "Telkomsel",
    demoPrice: 48000,
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
    name: "PLN Token Listrik Prabayar Rp 20.000",
    category: "pln",
    categoryLabel: "Token Listrik PLN",
    brand: "PLN",
    demoPrice: 20500,
    suggestedSellingPrice: 22500,
    description: "Simulasi pembelian 20 digit token listrik PLN prabayar",
    isSandbox: true,
    badge: "DEMO • SIMULASI",
    provider: "Simulasi Internal DaPay",
  },
  {
    id: "sim-prod-09",
    sku: "SIM-PLN-50K",
    name: "PLN Token Listrik Prabayar Rp 50.000",
    category: "pln",
    categoryLabel: "Token Listrik PLN",
    brand: "PLN",
    demoPrice: 50500,
    suggestedSellingPrice: 53000,
    description: "Simulasi pembelian 20 digit token listrik PLN prabayar",
    isSandbox: true,
    badge: "DEMO • SIMULASI",
    provider: "Simulasi Internal DaPay",
  },
  {
    id: "sim-prod-10",
    sku: "SIM-PLN-100K",
    name: "PLN Token Listrik Prabayar Rp 100.000",
    category: "pln",
    categoryLabel: "Token Listrik PLN",
    brand: "PLN",
    demoPrice: 100500,
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
    name: "Top Up Saldo DANA Rp 20.000",
    category: "emoney",
    categoryLabel: "Saldo E-Wallet",
    brand: "DANA",
    demoPrice: 20500,
    suggestedSellingPrice: 22000,
    description: "Simulasi pengisian saldo dompet digital DANA",
    isSandbox: true,
    badge: "DEMO • SIMULASI",
    provider: "Simulasi Internal DaPay",
  },
  {
    id: "sim-prod-12",
    sku: "SIM-DANA-50K",
    name: "Top Up Saldo DANA Rp 50.000",
    category: "emoney",
    categoryLabel: "Saldo E-Wallet",
    brand: "DANA",
    demoPrice: 50500,
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
