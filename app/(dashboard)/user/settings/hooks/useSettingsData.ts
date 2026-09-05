"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationPreferences,
  UserProfile,
} from "../types";

interface UseSettingsDataProps {
  initialProfile?: UserProfile | null;
  onRefresh?: () => void | Promise<void>;
}

export function useSettingsData({
  initialProfile,
  onRefresh,
}: UseSettingsDataProps = {}) {
  // SWR State: Instant Initial Render from initialProfile
  const [profile, setProfile] = useState<UserProfile>(() => {
    return initialProfile || {};
  });

  const [notifications, setNotifications] = useState<NotificationPreferences>(() => {
    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...(initialProfile?.notifications || {}),
    };
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Auto-dismiss toast
  const showToast = useCallback((type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  }, []);

  // Revalidation / Refresh (preserved for manual refresh / mutation)
  const revalidate = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        return;
      }

      // 1. Fetch live user_metadata for notifications
      const userMetaNotifications = session.user?.user_metadata?.notifications as
        | Partial<NotificationPreferences>
        | undefined;

      if (userMetaNotifications) {
        setNotifications((prev) => ({
          ...prev,
          ...userMetaNotifications,
        }));
      }

      // 2. Fetch live dashboard profile
      const response = await fetch("/api/user/dashboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.status === 401) {
        return;
      }

      if (!response.ok) {
        throw new Error("Gagal menyinkronkan data pengaturan terbaru.");
      }

      const result = await response.json();
      if (result.success && result.data?.profile) {
        const liveProfile = result.data.profile as UserProfile;
        setProfile((prev) => ({
          ...prev,
          ...liveProfile,
          email: session.user.email || liveProfile.email || prev.email,
        }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat data.";
      if (isManualRefresh) {
        setError(msg);
        showToast("error", msg);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [showToast]);

  // Load notification preferences from client session on mount
  useEffect(() => {
    async function loadSessionNotifications() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const userMetaNotifications = session?.user?.user_metadata
          ?.notifications as Partial<NotificationPreferences> | undefined;

        if (userMetaNotifications) {
          setNotifications((prev) => ({
            ...prev,
            ...userMetaNotifications,
          }));
        }
      } catch (err) {
        console.error("Failed to load session notifications:", err);
      }
    }
    void loadSessionNotifications();
  }, []);

  // Synchronize when initialProfile changes from parent
  useEffect(() => {
    if (initialProfile) {
      setProfile((prev) => ({ ...prev, ...initialProfile }));
      if (initialProfile.notifications) {
        setNotifications((prev) => ({ ...prev, ...initialProfile.notifications }));
      }
    }
  }, [initialProfile]);

  // Save Profile (Full Name) via authorized endpoint
  const saveProfile = useCallback(
    async (fullName: string): Promise<boolean> => {
      const trimmed = fullName.trim();
      if (!trimmed) {
        showToast("error", "Nama lengkap tidak boleh kosong.");
        return false;
      }
      if (trimmed.length < 2) {
        showToast("error", "Nama lengkap minimal 2 karakter.");
        return false;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          showToast("error", "Sesi login telah berakhir. Silakan login kembali.");
          return false;
        }

        const response = await fetch("/api/user/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ full_name: trimmed }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Gagal memperbarui nama profil.");
        }

        // Optimistically update local profile state
        setProfile((prev) => ({ ...prev, full_name: trimmed }));
        showToast("success", "Profil berhasil diperbarui!");
        if (onRefresh) {
          void onRefresh();
        }
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Gagal memperbarui nama profil.";
        showToast("error", msg);
        return false;
      }
    },
    [onRefresh, showToast]
  );

  // Update Password with Secure Cryptographic Re-Authentication
  const updatePassword = useCallback(
    async (currentPassword: string, newPassword: string, confirmPassword: string): Promise<boolean> => {
      if (!currentPassword) {
        showToast("error", "Masukkan password saat ini untuk verifikasi keamanan.");
        return false;
      }
      if (!newPassword || newPassword.length < 8) {
        showToast("error", "Password baru minimal 8 karakter.");
        return false;
      }
      if (newPassword !== confirmPassword) {
        showToast("error", "Konfirmasi password baru tidak cocok.");
        return false;
      }
      if (newPassword === currentPassword) {
        showToast("error", "Password baru harus berbeda dari password saat ini.");
        return false;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user?.email) {
          showToast("error", "Sesi login tidak ditemukan. Silakan login kembali.");
          return false;
        }

        // 1. Mandatory Re-Authentication via Supabase Auth
        const { data: signInData, error: reAuthError } = await supabase.auth.signInWithPassword({
          email: session.user.email,
          password: currentPassword,
        });

        if (reAuthError || !signInData.session) {
          showToast("error", "Password saat ini salah. Verifikasi keamanan gagal.");
          return false;
        }

        // 2. Perform Secure Password Update
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (updateError) {
          throw updateError;
        }

        showToast("success", "Password akun Anda berhasil diperbarui!");
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Gagal memperbarui password akun.";
        showToast("error", msg);
        return false;
      }
    },
    [showToast]
  );

  // Save Notification Preferences with rollback protection
  const saveNotificationPreference = useCallback(
    async (key: keyof NotificationPreferences, value: boolean): Promise<void> => {
      // Optimistic update
      const previousValue = notifications[key];
      const nextPreferences = { ...notifications, [key]: value };
      setNotifications(nextPreferences);

      try {
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            notifications: nextPreferences,
          },
        });

        if (updateError) {
          throw updateError;
        }

        showToast("success", "Preferensi notifikasi berhasil disimpan.");
      } catch (err: unknown) {
        // Rollback on failure
        setNotifications((prev) => ({ ...prev, [key]: previousValue }));
        const msg = err instanceof Error ? err.message : "Gagal menyimpan preferensi notifikasi.";
        showToast("error", msg);
      }
    },
    [notifications, showToast]
  );

  return {
    profile,
    notifications,
    isRefreshing,
    error,
    toastMessage,
    dismissToast: () => setToastMessage(null),
    revalidate: () => void revalidate(true),
    saveProfile,
    updatePassword,
    saveNotificationPreference,
  };
}

