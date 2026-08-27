"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Bell,
  Check,
  ChevronRight,
  CircleUserRound,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

import { supabase } from "@/utils/supabaseClient";

type Profile = {
  id?: string | null;
  full_name?: string | null;
  email?: string | null;
  member_type?: string | null;
  referral_code?: string | null;
  balance?: number | string | null;
};

type DashboardResponse = {
  success?: boolean;
  data?: {
    profile?: Profile;
  };
  error?: string;
};

type SettingsSection =
  | "profile"
  | "security"
  | "notifications";

function formatBalance(
  value: unknown,
) {
  return `Rp ${Number(
    value || 0,
  ).toLocaleString("id-ID")}`;
}

export default function SettingsViewUser() {
  // ================================================================
  // PROFILE
  // ================================================================

  const [profile, setProfile] =
    useState<Profile>({});

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [activeSection, setActiveSection] =
    useState<SettingsSection>(
      "profile",
    );

  // ================================================================
  // PROFILE FORM
  // ================================================================

  const [fullName, setFullName] =
    useState("");

  const [isSavingProfile, setIsSavingProfile] =
    useState(false);

  // ================================================================
  // PASSWORD FORM
  // ================================================================

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [isChangingPassword, setIsChangingPassword] =
    useState(false);

  // ================================================================
  // NOTIFICATIONS
  // ================================================================

  const [orderNotifications, setOrderNotifications] =
    useState(true);

  const [balanceNotifications, setBalanceNotifications] =
    useState(true);

  const [promotionNotifications, setPromotionNotifications] =
    useState(true);

  // ================================================================
  // FETCH PROFILE
  // ================================================================

  const fetchProfile =
    useCallback(
      async (
        initialLoad = false,
      ) => {
        if (initialLoad) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        try {
          const {
            data: { session },
          } =
            await supabase.auth.getSession();

          if (!session?.access_token) {
            window.location.href =
              "/login";
            return;
          }

          const response =
            await fetch(
              "/api/user/dashboard",
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                  Authorization: `Bearer ${session.access_token}`,
                },
              },
            );

          if (response.status === 401) {
            window.location.href =
              "/login";
            return;
          }

          const result =
            (await response.json()) as DashboardResponse;

          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.error ||
                "Gagal memuat profil.",
            );
          }

          const nextProfile =
            result.data?.profile ||
            {};

          setProfile(nextProfile);

          setFullName(
            nextProfile.full_name ||
              "",
          );
        } catch (error) {
          console.error(
            "SettingsViewUser:",
            error,
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [],
    );

  useEffect(() => {
    void fetchProfile(true);
  }, [fetchProfile]);

  // ================================================================
  // SAVE PROFILE
  // ================================================================

  const handleSaveProfile =
    async () => {
      const name =
        fullName.trim();

      if (!name) {
        alert(
          "Nama lengkap tidak boleh kosong.",
        );
        return;
      }

      setIsSavingProfile(true);

      try {
        /*
         * Belum ada endpoint update profile
         * yang ditetapkan pada arsitektur ini.
         *
         * Kita tidak mengubah database langsung
         * dari browser. Untuk sementara UI
         * memberikan feedback bahwa endpoint
         * backend perlu disiapkan.
         */
        alert(
          "Form profil sudah siap. Endpoint penyimpanan profil akan kita hubungkan setelah kontrak API pengaturan akun ditetapkan.",
        );
      } finally {
        setIsSavingProfile(false);
      }
    };

  // ================================================================
  // CHANGE PASSWORD
  // ================================================================

  const handleChangePassword =
    async () => {
      if (!currentPassword) {
        alert(
          "Masukkan password saat ini.",
        );
        return;
      }

      if (
        newPassword.length <
        8
      ) {
        alert(
          "Password baru minimal 8 karakter.",
        );
        return;
      }

      if (
        newPassword !==
        confirmPassword
      ) {
        alert(
          "Konfirmasi password tidak sama.",
        );
        return;
      }

      setIsChangingPassword(true);

      try {
        /*
         * Supabase Auth menggunakan
         * updateUser untuk password baru.
         *
         * Password lama tidak dikirim ke
         * updateUser sehingga kita verifikasi
         * session terlebih dahulu.
         */
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (!session?.user) {
          throw new Error(
            "Sesi login tidak ditemukan.",
          );
        }

        const { error } =
          await supabase.auth.updateUser(
            {
              password:
                newPassword,
            },
          );

        if (error) {
          throw error;
        }

        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

        alert(
          "Password berhasil diperbarui.",
        );
      } catch (error) {
        alert(
          error instanceof Error
            ? error.message
            : "Gagal memperbarui password.",
        );
      } finally {
        setIsChangingPassword(false);
      }
    };

  // ================================================================
  // LOADING
  // ================================================================

  if (loading) {
    return (
      <section className="flex min-h-130 w-full items-center justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Loader2
            size={22}
            className="animate-spin text-blue-600"
          />
        </div>
      </section>
    );
  }

  return (
    <section className="w-full">
      <div className="mx-auto w-full max-w-295">
        {/* ====================================================== */}
        {/* HEADER                                                  */}
        {/* ====================================================== */}

        <header className="mb-5 rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.27em] text-blue-600">
                Account
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Pengaturan
              </h1>

              <p className="mt-1 max-w-xl text-sm leading-5 text-slate-500">
                Kelola profil, keamanan akun,
                dan preferensi notifikasi Anda.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void fetchProfile(
                  false,
                )
              }
              disabled={refreshing}
              className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-blue-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 sm:self-center"
            >
              <RefreshCw
                size={16}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>
          </div>
        </header>

        {/* ====================================================== */}
        {/* LAYOUT                                                  */}
        {/* ====================================================== */}

        <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
          {/* ==================================================== */}
          {/* SETTINGS NAV                                         */}
          {/* ==================================================== */}

          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
            <SettingsNavItem
              active={
                activeSection ===
                "profile"
              }
              icon={
                <CircleUserRound
                  size={17}
                />
              }
              label="Profil"
              description="Data akun"
              onClick={() =>
                setActiveSection(
                  "profile",
                )
              }
            />

            <SettingsNavItem
              active={
                activeSection ===
                "security"
              }
              icon={
                <ShieldCheck
                  size={17}
                />
              }
              label="Keamanan"
              description="Password akun"
              onClick={() =>
                setActiveSection(
                  "security",
                )
              }
            />

            <SettingsNavItem
              active={
                activeSection ===
                "notifications"
              }
              icon={
                <Bell size={17} />
              }
              label="Notifikasi"
              description="Preferensi"
              onClick={() =>
                setActiveSection(
                  "notifications",
                )
              }
            />
          </aside>

          {/* ==================================================== */}
          {/* CONTENT                                               */}
          {/* ==================================================== */}

          <main className="min-w-0">
            {activeSection ===
              "profile" && (
              <ProfileSettings
                profile={profile}
                fullName={fullName}
                setFullName={
                  setFullName
                }
                isSaving={
                  isSavingProfile
                }
                onSave={
                  handleSaveProfile
                }
              />
            )}

            {activeSection ===
              "security" && (
              <SecuritySettings
                currentPassword={
                  currentPassword
                }
                newPassword={
                  newPassword
                }
                confirmPassword={
                  confirmPassword
                }
                showCurrentPassword={
                  showCurrentPassword
                }
                showNewPassword={
                  showNewPassword
                }
                showConfirmPassword={
                  showConfirmPassword
                }
                setCurrentPassword={
                  setCurrentPassword
                }
                setNewPassword={
                  setNewPassword
                }
                setConfirmPassword={
                  setConfirmPassword
                }
                setShowCurrentPassword={
                  setShowCurrentPassword
                }
                setShowNewPassword={
                  setShowNewPassword
                }
                setShowConfirmPassword={
                  setShowConfirmPassword
                }
                isChanging={
                  isChangingPassword
                }
                onChangePassword={
                  handleChangePassword
                }
              />
            )}

            {activeSection ===
              "notifications" && (
              <NotificationSettings
                orderNotifications={
                  orderNotifications
                }
                balanceNotifications={
                  balanceNotifications
                }
                promotionNotifications={
                  promotionNotifications
                }
                setOrderNotifications={
                  setOrderNotifications
                }
                setBalanceNotifications={
                  setBalanceNotifications
                }
                setPromotionNotifications={
                  setPromotionNotifications
                }
              />
            )}
          </main>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/* SETTINGS NAV                                                       */
/* ================================================================== */

function SettingsNavItem({
  active,
  icon,
  label,
  description,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full items-center gap-3 rounded-xl p-3 text-left transition",
        active
          ? "bg-blue-50 text-blue-700"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          active
            ? "bg-white text-blue-600 shadow-sm"
            : "bg-slate-100 text-slate-500",
        ].join(" ")}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold">
          {label}
        </p>

        <p className="mt-0.5 text-[9px] text-slate-400">
          {description}
        </p>
      </div>

      {active && (
        <ChevronRight
          size={14}
          className="shrink-0 text-blue-500"
        />
      )}
    </button>
  );
}

/* ================================================================== */
/* PROFILE                                                            */
/* ================================================================== */

function ProfileSettings({
  profile,
  fullName,
  setFullName,
  isSaving,
  onSave,
}: {
  profile: Profile;
  fullName: string;
  setFullName: (
    value: string,
  ) => void;
  isSaving: boolean;
  onSave: () => void;
}) {
  const memberType =
    profile.member_type ===
    "Special"
      ? "Special Member"
      : "Reguler Member";

  return (
    <div className="space-y-5">
      <SettingsSectionHeader
        eyebrow="Profile"
        title="Informasi Profil"
        description="Informasi dasar akun member Anda."
      />

      {/* ACCOUNT CARD */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-violet-500 to-blue-500 text-xl font-black text-white shadow-sm">
            {(
              fullName ||
              "Member"
            )
              .trim()
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="min-w-0">
            <p className="text-lg font-black text-slate-900">
              {fullName ||
                "Member DaPay"}
            </p>

            <p className="mt-1 truncate text-sm text-slate-400">
              {profile.email ||
                "-"}
            </p>

            <div className="mt-2 inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-blue-700">
              {memberType}
            </div>
          </div>
        </div>
      </div>

      {/* FORM */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="space-y-5">
          <div>
            <label
              htmlFor="settings-full-name"
              className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400"
            >
              Nama Lengkap
            </label>

            <div className="relative">
              <UserRound
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="settings-full-name"
                type="text"
                value={fullName}
                onChange={(event) =>
                  setFullName(
                    event.target.value,
                  )
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="settings-email"
              className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400"
            >
              Email
            </label>

            <div className="relative">
              <Mail
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                id="settings-email"
                type="email"
                value={
                  profile.email ||
                  ""
                }
                readOnly
                className="h-11 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-medium text-slate-500 outline-none"
              />
            </div>

            <p className="mt-2 text-[9px] text-slate-400">
              Email akun digunakan sebagai
              identitas login dan tidak diedit
              dari halaman ini.
            </p>
          </div>

          <div>
            <label
              htmlFor="settings-referral-code"
              className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400"
            >
              Kode Referral
            </label>

            <input
              id="settings-referral-code"
              type="text"
              value={
                profile.referral_code ||
                "-"
              }
              readOnly
              className="h-11 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold uppercase tracking-wider text-slate-500 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Saldo DaPay
            </label>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <p className="text-lg font-black text-emerald-700">
                {formatBalance(
                  profile.balance,
                )}
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* SECURITY                                                           */
/* ================================================================== */

function SecuritySettings({
  currentPassword,
  newPassword,
  confirmPassword,
  showCurrentPassword,
  showNewPassword,
  showConfirmPassword,
  setCurrentPassword,
  setNewPassword,
  setConfirmPassword,
  setShowCurrentPassword,
  setShowNewPassword,
  setShowConfirmPassword,
  isChanging,
  onChangePassword,
}: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  showCurrentPassword: boolean;
  showNewPassword: boolean;
  showConfirmPassword: boolean;
  setCurrentPassword: (
    value: string,
  ) => void;
  setNewPassword: (
    value: string,
  ) => void;
  setConfirmPassword: (
    value: string,
  ) => void;
  setShowCurrentPassword: (
    value: boolean,
  ) => void;
  setShowNewPassword: (
    value: boolean,
  ) => void;
  setShowConfirmPassword: (
    value: boolean,
  ) => void;
  isChanging: boolean;
  onChangePassword: () => void;
}) {
  return (
    <div className="space-y-5">
      <SettingsSectionHeader
        eyebrow="Security"
        title="Keamanan Akun"
        description="Perbarui password akun Anda secara berkala."
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <KeyRound size={18} />
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Ganti Password
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Gunakan password yang kuat dan
              jangan gunakan password yang sama
              pada layanan lain.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <PasswordField
            id="current-password"
            label="Password Saat Ini"
            value={currentPassword}
            onChange={
              setCurrentPassword
            }
            visible={
              showCurrentPassword
            }
            onToggle={() =>
              setShowCurrentPassword(
                !showCurrentPassword,
              )
            }
          />

          <PasswordField
            id="new-password"
            label="Password Baru"
            value={newPassword}
            onChange={setNewPassword}
            visible={
              showNewPassword
            }
            onToggle={() =>
              setShowNewPassword(
                !showNewPassword,
              )
            }
          />

          <PasswordField
            id="confirm-password"
            label="Konfirmasi Password Baru"
            value={confirmPassword}
            onChange={
              setConfirmPassword
            }
            visible={
              showConfirmPassword
            }
            onToggle={() =>
              setShowConfirmPassword(
                !showConfirmPassword,
              )
            }
          />

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
              Persyaratan password
            </p>

            <div className="mt-2 space-y-1">
              <PasswordRule
                valid={
                  newPassword.length >=
                  8
                }
              >
                Minimal 8 karakter
              </PasswordRule>

              <PasswordRule
                valid={
                  newPassword.length ===
                    0 ||
                  newPassword !==
                    currentPassword
                }
              >
                Sebaiknya berbeda dari password
                lama
              </PasswordRule>

              <PasswordRule
                valid={
                  confirmPassword.length ===
                    0 ||
                  newPassword ===
                    confirmPassword
                }
              >
                Konfirmasi password harus sama
              </PasswordRule>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={
                onChangePassword
              }
              disabled={isChanging}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isChanging ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                  Memproses...
                </>
              ) : (
                <>
                  <ShieldCheck
                    size={16}
                  />
                  Perbarui Password
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-amber-100 bg-amber-50/60 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck
            size={17}
            className="mt-0.5 shrink-0 text-amber-600"
          />

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">
              Keamanan
            </p>

            <p className="mt-1 text-xs leading-5 text-amber-800/80">
              Jangan pernah memberikan password,
              kode OTP, atau informasi login kepada
              siapapun yang mengatasnamakan DaPay.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* NOTIFICATIONS                                                       */
/* ================================================================== */

function NotificationSettings({
  orderNotifications,
  balanceNotifications,
  promotionNotifications,
  setOrderNotifications,
  setBalanceNotifications,
  setPromotionNotifications,
}: {
  orderNotifications: boolean;
  balanceNotifications: boolean;
  promotionNotifications: boolean;
  setOrderNotifications: (
    value: boolean,
  ) => void;
  setBalanceNotifications: (
    value: boolean,
  ) => void;
  setPromotionNotifications: (
    value: boolean,
  ) => void;
}) {
  return (
    <div className="space-y-5">
      <SettingsSectionHeader
        eyebrow="Preferences"
        title="Notifikasi"
        description="Atur jenis informasi yang ingin Anda terima."
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="space-y-2">
          <NotificationRow
            icon={
              <Bell size={17} />
            }
            title="Status Pesanan"
            description="Notifikasi ketika status transaksi berubah."
            checked={
              orderNotifications
            }
            onChange={
              setOrderNotifications
            }
          />

          <NotificationRow
            icon={
              <WalletCards size={17} />
            }
            title="Aktivitas Saldo"
            description="Informasi mengenai deposit, penarikan, refund, dan perubahan saldo."
            checked={
              balanceNotifications
            }
            onChange={
              setBalanceNotifications
            }
          />

          <NotificationRow
            icon={
              <Mail size={17} />
            }
            title="Promo & Penawaran"
            description="Informasi promo dan penawaran khusus DaPay."
            checked={
              promotionNotifications
            }
            onChange={
              setPromotionNotifications
            }
          />
        </div>
      </div>

      <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-5">
        <div className="flex items-start gap-3">
          <Bell
            size={17}
            className="mt-0.5 shrink-0 text-blue-600"
          />

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">
              Catatan
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-800/80">
              Preferensi ini saat ini tersimpan
              selama sesi halaman. Penyimpanan
              permanen akan kita hubungkan setelah
              struktur preference/user-settings di
              backend ditetapkan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* SECTION HEADER                                                      */
/* ================================================================== */

function SettingsSectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
        {title}
      </h2>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

/* ================================================================== */
/* PASSWORD FIELD                                                      */
/* ================================================================== */

function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  onToggle,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400"
      >
        {label}
      </label>

      <div className="relative">
        <KeyRound
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          id={id}
          type={
            visible
              ? "text"
              : "password"
          }
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-11 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />

        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
          aria-label={
            visible
              ? "Sembunyikan password"
              : "Tampilkan password"
          }
        >
          {visible ? (
            <EyeOff size={15} />
          ) : (
            <Eye size={15} />
          )}
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/* PASSWORD RULE                                                       */
/* ================================================================== */

function PasswordRule({
  valid,
  children,
}: {
  valid: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-[9px]">
      <span
        className={[
          "flex h-4 w-4 items-center justify-center rounded-full",
          valid
            ? "bg-emerald-100 text-emerald-600"
            : "bg-slate-200 text-slate-400",
        ].join(" ")}
      >
        <Check size={10} />
      </span>

      <span
        className={
          valid
            ? "text-slate-600"
            : "text-slate-400"
        }
      >
        {children}
      </span>
    </div>
  );
}

/* ================================================================== */
/* NOTIFICATION ROW                                                    */
/* ================================================================== */

function NotificationRow({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (
    value: boolean,
  ) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white px-4 py-4 transition hover:border-slate-200 hover:bg-slate-50/50">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-800">
            {title}
          </p>

          <p className="mt-1 max-w-lg text-[10px] leading-4 text-slate-400">
            {description}
          </p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() =>
          onChange(!checked)
        }
        className={[
          "relative h-6 w-11 shrink-0 rounded-full transition",
          checked
            ? "bg-blue-600"
            : "bg-slate-200",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
            checked
              ? "translate-x-6"
              : "translate-x-1",
          ].join(" ")}
        />
      </button>
    </div>
  );
}