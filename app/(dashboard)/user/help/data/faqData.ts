import { CategoryCounts, FAQItem, HelpCategory } from "../types";

export const FAQ_DATA: FAQItem[] = [
  /* ================================================================ */
  /* ACCOUNT (4 FAQ)                                                  */
  /* ================================================================ */
  {
    id: "account-login",
    category: "account",
    question: "Saya tidak bisa masuk ke akun saya. Apa yang harus dilakukan?",
    answer:
      "Pastikan alamat email dan password yang Anda masukkan sudah benar. Jika sesi login berakhir, lakukan login ulang. Jangan pernah membagikan password, OTP, atau kode verifikasi kepada siapapun demi keamanan akun Anda.",
  },
  {
    id: "account-password",
    category: "account",
    question: "Bagaimana cara mengganti password akun?",
    answer:
      "Buka menu Pengaturan pada sidebar, lalu pilih submenu Keamanan. Masukkan password saat ini untuk re-otentikasi keamanan, lalu masukkan dan konfirmasi password baru (minimal 8 karakter).",
  },
  {
    id: "account-security",
    category: "account",
    question: "Apa yang harus saya lakukan jika mendeteksi aktivitas mencurigakan?",
    answer:
      "Segera ubah password akun Anda melalui menu Pengaturan > Keamanan. Hubungi Admin DaPay melalui kanal WhatsApp resmi dengan menyertakan detail waktu kejadian tanpa membagikan data keamanan rahasia.",
  },
  {
    id: "account-email",
    category: "account",
    question: "Mengapa email dan kode referral akun bersifat permanen (read-only)?",
    answer:
      "Email dan kode referral ditetapkan sebagai identitas permanen akun untuk menjaga integritas riwayat transaksi, pencatatan mutasi saldo, serta jaringan afiliasi Anda.",
  },

  /* ================================================================ */
  /* TRANSACTION (5 FAQ)                                              */
  /* ================================================================ */
  {
    id: "transaction-pending",
    category: "transaction",
    question: "Apa arti status pesanan 'Pending'?",
    answer:
      "Status Pending berarti pembayaran atau transaksi Anda telah tercatat dan sedang menunggu verifikasi sistem. Harap tidak melakukan pembayaran ganda sebelum status transaksi terkonfirmasi.",
  },
  {
    id: "transaction-processing",
    category: "transaction",
    question: "Apa arti status pesanan 'Diproses'?",
    answer:
      "Status Diproses menandakan transaksi telah berhasil diverifikasi dan pesanan sedang diteruskan ke sistem penyedia untuk pengiriman produk digital secara instan.",
  },
  {
    id: "transaction-success",
    category: "transaction",
    question: "Apa arti status pesanan 'Berhasil'?",
    answer:
      "Status Berhasil berarti produk digital telah sukses terkirim ke nomor tujuan / akun game Anda dan seluruh rincian Serial Number (SN) dapat dilihat pada detail transaksi.",
  },
  {
    id: "transaction-failed",
    category: "transaction",
    question: "Apa yang terjadi jika status transaksi 'Gagal'?",
    answer:
      "Jika transaksi Gagal (misalnya nomor tujuan salah atau gangguan penyedia), dana otomatis dikembalikan sesuai metode sumber dana awal. Periksa riwayat saldo atau hubungi admin dengan Order ID jika membutuhkan bantuan.",
  },
  {
    id: "transaction-refund",
    category: "transaction",
    question: "Bagaimana aturan pengembalian dana (refund) jika transaksi gagal?",
    answer:
      "Pengembalian dana dikembalikan secara proporsional ke sumber dana awal transaksi: pembayaran via Saldo kembali ke Saldo DaPay, dan pembayaran via Koin kembali ke Koin DaPay.",
  },

  /* ================================================================ */
  /* BALANCE (4 FAQ)                                                  */
  /* ================================================================ */
  {
    id: "balance-deposit",
    category: "balance",
    question: "Bagaimana cara melakukan isi saldo (deposit) DaPay?",
    answer:
      "Buka menu Deposit pada sidebar, masukkan nominal yang diinginkan, pilih metode pembayaran (QRIS / Virtual Account / Transfer Bank), dan bayar sesuai total nominal termasuk kode unik.",
  },
  {
    id: "balance-deposit-asset",
    category: "balance",
    question: "Apakah deposit menambah Saldo DaPay atau Koin DaPay?",
    answer:
      "Deposit hanya menambah Saldo DaPay (aset likuid utama). Deposit tidak menambah Koin DaPay.",
  },
  {
    id: "balance-pending",
    category: "balance",
    question: "Saya sudah transfer tetapi deposit masih berstatus Pending?",
    answer:
      "Pastikan nominal yang Anda transfer sama persis hingga 3 digit kode unik terakhir. Verifikasi QRIS dan transfer otomatis biasanya diproses dalam 1-5 menit. Jika ada kendala, hubungi admin dengan bukti transfer.",
  },
  {
    id: "balance-withdraw",
    category: "balance",
    question: "Bagaimana cara melakukan penarikan saldo (withdraw)?",
    answer:
      "Buka menu Tarik Saldo, masukkan nominal penarikan, pilih rekening bank atau e-wallet tujuan, serta pastikan nomor rekening dan nama pemilik rekening sesuai sebelum mengajukan penarikan.",
  },

  /* ================================================================ */
  /* COIN / CASHBACK (3 FAQ)                                          */
  /* ================================================================ */
  {
    id: "coin-what-is",
    category: "coin",
    question: "Apa itu Koin DaPay dan bagaimana cara menggunakannya?",
    answer:
      "Koin DaPay adalah aset reward reward/cashback loyalitas. Koin dapat digunakan sebagai potongan pembayaran pada produk digital yang mendukung pembayaran koin.",
  },
  {
    id: "coin-cashback",
    category: "coin",
    question: "Ke mana cashback transaksi akan masuk?",
    answer:
      "Cashback dari promo transaksi digital diberikan dalam bentuk Koin DaPay dan langsung ditambahkan ke saldo koin akun Anda setelah transaksi selesai.",
  },
  {
    id: "coin-withdraw",
    category: "coin",
    question: "Apakah Koin DaPay dapat dicairkan atau ditarik ke rekening bank?",
    answer:
      "Tidak. Koin DaPay adalah aset reward belanja hemat dan tidak dapat dicairkan atau ditarik ke rekening bank maupun e-wallet.",
  },

  /* ================================================================ */
  /* REFERRAL / AFILIASI (3 FAQ)                                      */
  /* ================================================================ */
  {
    id: "referral-link",
    category: "referral",
    question: "Di mana saya bisa mendapatkan kode dan link referral saya?",
    answer:
      "Buka menu Afiliasi Saya pada sidebar. Link referral dan kode unik Anda ditampilkan pada banner utama untuk disalin dan dibagikan ke calon mitra.",
  },
  {
    id: "referral-commission",
    category: "referral",
    question: "Ke mana komisi referral akan masuk?",
    answer:
      "Komisi referral dari transaksi mitra otomatis masuk ke Saldo DaPay Anda (bukan Koin) dan dapat digunakan untuk berbelanja maupun ditarik ke rekening bank.",
  },
  {
    id: "referral-difference",
    category: "referral",
    question: "Apa perbedaan antara komisi referral dan cashback?",
    answer:
      "Komisi referral bersumber dari transaksi mitra dan masuk sebagai Saldo DaPay (dapat ditarik), sedangkan Cashback bersumber dari promo transaksi pribadi dan masuk sebagai Koin DaPay (belanja hemat).",
  },
];

/**
 * Dynamically computes FAQ count per category from the actual FAQ dataset.
 */
export function calculateCategoryCounts(items: FAQItem[]): CategoryCounts {
  const counts: CategoryCounts = {
    all: items.length,
    account: 0,
    transaction: 0,
    balance: 0,
    coin: 0,
    referral: 0,
  };

  for (const item of items) {
    if (item.category && counts[item.category] !== undefined) {
      counts[item.category]++;
    }
  }

  return counts;
}

export function filterFaqItems(
  items: FAQItem[],
  category: HelpCategory,
  searchKeyword: string
): FAQItem[] {
  const keyword = searchKeyword.trim().toLowerCase();

  return items.filter((item) => {
    const matchesCategory = category === "all" || item.category === category;

    if (!matchesCategory) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    const searchable = `${item.question} ${item.answer} ${item.category}`.toLowerCase();
    return searchable.includes(keyword);
  });
}

