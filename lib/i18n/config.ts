export const LOCALES = ["id", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "id";

export function isValidLocale(val: unknown): val is Locale {
  return typeof val === "string" && (LOCALES as readonly string[]).includes(val);
}

export function getLocaleFromPathname(pathname: string): Locale {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "en") return "en";
  return DEFAULT_LOCALE;
}

export function stripLocaleFromPathname(pathname: string): string {
  if (pathname === "/en" || pathname === "/en/") return "/";
  if (pathname.startsWith("/en/")) return pathname.slice(3) || "/";
  return pathname || "/";
}

export function localizeHref(href: string, locale: Locale): string {
  // Internal path handling only
  if (!href.startsWith("/")) return href;
  if (href.startsWith("//")) return href;

  const cleanPath = stripLocaleFromPathname(href);

  if (locale === "en") {
    return cleanPath === "/" ? "/en" : `/en${cleanPath}`;
  }

  return cleanPath;
}
