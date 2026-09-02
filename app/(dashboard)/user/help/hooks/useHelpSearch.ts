"use client";

import { useCallback, useMemo, useState } from "react";
import { calculateCategoryCounts, FAQ_DATA, filterFaqItems } from "../data/faqData";
import { HelpCategory } from "../types";

function getAdminWhatsAppConfig(): { whatsappUrl: string; isWhatsappAvailable: boolean } {
  const rawNumber = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || "";
  const cleanNumber = rawNumber.replace(/\D/g, "");

  // Validation: Indonesian phone numbers typically 10-15 digits starting with 62 or 08
  if (!cleanNumber || cleanNumber.length < 9) {
    return { whatsappUrl: "", isWhatsappAvailable: false };
  }

  const normalizedNumber = cleanNumber.startsWith("0")
    ? `62${cleanNumber.slice(1)}`
    : cleanNumber;

  return {
    whatsappUrl: `https://wa.me/${normalizedNumber}`,
    isWhatsappAvailable: true,
  };
}

export function useHelpSearch() {
  const [category, setCategory] = useState<HelpCategory>("all");
  const [search, setSearch] = useState("");
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);
  const [showAllInOverview, setShowAllInOverview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Dynamic category counts computed from actual dataset
  const categoryCounts = useMemo(() => {
    return calculateCategoryCounts(FAQ_DATA);
  }, []);

  // Filtered FAQ list
  const filteredFaq = useMemo(() => {
    return filterFaqItems(FAQ_DATA, category, search);
  }, [category, search]);

  // Screen-reader accessible live announcement
  const liveAnnouncement = useMemo(() => {
    const count = filteredFaq.length;
    const trimmed = search.trim();
    if (trimmed && category !== "all") {
      return `Menampilkan ${count} FAQ untuk kata kunci "${trimmed}" dalam kategori ${category}.`;
    }
    if (trimmed) {
      return `Menampilkan ${count} FAQ untuk kata kunci "${trimmed}".`;
    }
    if (category !== "all") {
      return `Menampilkan ${count} FAQ dalam kategori ${category}.`;
    }
    return `Menampilkan seluruh ${count} FAQ.`;
  }, [filteredFaq.length, search, category]);

  // Safe WhatsApp URL config
  const whatsappConfig = useMemo(() => getAdminWhatsAppConfig(), []);
  const whatsappUrl = whatsappConfig.whatsappUrl;
  const isWhatsappAvailable = whatsappConfig.isWhatsappAvailable;

  // Show Toast Feedback
  const showToast = useCallback((type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 3500);
  }, []);

  // Toggle FAQ Accordion
  const toggleFaq = useCallback((id: string) => {
    setOpenFaqId((prev) => (prev === id ? null : id));
  }, []);

  // Clear search and reset category
  const resetFilters = useCallback(() => {
    setSearch("");
    setCategory("all");
    setShowAllInOverview(false);
  }, []);

  // Category selection with smooth scroll to FAQ section
  const selectCategory = useCallback((nextCategory: HelpCategory, shouldScroll = true) => {
    setCategory(nextCategory);
    setShowAllInOverview(false);
    if (shouldScroll && typeof window !== "undefined") {
      setTimeout(() => {
        const faqSection = document.getElementById("faq-accordion-section");
        if (faqSection) {
          faqSection.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 50);
    }
  }, []);

  // Copy template message
  const copyTemplateMessage = useCallback(
    async (customText?: string) => {
      const message =
        customText ||
        "Halo Admin DaPay, saya ingin meminta bantuan terkait akun/transaksi saya di DaPay. Terima kasih.";

      try {
        await navigator.clipboard.writeText(message);
        setCopied(true);
        showToast("success", "Template pesan bantuan berhasil disalin!");
        setTimeout(() => setCopied(false), 2000);
      } catch {
        showToast("error", "Gagal menyalin pesan. Silakan salin secara manual.");
      }
    },
    [showToast]
  );

  // Open WhatsApp action
  const openWhatsApp = useCallback(() => {
    if (!isWhatsappAvailable || !whatsappUrl) {
      showToast("error", "Kontak WhatsApp Admin belum tersedia saat ini.");
      return;
    }
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }, [isWhatsappAvailable, whatsappUrl, showToast]);

  return {
    category,
    setCategory,
    search,
    setSearch,
    openFaqId,
    toggleFaq,
    showAllInOverview,
    setShowAllInOverview,
    categoryCounts,
    filteredFaq,
    totalFaqCount: FAQ_DATA.length,
    liveAnnouncement,
    whatsappUrl,
    isWhatsappAvailable,
    copied,
    toastMessage,
    dismissToast: () => setToastMessage(null),
    resetFilters,
    selectCategory,
    copyTemplateMessage,
    openWhatsApp,
  };
}
