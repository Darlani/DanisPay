export type OrderStatus =
  | "Pending"
  | "Expired"
  | "Proses"
  | "Berhasil"
  | "Gagal";

export type Order = {
  id: string;
  order_id?: string | null;
  api_ref_id?: string | null;
  sku?: string | null;
  product_name?: string | null;
  item_label?: string | null;
  customer_no?: string | null;
  customer_name?: string | null;
  buy_price?: number | string | null;
  price?: number | string | null;
  total_amount?: number | string | null;
  discount?: number | string | null;
  voucher_code?: string | null;
  voucher_amount?: number | string | null;
  cashback?: number | string | null;
  payment_method?: string | null;
  product_type?: string | null;
  sn?: string | null;
  category?: string | null;
  status?: string | null;
  used_balance?: number | string | null;
  used_coin?: number | string | null;
  unique_code?: number | string | null;
  refund_balance?: number | string | null;
  refund_coin?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
  paid_at?: string | null;
  processed_at?: string | null;
  completed_at?: string | null;
};

export type StatusCounts = {
  semua: number;
  pending: number;
  expired: number;
  proses: number;
  berhasil: number;
  gagal: number;
};

export type OrdersSummary = {
  totalSpent: number;
  totalCount: number;
  successCount: number;
  processingCount: number;
  failedCount: number;
  expiredCount?: number;
  pendingCount?: number;
  statusCounts?: StatusCounts;
};

export type OrdersPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type OrdersApiResponse = {
  success?: boolean;
  data?: {
    orders: Order[];
    pagination: OrdersPagination;
    summary: OrdersSummary;
    categories: string[];
  };
  error?: string;
};

export type SortOption = "newest" | "oldest" | "highest_amount" | "lowest_amount";

export type OrderFilters = {
  search: string;
  status: string;
  category: string;
  paymentMethod: string;
  sort: SortOption;
  date: string;
  page: number;
  limit: number;
};

/* ================================================================== */
/* HELPERS & FORMATTERS                                               */
/* ================================================================== */

export function toNumber(value: unknown): number {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

export function formatRupiah(value: unknown): string {
  const amount = toNumber(value);
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

export function formatCoins(value: unknown): string {
  const amount = toNumber(value);
  return `${amount.toLocaleString("id-ID")} Koin`;
}

export function formatDate(value: unknown): string {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";

  const day = String(date.getDate()).padStart(2, "0");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

export function formatDateOnly(value: unknown): string {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatTimeOnly(value: unknown): string {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  return (
    date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }) + " WIB"
  );
}

export function normalizeStatus(value?: string | null): OrderStatus {
  const status = String(value || "").trim().toLowerCase();

  if (
    status === "berhasil" ||
    status === "success" ||
    status === "successful" ||
    status === "selesai" ||
    status === "lunas"
  ) {
    return "Berhasil";
  }

  if (
    status === "expired" ||
    status === "kadaluarsa"
  ) {
    return "Expired";
  }

  if (
    status === "proses" ||
    status === "diproses" ||
    status === "processing" ||
    status === "process"
  ) {
    return "Proses";
  }

  if (
    status === "gagal" ||
    status === "failed" ||
    status === "reject" ||
    status === "rejected" ||
    status === "batal" ||
    status === "canceled" ||
    status === "refund" ||
    status === "refunded"
  ) {
    return "Gagal";
  }

  return "Pending";
}

export function displayOrderId(orderId?: string | null): string {
  if (!orderId) return "-";
  const value = String(orderId).trim();
  if (value.startsWith("DANISH-") || value.startsWith("DAPAY-")) {
    return value;
  }
  return value.length > 12 ? `DAPAY-${value.slice(-8).toUpperCase()}` : value;
}

export function getStatusClasses(status: OrderStatus) {
  switch (status) {
    case "Berhasil":
      return {
        badge: "border-emerald-200/80 bg-emerald-50 text-emerald-700",
        dot: "bg-emerald-500",
        text: "text-emerald-700",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
      };
    case "Proses":
      return {
        badge: "border-blue-200/80 bg-blue-50 text-blue-700",
        dot: "bg-blue-500 animate-pulse",
        text: "text-blue-700",
        bg: "bg-blue-50",
        border: "border-blue-200",
      };
    case "Expired":
      return {
        badge: "border-slate-300 bg-slate-100 text-slate-600",
        dot: "bg-slate-400",
        text: "text-slate-600",
        bg: "bg-slate-100",
        border: "border-slate-300",
      };
    case "Gagal":
      return {
        badge: "border-rose-200/80 bg-rose-50 text-rose-700",
        dot: "bg-rose-500",
        text: "text-rose-700",
        bg: "bg-rose-50",
        border: "border-rose-200",
      };
    default:
      return {
        badge: "border-amber-200/80 bg-amber-50 text-amber-700",
        dot: "bg-amber-500",
        text: "text-amber-700",
        bg: "bg-amber-50",
        border: "border-amber-200",
      };
  }
}

export function getPaymentLabel(method?: string | null): string {
  if (!method) return "-";
  const value = method.trim().toLowerCase();

  if (value.includes("qris")) return "QRIS";
  if (value.includes("dana")) return "DANA";
  if (value.includes("gopay") || value.includes("go-pay")) return "GoPay";
  if (value.includes("ovo")) return "OVO";
  if (value.includes("shopee") || value.includes("spay")) return "ShopeePay";
  if (value.includes("linkaja") || value.includes("link aja")) return "LinkAja";
  if (value.includes("bca")) return "BCA VA";
  if (value.includes("mandiri")) return "Mandiri VA";
  if (value.includes("bri")) return "BRI VA";
  if (value.includes("bni")) return "BNI VA";
  if (value.includes("indomaret")) return "Indomaret";
  if (value.includes("alfamart") || value.includes("alfamidi")) return "Alfamart";
  if (value.includes("sakuku")) return "Sakuku";
  if (value.includes("isaku") || value.includes("i-saku")) return "i.Saku";
  if (value.includes("mixed") || value.includes("saldo + koin")) return "Saldo + Koin";
  if (value.includes("saldo") || value.includes("balance")) return "Saldo DaPay";
  if (value.includes("koin") || value.includes("coin")) return "Koin DaPay";

  return method;
}

export function getPaymentLogo(method?: string | null): string | null {
  if (!method) return null;
  const value = method.trim().toLowerCase();

  // Dana (e.g. "dana", "dana sesama", "transfer dana", "saldo dana")
  if (value.includes("dana")) return "/payment/dana.png";

  // GoPay (e.g. "gopay", "go-pay", "gopay transfer")
  if (value.includes("gopay") || value.includes("go-pay")) return "/payment/gopay.png";

  // ShopeePay (e.g. "shopeepay", "shopee", "spay")
  if (value.includes("shopee") || value.includes("spay")) return "/payment/shopeepay.png";

  // OVO
  if (value.includes("ovo")) return "/payment/ovo.png";

  // QRIS
  if (value.includes("qris")) return "/payment/qris.png";

  // LinkAja
  if (value.includes("linkaja") || value.includes("link aja")) return "/payment/linkaja.png";

  // Bank VA / Transfer
  if (value.includes("bca")) return "/payment/bca.png";
  if (value.includes("bni")) return "/payment/bni.png";
  if (value.includes("bri")) return "/payment/bri.png";
  if (value.includes("mandiri")) return "/payment/mandiri.png";

  // Retail Stores
  if (value.includes("indomaret") || value.includes("indomart")) return "/payment/indomaret.png";
  if (value.includes("alfamart") || value.includes("alfamidi") || value.includes("alfa")) return "/payment/alfamart.png";

  // E-Wallet Others
  if (value.includes("sakuku")) return "/payment/sakuku.png";
  if (value.includes("isaku") || value.includes("i-saku")) return "/payment/isaku.png";
  if (value.includes("atm")) return "/payment/atm-bersama.png";

  // Saldo / Koin DaPay
  if (
    value.includes("saldo") ||
    value.includes("koin") ||
    value.includes("dapay") ||
    value.includes("balance") ||
    value.includes("mixed")
  ) {
    return "/images/DaPay.svg";
  }

  return null;
}

export function resolveCustomerName(order?: Order | null): string | null {
  if (!order) return null;

  // 1. Direct customer_name
  if (order.customer_name && order.customer_name.trim() !== "-" && order.customer_name.trim() !== "") {
    return order.customer_name.trim();
  }

  // 2. PLN / Game SN parsing (e.g. "TOKEN/NAMA PELANGGAN/...")
  if (order.sn && order.sn.includes("/")) {
    const parts = order.sn.split("/");
    if (parts.length > 1 && parts[1]?.trim() && parts[1].trim() !== "-") {
      return parts[1].trim();
    }
  }

  // 3. Fallback: desc json if desc object is present
  if ((order as unknown as { desc?: unknown }).desc) {
    const d = (order as unknown as { desc: unknown }).desc;
    if (typeof d === "object" && d !== null) {
      const obj = d as Record<string, unknown>;
      const name = obj.nama || obj.nama_pelanggan || obj.customer_name;
      if (typeof name === "string" && name.trim()) return name.trim();
    }
  }

  return null;
}

export function maskSensitiveToken(token?: string | null): string {
  if (!token) return "-";
  const trimmed = token.trim();
  if (trimmed.length <= 8) {
    return `${trimmed.slice(0, 2)} •••• ${trimmed.slice(-2)}`;
  }
  const start = trimmed.slice(0, 4);
  const end = trimmed.slice(-4);
  return `${start} •••• •••• ${end}`;
}

export function getProductImage(name?: string | null): string | null {
  if (!name) return null;
  const lower = name.toLowerCase().trim();

  if (lower.includes("mobile legend") || lower.includes("mlbb") || lower.includes("diamond ml")) {
    return "/images/mlbb-1.jpg";
  }
  if (lower.includes("free fire") || lower.includes("ff max") || lower.includes("ff global") || lower === "ff" || lower.startsWith("ff ")) {
    return "/images/ff-1.jpg";
  }
  if (lower.includes("pubg")) {
    return "/images/pubg-1.jpg";
  }
  if (lower.includes("genshin")) {
    return "/images/genshin.jpg";
  }
  if (lower.includes("honkai") || lower.includes("hsr")) {
    return "/images/hsr.jpg";
  }
  if (lower.includes("valorant")) {
    return "/images/valorant-1.jpg";
  }
  if (lower.includes("roblox") || lower.includes("robux")) {
    return "/images/roblox.jpg";
  }
  if (lower.includes("honor of kings") || lower.includes("hok")) {
    return "/images/hok-1.jpg";
  }
  if (lower.includes("call of duty") || lower.includes("codm") || lower.includes("cod mobile")) {
    return "/images/codm-1.jpg";
  }
  if (lower.includes("brawl star")) {
    return "/images/brawl-stars.jpg";
  }
  if (lower.includes("minecraft")) {
    return "/images/minecraft.jpg";
  }
  if (lower.includes("point blank") || lower.includes(" pb ") || lower.startsWith("pb ") || lower === "pb") {
    return "/images/pb.jpg";
  }
  if (lower.includes("league of legend") || lower.includes("wild rift") || lower.includes(" lol ") || lower.startsWith("lol ") || lower === "lol") {
    return "/images/lol.jpg";
  }
  if (lower.includes("steam")) {
    return "/images/steam.jpg";
  }
  if (lower.includes("google play") || lower.includes("googleplay")) {
    return "/images/google-play.jpg";
  }
  if (lower.includes("playstation") || lower.includes("psn")) {
    return "/images/psn-1.jpg";
  }
  if (lower.includes("game pass")) {
    return "/images/pc-game-pass.jpg";
  }
  if (lower.includes("xbox")) {
    return "/images/xbox.jpg";
  }
  if (lower.includes("garena") || lower.includes("undawn")) {
    return "/images/garena.jpg";
  }
  if (lower.includes("razer")) {
    return "/images/razer-1.jpg";
  }
  if (lower.includes("pokemon")) {
    return "/images/pokemon-go.jpg";
  }
  if (lower.includes("fate") || lower.includes("fgo")) {
    return "/images/fgo.jpg";
  }
  if (lower.includes("fortnite")) {
    return "/images/fortnite.jpg";
  }
  if (lower.includes("fifa") || lower.includes("ea sports") || lower.includes("fc mobile") || lower === "ea" || lower.startsWith("ea ")) {
    return "/images/ea.jpg";
  }
  if (lower.includes("whiteout")) {
    return "/images/whiteout-1.jpg";
  }
  if (lower.includes("monopoly")) {
    return "/images/monopoly.jpg";
  }
  if (lower.includes("candy crush")) {
    return "/images/candy-crush-1.jpg";
  }
  if (lower.includes("coin master")) {
    return "/images/coin-master.jpg";
  }
  if (lower.includes("royal match")) {
    return "/images/royal-match.jpg";
  }
  if (lower.includes("au2")) {
    return "/images/au2.jpg";
  }
  if (lower.includes("netflix")) {
    return "/images/netflix-1.jpg";
  }
  if (lower.includes("spotify")) {
    return "/images/spotify.jpg";
  }
  if (lower.includes("canva")) {
    return "/images/canva.jpg";
  }
  if (lower.includes("capcut")) {
    return "/images/capcut.jpg";
  }
  if (lower.includes("discord")) {
    return "/images/discord.jpg";
  }
  if (lower.includes("telegram")) {
    return "/images/telegram.jpg";
  }
  if (lower.includes("tiktok")) {
    return "/images/tiktok.jpg";
  }
  if (lower.includes("vidio")) {
    return "/images/vidio.jpg";
  }
  if (lower.includes("webtoon")) {
    return "/images/webtoon.jpg";
  }
  if (lower.includes("youku")) {
    return "/images/youku.jpg";
  }
  if (lower.includes("ometv") || lower.includes("ome tv")) {
    return "/images/ometv.jpg";
  }
  if (lower.includes("apple") || lower.includes("itunes")) {
    return "/images/apple.jpg";
  }
  if (lower.includes("amazon")) {
    return "/images/amazon.jpg";
  }
  if (lower.includes("mcafee")) {
    return "/images/mcafee.jpg";
  }
  if (lower.includes("exitlag")) {
    return "/images/exitlag.jpg";
  }
  if (lower.includes("turbo vpn") || lower.includes("vpn")) {
    return "/images/turbo-vpn.jpg";
  }
  if (lower.includes("tagihan listrik") || lower.includes("pln pasca")) {
    return "/images/tagihan-listrik-1.jpg";
  }
  if (lower.includes("token listrik") || lower.includes("token pln") || lower.includes("pln") || lower.includes("listrik")) {
    return "/images/token-listrik-1.jpg";
  }
  if (lower.includes("telkomsel") || lower.includes("simpati") || lower.includes("kartu as")) {
    return "/images/telkomsel-1.jpg";
  }
  if (lower.includes("indosat") || lower.includes("im3") || lower.includes("ooredoo")) {
    return "/images/indosat-1.jpg";
  }
  if (lower.includes("axis")) {
    return "/images/axis.jpg";
  }
  if (lower.includes("xl")) {
    return "/images/xl.jpg";
  }
  if (lower.includes("tri") || lower.includes("three") || lower.includes("3 tri")) {
    return "/images/tri.jpg";
  }
  if (lower.includes("smartfren")) {
    return "/images/smartfren.jpg";
  }
  if (lower.includes("by.u") || lower.includes("byu")) {
    return "/images/byU.webp";
  }
  if (lower.includes("shopee")) {
    return "/images/shopee.jpg";
  }
  if (lower.includes("lazada")) {
    return "/images/lazada.jpg";
  }
  if (lower.includes("zalora")) {
    return "/images/zalora-1.jpg";
  }
  if (lower.includes("maxim")) {
    return "/images/maxim-2.jpg";
  }
  if (lower.includes("linkaja")) {
    return "/images/linkaja.jpg";
  }
  if (lower.includes("pesawat") || lower.includes("flight")) {
    return "/images/flight.jpg";
  }
  if (lower.includes("kereta") || lower.includes("train") || lower.includes("kai")) {
    return "/images/train.jpg";
  }
  if (lower.includes("hotel")) {
    return "/images/hotel.jpg";
  }
  if (lower.includes("niagahoster")) {
    return "/images/niagahoster.jpg";
  }
  if (lower.includes("domain")) {
    return "/images/domain-shop.jpg";
  }
  if (lower.includes("vps")) {
    return "/images/vps-gaming-1.jpg";
  }

  return null;
}

export function getProductSlug(name?: string | null, category?: string | null): string {
  if (!name) return "";
  const lower = name.toLowerCase().trim();
  const cat = (category || "").toLowerCase().trim();

  // 1. PLN (Prabayar & Pascabayar)
  if (lower.includes("pascabayar") || cat.includes("pascabayar") || lower.includes("tagihan listrik")) {
    return "pln-pascabayar";
  }
  if (lower.includes("pln") || lower.includes("token listrik") || cat.includes("pln") || lower.includes("listrik")) {
    return "pln";
  }

  // 2. Pulsa & Data Operator
  if (lower.includes("telkomsel") || lower.includes("simpati") || lower.includes("as ")) return "telkomsel";
  if (lower.includes("indosat") || lower.includes("im3") || lower.includes("ooredoo")) return "indosat";
  if (lower.includes("axis")) return "axis";
  if (lower.includes("smartfren")) return "smartfren";
  if (lower.includes("by.u") || lower.includes("byu")) return "byu";
  if (lower === "xl" || lower.startsWith("xl ") || lower.includes(" xl")) return "xl";
  if (lower === "tri" || lower.startsWith("tri ") || lower.includes(" tri") || lower.includes("three")) return "tri";

  // 3. E-Wallet
  if (lower.includes("dana")) return "dana";
  if (lower.includes("gopay") || lower.includes("go-pay")) return "gopay";
  if (lower.includes("ovo")) return "ovo";
  if (lower.includes("shopee") || lower.includes("spay")) return "shopee-pay";
  if (lower.includes("linkaja")) return "linkaja";
  if (lower.includes("mandiri e-toll") || lower.includes("e-toll")) return "mandiri-e-toll";
  if (lower.includes("tix id") || lower.includes("tixid")) return "tix-id";
  if (lower.includes("maxim")) return "maxim";

  // 4. Games Top Up
  if (lower.includes("mobile legend") || lower.includes("mlbb")) return "mobile-legends";
  if (lower.includes("free fire global") || lower.includes("ff global")) return "ff-global";
  if (lower.includes("free fire") || lower.includes("ff")) return "free-fire";
  if (lower.includes("pubg")) return "pubg-mobile";
  if (lower.includes("valorant")) return "valorant";
  if (lower.includes("genshin")) return "genshin-impact";
  if (lower.includes("honkai: star rail") || lower.includes("honkai star rail") || lower.includes("hsr")) return "honkai-star-rail";
  if (lower.includes("honkai impact")) return "honkai-impact-3";
  if (lower.includes("honor of kings") || lower.includes("hok")) return "honor-of-kings";
  if (lower.includes("whiteout")) return "whiteout-survival-frost-star";
  if (lower.includes("point blank") || lower.includes(" pb ") || lower === "pb") return "point-blank";
  if (lower.includes("minecraft")) return "minecraft";
  if (lower.includes("roblox")) return "roblox";
  if (lower.includes("brawl star")) return "brawl-stars";
  if (lower.includes("clash of clan") || lower.includes("coc")) return "clash-of-clans";
  if (lower.includes("clash royale")) return "clash-royale";
  if (lower.includes("hay day")) return "hay-day";
  if (lower.includes("stumble guys")) return "stumble-guys";
  if (lower.includes("super sus")) return "super-sus";
  if (lower.includes("sausage man")) return "sausage-man";
  if (lower.includes("ragnarok twilight")) return "ragnarok-twilight";
  if (lower.includes("ragnarok origin")) return "ragnarok-origin";
  if (lower.includes("ragnarok m")) return "ragnarok-m-eternal-love";
  if (lower.includes("undawn")) return "undawn";
  if (lower.includes("aov") || lower.includes("arena of valor")) return "aov";
  if (lower.includes("speed drifters")) return "speed-drifters";
  if (lower.includes("crossfire")) return "crossfire";
  if (lower.includes("heroes evolved")) return "heroes-evolved";
  if (lower.includes("lifeafter")) return "lifeafter-credits";
  if (lower.includes("lords mobile")) return "lords-mobile";
  if (lower.includes("mu origin")) return "mu-origin-3";
  if (lower.includes("one punch man")) return "one-punch-man";
  if (lower.includes("seal m")) return "seal-m-sea";
  if (lower.includes("state of survival")) return "state-of-survival";
  if (lower.includes("the ants")) return "the-ants-underground-kingdom";
  if (lower.includes("tower of fantasy")) return "tower-of-fantasy";
  if (lower.includes("wild rift")) return "league-of-legends-wild-rift";
  if (lower.includes("league of legends") || lower === "lol") return "lol";
  if (lower.includes("zepeto")) return "zepeto";
  if (lower.includes("pokemon")) return "pokemon-go";
  if (lower.includes("fate") || lower.includes("fgo")) return "fgo";
  if (lower.includes("fortnite")) return "fortnite";
  if (lower.includes("monopoly")) return "monopoly-go";
  if (lower.includes("candy crush")) return "candy-crush";
  if (lower.includes("coin master")) return "coin-master";
  if (lower.includes("royal match")) return "royal-match";

  // 5. Vouchers & Gift Cards
  if (lower.includes("steam")) return "steam-gift";
  if (lower.includes("google play") || lower.includes("googleplay")) return "google-play";
  if (lower.includes("playstation") || lower.includes("psn")) return "psn-gift";
  if (lower.includes("xbox")) return "xbox-gift";
  if (lower.includes("ea gift") || lower.includes("ea sports")) return "ea-gift";
  if (lower.includes("game pass")) return "pc-game-pass";
  if (lower.includes("apple") || lower.includes("itunes")) return "apple-gift";
  if (lower.includes("razer")) return "razer-gold";
  if (lower.includes("tiktok")) return "tiktok-gift";
  if (lower.includes("zalora")) return "zalora";
  if (lower.includes("amazon")) return "amazon-gift";

  // 6. Subscriptions & Digital Services
  if (lower.includes("netflix")) return "netflix";
  if (lower.includes("spotify")) return "spotify";
  if (lower.includes("canva")) return "canva";
  if (lower.includes("capcut")) return "capcut";
  if (lower.includes("discord")) return "discord";
  if (lower.includes("webtoon")) return "webtoon";
  if (lower.includes("telegram")) return "telegram";
  if (lower.includes("vidio")) return "vidio";
  if (lower.includes("youku")) return "youku";
  if (lower.includes("ometv") || lower.includes("ome tv")) return "ometv";
  if (lower.includes("mcafee")) return "mcafee";
  if (lower.includes("vpn")) return "vpn";
  if (lower.includes("exit lag") || lower.includes("exitlag")) return "exit-lag";

  // 7. Travel & Hosting
  if (lower.includes("pesawat")) return "tiket-pesawat";
  if (lower.includes("kereta")) return "tiket-kereta";
  if (lower.includes("hotel")) return "hotel";
  if (lower.includes("niagahoster") || lower.includes("hosting")) return "niagahoster";
  if (lower.includes("domain")) return "domain-shop";
  if (lower.includes("vps")) return "vps-gaming";
  if (lower.includes("k-vision") || lower.includes("kvision")) return "k-vision-dan-gol";
  if (lower.includes("pertamina") || lower.includes("gas")) return "pertamina-gas";

  // 8. Default slugify fallback
  return lower
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-");
}
