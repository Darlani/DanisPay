DaPay Wallet & Coins Contract v1
Project: DaPay / my-ecommerce
Status: Draft — basis implementasi setelah Project Owner approval
Scope: Wallet/Saldo, Koin DaPay, payment composition, cashback, referral commission, refund, withdrawal, ledger/audit

1. Tujuan
Dokumen ini menetapkan kontrak finansial untuk memisahkan nilai yang dapat dicairkan (Saldo DaPay) dari reward internal yang tidak dapat dicairkan (Koin DaPay), serta memastikan pembayaran campuran dan refund selalu dapat ditelusuri ke sumber dana asal.

Repository memang sudah memiliki domain Balance, Deposit, Withdrawal, Refund, Cashback, Referral, dan Balance Logs/Audit; financial mutation juga diperlakukan sebagai area sensitif dan harus server-side/atomic.

2. Prinsip Otoritatif
Saldo dan Koin adalah dua jenis asset yang berbeda.

Client tidak pernah menjadi source of truth untuk mutasi finansial.

Checkout tidak menjadi source of truth saldo.

Setiap perubahan finansial harus memiliki audit trail.

Refund mengikuti original payment composition, bukan saldo user saat refund.

Reward diberikan berdasarkan event bisnis yang memenuhi syarat dan tidak boleh diberikan dua kali.

Status order non-final tidak boleh dianggap sebagai final financial success.

Tidak ada konversi Koin -> Saldo secara implisit.

3. Definisi Asset
3.1 Saldo DaPay
Saldo adalah nilai wallet yang:

dapat digunakan untuk pembelian;

dapat menerima Deposit;

dapat menerima Referral Commission yang sudah earned;

dapat menerima refund yang berasal dari pembayaran Saldo;

dapat ditarik melalui Withdrawal sesuai aturan;

bersifat cashable/withdrawable.

Representasi konseptual:

balance
3.2 Koin DaPay
Koin adalah reward internal yang:

dapat digunakan untuk transaksi jika produk/checkout mengizinkan;

berasal dari Cashback, Bonus, Promo, atau reward internal lain;

tidak dapat ditarik ke bank/e-wallet;

tidak dapat berubah menjadi Saldo secara otomatis;

ketika direfund, harus kembali sebagai Koin.

Representasi konseptual:

coin_balance
4. Klasifikasi Sumber Dana
Event	Asset	Withdrawable
Deposit	Saldo	Ya
Referral Commission earned	Saldo	Ya
Refund dari porsi pembayaran Saldo	Saldo	Ya
Cashback	Koin	Tidak
Bonus	Koin	Tidak
Promo / campaign reward	Koin	Tidak
Refund dari porsi pembayaran Koin	Koin	Tidak
Hard prohibition
Koin -> Saldo       DILARANG
Koin -> Withdrawal  DILARANG
Cashback -> Saldo   DILARANG
Refund Koin -> Saldo DILARANG
Kontrak ini secara sengaja memperketat model lama yang di repository masih memakai profiles.balance dan balance_logs untuk Cashback/Referral pada beberapa flow.

5. Payment Composition
Setiap order yang menggunakan wallet harus menyimpan komposisi pembayaran secara eksplisit.

Minimal secara konseptual:

order.total_amount
order.used_balance
order.used_coin
Invariant:

used_balance >= 0
used_coin >= 0
used_balance + used_coin <= total_amount
Jika tidak ada external payment dan seluruh order dibayar dari wallet:

used_balance + used_coin = total_amount
Untuk mixed payment dengan payment gateway/external payment, komponen external payment juga harus dapat ditelusuri.

6. Contoh Mixed Payment
Harga order:

Rp30.000
Komposisi:

Saldo = Rp18.000
Koin  = 12.000
Maka:

used_balance = 18.000
used_coin    = 12.000
Sistem tidak boleh menyimpan seluruh Rp30.000 sebagai used_balance lalu secara informal menganggap sebagian adalah Koin.

7. Refund Contract
7.1 Prinsip utama
Refund harus menggunakan komposisi pembayaran yang tersimpan pada order.

Contoh:

balance_used = 8.000
coin_used    = 12.000
Jika order gagal dan memenuhi syarat refund:

refund_balance = 8.000
refund_coin    = 12.000
Hasil:

Saldo +Rp8.000
Koin  +12.000
7.2 Dilarang
Jangan pernah menghitung refund dengan cara:

refund -> current user balance
atau:

refund -> balance regardless of original source
7.3 Refund idempotency
Satu order tidak boleh menerima refund yang sama dua kali.

Refund harus memiliki durable reference terhadap order/payment event dan mekanisme idempotency.

8. Cashback Contract
Cashback adalah Koin, bukan Saldo.

Cashback hanya boleh diberikan ketika event bisnis yang menjadi syarat cashback telah memenuhi kondisi final yang ditentukan.

Prinsip default:

Order dibuat
-> Payment valid
-> Fulfillment diproses
-> Order final Berhasil
-> Cashback credited ke Koin
Order Pending/Diproses tidak boleh otomatis dianggap telah menghasilkan cashback final.

Cashback juga harus idempotent agar satu order tidak menghasilkan cashback ganda.

Repository saat ini menunjukkan flow legacy yang masih menambah profiles.balance untuk Cashback dan menulis balance_logs.type = Cashback; hal ini merupakan legacy behavior yang harus dipisahkan ketika kontrak ini diimplementasikan, bukan aturan baru.

9. Referral Commission Contract
Referral Commission adalah Saldo DaPay setelah memenuhi syarat komisi.

Default lifecycle:

Referral attribution
-> transaksi valid
-> order final Berhasil
-> hitung commission
-> commission credited ke Saldo
Commission harus memiliki provenance terhadap order yang menghasilkan komisi dan harus idempotent.

Repository saat ini menunjukkan referral_commission pada order dan penambahan commission ke profiles.balance serta balance_logs.type = Referral; prinsip bahwa commission menjadi Saldo dipertahankan, tetapi mekanisme pemberian harus diperketat dengan provenance/idempotency.

10. Withdrawal Contract
Withdrawal hanya menggunakan Saldo DaPay, tidak boleh menggunakan Koin.

Kontrak yang sudah terlihat dan diverifikasi di repository:

amount      = nominal withdrawal
admin_fee   = fee awal
held_amount = amount + admin_fee
status      = Pending
profile debit = held_amount
Withdrawal atomic sudah menggunakan pola server-side dan locking; semantics approve/reject yang ada tidak boleh dirusak tanpa kontrak baru.

11. Withdrawal Approve / Reject
Existing verified semantics:

Approve
refund = held_amount - (amount + final_fee)
status -> Success
admin_fee -> final_fee
Jika refund positif, refund masuk ke Saldo dan dicatat pada ledger.

Reject
refund = held_amount
status -> Rejected
credit refund ke Saldo
Kontrak ini hanya berlaku untuk Withdrawal reversal/refund, bukan refund order pembelian. Dua domain refund tersebut tidak boleh dicampur.

12. Ledger & Audit
Setiap mutasi asset harus memiliki jejak audit yang dapat menjawab:

siapa
asset apa
berapa
sebelum berapa
sesudah berapa
sumber event apa
order/payment/withdrawal/deposit mana
kapan
Minimal secara konseptual kita membutuhkan pemisahan:

Balance Ledger
Coin Ledger
Order Payment Composition
Implementasi fisik boleh tetap memakai struktur existing selama kontrak asset_type/source_reference/idempotency dapat ditegakkan dengan jelas.

13. Proposed Ledger Shape
Jika balance_logs dipertahankan, arah desain yang disarankan:

balance_logs
- asset_type: balance | coin
- type
- amount
- initial_balance / initial_coin_balance
- final_balance / final_coin_balance
- source_type
- source_id
- order_id nullable
- idempotency_key nullable
- user_id
- created_at
Ini adalah target architecture, bukan instruksi migration langsung.

14. Order Payment Source of Truth
Checkout tidak boleh menjadi sumber kebenaran saldo.

Sumber kebenaran financial state harus server-side dan atomic.

Order menyimpan fakta payment composition; financial mutation dilakukan oleh service/RPC/server transaction yang berwenang.

15. Status & Reward Timing
Canonical final success internal tetap:

Berhasil
Pending dan Diproses bukan final success.

Reward yang bergantung pada keberhasilan transaksi sebaiknya hanya committed ketika order telah mencapai event final yang disepakati.

16. Invariants
Sistem wajib menegakkan invariant berikut:

coin_balance tidak pernah menjadi withdrawable balance.

Refund coin tidak pernah dikredit ke balance.

Refund balance tidak pernah dikredit ke coin_balance.

used_balance dan used_coin harus merepresentasikan komposisi pembayaran sebenarnya.

Total komponen pembayaran tidak boleh melebihi total order.

Cashback satu order tidak boleh credited dua kali.

Referral commission satu event tidak boleh credited dua kali.

Refund satu event tidak boleh dijalankan dua kali.

Financial mutations harus server-side/atomic.

Client-provided email tidak boleh menjadi authority owner untuk mutasi finansial.

17. Legacy Findings From Repository Snapshot
Snapshot repository menunjukkan beberapa flow legacy yang sekarang masih memperlakukan Cashback sebagai penambahan profiles.balance, dan terminology Full Koin masih menggunakan field orders.used_balance. Contoh implementasi tersebut juga menulis balance_logs.type = Cashback dan Referral. Ini menunjukkan bahwa pemisahan Saldo/Koin belum menjadi kontrak implementasi saat ini dan perlu dilakukan sebagai perubahan terencana, bukan asumsi bahwa repository sudah compliant.

Withdrawal dan deposit mempunyai primitive atomic/security yang jauh lebih kuat dan telah diverifikasi; kontrak baru harus mempertahankan properties tersebut.

18. Implementation Order
Urutan implementasi yang disarankan:

1. Finalize this contract
2. Database/schema audit
3. Define wallet + coin fields / asset typing
4. Define order payment composition
5. Define ledger source references + idempotency
6. Harden checkout wallet/coin deduction
7. Harden refund by original source
8. Move cashback to coin ledger
9. Keep/refine referral commission as balance
10. Update wallet summary / API
11. Update admin analytics/accounting definitions
12. Update user UI
13. Controlled tests
14. Production verification
19. Explicit Non-Goals
Dokumen ini tidak mengizinkan implementasi langsung tanpa review/approval lanjutan untuk:

membuat migration production;

mengubah RPC production;

mengubah order writers;

mengubah checkout/payment writers;

melakukan data backfill;

mengonversi historical cashback/referral balance ke coin secara otomatis.

Semua itu memerlukan audit compatibility dan approval terpisah.

20. Decision Record
Approved business direction
SALDO
- cashable
- withdrawable
- depositable
- referral commission
- balance-source refunds

KOIN
- non-cashable
- non-withdrawable
- cashback / reward
- coin-source refunds

REFUND
- follows original payment source

MIXED PAYMENT
- explicit balance + coin composition
21. Source Basis
Dokumen ini disusun dari repository/project materials yang tersedia, termasuk Project Charter, Business Model & Business Domain Map, project progress/checkpoint, serta repomix snapshots yang menunjukkan implementasi wallet/deposit/withdrawal/order reward saat ini.

The repository sources explicitly establish that financial domain includes Balance, Deposit, Withdrawal, Refund, Cashback, Referral, and Balance Logs/Audit, and that wallet/financial state must not depend on client-side authority. They also show verified atomic withdrawal/deposit primitives and legacy order reward logic that currently writes Cashback/Referral through profiles.balance.

Status dokumen: DRAFT FOR PROJECT OWNER APPROVAL
No production migration should be created solely from this document.

