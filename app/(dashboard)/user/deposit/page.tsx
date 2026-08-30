"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import DepositViewUser from "./DepositViewUser";

export default function UserDepositPage() {
  const router = useRouter();

  // If accessed directly at /user/deposit, redirect to user dashboard or render view
  useEffect(() => {
    // Optional: sync to dashboard if required
  }, [router]);

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <DepositViewUser />
    </div>
  );
}

