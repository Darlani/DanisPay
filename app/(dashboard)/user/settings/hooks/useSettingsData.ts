"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationPreferences,
  UserProfile,
} from "../types";
import { useI18n } from "@/lib/i18n/context";

interface UseSettingsDataProps {
  initialProfile?: UserProfile | null;
  onRefresh?: () => void | Promise<void>;
}

export function useSettingsData({
  initialProfile,
  onRefresh,
}: UseSettingsDataProps = {}) {
  const { t } = useI18n();

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
        throw new Error(t("dashboard.settings.errSync"));
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
      const msg = err instanceof Error ? err.message : t("dashboard.settings.errLoad");
      if (isManualRefresh) {
        setError(msg);
        showToast("error", msg);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [showToast, t]);

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
        showToast("error", t("dashboard.settings.valNameEmpty"));
        return false;
      }
      if (trimmed.length < 2) {
        showToast("error", t("dashboard.settings.valNameMin"));
        return false;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          showToast("error", t("dashboard.settings.errSessionExpired"));
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
          throw new Error(result.error || t("dashboard.settings.errSaveProfile"));
        }

        // Optimistically update local profile state
        setProfile((prev) => ({ ...prev, full_name: trimmed }));
        showToast("success", t("dashboard.settings.toastProfileSaved"));
        if (onRefresh) {
          void onRefresh();
        }
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : t("dashboard.settings.errSaveProfile");
        showToast("error", msg);
        return false;
      }
    },
    [onRefresh, showToast, t]
  );

  // Update Password with Secure Cryptographic Re-Authentication
  const updatePassword = useCallback(
    async (currentPassword: string, newPassword: string, confirmPassword: string): Promise<boolean> => {
      if (!currentPassword) {
        showToast("error", t("dashboard.settings.valCurrentPwdRequired"));
        return false;
      }
      if (!newPassword || newPassword.length < 8) {
        showToast("error", t("dashboard.settings.valNewPwdMin"));
        return false;
      }
      if (newPassword !== confirmPassword) {
        showToast("error", t("dashboard.settings.valPwdMatch"));
        return false;
      }
      if (newPassword === currentPassword) {
        showToast("error", t("dashboard.settings.valPwdDifferent"));
        return false;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user?.email) {
          showToast("error", t("dashboard.settings.errSessionNotFound"));
          return false;
        }

        // 1. Mandatory Re-Authentication via Supabase Auth
        const { data: signInData, error: reAuthError } = await supabase.auth.signInWithPassword({
          email: session.user.email,
          password: currentPassword,
        });

        if (reAuthError || !signInData.session) {
          showToast("error", t("dashboard.settings.errWrongCurrentPwd"));
          return false;
        }

        // 2. Perform Secure Password Update
        const { error: updateError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (updateError) {
          throw updateError;
        }

        showToast("success", t("dashboard.settings.toastPasswordUpdated"));
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : t("dashboard.settings.errUpdatePassword");
        showToast("error", msg);
        return false;
      }
    },
    [showToast, t]
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

        showToast("success", t("dashboard.settings.toastNotifSaved"));
      } catch (err: unknown) {
        // Rollback on failure
        setNotifications((prev) => ({ ...prev, [key]: previousValue }));
        const msg = err instanceof Error ? err.message : t("dashboard.settings.errSaveNotif");
        showToast("error", msg);
      }
    },
    [notifications, showToast, t]
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

