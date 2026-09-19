import type { Metadata } from "next";
import NewsPage from "@/app/news/page";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "News & Announcements - DaPay",
  description: "Official updates, system announcements, and feature releases from DaPay.",
};

export default function EnglishNewsPage() {
  return <NewsPage locale="en" />;
}
