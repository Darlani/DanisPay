export interface ProviderData {
  code: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  is_catalog_enabled: boolean;
  is_execution_enabled: boolean;
  is_maintenance: boolean;
  is_storefront_visible?: boolean;
  health_status: string;
  balance: number;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_error: string | null;
  is_configured: boolean;
  created_at: string;
  updated_at: string;
}

export interface BrandMeta {
  initial: string;
  gradient: string;
  subtitle: string;
}

export interface SelectedError {
  code: string;
  name: string;
  error: string;
  time: string | null;
}

export interface ActionNotice {
  type: "success" | "error";
  message: string;
}

export type ToggleField =
  | "is_enabled"
  | "is_catalog_enabled"
  | "is_execution_enabled"
  | "is_maintenance"
  | "is_storefront_visible";

export const formatRupiah = (val: number | string | null | undefined): string => {
  const num = Number(val) || 0;
  return `Rp ${num.toLocaleString("id-ID")}`;
};

export const formatDateTime = (val: string | null | undefined): string => {
  if (!val) return "-";
  const date = new Date(val);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const PROVIDER_SYNC_CAPABILITIES: Record<string, boolean> = {
  DIGIFLAZZ: true,
};

// Brand avatar configuration: fallback vibrant color gradients and initials
export const BRAND_METRICS: Record<string, BrandMeta> = {
  APIGAMES: {
    initial: "A",
    gradient: "from-blue-500 to-blue-600 text-white shadow-blue-500/25",
    subtitle: "Game voucher, top up, dll.",
  },
  DIGIFLAZZ: {
    initial: "D",
    gradient: "from-indigo-500 to-blue-600 text-white shadow-indigo-500/25",
    subtitle: "PPOB, pulsa, paket data, dll.",
  },
  UNIPLAY: {
    initial: "U",
    gradient: "from-purple-500 to-indigo-600 text-white shadow-purple-500/25",
    subtitle: "Game voucher, top up, dll.",
  },
  VIP_RESELLER: {
    initial: "V",
    gradient: "from-violet-500 to-fuchsia-600 text-white shadow-violet-500/25",
    subtitle: "Multi-category digital goods",
  },
};

