import { supabaseAdmin } from '@/utils/supabaseAdmin';
import {
  CURATED_SANDBOX_BRANDS,
  CURATED_SANDBOX_CATEGORIES_CONFIG,
  CuratedSandboxBrandConfig,
  SandboxCategoryKey,
} from '@/lib/sandbox/curated-catalog';

export interface DynamicCatalogVariant {
  id: string;
  sku: string;
  name: string;
  price: number;
  discount: number;
  effectivePrice: number;
  promoLabel: string | null;
  cashback: number;
  isAvailable: boolean;
  subBrand: string | null;
}

// Type alias for backwards compatibility
export type DynamicSandboxCatalogItem = DynamicCatalogVariant;

export interface DynamicCatalogBrand {
  brandKey: string;
  brandName: string;
  displayName: string;
  categoryKey: SandboxCategoryKey;
  badge?: string;
  educationalTip?: string;
  totalVariants: number;
  products: DynamicCatalogVariant[];
}

export interface DynamicCatalogCategory {
  categoryKey: SandboxCategoryKey;
  displayName: string;
  description: string;
  iconName: string;
  totalProducts: number;
  brands: DynamicCatalogBrand[];
}

export interface DynamicSandboxCatalogResponse {
  success: boolean;
  categories: DynamicCatalogCategory[];
  totalProducts: number;
  cached: boolean;
  timestamp: string;
}

interface CatalogCacheData {
  timestamp: number;
  categories: DynamicCatalogCategory[];
  totalProducts: number;
}

interface UnifiedProductViewRow {
  id: string;
  sku: string;
  name: string;
  category_id: string | null;
  category_name: string | null;
  brand_id: number | null;
  brand_name: string | null;
  sub_brand: string | null;
  price: number | null;
  discount: number | null;
  cashback: number | null;
  promo_label: string | null;
  is_active: boolean | null;
  is_storefront_eligible: boolean | null;
  updated_at?: string | null;
}

let memoryCache: CatalogCacheData | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

/**
 * Resets the in-memory dynamic catalog cache.
 */
export function clearDynamicSandboxCatalogCache(): void {
  memoryCache = null;
}

/**
 * Resolves the dynamic Sandbox catalog directly from public.product_unified_view.
 *
 * Rules:
 * - Source of Truth: public.product_unified_view
 * - Filtering: is_active = true, is_storefront_eligible = true, price > 0
 * - Whitelist: Only brands registered in CURATED_SANDBOX_BRANDS
 * - Hierarchy: Categories -> Brands -> Product Variants (sorted price ASC)
 * - ProviderExecutionEngine is NOT used for catalog display (fast resolution, zero provider dependency)
 */
export async function getDynamicSandboxCatalog(options?: {
  bypassCache?: boolean;
}): Promise<DynamicSandboxCatalogResponse> {
  const now = Date.now();
  if (!options?.bypassCache && memoryCache && now - memoryCache.timestamp < CACHE_TTL_MS) {
    return {
      success: true,
      categories: memoryCache.categories,
      totalProducts: memoryCache.totalProducts,
      cached: true,
      timestamp: new Date(memoryCache.timestamp).toISOString(),
    };
  }

  // 1. Build brand lookup maps from curated whitelist
  // Normalize brandName for case-insensitive matching (e.g. "Valorant" vs "VALORANT")
  const brandConfigMap = new Map<string, CuratedSandboxBrandConfig>();
  const curatedBrandNames: string[] = [];

  for (const brandConfig of CURATED_SANDBOX_BRANDS) {
    brandConfigMap.set(brandConfig.brandName.toLowerCase().trim(), brandConfig);
    curatedBrandNames.push(brandConfig.brandName);
  }

  // 2. Query public.product_unified_view for active, storefront-eligible items
  const { data: rows, error: queryError } = await supabaseAdmin
    .from('product_unified_view')
    .select(
      'id, sku, name, category_id, category_name, brand_id, brand_name, sub_brand, price, discount, cashback, promo_label, is_active, is_storefront_eligible',
    )
    .eq('is_active', true)
    .eq('is_storefront_eligible', true)
    .gt('price', 0)
    .order('price', { ascending: true })
    .limit(2000);

  if (queryError) {
    console.error('🔥 [DynamicSandboxCatalog] Failed to query product_unified_view:', queryError.message);
    throw new Error(`Database catalog query failed: ${queryError.message}`);
  }

  const productRows = (rows || []) as UnifiedProductViewRow[];

  // 3. Filter rows against curated brand whitelist and group by brandKey
  const variantsByBrandKey = new Map<string, DynamicCatalogVariant[]>();

  for (const row of productRows) {
    if (!row.brand_name) continue;
    const nameLower = (row.name || "").toLowerCase();
    const skuLower = (row.sku || "").toLowerCase();
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
      continue;
    }

    const normalizedBrandName = row.brand_name.toLowerCase().trim();
    const brandConfig = brandConfigMap.get(normalizedBrandName);
    if (!brandConfig) continue; // Brand not in curated whitelist

    const rawPrice = Math.round(Number(row.price)) || 0;
    if (rawPrice <= 0) continue;

    const rawDiscount = Number(row.discount) || 0;
    const discount = rawDiscount > 0 ? rawDiscount : 0;
    const effectivePrice =
      discount > 0 ? Math.max(0, Math.floor(rawPrice * (1 - discount / 100))) : rawPrice;
    const rawCashback = Math.max(0, Math.round(Number(row.cashback)) || 0);
    const promoLabel = row.promo_label ? String(row.promo_label).trim() : null;

    const variant: DynamicCatalogVariant = {
      id: String(row.id),
      sku: String(row.sku),
      name: String(row.name),
      price: rawPrice,
      discount,
      effectivePrice,
      promoLabel: promoLabel || null,
      cashback: rawCashback,
      isAvailable: true,
      subBrand: row.sub_brand ? String(row.sub_brand).trim() : null,
    };

    const existingList = variantsByBrandKey.get(brandConfig.brandKey);
    if (existingList) {
      existingList.push(variant);
    } else {
      variantsByBrandKey.set(brandConfig.brandKey, [variant]);
    }
  }

  // 4. Construct hierarchy: Categories -> Brands -> Variants
  const categories: DynamicCatalogCategory[] = [];
  let grandTotalProducts = 0;

  for (const catConfig of CURATED_SANDBOX_CATEGORIES_CONFIG) {
    const brandsInCategory = CURATED_SANDBOX_BRANDS.filter(
      (b) => b.categoryKey === catConfig.key,
    );

    const builtBrands: DynamicCatalogBrand[] = [];
    let categoryProductCount = 0;

    for (const brandConfig of brandsInCategory) {
      const variants = variantsByBrandKey.get(brandConfig.brandKey) || [];
      // Sort variants by price ascending
      variants.sort((a, b) => a.price - b.price);

      // Only include brands that currently have available products in the view
      if (variants.length > 0) {
        categoryProductCount += variants.length;
        builtBrands.push({
          brandKey: brandConfig.brandKey,
          brandName: brandConfig.brandName,
          displayName: brandConfig.displayName,
          categoryKey: brandConfig.categoryKey,
          badge: brandConfig.badge,
          educationalTip: brandConfig.educationalTip,
          totalVariants: variants.length,
          products: variants,
        });
      }
    }

    grandTotalProducts += categoryProductCount;
    categories.push({
      categoryKey: catConfig.key,
      displayName: catConfig.displayName,
      description: catConfig.description,
      iconName: catConfig.iconName,
      totalProducts: categoryProductCount,
      brands: builtBrands,
    });
  }

  // 5. Update in-memory cache
  memoryCache = {
    timestamp: now,
    categories,
    totalProducts: grandTotalProducts,
  };

  return {
    success: true,
    categories,
    totalProducts: grandTotalProducts,
    cached: false,
    timestamp: new Date(now).toISOString(),
  };
}

/**
 * Resolves a single dynamic Sandbox product by its ID (UUID) or SKU across all categories.
 */
export async function resolveDynamicSandboxProduct(
  productIdOrSku: string,
  options?: { bypassCache?: boolean },
): Promise<DynamicCatalogVariant | null> {
  if (!productIdOrSku) return null;
  const catalogResponse = await getDynamicSandboxCatalog(options);
  for (const cat of catalogResponse.categories) {
    for (const brand of cat.brands) {
      for (const prod of brand.products) {
        if (prod.id === productIdOrSku || prod.sku === productIdOrSku) {
          return prod;
        }
      }
    }
  }
  return null;
}
