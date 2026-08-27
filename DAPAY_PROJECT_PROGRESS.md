# DAPAY PROJECT — MASTER CHECKPOINT PROGRES OTORITATIF

Project: **DaPay / my-ecommerce**  
Stack: **Next.js + Supabase**  
Checkpoint diperbarui: **2026-08-15**  
Status saat ini: **MASTER CHECKPOINT seluruh proyek DaPay. Withdrawal, deposit, shared payment, dan MacroDroid milestone yang tercatat di bawah sudah diverifikasi sesuai scope masing-masing; security audit selanjutnya sedang dipause atas keputusan user.**  
Deployment runtime aplikasi: **BELUM DIDEploy KE VPS** karena langganan VPS sedang tidak aktif. Source lokal sudah diuji dengan `npm run dev` terhadap Supabase production.

> **PENTING UNTUK CODEX / AUDIT DI MASA DEPAN**
>
> File ini adalah master checkpoint otoritatif untuk seluruh proyek DaPay. Jangan memulai ulang audit withdrawal, deposit, shared payment, atau MacroDroid dari nol. Jangan mengulang schema, ACL, RLS, tipe data, source RPC, concurrency, atau caller yang sudah ditandai **SELESAI / TERVERIFIKASI** di bawah, kecuali ada bukti baru atau dependency langsung yang memang mengharuskannya.
>
> Pernyataan historis seperti `READ-ONLY / BELUM ADA IMPLEMENTASI BARU`, `create_withdrawal_atomic belum dibuat`, `route withdrawal belum diubah`, dan sebagainya sudah **tidak berlaku**. Pernyataan itu menggambarkan kondisi sebelum pekerjaan yang dicatat dalam checkpoint ini.

---

# 0. STATUS EKSEKUTIF

## Misi utama — Hardening Withdrawal

**SELESAI / TERVERIFIKASI**

- Batas autentikasi server berbasis Bearer token sudah diterapkan untuk flow finansial user/admin yang dimigrasikan.
- `email` dari browser/body tidak lagi menjadi otoritas kepemilikan withdrawal.
- `create_withdrawal_atomic` sudah diimplementasikan dan dideploy ke Supabase production.
- Route withdrawal user sudah dimigrasikan ke Bearer auth + RPC atomic.
- UI withdrawal user sudah dimigrasikan untuk mengirim Bearer token dan nominal dalam bentuk decimal string.
- Proteksi duplicate Pending sudah berhasil diuji.
- Approve/reject withdrawal admin V5 yang aman sudah diimplementasikan dan dideploy.
- UI withdrawal admin sudah dimigrasikan agar tidak lagi memanggil RPC V4 langsung dari browser.
- Uji terkontrol approve tanpa refund, approve dengan refund, dan reject dengan full refund sudah berhasil.
- Semantik inti withdrawal tetap kompatibel dengan aturan V4 yang sudah ada.

## Side quest penting yang selesai selama misi

**SELESAI / TERVERIFIKASI**

- Penyesuaian saldo admin atomic yang aman sudah dibuat, dideploy, dan diuji.
- Hak akses browser langsung `UPDATE public.profiles` sudah dicabut dari PUBLIC/anon/authenticated.
- Deposit Approval V5 yang aman sudah dibuat, dideploy, dan diuji setelah ditemukan approval V4 langsung dari browser tidak bisa bekerja dengan ACL yang aman.
- Akun test Jono berhasil dipulihkan setelah profile terhapus; password Auth direset secara lokal melalui Admin API dan row profile direstore menggunakan UUID Auth yang sama.
- Deposit Jono berhasil di-approve melalui V5 untuk menyediakan saldo test withdrawal.
- Tabel accidental `public.v_caller_role` yang tercipta karena menjalankan gaya PL/pgSQL `SELECT ... INTO` langsung di SQL Editor berhasil diidentifikasi dan dihapus.
- Migration production `190000`–`190800`, termasuk Deposit Reject `190700`, sudah dipush dan diverifikasi.
- Runtime SQLSTATE `42702` pada allocator member deposit sudah diperbaiki oleh `190800`; retry sukses tanpa partial mutation dari percobaan gagal.
- **DEPOSIT REJECT — VERIFIED / CLOSED** untuk scope Pending → Rejected tanpa credit saldo.
- **MACRODROID PAYMENT RESOLVER — VERIFIED / CLOSED** untuk exact match, replay, manual-bank fail-closed, dan ambiguity fail-closed.

## Masih terbuka / backlog

- Deployment source aplikasi ke VPS/runtime **SENGAJA DITUNDA** karena VPS saat ini tidak aktif / tidak berlangganan.
- Status belum deploy **bukan blocker, bukan tugas berikutnya, dan bukan backlog yang harus segera diselesaikan**.
- Jangan menyarankan, merencanakan, mengeksekusi, atau menjadikan deployment aplikasi sebagai next step default.
- Deployment hanya boleh dibahas atau dilakukan setelah user secara eksplisit menyatakan VPS sudah aktif kembali dan secara eksplisit meminta deployment.
- Selama VPS belum aktif, pekerjaan tetap dilakukan melalui local development (`npm run dev`) terhadap environment Supabase yang sudah disepakati untuk audit, hardening, dan controlled testing.
- Writer saldo legacy berbasis service-role belum semuanya atomic atau menggunakan profile row lock, sehingga risiko lost-update/race masih ada.
- Temuan historis yang sudah diremediasi: withdrawal Pending duplicate protection dan member-deposit Bearer/trusted-profile authority sudah diterapkan. Jangan perlakukan wording lama di bagian historis sebagai kondisi current.
- Route upgrade member masih memakai pola authority lama dan perlu hardening auth terpisah.
- Beberapa policy RLS/ACL yang luas perlu dirapikan setelah kebutuhan akses yang sah diinventarisasi.
- Team Management masih membaca `profiles` langsung dari browser dan dibatasi oleh RLS; bila admin membutuhkan daftar user penuh, pindahkan ke server route yang memakai Bearer auth, bukan dengan memperluas SELECT untuk seluruh authenticated.
- Label UI masih bertuliskan `DEPOSIT V4` / `WITHDRAW V4` walaupun backend approval aman sudah V5.
- Supabase generated types belum diregenerasi setelah deployment RPC baru.

## Current work mode — UI / UX + Admin Dashboard completion

Security audit saat ini dipause. Fokus development aktif adalah visual/UI improvement, kelengkapan admin dashboard, missing admin functionality, navigation/usability, consistency, responsiveness mobile/desktop, dashboard information architecture, dan bug non-security yang ditemukan saat memperbaiki UI/admin.

Jika perubahan UI menemukan isu security-critical, catat secara targeted; jangan otomatis membuka kembali seluruh audit security.

---

# 1. FONDASI AUTENTIKASI

## 1.1 Helper auth server

**SELESAI / TERVERIFIKASI**

`utils/serverAuth.ts` menyediakan:

- `authenticateRequest(request)`
  - mewajibkan `Authorization: Bearer <Supabase access token>`
  - memvalidasi token di server menggunakan Supabase Admin Auth
  - mengembalikan `user.id` yang terpercaya
- `requireAdminOrManager(request)`
  - menentukan role dari `public.profiles` menggunakan authenticated user ID
  - hanya menerima `admin` / `manager`

Jangan pernah mempercayai actor email, actor UUID, role, `isAdmin`, cookie, atau localStorage dari browser sebagai otoritas authorization.

## 1.2 Dashboard user

**SELESAI**

`/api/user/dashboard` menggunakan Bearer token dan identity yang ditentukan server.

---

# 2. HARDENING PRIVILEGE PROFILES

## 2.1 Vulnerability yang ditemukan

ACL production pada tabel `public.profiles` sebelumnya memberikan `UPDATE` kepada authenticated dan anon. RLS yang ada memperbolehkan authenticated user mengubah row profile miliknya sendiri, sehingga row-level security **tidak** mencegah modifikasi kolom sensitif seperti:

- `balance`
- `role`
- `member_type`

Hal ini membuka kemungkinan user menaikkan saldo sendiri.

## 2.2 Pengganti admin balance adjustment

Migration yang sudah dideploy:

`20260813140000_adjust_profile_balance_atomic.sql`

RPC:

```text
public.adjust_profile_balance_atomic(
  p_target_user_id uuid,
  p_delta bigint,
  p_reason text,
  p_actor_user_id uuid
) returns uuid
```

Metadata production sudah diverifikasi:

- `SECURITY INVOKER`
- owner `postgres`
- `search_path=pg_catalog, pg_temp`
- service_role EXECUTE = true
- authenticated EXECUTE = false
- anon EXECUTE = false
- PUBLIC EXECUTE = false

Semantik:

- target profile dikunci dengan `FOR UPDATE`
- penyesuaian menggunakan delta saja
- delta tidak boleh 0
- saldo akhir tidak boleh negatif
- update balance + insert `balance_logs` + insert `admin_logs` dilakukan atomic
- `balance_logs.type = 'AdminAdjustment'`
- `admin_logs.action = 'ADJUST_BALANCE'`

Migrasi UI/server:

- TeamManagement tidak lagi menulis `profiles.balance` langsung dari browser.
- Browser mengirim Bearer token ke route admin yang aman.
- Actor ditentukan dari token yang sudah diverifikasi.

Uji fungsional terhadap DB production melalui localhost:

- `+1`: saldo `0 -> 1`
- `-1`: saldo `1 -> 0`
- balance log dan admin log keduanya benar
- test yang sama diulang dan tetap berhasil setelah privilege revoke

## 2.3 Remediasi privilege production

Sudah dijalankan:

```sql
REVOKE UPDATE ON TABLE public.profiles FROM PUBLIC;
REVOKE UPDATE ON TABLE public.profiles FROM anon;
REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
```

Effective privilege production yang sudah diverifikasi:

```text
service_role_update    = true
authenticated_update   = false
anon_update            = false
public_update          = false
```

Audit source sebelum revoke tidak menemukan dependency client-side yang sah terhadap `profiles.update/insert/upsert`; writer aktif yang tersisa adalah route server/service-role.

**STATUS: DITUTUP.**

---

# 3. SIDE QUEST — PEMULIHAN AKUN TEST JONO

Side quest ini terjadi hanya untuk mendapatkan akun test yang dapat dipakai untuk pengujian finansial end-to-end.

## 3.1 Kegagalan delete Auth

Jono Auth UID:

`25e11fee-f714-4370-ae38-24a44e80f569`

Penghapusan Jono dari Supabase Auth gagal dengan `Database error deleting user`.

Audit catalog menemukan foreign key public ke `auth.users` tanpa cascade:

- `deposits.user_id`
- `error_logs.user_id`
- `orders.user_id`

Audit per-user untuk Jono:

- deposits: 0
- error_logs: 0
- orders: **7**

Karena itu Jono tidak dapat dihapus karena historical orders masih mereferensikan Auth UID tersebut. Pemeriksaan Storage ownership tidak menemukan object milik Jono.

## 3.2 Pemulihan password

Script Node lokal sekali pakai menggunakan environment Supabase service-role terpercaya untuk memanggil:

`supabase.auth.admin.updateUserById(JONO_UID, { password: ... })`

Hasil: password berhasil diperbarui.

Script lokal terpisah menggunakan anon client mengonfirmasi:

```text
LOGIN AUTH BERHASIL
User ID: 25e11fee-f714-4370-ae38-24a44e80f569
Email: jono@gmail.com
```

## 3.3 Restore profile

Row `public.profiles` milik Jono sudah sempat dihapus manual, sehingga login Auth berhasil tetapi login aplikasi tidak dapat dilanjutkan.

Metadata Auth menunjukkan:

- email: `jono@gmail.com`
- full_name: `Jono`
- role member yang diharapkan: `member`
- created_at: `2026-03-02 10:22:47.927136+00`

Profile direstore menggunakan UUID Auth yang sama dan referral code baru.

Row yang direstore berisi:

- id = Auth UID di atas
- email = `jono@gmail.com`
- full_name = `Jono`
- role = `member`
- balance = 0
- member_type = `Regular`
- created_at dipertahankan

Setelah itu login aplikasi berhasil.

**Jangan membuat Auth identity kedua untuk Jono; 7 historical orders tetap terhubung ke UID yang lama/aktif ini.**

---

# 4. SIDE QUEST — HARDENING DEPOSIT APPROVAL

Side quest ini muncul karena Jono membutuhkan saldo test untuk pengujian withdrawal.

## 4.1 Masalah yang ditemukan

UI Admin Deposit V4 memanggil langsung dari browser:

```text
supabase.rpc('approve_deposit_v4', { depo_id })
```

Metadata production `approve_deposit_v4(depo_id uuid)`:

- `SECURITY DEFINER`
- owner `postgres`
- service_role EXECUTE = true
- authenticated/anon/PUBLIC EXECUTE = false
- function internal menggunakan `auth.uid()` dan mengecek `profiles.role`

Karena itu pemanggilan dari browser gagal dengan:

`permission denied for function approve_deposit_v4`

Memberikan authenticated EXECUTE secara langsung ditolak karena tidak aman.

Server route dengan service-role juga tidak dapat memakai V4 secara aman sambil mempertahankan human actor, karena V4 bergantung pada `auth.uid()`.

## 4.2 Deposit V5 diimplementasikan

Migration yang sudah dideploy:

`20260813160000_approve_deposit_v5.sql`

RPC:

```text
public.approve_deposit_v5(
  p_deposit_id uuid,
  p_actor_user_id uuid
) returns void
```

Security production yang sudah diverifikasi:

- `SECURITY INVOKER`
- owner `postgres`
- `search_path=pg_catalog, pg_temp`
- service_role EXECUTE = true
- authenticated/anon/PUBLIC EXECUTE = false

Flow:

```text
Browser admin
-> Bearer Supabase access token
-> POST /api/admin/deposits/[depositId]/approve
-> requireAdminOrManager(request)
-> actor UUID dari token yang sudah diverifikasi
-> supabaseAdmin
-> approve_deposit_v5
```

Defense-in-depth pada RPC:

- lookup actor profile
- actor wajib role admin/manager
- deposit `FOR UPDATE`
- pengecekan not-found/status/data secara eksplisit
- target profile `FOR UPDATE`
- proteksi BIGINT overflow
- `deposits.status = Success`
- credit balance profile
- insert `balance_logs` dilakukan atomic

Urutan lock:

`deposit -> profile`

## 4.3 Uji terkontrol deposit

Deposit Jono:

- amount = `100000`
- status `Pending -> Success`
- profile balance `0 -> 100000`
- `balance_logs.type = Deposit`
- log initial `0`, final `100000`
- log `user_id` sama dengan UUID Auth/Profile Jono

**STATUS: SECURE DEPOSIT APPROVAL V5 TERVERIFIKASI.**

Catatan: route pembuatan deposit oleh member **belum** di-hardening pada side quest ini dan tetap masuk backlog.

---

# 5. MISI UTAMA — CREATE WITHDRAWAL ATOMIC

## 5.1 Vulnerability awal

`app/api/member/withdraw/route.ts` versi lama:

- tidak menggunakan Bearer authentication
- mempercayai `email` dari body
- memakai service role
- memproses saldo berdasarkan email yang dikirim client
- risiko IDOR/unauthorized withdrawal langsung
- mutation balance/withdrawal/log terpisah
- mutation finansial memakai `Promise.all`
- tidak atomic; berisiko race/lost-update/partial failure

## 5.2 Fakta schema/compatibility yang sudah diverifikasi

Field penting `public.withdrawals`:

- id uuid
- user_email
- amount bigint
- held_amount bigint
- admin_fee bigint
- status
- bank_name
- account_number
- account_name
- created_at

Tidak ada kolom `user_id` pada `withdrawals`.

Pilihan ownership tetap **Option A**:

```text
Supabase Auth user.id
-> profiles.id
-> trusted profiles.email
-> withdrawals.user_email
```

Semantik yang wajib dipertahankan:

```text
amount      = nominal withdrawal
admin_fee   = admin fee awal
held_amount = amount + admin_fee
status      = Pending
profile debit = held_amount
balance_logs.type = Withdraw
balance_logs.amount = -held_amount
```

Semantik tersebut diperlukan agar kompatibel dengan approve/reject.

## 5.3 `create_withdrawal_atomic`

Migration yang sudah dideploy:

`20260813150000_create_withdrawal_atomic.sql`

RPC:

```text
public.create_withdrawal_atomic(
  p_user_id uuid,
  p_amount bigint,
  p_bank_name text,
  p_account_number text,
  p_account_name text,
  p_admin_fee bigint
) returns uuid
```

Metadata production yang sudah diverifikasi:

- `SECURITY INVOKER`
- owner `postgres`
- `search_path=pg_catalog, pg_temp`
- service_role EXECUTE = true
- authenticated/anon/PUBLIC EXECUTE = false

Flow atomic:

1. validasi input
2. lindungi overflow bigint pada `amount + admin_fee`
3. lock target profile berdasarkan authenticated `p_user_id` memakai `FOR UPDATE`
4. ambil trusted email dari profile
5. validasi saldo
6. cek Pending menggunakan ordinary MVCC `EXISTS` berdasarkan `user_email` / status `Pending`
7. **jangan lock withdrawal row**
8. debit saldo profile
9. insert withdrawal Pending
10. insert Withdraw balance log
11. return withdrawal UUID

Alasan create tidak mengunci withdrawal row:

- approve/reject memakai urutan lock `withdrawal -> profile`
- create hanya mengunci `profile`
- mengunci withdrawal yang sudah ada setelah profile akan menciptakan urutan lock terbalik dan potensi deadlock

Request create dari user yang sama terserialisasi melalui profile lock. Request kedua melihat row Pending yang sudah committed lalu gagal.

## 5.4 Migrasi API withdrawal user

`app/api/member/withdraw/route.ts` sekarang:

- mewajibkan Bearer token melalui `authenticateRequest`
- authenticated `user.id` menjadi satu-satunya authority kepemilikan
- body tidak lagi memakai email/user_id/role/balance/admin_fee sebagai authority
- amount wajib strict decimal integer string
- parse/validasi melalui `BigInt`
- tidak menggunakan JS `Number` untuk nilai uang authoritative
- fee/minimum dibaca server-side dari `public.store_settings`
- hanya memanggil `create_withdrawal_atomic`
- direct balance read-modify-write / withdrawal insert / balance log insert / `Promise.all` versi lama sudah dihapus

Setting production yang diamati saat test:

- `withdraw_min = 10000`
- `withdraw_fee = 2500`

## 5.5 Migrasi UI withdrawal user

Flow submit withdrawal pada dashboard user sekarang:

- mengambil Supabase session access token
- mengirim Bearer header
- hanya mengirim amount + field bank/account untuk kebutuhan bisnis
- tidak mengirim email sebagai authority owner
- state amount diubah dari JS `number` menjadi raw string
- tidak ada lagi `Number()` pada jalur nominal withdrawal
- strict decimal string + validasi convenience dengan `BigInt` di client

Ini memperbaiki jalur potensi precision loss sebelumnya:

```text
input -> Number -> String -> API
```

Jalur baru:

```text
input string -> validation -> API string -> BigInt server -> PostgreSQL bigint
```

## 5.6 Uji terkontrol create

Saldo awal Jono: `100000`

Create withdrawal:

- amount = `10000`
- initial admin_fee = `2500`
- held_amount = `12500`
- status = `Pending`
- bank = data test BCA

Hasil:

- balance `100000 -> 87500`
- `balance_logs.type = Withdraw`
- log amount `-12500`
- initial `100000`
- final `87500`
- `balance_logs.user_id` = UUID Auth/Profile Jono

## 5.7 Uji duplicate Pending

Saat withdrawal pertama masih Pending, Jono mencoba withdrawal lain.

Hasil:

`Anda masih memiliki penarikan yang sedang diproses.`

Tidak ada Pending kedua yang valid tercipta melalui jalur baru.

**STATUS: CREATE WITHDRAWAL ATOMIC + AUTH FLOW TERVERIFIKASI.**

---

# 6. MISI UTAMA — APPROVE / REJECT WITHDRAWAL YANG AMAN

## 6.1 Perilaku V4 yang wajib dipertahankan

Function production legacy tetap tidak disentuh:

```text
approve_withdraw_v4(req_id uuid, final_fee integer) returns void
reject_withdraw_v4(req_id uuid) returns void
```

Properti V4:

- `SECURITY DEFINER`
- pemeriksaan role internal melalui `auth.uid()`
- lock withdrawal `FOR UPDATE`, lalu profile `FOR UPDATE`

Semantik Approve V4:

```text
refund = held_amount - (amount + final_fee)
status -> Success
admin_fee -> final_fee
if refund > 0:
  credit refund ke balance
  insert Refund balance log
if refund <= 0:
  tidak ada debit tambahan dan tidak ada refund
```

Semantik Reject V4:

```text
refund seluruh held_amount
status -> Rejected
credit held_amount ke balance
insert Refund balance log
```

## 6.2 Masalah yang ditemukan pada UI admin

UI Admin Withdraw memanggil V4 langsung dari browser dan gagal:

`permission denied for function approve_withdraw_v4`

Grant authenticated EXECUTE secara langsung ditolak karena tidak aman.

V4 tidak dipakai kembali melalui service-role server route karena internal authorization-nya bergantung pada human `auth.uid()`.

## 6.3 V5 diimplementasikan

Migration yang sudah dideploy:

`20260813170000_approve_reject_withdraw_v5.sql`

RPC:

```text
public.approve_withdraw_v5(
  p_withdrawal_id uuid,
  p_final_fee bigint,
  p_actor_user_id uuid
) returns void
```

```text
public.reject_withdraw_v5(
  p_withdrawal_id uuid,
  p_actor_user_id uuid
) returns void
```

Metadata production keduanya sudah diverifikasi:

- `SECURITY INVOKER`
- owner `postgres`
- `search_path=pg_catalog, pg_temp`
- service_role EXECUTE = true
- authenticated EXECUTE = false
- anon EXECUTE = false
- PUBLIC EXECUTE = false

Model actor:

```text
Browser admin
-> Bearer token
-> requireAdminOrManager(request)
-> actor user.id dari token yang sudah diverifikasi
-> service-role route
-> V5
-> RPC mengecek ulang role actor profile admin/manager
```

Direct browser RPC V4 pada admin sudah dihapus.

Write `admin_logs` lama dari browser berdasarkan actor data di localStorage juga sudah dihapus karena tidak terpercaya dan tidak atomic.

## 6.4 Semantik Approve V5

Urutan lock:

`withdrawal -> profile`

Mempertahankan semantik V4 secara tepat terkait final fee/refund:

- final fee >= 0
- overflow `amount + final_fee` dilindungi
- **final fee boleh lebih besar dari fee awal yang ditahan**, sesuai V4
- `refund = held_amount - (amount + final_fee)` dapat bernilai nol/negatif
- refund nol/negatif tidak melakukan debit lagi
- refund positif menambah balance dan membuat Refund log
- status withdrawal menjadi Success
- admin_fee menjadi final fee

`p_final_fee` menggunakan bigint di V5, sesuai `withdrawals.admin_fee bigint`; ini secara sengaja memperluas range input dari V4 yang integer, sementara validasi route tetap membatasi pada range PostgreSQL bigint.

## 6.5 Semantik Reject V5

Urutan lock:

`withdrawal -> profile`

- wajib Pending
- refund seluruh held_amount
- proteksi overflow pada penambahan balance
- status -> Rejected
- update balance
- insert Refund log
- semuanya atomic

## 6.6 Route/UI admin

Routes:

```text
POST /api/admin/withdrawals/[withdrawalId]/approve
POST /api/admin/withdrawals/[withdrawalId]/reject
```

Keduanya:

- mewajibkan Bearer auth
- menggunakan `requireAdminOrManager`
- actor UUID hanya berasal dari verified token
- memanggil RPC V5 yang hanya bisa dieksekusi service-role
- tidak mengekspos raw DB error

Approve hanya menerima final fee sebagai validated integer string.
Reject tidak menerima nilai finansial apa pun dari browser.

WithdrawManagement tidak lagi memanggil V4 secara langsung dari browser.

## 6.7 Uji terkontrol

Test A — approve tanpa refund:

Pending awal:

- amount = 10000
- held_amount = 12500
- initial admin_fee = 2500
- balance setelah create = 87500

Approve final fee = 2500:

- status -> Success
- admin_fee = 2500
- refund = 0
- balance tetap 87500
- tidak perlu Refund balance log tambahan

**LULUS.**

Test B — approve dengan final fee lebih rendah:

User mengonfirmasi controlled test berhasil dengan perilaku refund.

Semantik expected yang diuji:

- final fee lebih rendah dari fee awal
- selisih fee positif direfund
- balance/log berubah dengan benar

**LULUS BERDASARKAN KONFIRMASI USER.**

Test C — reject:

User mengonfirmasi controlled rejection test berhasil sampai full held_amount refund.

**LULUS BERDASARKAN KONFIRMASI USER.**

**STATUS: WITHDRAWAL APPROVE/REJECT V5 TERVERIFIKASI.**

---

# 7. INVENTORY MIGRATION PRODUCTION — JANGAN REDEPLOY SECARA BUTA

Migration berikut sudah pernah dipush ke linked Supabase production project dan pemeriksaan metadata/ACL pasca-deploy sudah lulus:

```text
20260813140000_adjust_profile_balance_atomic.sql
20260813150000_create_withdrawal_atomic.sql
20260813160000_approve_deposit_v5.sql
20260813170000_approve_reject_withdraw_v5.sql
```

Sebelum `db push` berikutnya, selalu jalankan:

```text
npx supabase db push --linked --dry-run
```

dan pastikan tidak ada historical migration yang tidak diharapkan ikut masuk.

Jangan membuat ulang RPC di atas dengan duplicate signature kecuali memang sengaja membuat migration baru.

---

# 8. MODEL LOCK / CONCURRENCY SAAT INI

## Admin balance adjustment

Lock:

`profile`

## Deposit approval V5

Lock:

`deposit -> profile`

## Withdrawal create

Lock:

`profile`

Lalu melakukan ordinary MVCC Pending check. **Tidak** lock withdrawal.

## Withdrawal approve/reject V5

Lock:

`withdrawal -> profile`

## Review deadlock

Tidak ada cycle baru di antara hardened path ini:

- adjustment tidak meminta lock deposit/withdrawal
- deposit approval tidak pernah meminta withdrawal lock
- withdrawal create tidak meminta withdrawal lock setelah profile
- approve/reject mempertahankan urutan withdrawal -> profile

Residual risk masih ada pada legacy balance writer yang tidak mengikuti model locking ini.

---

# 9. MODEL KEAMANAN SAAT INI

## Browser tidak boleh mengeksekusi privileged financial RPC secara langsung

Model privileged mutation:

```text
Browser
-> Supabase Auth access token
-> server API route
-> authenticateRequest / requireAdminOrManager
-> trusted actor/user ID ditentukan server-side
-> supabaseAdmin/service_role
-> service-role-only SECURITY INVOKER RPC
```

Untuk RPC yang menerima parameter user/actor UUID, role yang dapat diakses browser tidak boleh memiliki EXECUTE.

## Field identity dari browser hanya resource/display, bukan authority

Jangan percaya dari browser:

- email
- user_id
- actor_user_id
- role
- isAdmin
- balance
- old balance
- new balance
- admin fee jika fee ditentukan server

---

# 10. FAKTA ENVIRONMENT TEST / DEPLOYMENT

Runtime VPS/app production saat ini tidak tersedia karena langganan VPS sedang tidak aktif.

Hal ini **disengaja dan sudah diketahui**, sehingga deployment aplikasi bukan pekerjaan yang sedang ditunggu untuk dilakukan.

Pengujian saat ini dilakukan dengan:

```text
npm run dev
localhost Next.js app
-> local server routes
-> project .env.local
-> Supabase production database/Auth
```

Karena itu mutation DB selama controlled test dari localhost merupakan mutation sungguhan terhadap production DB.

Jangan menganggap localhost berarti memakai Supabase lokal.

## Deployment policy saat ini

Deployment source aplikasi ke VPS/runtime **SENGAJA DITUNDA**.

Aturan:

- Jangan melakukan deployment aplikasi ke VPS.
- Jangan menyarankan deployment sebagai next step.
- Jangan membuat checklist deployment atau go-live kecuali diminta.
- Jangan menganggap status "belum dideploy" sebagai pekerjaan yang belum selesai.
- Jangan mengubah scope audit/hardening menjadi deployment task.
- Jangan menjalankan command deploy, restart service production, konfigurasi reverse proxy, PM2, Docker production, DNS, SSL, atau tindakan go-live lain tanpa permintaan eksplisit dari user.
- Deployment hanya boleh dibahas atau dilakukan setelah user secara eksplisit mengatakan VPS sudah aktif kembali dan meminta deployment.
- Sampai saat itu, lanjutkan audit, hardening, coding, migration review, dan controlled testing melalui local development sesuai scope yang sedang dikerjakan.

Status yang benar:

```text
Database/RPC production:
beberapa migration security yang sudah disetujui memang sudah dideploy ke Supabase production.

Next.js source/runtime:
tetap lokal dan SENGAJA belum dideploy ke VPS.

Keputusan:
JANGAN deploy aplikasi sampai user secara eksplisit meminta.
```

---

# 11. INCIDENT SIDE QUEST — TABEL SQL ACCIDENTAL

Saat memeriksa `approve_deposit_v4`, potongan PL/pgSQL berikut tidak sengaja dijalankan langsung di SQL Editor:

```sql
SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
```

Pada plain SQL, `SELECT ... INTO` membuat tabel:

`public.v_caller_role`

Tabel accidental tersebut berhasil diidentifikasi dan di-drop.

Verifikasi setelahnya menunjukkan tabel itu sudah tidak ada.

**Sudah selesai. Jangan menjalankan potongan assignment variabel PL/pgSQL langsung di SQL Editor di luar block/function PL/pgSQL.**

---

# 12. FAKTA DATABASE PENTING YANG SUDAH DIAUDIT

## profiles

Tipe PostgreSQL relevan yang sudah diketahui:

- id uuid
- balance bigint

`profiles.id` saat ini **tidak** memiliki FK ke `auth.users.id`.

Artinya menghapus Auth user tidak otomatis menghapus profile row, dan menghapus profile row juga tidak menghapus Auth user.

## withdrawals

Tipe relevan yang sudah diketahui:

- id uuid
- amount bigint
- held_amount bigint
- admin_fee bigint

Constraint yang sebelumnya diaudit:

- primary key id
- FK `withdrawals.user_email -> profiles.email`

Tidak ada `user_id` pada withdrawals.

Sebelum migration create, tidak ada index user_email/status/partial Pending.

Audit production Pending sebelum deployment:

- Pending count = 0
- duplicate Pending per user_email = 0

## balance_logs

Tipe relevan:

- amount bigint
- description text
- initial_balance bigint
- final_balance bigint

`type` adalah plain text NOT NULL; tidak ada enum/domain/check yang membatasi nilainya.

Type yang sudah diamati/disetujui sekarang mencakup:

- Payment
- Refund
- Withdraw
- Deposit
- AdminAdjustment

## admin_logs

Kolom text mencakup:

- admin_email
- action
- target
- details

Tidak ada enum/check yang membatasi action.

Action yang disetujui dan ditambahkan oleh admin adjustment:

`ADJUST_BALANCE`

---

# 13. YANG TIDAK BOLEH DI-AUDIT ULANG TANPA ALASAN BARU

Codex **tidak boleh** mengulang audit berikut hanya karena task berikutnya masih menyentuh project yang sama:

- exact PG bigint/uuid types yang digunakan withdrawal
- ada/tidaknya `withdrawals.user_id`
- semantik dasar approve/reject V4
- keputusan ownership withdrawal Option A
- penemuan vulnerability direct UPDATE profile
- status revoke privilege UPDATE profiles
- desain/ACL/test RPC admin balance adjustment
- incompatibility Deposit V4 `auth.uid()` terhadap service-role server route
- metadata/ACL/basic test Deposit V5
- metadata/ACL/basic test `create_withdrawal_atomic`
- controlled test duplicate Pending
- metadata/ACL/basic approve/refund/reject test Withdrawal V5
- verifikasi path folder dynamic route untuk source V5 yang dideploy

Audit ulang hanya dilakukan jika:

- schema production berubah,
- migration history berubah,
- ada error yang bertentangan dengan checkpoint ini,
- atau perubahan baru secara langsung mengubah dependency terkait.

---

# 14. BACKLOG KEAMANAN BERIKUTNYA — KANDIDAT PRIORITAS

Ini adalah scope terpisah; jangan diam-diam digabungkan menjadi pekerjaan withdrawal.

## Prioritas tinggi

1. **Hardening auth create deposit member**
   - route saat ini menerima body email dan memakai service role
   - seharusnya derive user dari Bearer token
   - perlu review ownership dan atomicity/pending deposit creation

2. **Hardening auth upgrade member**
   - flow saat ini masih mengirim body email dari UI user
   - seharusnya derive user dari Bearer token
   - review atomic update balance/member_type

3. **Audit/migrasi concurrency legacy wallet writer**
   - orders create/manage/refunds/Digiflazz masih memiliki campuran read-modify-write tanpa locking
   - migrasikan dengan hati-hati ke model atomic profile-locking yang sama

## Defense in depth

4. **Partial unique index Pending withdrawal**

Secara konsep:

```sql
UNIQUE (user_email) WHERE status = 'Pending'
```

Jangan dibuat secara buta. Cek ulang data/index terkini tepat sebelum migration.

5. **Cleanup RLS / ACL**

Beberapa policy lama terlalu luas/menyesatkan. Karena browser UPDATE profiles sekarang sudah direvoke, policy ALL/UPDATE lama sebaiknya nanti dirapikan agar grant di masa depan tidak diam-diam membuka lagi mutation sensitif.

6. **Route admin user listing**

Browser Team Management `profiles.select('*')` tidak bisa melihat semua user di bawah RLS saat ini. Jika daftar penuh dibutuhkan:

```text
browser admin -> Bearer -> server route -> requireAdminOrManager -> service_role SELECT
```

Jangan menyelesaikannya dengan memberi broad authenticated SELECT ke profiles.

## Cosmetic / maintenance

7. Ganti label UI `DEPOSIT V4` / `WITHDRAW V4` jika diinginkan.
8. Regenerasi Supabase TypeScript types setelah schema RPC yang dideploy sudah stabil.

---

# 15. VERDICT MISI UTAMA SAAT INI

## Hardening withdrawal

**SECARA FUNGSIONAL SELESAI UNTUK HARDENED PATH YANG SUDAH DIUJI.**

Temuan kritis withdrawal awal sudah ditangani oleh source lokal baru + model RPC database yang sudah dideploy:

```text
LAMA:
unauthenticated/body-email authority
+ service role
+ mutation finansial non-atomic

BARU:
Bearer-authenticated server identity
+ service-role-only atomic RPC
+ profile row serialization
+ secure admin approval/rejection routes
```

Catatan deployment penting:

**Migration RPC database yang sudah disetujui memang sudah ada di Supabase production, tetapi perubahan source route/UI Next.js tetap lokal dan SENGAJA belum dideploy ke VPS.**

Ini merupakan kondisi yang direncanakan, bukan masalah yang harus segera diperbaiki.

Primitive security pada database production sudah tersedia untuk migration yang telah disetujui, sementara pengujian source aplikasi dilakukan melalui localhost.

**Jangan menjadikan deployment aplikasi sebagai next step. Deployment hanya boleh dilakukan setelah user secara eksplisit menyatakan VPS sudah aktif kembali dan meminta deployment.**

---

# 16. MILESTONE — MACRODROID PAYMENT RESOLVER

**STATUS: TERVERIFIKASI / DITUTUP untuk scope resolver pembayaran MacroDroid.**

Jangan mengulang audit resolver MacroDroid, auto-deposit, manual-bank fail-closed, replay, atau ambiguity handling yang tercatat di bawah kecuali ada dependency baru, perubahan schema, regresi, atau runtime failure baru.

## 16.1 Migration production dan primitive database

Migration production berikut sudah dipush dan diverifikasi:

- `20260813190000_shared_pending_payment_indexes.sql`
- `20260813190100_deposit_unique_payment_amount_schema.sql`
- `20260813190200_order_wallet_idempotency_schema.sql`
- `20260813190300_shared_payment_financial_rpcs.sql`
- `20260813190400_refund_expired_mixed_orders_atomic.sql`
- `20260813190500_machine_deposit_approval_atomic.sql`
- `20260813190600_order_state_claim_atomic.sql`
- `20260813190700_reject_deposit_atomic.sql` — side quest reject deposit
- `20260813190800_fix_deposit_unique_amount_column_ambiguity.sql`

Key addition yang sudah tersedia di production:

- `190000`: `orders_one_pending_total_amount_idx`;
- `190100`: `deposits.unique_code`, `deposits.total_amount`, dan `deposits_one_pending_total_amount_idx`;
- `190200`: `orders.idempotency_key` dan `orders_member_idempotency_key_idx`;
- `190300`: shared reservation/order/wallet/deposit financial RPCs, termasuk `create_pending_order_from_reservation`, `create_mixed_order_from_reservation_atomic`, `create_full_coin_order_atomic`, dan `create_deposit_with_unique_amount_atomic`;
- `190400`: `refund_expired_mixed_order_atomic`;
- `190500`: `approve_deposit_from_machine_atomic`;
- `190600`: `claim_order_transition_atomic`;
- `190700`: `reject_deposit_atomic`;
- `190800`: corrective replacement allocator deposit dengan qualification `o.total_amount` / `d.total_amount`.

Semua sensitive RPC tersebut diverifikasi menggunakan `SECURITY INVOKER`, `search_path = pg_catalog, pg_temp`, ACL execute service-role-only, dan tanpa unexpected overload. Shared reservation memakai `code_reservations` sebagai namespace bersama orders/deposits; setiap allocator memperoleh reservation unik lalu melakukan mandatory post-acquisition durable recheck. Browser bukan authority untuk `unique_code` atau `total_amount`; guest email tetap `NULL`, sedangkan `user_contact` dipertahankan. Voucher pada reservation flow dan unique checkout Pascabayar sengaja fail-closed sampai tersedia validasi voucher/inquiry authoritative server-side.

## 16.2 Runtime finding dan fix 190800

Uji member deposit baru pertama gagal dengan `SQLSTATE 42702`: `column reference "total_amount" is ambiguous`.

- Tidak ada deposit row yang dibuat dan tidak ada partial mutation.
- Root cause: output variable `RETURNS TABLE total_amount` PL/pgSQL bertabrakan dengan referensi kolom tabel yang tidak dikualifikasi.
- Migration 190800 mengganti referensi allocator yang relevan dengan `o.total_amount` dan `d.total_amount`.
- Migration dipush/diverifikasi; retry deposit berhasil.

## 16.3 Side quest — reject deposit legacy

Deposit `7b61e001-ad79-4a2c-985c-d14da25d9ba6` telah diuji melalui reject atomic:

- `Pending → Rejected`;
- saldo Jono tetap `75500`;
- tidak ada Deposit balance log;
- tepat satu admin log `REJECT_DEPOSIT`;
- actor asli: `officialdapay@gmail.com`, role `manager`.

**Reject deposit side quest: TERVERIFIKASI / DITUTUP untuk scope ini.**

## 16.4 Uji terkontrol — auto-deposit MacroDroid

Deposit QRIS: `93bf3584-20db-4a6f-85d2-2eeb3020599b`

- channel `qris`;
- base `amount=20000`, `unique_code=50`, `total_amount=20050`;
- sebelum: `Pending`, saldo Jono `75500`;
- sesudah machine approval: `Success`, saldo Jono `95500`.

Bukti:

- satu Deposit balance log, amount `20000`, `initial_balance=75500`, `final_balance=95500`;
- satu admin log `MACHINE_DEPOSIT_APPROVAL`, `admin_email=NULL`, source `macrodroid`, `credited_amount=20000`.

Replay diverifikasi **LULUS**: saldo tetap `95500`, Deposit balance log tetap satu, dan machine audit tetap satu. Kredit hanya memakai `deposits.amount`, bukan `total_amount`.

## 16.5 Uji terkontrol — manual bank fail-closed

Deposit manual bank: `af9e8848-5a4b-4348-a21c-b2373069fae2`

- channel `bni_manual`;
- `amount=20000`, `unique_code=33`, `total_amount=20033`;
- exact-match MacroDroid menghasilkan HTTP `409`;
- status tetap `Pending` dan saldo Jono tetap `95500`;
- `0` Deposit balance logs dan `0` `MACHINE_DEPOSIT_APPROVAL` logs.

**Manual-bank auto approval: fail-closed, LULUS.**

## 16.6 Uji terkontrol — order exact match dan replay

Guest external order:

- database ID: `716cf6bc-2450-4af5-b18f-d6e1a47eea05`;
- order ID: `DANISH-1FD4D6C995A948738D16FCCFE144BF17`;
- base `3400`, `unique_code=10`, `total_amount=3410`, `used_balance=0`.

Sebelum MacroDroid status `Pending`; sesudah exact match status menjadi `Diproses`.

Terverifikasi:

- `used_balance` tetap `0`;
- tidak ada wallet, cashback, atau referral logs;
- `sn` tetap `NULL`;
- tidak ada fulfillment Digiflazz/provider yang dipanggil receiver.

Replay diverifikasi **LULUS**: status tetap `Diproses`, `updated_at` tidak berubah, dan tidak ada side effect baru.

## 16.7 Defense ambiguity resolver

Resolver memeriksa kedua namespace durable:

- `Pending orders.total_amount`;
- `Pending deposits.total_amount`.

Kontrak yang terverifikasi:

- `0` match → HTTP `404`, tanpa mutation;
- tepat `1` match → proses resource tersebut;
- `>1` match → HTTP `409` sebelum RPC mutation apa pun;
- tidak ada fallback first-row-wins.

Partial unique per tabel dan shared `code_reservations` mengurangi collision. Karena PostgreSQL tidak dapat membuat unique index lintas dua tabel, combined resolver adalah defense final yang tetap wajib untuk fail-closed terhadap collision order↔deposit. Pada branch ambigu, tidak ada pemanggilan `claim_order_transition_atomic` atau `approve_deposit_from_machine_atomic`; tidak ada status, balance, audit, cashback/referral, atau provider side effect.

**Ambiguity verification: LULUS.**

## 16.8 Catatan network/environment non-blocking

- Router network `192.168.1.x` tidak dapat mengekspos local dev server ke phone secara andal.
- Alternative phone/hotspot LAN `192.168.46.x` berhasil mencapai local Next.js.
- Next.js menampilkan warning `allowedDevOrigins` untuk dev assets `/_next/*`.
- Webhook POST sendiri berfungsi dan runtime MacroDroid tests lulus.
- Troubleshooting router/`allowedDevOrigins` ditunda.

Ini adalah catatan environment non-blocking, **bukan** application-security failure.

## 16.9 Scope yang masih gated

Jangan menandai seluruh shared-payment project selesai. Pekerjaan berikut tetap membutuhkan scope/review tersendiri:

- hardening transition writer Digiflazz/provider;
- desain fulfillment claim/retry;
- full-Koin server-owned fulfillment;
- enablement mixed-Koin hanya setelah seluruh writer guard selesai;
- controlled tests tersisa untuk scope tersebut.

## 16.10 CURRENT WORK MODE — SECURITY AUDIT PAUSED

Semua audit dan hardening yang belum selesai **sengaja DITUNDA** sampai user secara eksplisit meminta untuk melanjutkannya. Jangan otomatis memulai, menyarankan, atau memperlakukan item berikut sebagai blocker untuk development yang tidak terkait:

- hardening writer Digiflazz/provider dan provider fulfillment transition;
- fulfillment claim/retry design;
- full-Koin server-owned fulfillment;
- enablement mixed-Koin;
- hardening auth Member Upgrade;
- concurrency legacy wallet writer;
- cleanup defense RLS/ACL;
- hardening TeamManagement/admin-data;
- cleanup generated Supabase types;
- backlog security lainnya.

Fokus project aktif sekarang: **UI / UX + Admin Dashboard completion** — visual/UI improvements, admin functionality yang belum ada, navigation/usability, consistency, responsive layout, dan dashboard information architecture. Security-critical finding yang muncul selama UI work boleh dicatat secara targeted, tetapi tidak otomatis membuka seluruh audit security.

Saat audit/hardening dilanjutkan nanti, gunakan `DAPAY_PROJECT_PROGRESS.md` sebagai master checkpoint authoritative.

Jangan re-audit scope yang telah ditandai **VERIFIED / CLOSED** kecuali ada dependency baru yang mengubahnya, schema berubah, terjadi regresi/runtime failure, atau user secara eksplisit meminta re-audit.

---

# 17. ATURAN HANDOFF KE CODEX

Saat memulai task berikutnya, baca checkpoint ini terlebih dahulu dan sebutkan backlog item mana yang sedang dikerjakan.

Jangan menjawab dengan audit project menyeluruh dari awal.

Semua bagian yang ditandai:

```text
SELESAI
TERVERIFIKASI
DITUTUP
LULUS
```

harus dianggap authoritative kecuali:

- ada perubahan schema baru,
- ada migration baru yang mengubah dependency tersebut,
- ada error baru yang bertentangan dengan checkpoint,
- atau scope baru memang membutuhkan targeted re-check.

Jangan mengulang audit yang sudah selesai hanya untuk mendapatkan konteks ulang.

## DEPLOYMENT POLICY — WAJIB DIPATUHI CODEX

Deployment aplikasi ke VPS/runtime saat ini **SENGAJA DITUNDA** karena VPS tidak aktif / tidak berlangganan.

Ini adalah keputusan planning user.

Karena itu:

- JANGAN melakukan deployment aplikasi.
- JANGAN menyarankan deployment sebagai next step.
- JANGAN mengatakan bahwa aplikasi "harus segera dideploy".
- JANGAN membuat deployment sebagai blocker penyelesaian audit/hardening.
- JANGAN menjalankan command deployment.
- JANGAN membuat perubahan khusus deployment kecuali diminta.
- JANGAN mengonfigurasi PM2, Docker production, Nginx, reverse proxy, DNS, SSL, service startup, atau environment VPS tanpa permintaan eksplisit.
- JANGAN menjadikan VPS yang sedang mati sebagai alasan untuk menghentikan pekerjaan audit/hardening lokal.
- Lanjutkan pekerjaan melalui local development (`npm run dev`) dan environment Supabase yang sudah digunakan selama controlled testing.
- Deployment hanya boleh dibahas atau dilakukan jika user secara eksplisit menyatakan VPS sudah aktif kembali DAN meminta deployment.

Jika sebuah task sudah selesai di localhost dan migration database yang diperlukan sudah diverifikasi, laporkan statusnya sebagai selesai untuk scope tersebut.

Jangan otomatis menambahkan:

```text
Next step: deploy ke VPS
```

sebagai rekomendasi.

Jika perlu menyebut status runtime, gunakan wording:

```text
Source aplikasi masih lokal sesuai deployment policy yang disengaja.
Tidak ada deployment yang diperlukan pada scope ini.
```

## SCOPE CONTROL

Untuk setiap task baru:

1. Baca checkpoint ini.
2. Identifikasi hanya scope yang diminta user.
3. Gunakan hasil audit lama sebagai fakta authoritative.
4. Lakukan targeted re-check hanya jika dependency langsung memang memerlukannya.
5. Jangan memperluas pekerjaan ke backlog lain tanpa izin.
6. Jangan menjalankan migration/database mutation tanpa review dan persetujuan user.
7. Gunakan dry-run/read-only check terlebih dahulu bila perubahan database dibutuhkan.
8. Jangan deployment aplikasi kecuali user meminta secara eksplisit.
9. Setelah task selesai, perbarui checkpoint dengan:
   - apa yang ditemukan,
   - apa yang diubah,
   - migration yang dibuat/dideploy,
   - hasil test,
   - residual risk,
   - side quest yang terjadi,
   - status final scope tersebut.

Kalimat pertama yang disarankan untuk pekerjaan Codex berikutnya:

```text
Saya sudah membaca DAPAY_PROJECT_PROGRESS.md. Saya akan memperlakukan bagian yang ditandai SELESAI/TERVERIFIKASI sebagai authoritative dan hanya akan mengerjakan scope yang diminta. Deployment aplikasi ke VPS sengaja ditunda dan tidak akan saya sarankan atau lakukan kecuali user memintanya secara eksplisit.
```

---

# 18. CATATAN HISTORIS

Checkpoint awal menggambarkan kondisi sebelum implementasi, ketika create withdrawal, migration, perubahan route/UI, dan index belum diimplementasikan. Kondisi tersebut dipertahankan hanya sebagai konteks historis dan tidak boleh mengalahkan checkpoint otoritatif ini.
