import type { Metadata } from "next";
import HomePage from "@/app/page";

export const metadata: Metadata = {
  title: "DanisPay - Top Up Games & Digital Services",
  description: "Fastest and most trusted digital game voucher and PPOB top up service in Indonesia.",
};

export default function EnglishHomePage() {
  return <HomePage />;
}
