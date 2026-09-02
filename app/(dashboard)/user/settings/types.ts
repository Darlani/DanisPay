export type SettingsSection = "profile" | "security" | "notifications";

export interface NotificationPreferences {
  orders: boolean;
  balance: boolean;
  promotions: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  orders: true,
  balance: true,
  promotions: true,
};

export interface UserProfile {
  id?: string | null;
  full_name?: string | null;
  email?: string | null;
  member_type?: string | null;
  referral_code?: string | null;
  balance?: number | string | null;
  coin_balance?: number | string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  notifications?: Partial<NotificationPreferences> | null;
}

export interface SettingsTabItem {
  id: SettingsSection;
  label: string;
  description: string;
  iconName: "user" | "shield" | "bell";
}

export const SETTINGS_TABS: SettingsTabItem[] = [
  {
    id: "profile",
    label: "Profil Akun",
    description: "Informasi dasar akun member",
    iconName: "user",
  },
  {
    id: "security",
    label: "Keamanan",
    description: "Password & autentikasi",
    iconName: "shield",
  },
  {
    id: "notifications",
    label: "Notifikasi",
    description: "Preferensi pengingat & promo",
    iconName: "bell",
  },
];

export function formatRupiah(value: unknown): string {
  const num = typeof value === "number" ? value : Number(value || 0);
  if (isNaN(num)) return "Rp 0";
  return `Rp ${num.toLocaleString("id-ID")}`;
}

export function getInitial(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    return name.trim().charAt(0).toUpperCase();
  }
  if (email && email.trim()) {
    return email.trim().charAt(0).toUpperCase();
  }
  return "M";
}

export function formatMemberType(memberType?: string | null): string {
  const clean = (memberType || "").trim().toLowerCase();
  if (clean === "special") return "Special Member";
  if (clean === "gold") return "Gold Member";
  return "Regular Member";
}

