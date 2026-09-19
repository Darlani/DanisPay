"use client";

import React, { createContext, useContext, useMemo } from "react";
import { usePathname } from "next/navigation";
import { DEFAULT_LOCALE, getLocaleFromPathname, type Locale } from "./config";
import { createTranslator, getDictionary, type Dictionary } from "./dictionaries";

interface I18nContextValue {
  locale: Locale;
  t: (key: string, params?: Record<string, string | number> | string, fallback?: string) => string;
  dictionary: Dictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const pathname = usePathname();
  const currentLocale = useMemo(() => {
    if (initialLocale) return initialLocale;
    return getLocaleFromPathname(pathname || "/");
  }, [pathname, initialLocale]);

  const value = useMemo(() => {
    return {
      locale: currentLocale,
      t: createTranslator(currentLocale),
      dictionary: getDictionary(currentLocale),
    };
  }, [currentLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Safe fallback if used outside provider
    return {
      locale: DEFAULT_LOCALE,
      t: createTranslator(DEFAULT_LOCALE),
      dictionary: getDictionary(DEFAULT_LOCALE),
    };
  }
  return ctx;
}

export function useTranslations() {
  const { t } = useI18n();
  return t;
}
