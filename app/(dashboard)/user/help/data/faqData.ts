import { CategoryCounts, FAQItem, HelpCategory } from "../types";

export const FAQ_DATA_ID: FAQItem[] = [
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

export const FAQ_DATA_EN: FAQItem[] = [
  /* ================================================================ */
  /* ACCOUNT (4 FAQ)                                                  */
  /* ================================================================ */
  {
    id: "account-login",
    category: "account",
    question: "I cannot log in to my account. What should I do?",
    answer:
      "Make sure the email address and password you entered are correct. If your login session has expired, please log in again. Never share your password, OTP, or verification code with anyone for your account security.",
  },
  {
    id: "account-password",
    category: "account",
    question: "How do I change my account password?",
    answer:
      "Open the Settings menu in the sidebar, then select the Security tab. Enter your current password for security re-authentication, then enter and confirm your new password (minimum 8 characters).",
  },
  {
    id: "account-security",
    category: "account",
    question: "What should I do if I detect suspicious activity?",
    answer:
      "Immediately change your account password via Settings > Security. Contact DaPay Admin via the official WhatsApp channel with details of when it happened, without sharing confidential security data.",
  },
  {
    id: "account-email",
    category: "account",
    question: "Why are account email and referral code permanent (read-only)?",
    answer:
      "Email and referral code are set as permanent account identifiers to maintain the integrity of transaction history, balance mutation records, and your affiliate network.",
  },

  /* ================================================================ */
  /* TRANSACTION (5 FAQ)                                              */
  /* ================================================================ */
  {
    id: "transaction-pending",
    category: "transaction",
    question: "What does the 'Pending' order status mean?",
    answer:
      "Pending status means your payment or transaction has been recorded and is awaiting system verification. Please do not make duplicate payments before the transaction status is confirmed.",
  },
  {
    id: "transaction-processing",
    category: "transaction",
    question: "What does the 'Diproses' (Processing) order status mean?",
    answer:
      "Diproses indicates that the transaction has been verified and the order is being forwarded to the provider system for instant digital product delivery.",
  },
  {
    id: "transaction-success",
    category: "transaction",
    question: "What does the 'Berhasil' (Success) order status mean?",
    answer:
      "Berhasil status means the digital product has been successfully sent to your target number / game account and complete Serial Number (SN) details can be viewed in the transaction details.",
  },
  {
    id: "transaction-failed",
    category: "transaction",
    question: "What happens if the transaction status is 'Gagal' (Failed)?",
    answer:
      "If a transaction is Gagal (e.g., incorrect destination number or provider outage), funds are automatically refunded to the original payment source. Check your balance history or contact admin with your Order ID if you need assistance.",
  },
  {
    id: "transaction-refund",
    category: "transaction",
    question: "How does the refund policy work if a transaction fails?",
    answer:
      "Refunds are credited proportionally to the original transaction funding source: payment via Saldo returns to DaPay Saldo, and payment via Coins returns to DaPay Coins.",
  },

  /* ================================================================ */
  /* BALANCE (4 FAQ)                                                  */
  /* ================================================================ */
  {
    id: "balance-deposit",
    category: "balance",
    question: "How do I top up (deposit) DaPay balance?",
    answer:
      "Open the Deposit menu in the sidebar, enter the desired amount, select a payment method (QRIS / Virtual Account / Bank Transfer), and pay according to the total amount including unique code.",
  },
  {
    id: "balance-deposit-asset",
    category: "balance",
    question: "Does a deposit add to DaPay Saldo or DaPay Coins?",
    answer:
      "Deposit only adds to DaPay Saldo (primary liquid asset). Deposit does not add to DaPay Coins.",
  },
  {
    id: "balance-pending",
    category: "balance",
    question: "I have transferred but my deposit is still Pending?",
    answer:
      "Ensure the transfer amount matches exactly up to the last 3 digits of the unique code. QRIS verification and automatic transfers are usually processed within 1-5 minutes. If there are issues, contact admin with proof of transfer.",
  },
  {
    id: "balance-withdraw",
    category: "balance",
    question: "How do I request a balance withdrawal?",
    answer:
      "Open the Withdraw menu, enter the withdrawal amount, choose the destination bank or e-wallet account, and verify that the account number and account holder name match before submitting.",
  },

  /* ================================================================ */
  /* COIN / CASHBACK (3 FAQ)                                          */
  /* ================================================================ */
  {
    id: "coin-what-is",
    category: "coin",
    question: "What are DaPay Coins and how do I use them?",
    answer:
      "DaPay Coins are loyalty reward/cashback assets. Coins can be used as payment discounts on digital products that support coin payments.",
  },
  {
    id: "coin-cashback",
    category: "coin",
    question: "Where is transaction cashback credited?",
    answer:
      "Cashback from digital transaction promos is granted in the form of DaPay Coins and immediately added to your account coin balance once the transaction is completed.",
  },
  {
    id: "coin-withdraw",
    category: "coin",
    question: "Can DaPay Coins be cashed out or withdrawn to a bank account?",
    answer:
      "No. DaPay Coins are reward assets for shopping discounts and cannot be cashed out or withdrawn to a bank account or e-wallet.",
  },

  /* ================================================================ */
  /* REFERRAL / AFILIASI (3 FAQ)                                      */
  /* ================================================================ */
  {
    id: "referral-link",
    category: "referral",
    question: "Where can I find my referral code and link?",
    answer:
      "Open the My Affiliate menu in the sidebar. Your referral link and unique code are displayed on the main banner to copy and share with potential partners.",
  },
  {
    id: "referral-commission",
    category: "referral",
    question: "Where is referral commission credited?",
    answer:
      "Referral commission from partner transactions is automatically credited to your DaPay Saldo (not Coins) and can be used for purchases or withdrawn to a bank account.",
  },
  {
    id: "referral-difference",
    category: "referral",
    question: "What is the difference between referral commission and cashback?",
    answer:
      "Referral commission comes from partner transactions and is credited as DaPay Saldo (withdrawable), whereas Cashback comes from personal transaction promos and is credited as DaPay Coins (shopping discounts).",
  },
];

// Backward-compatible default dataset
export const FAQ_DATA: FAQItem[] = FAQ_DATA_ID;

/**
 * Returns FAQ items localized according to current locale (id or en).
 */
export function getFaqData(locale?: string): FAQItem[] {
  return locale === "en" ? FAQ_DATA_EN : FAQ_DATA_ID;
}

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
