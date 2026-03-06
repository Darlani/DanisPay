// lib/constants/product-mappings.ts

export const SUB_BRAND_DICTIONARY: any = {

"TELKOMSEL": [
    // --- KATEGORI KHUSUS (Prioritas Tinggi) ---
    { key: "combo sakti", slug: "combo-sakti" },
    { key: "internet sakti", slug: "internet-sakti" },
    { key: "gamesmax unlimited play", slug: "gamesmax-unlimited-play" },
    { key: "unlimitedmax", slug: "unlimitedmax" },
    { key: "surprise deal", slug: "surprise-deal" },
    { key: "terbaik untukmu", slug: "terbaik-untukmu" },
    { key: "ketengan tiktok", slug: "ketengan-tiktok" },
    { key: "ukm combo", slug: "ukm-combo" },
    { key: "ukm plus", slug: "ukm-plus" },
    
    // --- KATEGORI UMUM ---
    { key: "flash", slug: "flash" },
    { key: "umroh", slug: "umroh" },
    { key: "malam", slug: "malam" },
    { key: "whatsapp", slug: "whatsapp" },
    { key: "youtube", slug: "youtube" },
    { key: "instagram", slug: "instagram" },
    { key: "facebook", slug: "facebook" },
    { key: "gamesmax", slug: "gamesmax" },
    { key: "omg", slug: "omg" },
    { key: "gigamax", slug: "gigamax" },
    { key: "ilmupedia", slug: "ilmupedia" },
    { key: "orbit", slug: "orbit" },
    { key: "internetmax", slug: "internetmax" },
    { key: "ukm", slug: "ukm" },
    { key: "combo", slug: "combo" },
    { key: "netflix", slug: "netflix" },
    { key: "ruangguru", slug: "ruangguru" },
    { key: "non puma", slug: "non-puma" },
    { key: "videomax", slug: "videomax" }
  ],

"INDOSAT": [
    // --- KATEGORI UMROH & HAJI (Paling Spesifik) ---
    { key: "umroh haji internet", slug: "umroh-haji-internet" },
    { key: "umroh haji combo", slug: "umroh-haji-combo" },
    { key: "umroh haji", slug: "umroh-haji" },
    { key: "haji", slug: "haji" },

    // --- KATEGORI FREEDOM INTERNET & 5G ---
    { key: "freedom internet 5g", slug: "freedom-internet-5g" },
    { key: "freedom internet gift", slug: "freedom-internet-gift" },
    { key: "freedom internet", slug: "freedom-internet" },

    // --- KATEGORI FREEDOM COMBO & U ---
    { key: "freedom combo gift", slug: "freedom-combo-gift" },
    { key: "freedom combo", slug: "freedom-combo" },
    { key: "freedom u gift", slug: "freedom-u-gift" },
    { key: "freedom u", slug: "freedom-u" },

    // --- KATEGORI YELLOW ---
    { key: "yellow gift", slug: "yellow-gift" },
    { key: "yellow", slug: "yellow" },

    // --- KATEGORI COMBO DATA ---
    { key: "combo data", slug: "combo-data" },
    { key: "extra booster", slug: "combo-data" },
    { key: "pulsa reguler combo", slug: "pulsa-regular-combo" },
    { key: "pulsa regular combo", slug: "pulsa-regular-combo" },
    { key: "tambah masa aktif", slug: "masa-aktif" },

    // --- KATEGORI FREEDOM LAINNYA ---
    { key: "freedom longlife", slug: "freedom-longlife" },
    { key: "freedom harian", slug: "freedom-harian" },
    { key: "freedom apps gift", slug: "freedom-apps-gift" },
    { key: "freedom apps", slug: "freedom-apps" },
    { key: "freedom max", slug: "freedom-max" },
    { key: "freedom play", slug: "freedom-play" },
    { key: "freedom spesial", slug: "freedom-spesial" },

    // --- KATEGORI WILAYAH & KHUSUS ---
    { key: "jawa tengah - jawa barat", slug: "jawa-tengah-jawa-barat" },
    { key: "jabodetabek", slug: "jabodetabek" },
    { key: "jawa barat", slug: "jawa-barat" },
    { key: "sumatera", slug: "sumatera" },
    { key: "kalisumapa", slug: "kalisumapa" },

    // --- KATEGORI PROMO & EVENT ---
    { key: "extra booster gift", slug: "extra-booster-gift" },
    { key: "fifa world cup", slug: "fifa-world-cup" },
    { key: "ramadan", slug: "ramadan" },
    { key: "hifi air", slug: "hifi-air" },
    { key: "roaming", slug: "roaming" },
    { key: "ekstra", slug: "ekstra" },
    { key: "umkm", slug: "umkm" }
  ],

  "XL": [
    { key: "xtra combo", slug: "xtra-combo" },
    { key: "akrab", slug: "xl-akrab" }
  ],

  "AXIS": [
    { key: "bronet", slug: "axis-bronet" },
    { key: "owsem", slug: "axis-owsem" }
  ],
  "MOBILE LEGENDS": [
    { key: "weekly diamond pass", slug: "weekly-diamond-pass" },
    { key: "twilight pass", slug: "twilight-pass" },
    { key: "diamonds", slug: "diamonds-ml" }
  ],
  "FREE FIRE": [
    { key: "membership", slug: "membership" },
    { key: "diamonds", slug: "diamonds" }
  ]
};

// Fungsi Helper buat nyari slug (Biar route.ts lo bersih)
// lib/constants/product-mappings.ts

// lib/constants/product-mappings.ts

export const getSubBrandSlug = (brand: string, productName: string, category: string, type: string): string => {
  const b = brand.toUpperCase();
  const name = productName.toLowerCase();
  const cat = (category || "").toLowerCase();
  const t = (type || "").toLowerCase();

  // 1. CEK DICTIONARY (Prioritas Super Utama)
  // Biarkan Freedom Internet, Yellow, dll masuk ke tabnya masing-masing dulu
  if (SUB_BRAND_DICTIONARY[b]) {
    const match = SUB_BRAND_DICTIONARY[b].find((item: any) => name.includes(item.key));
    if (match) return match.slug; 
  }

  // 2. CEGATAN COMBO DATA (Prioritas Kedua)
  // Kalau lolos dictionary, tapi ada tanda "+" dan satuan kuota, masuk Combo Data (Tab Pulsa)
  if (name.includes("+") && /\d+\s*(mb|gb)/i.test(name)) {
    return "combo-data";
  }

  // 3. LOGIKA DATA UMUM (Prioritas Ketiga - Disatukan)
  // Kalau lolos dictionary dan bukan combo, tapi ada MB/GB atau kata kunci internet, masuk Data Umum
  if (
    /\d+\s*(mb|gb)/i.test(name) ||
    name.includes("data") || 
    name.includes("internet") || 
    name.includes("telepon") || 
    name.includes("sms") || 
    name.includes("kuota") || 
    name.includes("voucher")
  ) {
    return "data-umum"; 
  }

  // 3. LOGIKA PULSA (Reguler vs Transfer) - Sisa yang murni nominal angka
  const isNominal = /(\d+[\d.]*)/.test(name);
  const isTransfer = t.includes("transfer") || name.includes("transfer");

  if (cat.includes("pulsa") || ["TELKOMSEL", "INDOSAT", "XL", "AXIS", "TRI", "SMARTFREN"].includes(b)) {
    if (isTransfer) return "pulsa-transfer";
    if (isNominal) return "pulsa-reguler";
  }

  return "umum"; 
};

export const PULSA_CATEGORY_SLUGS = [
  'pulsa-reguler',
  'pulse-regular', 
  'pulsa-transfer',
  'pulsa-regular-combo',
  'combo-data',
  'masa-aktif',
  'tambah-masa-aktif',
  'umum' 
];