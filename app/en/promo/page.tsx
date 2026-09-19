import type { Metadata } from "next";
import PromoPage from "@/app/promo/page";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Promotions & Special Deals - DaPay",
  description: "Discover top-up discounts, cashback vouchers, and official campaign deals on DaPay.",
};

export default function EnglishPromoPage(props: { searchParams: Promise<{ category?: string }> }) {
  return <PromoPage {...props} locale="en" />;
}
