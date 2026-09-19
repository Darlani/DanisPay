import type { MetadataRoute } from "next";

/**
 * Resolve canonical base URL from environment without hardcoded domains.
 */
function getBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://danispay.my.id";
  return raw.replace(/\/+$/, "");
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/news", "/promo", "/news/*", "/promotions/*", "/en", "/en/*"],
        disallow: [
          "/admin/",
          "/api/",
          "/user/",
          "/checkout/",
          "/sandbox/",
          "/login",
          "/register",
          "/forgot-password",
          "/update-password",
          "/setup-2fa",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
