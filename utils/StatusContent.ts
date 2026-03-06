/**
 * Utility untuk mengelola status produk secara spesifik (Maintenance per Produk).
 * Masukkan slug produk yang bermasalah di sini.
 */
export const getProductStatus = (productSlug: string) => {
  const statusMap: Record<string, { title: string; desc: string; img: string }> = {
    // TRAVEL: Tiket Kereta
    'tiket-kereta': {
      title: "KAI Maintenance",
      desc: "Layanan pemesanan Tiket Kereta sedang dalam pemeliharaan sistem vendor. Silakan cek produk travel lainnya.",
      img: "/status/maintenance-illustration.png",
    },
    // PPOB: Tagihan PLN
    'pln-pasca': {
      title: "Gangguan Server PLN",
      desc: "Pembayaran tagihan PLN sedang mengalami gangguan teknis dari pusat. Mohon coba beberapa saat lagi.",
      img: "/status/maintenance-illustration.png",
    },
    // SERVER: VPS Singapore
    'vps-sg': {
      title: "Stok VPS Habis",
      desc: "Layanan VPS Singapore sedang dalam proses restock infrastruktur. Estimasi tersedia kembali dalam 24 jam.",
      img: "/status/maintenance-illustration.png",
    },
    // GAME: Contoh spesifik
    '': {
      title: "MLBB Maintenance",
      desc: "Server top up Mobile Legends sedang dalam perbaikan rutin pasca update patch game.",
      img: "/status/maintenance-illustration.png",
    },
  };

  return statusMap[productSlug] || null;
};