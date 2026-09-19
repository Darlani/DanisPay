import type { MetadataRoute } from "next";
import { listContents } from "@/lib/cms/content-service";

/**
 * Resolve canonical base URL from environment without hardcoded domains.
 */
function getBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://danispay.my.id";
  return raw.replace(/\/+$/, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();

  // 1. Static Core Public Routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/news`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/promo`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/en`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/en/news`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/en/promo`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.7,
    },
  ];

  // 2. Dynamic Eligible Published NEWS Articles
  let dynamicNewsRoutes: MetadataRoute.Sitemap = [];
  try {
    const result = await listContents(
      {
        type: "NEWS",
        sortBy: "published_desc",
        limit: 100,
      },
      true, // Strictly enforces canonical public eligibility
    );

    if (!result.isError && result.data?.items) {
      dynamicNewsRoutes = result.data.items.map((item) => ({
        url: `${baseUrl}/news/${item.slug}`,
        lastModified: item.updated_at ? new Date(item.updated_at) : item.published_at ? new Date(item.published_at) : new Date(),
        changeFrequency: "weekly",
        priority: item.is_featured ? 0.9 : 0.7,
      }));
    }
  } catch {
    // Gracefully fallback to static routes on query failure
  }

  return [...staticRoutes, ...dynamicNewsRoutes];
}
