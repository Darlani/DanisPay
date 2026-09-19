import type { Metadata } from "next";
import NewsDetailPage, { generateNewsMetadata } from "@/app/news/[slug]/page";

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  return generateNewsMetadata(props, "en");
}

export default function EnglishNewsDetailPage(props: PageProps) {
  return <NewsDetailPage {...props} locale="en" />;
}
