import idDict from "@/messages/id.json";
import enDict from "@/messages/en.json";
import type { Locale } from "./config";

export type Dictionary = typeof idDict;

export const dictionaries: Record<Locale, Dictionary> = {
  id: idDict,
  en: enDict,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] || dictionaries.id;
}

export function createTranslator(locale: Locale) {
  const dict = getDictionary(locale);

  return function t(key: string, params?: Record<string, string | number> | string, fallback?: string): string {
    const defaultFallback = typeof params === "string" ? params : fallback;
    const values = typeof params === "object" && params !== null ? params : undefined;

    const parts = key.split(".");
    let current: unknown = dict;

    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return defaultFallback || key;
      }
    }

    if (typeof current !== "string") {
      return defaultFallback || key;
    }

    if (!values) {
      return current;
    }

    return current.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, varName) => {
      return varName in values ? String(values[varName]) : `{${varName}}`;
    });
  };
}
