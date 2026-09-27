import type { Metadata } from "next";
import UserDashboard from "@/app/(dashboard)/user/page";

export const metadata: Metadata = {
  title: "User Dashboard - DaPay",
  description: "Manage your digital product transactions, wallet balance, deposits, and affiliate program.",
};

export default function EnglishUserDashboardPage() {
  return <UserDashboard />;
}

