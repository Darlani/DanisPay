import type { Metadata } from "next";
import PromoDetailPage, { generatePromoMetadata } from "@/app/promotions/[slug]/page";

export const revalidate = 0;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  return generatePromoMetadata(props, "en");
}

export default function EnglishPromoDetailPage(props: PageProps) {
  return <PromoDetailPage {...props} locale="en" />;
}
