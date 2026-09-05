"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import {
  Calendar as CalendarIcon,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Save,
  Trash2,
  Bell,
  Ticket,
  Banknote,
  CheckCircle2,
  Loader2,
  Ban,
  Layers,
  Sparkles,
  CalendarDays,
  Megaphone,
  ArrowUpRight,
  Zap,
  Target,
  CircleDollarSign,
  ExternalLink,
  Clock,
} from "lucide-react";
import imageCompression from "browser-image-compression";

/* =========================================================
   TYPES
========================================================= */

interface AdminEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  impact_level: string;
}

interface Banner {
  id: number | string | null;
  src: string;
  alt: string;
  promo?: string | null;
  href?: string | null;
  category?: string | null;
  description?: string | null;
  promo_code?: string | null;
  cashback?: string | null;
  is_active?: boolean;
  isPlaceholder?: boolean;
}

interface Voucher {
  id: number | string;
  code: string;
  discount_amount: number;
  is_active: boolean;
  valid_from: string | null;
  expired_at: string | null;
  category: string | null;
  global_limit: number;
  usage_limit: number;
  current_usage: number;
}

interface Brand {
  name: string;
}

/* =========================================================
   CONSTANTS
========================================================= */

const MAX_BANNER_SLOTS = 9;

const IMPACT_PRIORITY: Record<string, number> = {
  Critical: 1,
  High: 2,
  Promo: 3,
  Medium: 4,
  Low: 5,
};

const VOUCHER_STATUS = {
  LIVE: "LIVE",
  OFF: "OFF",
  SOLD_OUT: "SOLD_OUT",
  EXPIRED: "EXPIRED",
  PENDING: "PENDING",
} as const;

/* =========================================================
   HELPERS
========================================================= */

const pad = (value: number) => String(value).padStart(2, "0");

const formatDateForDatabase = (date: Date) => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
};

const normalizeDateValue = (value: string | null | undefined) => {
  if (!value) return "";

  return String(value).slice(0, 10);
};

const formatDateIndonesia = (
  dateString: string,
  options?: Intl.DateTimeFormatOptions
) => {
  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString(
    "id-ID",
    options || {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

const getGoogleCalendarMonthUrl = (date: Date) => {
  return `https://calendar.google.com/calendar/u/0/r/month/${date.getFullYear()}/${date.getMonth() + 1}/1`;
};

/* =========================================================
   COMPONENT
========================================================= */

export default function EventView() {
  /* =======================================================
     GENERAL STATE
  ======================================================= */

  const [loading, setLoading] = useState(true);

  const [events, setEvents] = useState<AdminEvent[]>([]);

  const [viewDate, setViewDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [calendarView, setCalendarView] = useState<"Month" | "Week" | "List">("Month");


  /* =======================================================
     EVENT MODAL STATE
  ======================================================= */

  const [showInputModal, setShowInputModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [selectedDayEvents, setSelectedDayEvents] = useState<AdminEvent[]>(
    []
  );

  const [selectedDateLabel, setSelectedDateLabel] = useState("");

  const [selectedDateInput, setSelectedDateInput] = useState<number>(
    new Date().getDate()
  );

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newImpact, setNewImpact] = useState("Medium");

  const [selectedAlert, setSelectedAlert] = useState<AdminEvent | null>(null);

  const [savingEvent, setSavingEvent] = useState(false);

  /* =======================================================
     BANNER STATE
  ======================================================= */

  const [showBannerModal, setShowBannerModal] = useState(false);

  const [bannerList, setBannerList] = useState<Banner[]>([]);

  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  const [uploading, setUploading] = useState(false);

  const [savingBanner, setSavingBanner] = useState(false);

  const [previewImage, setPreviewImage] = useState("");

  /* =======================================================
     VOUCHER STATE
  ======================================================= */

  const [showVoucherModal, setShowVoucherModal] = useState(false);

  const [vouchers, setVouchers] = useState<Voucher[]>([]);

  const [activeVoucherFilter, setActiveVoucherFilter] = useState("ALL");

  const [availableBrands, setAvailableBrands] = useState<Brand[]>([]);

  const [loadingVouchers, setLoadingVouchers] = useState(false);

  /* =======================================================
     TODAY
  ======================================================= */

  const today = new Date();

  /* =======================================================
     FETCH EVENTS
  ======================================================= */

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_events")
        .select("*")
        .order("event_date", { ascending: true });

      if (error) {
        console.error("Fetch events error:", error);
        return;
      }

      setEvents((data || []) as AdminEvent[]);
    } catch (error) {
      console.error("Fetch events exception:", error);
    }
  };

  /* =======================================================
     FETCH BANNERS
  ======================================================= */

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .order("id", { ascending: true });

      if (error) {
        console.error("Fetch banners error:", error);
        return;
      }

      const existingBanners = (data || []) as Banner[];

      const slots: Banner[] = [...existingBanners];

      while (slots.length < MAX_BANNER_SLOTS) {
        slots.push({
          id: null,
          alt: "Slot Kosong",
          src: "",
          promo: "",
          href: "",
          category: "game",
          description: "",
          promo_code: "",
          cashback: "",
          is_active: true,
          isPlaceholder: true,
        });
      }

      setBannerList(slots.slice(0, MAX_BANNER_SLOTS));
    } catch (error) {
      console.error("Fetch banners exception:", error);
    }
  };

  /* =======================================================
     FETCH VOUCHERS
  ======================================================= */

  const fetchVouchers = async () => {
    setLoadingVouchers(true);

    try {
      const [{ data: brandsData, error: brandsError }, { data: promoData, error: promoError }] =
        await Promise.all([
          supabase
            .from("brands")
            .select("name")
            .order("name", { ascending: true }),

          supabase
            .from("promos")
            .select("*")
            .order("created_at", { ascending: false }),
        ]);

      if (brandsError) {
        console.error("Fetch brands error:", brandsError);
      }

      if (promoError) {
        console.error("Fetch promos error:", promoError);
        return;
      }

      setAvailableBrands((brandsData || []) as Brand[]);

      const promos = promoData || [];

      const vouchersWithUsage: Voucher[] = await Promise.all(
        promos.map(async (promo: any) => {
          const { count, error } = await supabase
            .from("orders")
            .select("*", {
              count: "exact",
              head: true,
            })
            .eq("voucher_code", promo.code)
            .in("status", ["success", "paid", "settlement"]);

          if (error) {
            console.error(
              `Usage voucher ${promo.code} error:`,
              error
            );
          }

          return {
            ...promo,
            current_usage: count || 0,
          };
        })
      );

      setVouchers(vouchersWithUsage);
    } catch (error) {
      console.error("Fetch vouchers exception:", error);
    } finally {
      setLoadingVouchers(false);
    }
  };

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);

      await Promise.all([
        fetchEvents(),
        fetchBanners(),
        fetchVouchers(),
      ]);

      setLoading(false);
    };

    loadAll();
  }, []);

  /* =======================================================
     MONTH NAVIGATION
  ======================================================= */

  const changeMonth = (offset: number) => {
    setViewDate(
      new Date(
        viewDate.getFullYear(),
        viewDate.getMonth() + offset,
        1
      )
    );
  };

  const goToday = () => {
    setViewDate(new Date());
  };

  /* =======================================================
     OPEN ADD EVENT
  ======================================================= */

  const openAddEvent = (day?: number) => {
    const targetDay = day || today.getDate();

    setSelectedDateInput(targetDay);
    setNewTitle("");
    setNewDescription("");
    setNewImpact("Medium");
    setShowInputModal(true);
  };

  /* =======================================================
     DATE CLICK
  ======================================================= */

  const handleDateClick = (
    day: number,
    dayEvents: AdminEvent[]
  ) => {
    const selectedDate = new Date(
      viewDate.getFullYear(),
      viewDate.getMonth(),
      day
    );

    setSelectedDateInput(day);

    setSelectedDateLabel(
      selectedDate.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    );

    setSelectedDayEvents(dayEvents);

    if (dayEvents.length > 0) {
      setShowDetailModal(true);
    } else {
      openAddEvent(day);
    }
  };

  /* =======================================================
     SAVE EVENT
  ======================================================= */

  const handleSaveEvent = async () => {
    const title = newTitle.trim();

    if (!title) {
      alert("Judul event wajib diisi.");
      return;
    }

    const maxDay = new Date(
      viewDate.getFullYear(),
      viewDate.getMonth() + 1,
      0
    ).getDate();

    if (
      selectedDateInput < 1 ||
      selectedDateInput > maxDay
    ) {
      alert("Tanggal tidak valid.");
      return;
    }

    setSavingEvent(true);

    try {
      const formattedDate = `${viewDate.getFullYear()}-${pad(
        viewDate.getMonth() + 1
      )}-${pad(selectedDateInput)}`;

      const { error } = await supabase
        .from("admin_events")
        .insert([
          {
            title,
            description: newDescription.trim() || null,
            event_date: formattedDate,
            impact_level: newImpact,
          },
        ]);

      if (error) {
        console.error("Save event error:", error);
        alert(`Gagal menyimpan event: ${error.message}`);
        return;
      }

      setNewTitle("");
      setNewDescription("");
      setNewImpact("Medium");
      setShowInputModal(false);

      await fetchEvents();
    } catch (error: any) {
      console.error("Save event exception:", error);
      alert(
        error?.message || "Terjadi kesalahan saat menyimpan event."
      );
    } finally {
      setSavingEvent(false);
    }
  };

  /* =======================================================
     DELETE EVENT
  ======================================================= */

  const handleDeleteEvent = async (eventId: string) => {
    const confirmed = confirm(
      "Apakah Anda yakin ingin menghapus event ini?"
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("admin_events")
        .delete()
        .eq("id", eventId);

      if (error) {
        alert(`Gagal menghapus event: ${error.message}`);
        return;
      }

      const remainingEvents = selectedDayEvents.filter(
        (event) => event.id !== eventId
      );

      setSelectedDayEvents(remainingEvents);

      await fetchEvents();

      if (remainingEvents.length === 0) {
        setShowDetailModal(false);
      }
    } catch (error: any) {
      console.error("Delete event exception:", error);
      alert(error?.message || "Gagal menghapus event.");
    }
  };

  /* =======================================================
     IMAGE UPLOAD
  ======================================================= */

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    const file = e.target.files[0];

    if (!file.type.startsWith("image/")) {
      alert("File harus berupa gambar.");
      return;
    }

    setUploading(true);

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.4,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
        fileType: "image/webp",
      });

      const fileName = `promotions/${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}.webp`;

      const { error: uploadError } = await supabase.storage
        .from("banners")
        .upload(fileName, compressed, {
          cacheControl: "3600",
          upsert: false,
          contentType: "image/webp",
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from("banners")
        .getPublicUrl(fileName);

      setPreviewImage(data.publicUrl);
    } catch (error: any) {
      console.error("Upload banner error:", error);
      alert(
        error?.message || "Upload gambar gagal."
      );
    } finally {
      setUploading(false);

      // Supaya file yang sama bisa dipilih lagi
      e.target.value = "";
    }
  };

  /* =======================================================
     SAVE BANNER
  ======================================================= */

  const handleSaveBanner = async () => {
    if (!editingBanner) return;

    if (!previewImage && !editingBanner.src) {
      alert("Silakan upload gambar banner terlebih dahulu.");
      return;
    }

    setSavingBanner(true);

    try {
      const payload = {
        src: previewImage || editingBanner.src,
        alt: editingBanner.alt || "DaPay Banner",
        promo: editingBanner.promo || null,
        href: editingBanner.href || null,
        category: editingBanner.category || "game",
        description: editingBanner.description || null,
        promo_code: editingBanner.promo_code || null,
        cashback: editingBanner.cashback || null,
        is_active:
          editingBanner.is_active !== false,
      };

      let error;

      if (editingBanner.id) {
        const result = await supabase
          .from("banners")
          .update(payload)
          .eq("id", editingBanner.id);

        error = result.error;
      } else {
        const result = await supabase
          .from("banners")
          .insert([payload]);

        error = result.error;
      }

      if (error) {
        console.error("Save banner error:", error);
        alert(`Gagal menyimpan banner: ${error.message}`);
        return;
      }

      setEditingBanner(null);
      setPreviewImage("");

      await fetchBanners();
    } catch (error: any) {
      console.error("Save banner exception:", error);
      alert(
        error?.message || "Gagal menyimpan banner."
      );
    } finally {
      setSavingBanner(false);
    }
  };

  /* =======================================================
     OPEN BANNER EDITOR
  ======================================================= */

  const openBannerEditor = (banner: Banner) => {
    setEditingBanner({
      ...banner,
      is_active:
        banner.is_active !== false,
    });

    setPreviewImage(banner.src || "");
  };

  /* =======================================================
     VOUCHER STATUS
  ======================================================= */

  const getDerivedStatus = (
    voucher: Voucher
  ) => {
    const now = new Date();

    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const from = voucher.valid_from
      ? new Date(`${normalizeDateValue(voucher.valid_from)}T00:00:00`)
      : null;

    const exp = voucher.expired_at
      ? new Date(`${normalizeDateValue(voucher.expired_at)}T00:00:00`)
      : null;

    if (!voucher.is_active) {
      return VOUCHER_STATUS.OFF;
    }

    if (
      Number(voucher.global_limit) > 0 &&
      Number(voucher.current_usage || 0) >=
        Number(voucher.global_limit)
    ) {
      return VOUCHER_STATUS.SOLD_OUT;
    }

    if (exp && todayStart > exp) {
      return VOUCHER_STATUS.EXPIRED;
    }

    if (from && todayStart < from) {
      return VOUCHER_STATUS.PENDING;
    }

    return VOUCHER_STATUS.LIVE;
  };

  /* =======================================================
     FILTER VOUCHERS
  ======================================================= */

  const filteredVouchers = useMemo(() => {
    if (activeVoucherFilter === "ALL") {
      return vouchers;
    }

    return vouchers.filter((voucher) => {
      const status = getDerivedStatus(voucher);

      if (activeVoucherFilter === "ACTIVE") {
        return status === VOUCHER_STATUS.LIVE;
      }

      if (activeVoucherFilter === "EXPIRED") {
        return (
          status === VOUCHER_STATUS.EXPIRED ||
          status === VOUCHER_STATUS.SOLD_OUT
        );
      }

      if (activeVoucherFilter === "PENDING") {
        return (
          status === VOUCHER_STATUS.PENDING ||
          status === VOUCHER_STATUS.OFF
        );
      }

      return true;
    });
  }, [vouchers, activeVoucherFilter]);

  /* =======================================================
     UPDATE VOUCHER STATE
  ======================================================= */

  const updateVoucherLocal = (
    id: Voucher["id"],
    field: keyof Voucher,
    value: any
  ) => {
    setVouchers((current) =>
      current.map((voucher) =>
        voucher.id === id
          ? {
              ...voucher,
              [field]: value,
            }
          : voucher
      )
    );
  };

  /* =======================================================
     SAVE VOUCHER
  ======================================================= */

  const handleUpdateVoucher = async (
    voucher: Voucher
  ) => {
    try {
      const { error } = await supabase
        .from("promos")
        .update({
          code: voucher.code.toUpperCase().trim(),
          discount_amount: Number(
            voucher.discount_amount || 0
          ),
          is_active: Boolean(voucher.is_active),
          valid_from:
            normalizeDateValue(voucher.valid_from) ||
            null,
          expired_at:
            normalizeDateValue(voucher.expired_at) ||
            null,
          category:
            voucher.category?.trim().toLowerCase() ||
            "all",
          global_limit: Number(
            voucher.global_limit || 0
          ),
          usage_limit: Number(
            voucher.usage_limit || 1
          ),
        })
        .eq("id", voucher.id);

      if (error) {
        console.error("Update voucher error:", error);
        alert(
          `Gagal menyimpan voucher: ${error.message}`
        );
        return;
      }

      alert("VOUCHER BERHASIL DISIMPAN!");

      await fetchVouchers();
    } catch (error: any) {
      console.error("Update voucher exception:", error);
      alert(
        error?.message ||
          "Terjadi kesalahan saat menyimpan voucher."
      );
    }
  };

  /* =======================================================
     ADD VOUCHER
  ======================================================= */

  const handleAddVoucher = async () => {
    const code = prompt("KODE VOUCHER BARU:");

    if (!code?.trim()) {
      return;
    }

    try {
      const normalizedCode = code
        .trim()
        .toUpperCase();

      const { error } = await supabase
        .from("promos")
        .insert([
          {
            code: normalizedCode,
            is_active: true,
            global_limit: 100,
            usage_limit: 1,
            discount_amount: 0,
            category: "all",
          },
        ]);

      if (error) {
        console.error("Add voucher error:", error);
        alert(
          `Gagal membuat voucher: ${error.message}`
        );
        return;
      }

      await fetchVouchers();
    } catch (error: any) {
      console.error("Add voucher exception:", error);
      alert(
        error?.message ||
          "Gagal membuat voucher."
      );
    }
  };

  /* =======================================================
     DELETE VOUCHER
  ======================================================= */

  const handleDeleteVoucher = async (
    voucherId: Voucher["id"]
  ) => {
    const confirmed = confirm(
      "Apakah Anda yakin ingin menghapus voucher ini?"
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("promos")
        .delete()
        .eq("id", voucherId);

      if (error) {
        alert(
          `Gagal menghapus voucher: ${error.message}`
        );
        return;
      }

      await fetchVouchers();
    } catch (error: any) {
      console.error("Delete voucher exception:", error);
      alert(
        error?.message ||
          "Gagal menghapus voucher."
      );
    }
  };

  /* =======================================================
     CALENDAR CALCULATION
  ======================================================= */

  const firstDayOfMonth = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth(),
    1
  ).getDay();

  const daysInMonth = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth() + 1,
    0
  ).getDate();

  /* =======================================================
     EVENT STATISTICS
  ======================================================= */

  const monthEventCount = useMemo(() => {
    return events.filter((event) => {
      const date = new Date(
        `${event.event_date}T00:00:00`
      );

      return (
        date.getMonth() === viewDate.getMonth() &&
        date.getFullYear() === viewDate.getFullYear()
      );
    }).length;
  }, [events, viewDate]);

  const sortedEvents = useMemo(() => {
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    return [...events]
      .filter((event) => {
        const date = new Date(
          `${event.event_date}T00:00:00`
        );

        return date >= todayStart;
      })
      .sort((a, b) => {
        const priorityA =
          IMPACT_PRIORITY[a.impact_level] || 99;

        const priorityB =
          IMPACT_PRIORITY[b.impact_level] || 99;

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        return (
          new Date(
            `${a.event_date}T00:00:00`
          ).getTime() -
          new Date(
            `${b.event_date}T00:00:00`
          ).getTime()
        );
      });
  }, [events, today]);

  const upcomingEvents = sortedEvents.slice(0, 5);

  const criticalCount = events.filter(
    (event) =>
      event.impact_level === "Critical"
  ).length;

  const promoCount = events.filter(
    (event) =>
      event.impact_level === "Promo"
  ).length;

  const filledBannerCount = bannerList.filter(
    (banner) => Boolean(banner.src)
  ).length;

  const filteredEvents = useMemo(() => {
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    return events.filter((event) => {
      const query = searchTerm.trim().toLowerCase();
      const haystack = `${event.title} ${event.description || ""}`.toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      const matchesPriority = priorityFilter === "All" || event.impact_level === priorityFilter;
      const date = new Date(`${event.event_date}T00:00:00`);
      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Upcoming" && date >= todayStart) ||
        (statusFilter === "Past" && date < todayStart);

      return matchesSearch && matchesPriority && matchesStatus;
    });
  }, [events, searchTerm, priorityFilter, statusFilter, today]);

  const upcomingCount = events.filter((event) => {
    const date = new Date(`${event.event_date}T00:00:00`);
    return date >= new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }).length;

  const filteredUpcoming = filteredEvents
    .filter((event) => new Date(`${event.event_date}T00:00:00`) >= new Date(today.getFullYear(), today.getMonth(), today.getDate()))
    .sort((a, b) => {
      const pa = IMPACT_PRIORITY[a.impact_level] || 99;
      const pb = IMPACT_PRIORITY[b.impact_level] || 99;
      if (pa !== pb) return pa - pb;
      return new Date(`${a.event_date}T00:00:00`).getTime() - new Date(`${b.event_date}T00:00:00`).getTime();
    })
    .slice(0, 3);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#f6f8fc] p-6">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-100 bg-white px-6 py-4 shadow-xl">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Loader2
              className="animate-spin"
              size={20}
            />
          </span>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
              Event Hub
            </p>

            <p className="text-sm font-bold text-slate-500">
              Menyinkronkan data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="w-full space-y-6 pb-16 text-slate-900 font-sans">
      <datalist id="categoryOptions">
        <option value="all">💎 SEMUA PRODUK</option>
        {availableBrands.map((brand, index) => (
          <option key={`${brand.name}-${index}`} value={brand.name.toLowerCase()}>
            📦 {brand.name.toUpperCase()}
          </option>
        ))}
      </datalist>

      {/* HEADER */}
      <header className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[24px] font-black tracking-[-0.04em] text-slate-950">EVENT &amp; CAMPAIGN CENTER</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">Kelola campaign, promo, maintenance &amp; agenda</p>
        </div>
        <button type="button" onClick={() => openAddEvent()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95">
          <Plus size={17} /> Create Event
        </button>
      </header>

      {/* STATS */}
      <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { value: events.length, label: "Events", note: "Total Events", icon: CalendarDays, box: "bg-violet-50 border-violet-100", iconBox: "bg-violet-100 text-violet-700" },
          { value: upcomingCount, label: "Upcoming", note: "Akan datang", icon: Clock, box: "bg-blue-50/60 border-blue-100", iconBox: "bg-blue-100 text-blue-700" },
          { value: promoCount, label: "Promo", note: "Event promo", icon: Ticket, box: "bg-emerald-50/60 border-emerald-100", iconBox: "bg-emerald-100 text-emerald-700" },
          { value: criticalCount, label: "Critical", note: "Prioritas tinggi", icon: AlertCircle, box: "bg-rose-50/70 border-rose-100", iconBox: "bg-rose-100 text-rose-600" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className={`rounded-xl border p-4 shadow-sm ${item.box}`}>
              <div className="flex items-center gap-4">
                <div className={`flex h-14 w-14 items-center justify-center rounded-full ${item.iconBox}`}><Icon size={27} /></div>
                <div>
                  <p className="text-2xl font-black">{item.value}</p>
                  <p className="text-sm font-bold text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.note}</p>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* FILTERS */}
      <section className="mb-4 flex flex-col gap-2.5 xl:flex-row">
        <div className="relative flex-1">
          <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search event..." className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
        </div>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 outline-none">
          <option value="All">All Priority</option><option value="Critical">Critical</option><option value="High">High</option><option value="Promo">Promo</option><option value="Medium">Medium</option><option value="Low">Low</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 outline-none">
          <option value="All">All Status</option><option value="Upcoming">Upcoming</option><option value="Past">Past</option>
        </select>
        <div className="flex h-10 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {(["Month", "Week", "List"] as const).map((mode) => (
            <button key={mode} type="button" onClick={() => setCalendarView(mode)} className={`inline-flex min-w-24 items-center justify-center gap-2 px-4 text-sm font-bold ${calendarView === mode ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
              {mode === "Month" ? <CalendarDays size={15} /> : mode === "Week" ? <CalendarIcon size={15} /> : <Layers size={15} />}{mode}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        {/* CALENDAR / LIST */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => changeMonth(-1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><ChevronLeft size={16}/></button>
              <button type="button" onClick={goToday} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Today</button>
              <button type="button" onClick={() => changeMonth(1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><ChevronRight size={16}/></button>
              <h2 className="ml-2 text-xl font-black uppercase tracking-tight text-slate-900">{viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h2>
            </div>
            <a href={getGoogleCalendarMonthUrl(viewDate)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50">
              <CalendarDays size={15}/> Open in Google Calendar <ExternalLink size={12}/>
            </a>
          </div>

          {calendarView === "Month" ? (
            <div className="p-4 md:p-5">
              <div className="grid grid-cols-7 overflow-hidden rounded-t-lg border border-slate-200">
                {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day, i) => (
                  <div key={day} className={`flex h-10 items-center justify-center border-r border-slate-200 bg-white text-xs font-bold last:border-r-0 ${i===0?"text-rose-500":i===6?"text-blue-600":"text-slate-500"}`}>{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 overflow-hidden rounded-b-lg border-l border-t border-slate-200">
                {Array.from({length:firstDayOfMonth}).map((_,i)=><div key={`empty-${i}`} className="min-h-24 border-b border-r border-slate-200 bg-slate-50/50 md:min-h-28"/>)}
                {Array.from({length:daysInMonth}).map((_,i)=>{
                  const day=i+1;
                  const cellDate=new Date(viewDate.getFullYear(),viewDate.getMonth(),day);
                  const weekday=cellDate.getDay();
                  const isToday=day===today.getDate()&&viewDate.getMonth()===today.getMonth()&&viewDate.getFullYear()===today.getFullYear();
                  const dateStr=`${viewDate.getFullYear()}-${pad(viewDate.getMonth()+1)}-${pad(day)}`;
                  const dayEvents=filteredEvents.filter(e=>normalizeDateValue(e.event_date)===dateStr);
                  return (
                    <button key={dateStr} type="button" onClick={()=>handleDateClick(day,dayEvents)} className={`group min-h-24 border-b border-r border-slate-200 bg-white p-2 text-left hover:bg-indigo-50/40 md:min-h-28 ${isToday?"bg-indigo-50/40":""}`}>
                      <div className="flex items-center justify-between">
                        <span className={`flex h-7 min-w-7 items-center justify-center rounded-full text-xs font-bold ${isToday?"bg-indigo-600 text-white":weekday===0?"text-rose-500":weekday===6?"text-blue-600":"text-slate-700"}`}>{day}</span>
                        {dayEvents.length>0&&<span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">{dayEvents.length}</span>}
                      </div>
                      <div className="mt-2 space-y-1">
                        {dayEvents.slice(0,3).map(event=>{
                          const tone=event.impact_level==="Critical"?"border-rose-100 bg-rose-50 text-rose-700":event.impact_level==="Promo"?"border-orange-100 bg-orange-50 text-orange-700":event.impact_level==="High"?"border-violet-100 bg-violet-50 text-violet-700":event.impact_level==="Low"?"border-emerald-100 bg-emerald-50 text-emerald-700":"border-indigo-100 bg-indigo-50 text-indigo-700";
                          const dot=event.impact_level==="Critical"?"bg-rose-500":event.impact_level==="Promo"?"bg-orange-500":event.impact_level==="High"?"bg-violet-500":event.impact_level==="Low"?"bg-emerald-500":"bg-indigo-500";
                          return <div key={event.id} className={`flex min-w-0 items-center gap-1.5 rounded-md border px-1.5 py-1 ${tone}`}><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`}/><span className="truncate text-[8px] font-bold md:text-[9px]">{event.title}</span></div>
                        })}
                        {dayEvents.length>3&&<div className="px-1 text-[8px] font-bold text-slate-400">+{dayEvents.length-3} more</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-3 text-[10px] font-semibold text-slate-500">
                {[["bg-rose-500","Critical"],["bg-orange-500","Promo"],["bg-violet-500","High"],["bg-indigo-500","Medium"],["bg-emerald-500","Low"]].map(([dot,label])=><span key={label} className="flex items-center gap-1.5"><i className={`h-2 w-2 rounded-full ${dot}`}/>{label}</span>)}
              </div>
            </div>
          ) : calendarView === "Week" ? (
            <div className="p-4 md:p-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
                {Array.from({ length: 7 }).map((_, index) => {
                  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
                  const weekStart = new Date(
                    monthStart.getFullYear(),
                    monthStart.getMonth(),
                    1 - monthStart.getDay()
                  );
                  const dayDate = new Date(
                    weekStart.getFullYear(),
                    weekStart.getMonth(),
                    weekStart.getDate() + index
                  );
                  const dateStr = formatDateForDatabase(dayDate);
                  const dayEvents = filteredEvents.filter(
                    (event) => normalizeDateValue(event.event_date) === dateStr
                  );

                  return (
                    <div key={dateStr} className="min-h-52 rounded-xl border border-slate-200 bg-white p-3">
                      <div className="border-b border-slate-100 pb-2">
                        <p className="text-[10px] font-bold uppercase text-slate-400">
                          {dayDate.toLocaleDateString("en-US", { weekday: "short" })}
                        </p>
                        <p className="mt-1 text-lg font-black text-slate-900">{dayDate.getDate()}</p>
                      </div>
                      <div className="mt-3 space-y-2">
                        {dayEvents.length === 0 ? (
                          <p className="text-[10px] text-slate-300">No event</p>
                        ) : (
                          dayEvents.map((event) => (
                            <button
                              key={event.id}
                              type="button"
                              onClick={() => setSelectedAlert(event)}
                              className="w-full rounded-lg border border-indigo-100 bg-indigo-50 p-2 text-left hover:bg-indigo-100"
                            >
                              <p className="truncate text-[10px] font-bold text-indigo-700">{event.title}</p>
                              <p className="mt-1 text-[9px] text-indigo-400">{event.impact_level}</p>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-162.5 text-left">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-4">Date</th><th className="px-5 py-4">Event</th><th className="px-5 py-4">Priority</th><th className="px-5 py-4">Description</th><th className="px-5 py-4 text-right">Action</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEvents.slice().sort((a,b)=>new Date(a.event_date).getTime()-new Date(b.event_date).getTime()).map(event=>(
                    <tr key={event.id} className="hover:bg-indigo-50/30">
                      <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500">{formatDateIndonesia(event.event_date)}</td>
                      <td className="px-5 py-4 text-sm font-bold">{event.title}</td>
                      <td className="px-5 py-4"><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">{event.impact_level}</span></td>
                      <td className="max-w-sm truncate px-5 py-4 text-xs text-slate-500">{event.description||"-"}</td>
                      <td className="px-5 py-4 text-right"><button type="button" onClick={()=>{const d=new Date(`${event.event_date}T00:00:00`);setSelectedDateInput(d.getDate());setSelectedDateLabel(formatDateIndonesia(event.event_date,{weekday:"long",day:"numeric",month:"long",year:"numeric"}));setSelectedDayEvents([event]);setShowDetailModal(true)}} className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"><ChevronRight size={16}/></button></td>
                    </tr>
                  ))}
                  {filteredEvents.length===0&&<tr><td colSpan={5} className="py-16 text-center text-sm text-slate-400">No events found.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* SIDEBAR */}
        <aside className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-black uppercase">Upcoming</h3>
              <button type="button" onClick={()=>{setCalendarView("List");setStatusFilter("Upcoming")}} className="text-xs font-bold text-indigo-600 hover:underline">View all</button>
            </div>
            <div className="mt-3 space-y-2">
              {filteredUpcoming.length===0?<div className="rounded-lg border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">Belum ada event mendatang.</div>:filteredUpcoming.map(event=>{
                const accent=event.impact_level==="Critical"?"border-rose-500":event.impact_level==="Promo"?"border-orange-500":event.impact_level==="High"?"border-violet-500":"border-indigo-500";
                const badge=event.impact_level==="Critical"?"bg-rose-50 text-rose-600":event.impact_level==="Promo"?"bg-orange-50 text-orange-600":event.impact_level==="High"?"bg-violet-50 text-violet-600":"bg-indigo-50 text-indigo-600";
                return <button key={event.id} type="button" onClick={()=>setSelectedAlert(event)} className={`w-full rounded-lg border border-slate-200 border-l-4 ${accent} p-3 text-left hover:bg-slate-50`}>
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${event.impact_level==="Critical"?"bg-rose-500":event.impact_level==="Promo"?"bg-orange-500":event.impact_level==="High"?"bg-violet-500":"bg-indigo-500"}`}/>
                    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-bold">{event.title}</p><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${badge}`}>{event.impact_level}</span></div><p className="mt-1 text-xs text-slate-400">{formatDateIndonesia(event.event_date)} • {event.description||"No description"}</p></div>
                    <CalendarIcon size={15} className="mt-1 shrink-0 text-slate-300"/>
                  </div>
                </button>
              })}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-base font-black uppercase">Quick Management</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <button type="button" onClick={()=>setShowBannerModal(true)} className="rounded-xl border border-violet-100 bg-violet-50/60 p-4 text-left hover:shadow-md"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Megaphone size={19}/></div><p className="mt-3 text-sm font-black">Banners</p><p className="mt-1 text-xs text-slate-500">{filledBannerCount} / {MAX_BANNER_SLOTS} active</p><span className="mt-2 inline-flex text-xs font-bold text-indigo-600">Kelola banner →</span></button>
              <button type="button" onClick={()=>setShowVoucherModal(true)} className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-left hover:shadow-md"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><Ticket size={19}/></div><p className="mt-3 text-sm font-black">Vouchers</p><p className="mt-1 text-xs text-slate-500">{vouchers.length} active</p><span className="mt-2 inline-flex text-xs font-bold text-emerald-700">Kelola voucher →</span></button>
              <button type="button" onClick={()=>setCalendarView("List")} className="rounded-xl border border-orange-100 bg-orange-50/60 p-4 text-left hover:shadow-md"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600"><Clock size={19}/></div><p className="mt-3 text-sm font-black">Activity</p><p className="mt-1 text-xs text-slate-500">{events.length} event records</p><span className="mt-2 inline-flex text-xs font-bold text-orange-600">Lihat activity →</span></button>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><h3 className="text-sm font-black uppercase">Recent Activity</h3><span className="text-[9px] font-bold uppercase text-slate-400">Event records</span></div>
            <div className="divide-y divide-slate-100">
              {filteredEvents.slice().sort((a,b)=>new Date(b.event_date).getTime()-new Date(a.event_date).getTime()).slice(0,5).map(event=><button key={event.id} type="button" onClick={()=>{const d=new Date(`${event.event_date}T00:00:00`);setSelectedDateInput(d.getDate());setSelectedDateLabel(formatDateIndonesia(event.event_date,{weekday:"long",day:"numeric",month:"long",year:"numeric"}));setSelectedDayEvents([event]);setShowDetailModal(true)}} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"><span className={`h-2 w-2 rounded-full ${event.impact_level==="Critical"?"bg-rose-500":event.impact_level==="Promo"?"bg-orange-500":event.impact_level==="High"?"bg-violet-500":"bg-indigo-500"}`}/><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{event.title}</p><p className="mt-0.5 text-[10px] text-slate-400">{formatDateIndonesia(event.event_date)}</p></div><ChevronRight size={14} className="text-slate-300"/></button>)}
              {filteredEvents.length===0&&<p className="p-6 text-center text-xs text-slate-400">Tidak ada activity.</p>}
            </div>
          </section>
        </aside>
      </div>

      {/* ===================================================
          MODAL ADD EVENT
      =================================================== */}

      {showInputModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-md">

          <div className="relative w-full max-w-lg rounded-[45px] bg-white p-8 shadow-2xl">

            <button
              type="button"
              onClick={() =>
                setShowInputModal(false)
              }
              className="absolute right-8 top-8 text-slate-400 hover:text-slate-900"
            >
              <X />
            </button>

            <h3 className="mb-6 text-2xl font-black tracking-tight text-slate-900">
              Add Memo
            </h3>

            <div className="space-y-5">

              <div className="grid grid-cols-2 gap-4">

                <div>

                  <label className="mb-2 ml-2 block text-[9px] font-black uppercase text-slate-400">
                    Tanggal
                  </label>

                  <input
                    type="number"
                    min={1}
                    max={daysInMonth}
                    value={selectedDateInput}
                    onChange={(e) =>
                      setSelectedDateInput(
                        Number(e.target.value)
                      )
                    }
                    className="w-full rounded-[25px] border-2 border-transparent bg-slate-50 p-5 font-black outline-none focus:border-blue-500"
                    placeholder="Day"
                  />

                </div>

                <div>

                  <label className="mb-2 ml-2 block text-[9px] font-black uppercase text-slate-400">
                    Prioritas
                  </label>

                  <select
                    value={newImpact}
                    onChange={(e) =>
                      setNewImpact(
                        e.target.value
                      )
                    }
                    className="w-full rounded-[25px] border-2 border-transparent bg-slate-50 p-5 font-black outline-none focus:border-blue-500"
                  >
                    <option value="Low">
                      Low
                    </option>

                    <option value="Medium">
                      Medium
                    </option>

                    <option value="Promo">
                      Promo
                    </option>

                    <option value="High">
                      High
                    </option>

                    <option value="Critical">
                      Critical
                    </option>
                  </select>

                </div>

              </div>

              <input
                type="text"
                value={newTitle}
                onChange={(e) =>
                  setNewTitle(e.target.value)
                }
                className="w-full rounded-[25px] border-2 border-transparent bg-slate-50 p-5 font-black outline-none focus:border-blue-500"
                placeholder="Memo Title"
              />

              <textarea
                value={newDescription}
                onChange={(e) =>
                  setNewDescription(
                    e.target.value
                  )
                }
                className="h-32 w-full resize-none rounded-[25px] border-2 border-transparent bg-slate-50 p-5 font-bold outline-none focus:border-blue-500"
                placeholder="Description..."
              />

              <button
                type="button"
                onClick={handleSaveEvent}
                disabled={savingEvent}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-indigo-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                {savingEvent ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                    Saving...
                  </>
                ) : (
                  "Save Memo"
                )}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ===================================================
          MODAL EVENT DETAIL
      =================================================== */}

      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-md">

          <div className="relative w-full max-w-xl rounded-[45px] bg-white p-8 shadow-2xl">

            <button
              type="button"
              onClick={() =>
                setShowDetailModal(false)
              }
              className="absolute right-8 top-8 text-slate-400 hover:text-slate-900"
            >
              <X />
            </button>

            <p className="mb-8 text-xs font-black uppercase tracking-widest text-blue-600">
              {selectedDateLabel}
            </p>

            <div className="custom-scrollbar max-h-[60vh] space-y-4 overflow-y-auto pr-2">

              {selectedDayEvents.map(
                (event) => (
                  <div
                    key={event.id}
                    className="rounded-[35px] border-2 border-slate-100 bg-slate-50 p-6"
                  >

                    <div className="mb-4 flex items-center justify-between">

                      <span
                        className={`
                          rounded-full px-3 py-1
                          text-[10px] font-black uppercase text-white
                          ${
                            event.impact_level ===
                            "Critical"
                              ? "bg-rose-500"
                              : event.impact_level ===
                                  "Promo"
                                ? "bg-orange-500"
                                : "bg-blue-600"
                          }
                        `}
                      >
                        {event.impact_level}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteEvent(
                            event.id
                          )
                        }
                        className="text-slate-300 hover:text-rose-500"
                      >
                        <Trash2 size={20} />
                      </button>

                    </div>

                    <h4 className="mb-1.5 text-lg font-bold text-slate-900">
                      {event.title}
                    </h4>

                    <p className="text-sm font-medium text-slate-500">
                      {event.description ||
                        "No detail provided."}
                    </p>

                  </div>
                )
              )}

              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false);
                  openAddEvent(
                    selectedDateInput
                  );
                }}
                className="w-full rounded-3xl border-2 border-dashed border-slate-200 py-4 text-xs font-black uppercase text-slate-400 transition-all hover:border-blue-300 hover:text-blue-500"
              >
                + Add more to this day
              </button>

            </div>

          </div>

        </div>
      )}

      {/* ===================================================
          BANNER MANAGER
      =================================================== */}

      {showBannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 p-4 backdrop-blur-md">

          <div className="relative flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[50px] bg-white p-6 shadow-2xl md:p-10">

            {/* HEADER */}

            <div className="mb-8 flex items-center justify-between border-b pb-4">

              <h3 className="text-2xl font-black tracking-tight text-slate-900">
                System Banners
              </h3>

              <button
                type="button"
                onClick={() =>
                  setShowBannerModal(false)
                }
                className="rounded-full bg-slate-100 p-2 text-slate-500 transition-all hover:bg-slate-200"
              >
                <X size={24} />
              </button>

            </div>

            {/* BANNER GRID */}

            <div className="custom-scrollbar grid flex-1 grid-cols-1 gap-6 overflow-y-auto pr-2 md:grid-cols-2 lg:grid-cols-3">

              {bannerList.map(
                (banner, index) => (
                  <div
                    key={
                      banner.id ??
                      `slot-${index}`
                    }
                    className="group flex flex-col overflow-hidden rounded-[35px] border border-slate-100 bg-slate-50 transition-all hover:border-blue-500/30"
                  >

                    <div className="relative h-44 bg-slate-200">

                      {banner.src ? (
                        <img
                          src={banner.src}
                          className="h-full w-full object-cover"
                          alt={
                            banner.alt ||
                            `Banner ${index + 1}`
                          }
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-bold uppercase tracking-wider text-slate-400">
                          Slot {index + 1} Empty
                        </div>
                      )}

                    </div>

                    <div className="space-y-3 p-6">

                      <div className="flex items-center gap-2">

                        <div
                          className={`h-1.5 w-1.5 rounded-full ${
                            banner.href
                              ? "bg-emerald-500"
                              : "bg-slate-300"
                          }`}
                        />

                        <span className="text-[8px] font-black uppercase text-slate-400">
                          {banner.href
                            ? "Link Active"
                            : "No Navigation"}
                        </span>

                      </div>

                      <div className="flex items-center justify-between">

                        <span className="text-[9px] font-black uppercase text-slate-400">
                          Slot {index + 1}
                        </span>

                        {banner.is_active ===
                          false && (
                          <span className="rounded-full bg-rose-100 px-2 py-1 text-[7px] font-black uppercase text-rose-500">
                            OFF
                          </span>
                        )}

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          openBannerEditor(
                            banner
                          )
                        }
                        className="w-full rounded-2xl bg-slate-900 py-4 text-[10px] font-black uppercase text-white transition-colors hover:bg-blue-600"
                      >
                        Configure Slot
                      </button>

                    </div>

                  </div>
                )
              )}

            </div>

            {/* =================================================
                BANNER EDITOR
            ================================================= */}

            {editingBanner && (
              <div className="absolute inset-0 z-50 flex flex-col overflow-hidden bg-white p-6 md:p-10">

                <div className="mb-8 flex items-center justify-between border-b pb-6">

                  <div>

                    <h4 className="text-2xl font-black tracking-tight text-slate-900">
                      Slot Configuration
                    </h4>

                    <p className="text-xs font-bold uppercase text-blue-600">
                      Updating &quot;
                      {editingBanner.alt ||
                        "New Slot"}
                      &quot;
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingBanner(
                        null
                      );
                      setPreviewImage("");
                    }}
                    className="text-xs font-black uppercase tracking-widest text-rose-500 underline hover:text-rose-700"
                  >
                    Cancel Editor
                  </button>

                </div>

                <div className="custom-scrollbar grid flex-1 grid-cols-1 gap-8 overflow-y-auto pr-2 pb-10 lg:grid-cols-2 lg:gap-12">

                  {/* PREVIEW */}

                  <div className="space-y-6">

                    <div className="relative aspect-video cursor-pointer overflow-hidden rounded-[40px] border-4 border-slate-100 bg-slate-50 shadow-lg">

                      {previewImage ||
                      editingBanner.src ? (
                        <img
                          src={
                            previewImage ||
                            editingBanner.src
                          }
                          className="h-full w-full object-cover"
                          alt="Preview"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-bold uppercase tracking-wider text-slate-400">
                          Click to Upload Image
                        </div>
                      )}

                      <input
                        type="file"
                        accept="image/*"
                        onChange={
                          handleImageUpload
                        }
                        className="absolute inset-0 cursor-pointer opacity-0"
                      />

                      {uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-white backdrop-blur-sm">

                          <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-xs font-black uppercase">
                            <Loader2
                              size={16}
                              className="animate-spin"
                            />
                            Uploading...
                          </div>

                        </div>
                      )}

                    </div>

                    <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5">

                      <p className="text-[9px] font-black uppercase tracking-widest text-blue-600">
                        Banner Recommendation
                      </p>

                      <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
                        Gunakan gambar landscape
                        dengan rasio sekitar 16:9
                        agar tampilan banner tetap
                        proporsional.
                      </p>

                    </div>

                  </div>

                  {/* FORM */}

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                    {/* ALT */}

                    <div className="space-y-1 md:col-span-2">

                      <label className="ml-4 text-[10px] font-black uppercase text-slate-400">
                        Banner Title (alt)
                      </label>

                      <input
                        type="text"
                        value={
                          editingBanner.alt ||
                          ""
                        }
                        onChange={(e) =>
                          setEditingBanner(
                            {
                              ...editingBanner,
                              alt: e.target
                                .value,
                            }
                          )
                        }
                        className="w-full rounded-[25px] border-2 border-transparent bg-slate-50 p-5 text-sm font-black outline-none transition-all focus:border-blue-500"
                        placeholder="Contoh: Promo MLBB"
                      />

                    </div>

                    {/* PROMO */}

                    <div className="space-y-1">

                      <label className="ml-4 text-[10px] font-black uppercase text-slate-400">
                        Tag Promo
                      </label>

                      <input
                        type="text"
                        value={
                          editingBanner.promo ||
                          ""
                        }
                        onChange={(e) =>
                          setEditingBanner(
                            {
                              ...editingBanner,
                              promo: e.target
                                .value,
                            }
                          )
                        }
                        className="w-full rounded-[25px] border-2 border-transparent bg-slate-50 p-5 text-sm font-black outline-none transition-all focus:border-blue-500"
                        placeholder="Contoh: Diskon 20%"
                      />

                    </div>

                    {/* CATEGORY */}

                    <div className="space-y-1">

                      <label className="ml-4 text-[10px] font-black uppercase text-slate-400">
                        Category
                      </label>

                      <select
                        value={
                          editingBanner.category ||
                          "game"
                        }
                        onChange={(e) =>
                          setEditingBanner(
                            {
                              ...editingBanner,
                              category:
                                e.target
                                  .value,
                            }
                          )
                        }
                        className="w-full appearance-none rounded-[25px] border-2 border-transparent bg-slate-50 p-5 text-sm font-black outline-none transition-all focus:border-blue-500"
                      >
                        <option value="game">
                          Game
                        </option>

                        <option value="ppob">
                          PPOB
                        </option>

                        <option value="entertainment">
                          Entertainment
                        </option>

                        <option value="affiliate">
                          Affiliate
                        </option>
                      </select>

                    </div>

                    {/* PROMO CODE */}

                    <div className="space-y-1">

                      <label className="ml-4 flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                        <Ticket size={12} />
                        Promo Code
                      </label>

                      <input
                        type="text"
                        value={
                          editingBanner.promo_code ||
                          ""
                        }
                        onChange={(e) =>
                          setEditingBanner(
                            {
                              ...editingBanner,
                              promo_code:
                                e.target.value.toUpperCase(),
                            }
                          )
                        }
                        className="w-full rounded-[25px] border-2 border-blue-200 bg-blue-50 p-5 text-sm font-black text-blue-700 outline-none"
                        placeholder="KODEPROMO"
                      />

                    </div>

                    {/* CASHBACK */}

                    <div className="space-y-1">

                      <label className="ml-4 flex items-center gap-2 text-[10px] font-black uppercase text-slate-400">
                        <Banknote size={12} />
                        Cashback
                      </label>

                      <input
                        type="text"
                        value={
                          editingBanner.cashback ||
                          ""
                        }
                        onChange={(e) =>
                          setEditingBanner(
                            {
                              ...editingBanner,
                              cashback:
                                e.target
                                  .value,
                            }
                          )
                        }
                        className="w-full rounded-[25px] border-2 border-emerald-200 bg-emerald-50 p-5 text-sm font-black text-emerald-700 outline-none"
                        placeholder="5%"
                      />

                    </div>

                    {/* HREF */}

                    <div className="space-y-1 md:col-span-2">

                      <label className="ml-4 text-[10px] font-black uppercase text-slate-400">
                        Navigation Link (Href)
                      </label>

                      <input
                        type="text"
                        value={
                          editingBanner.href ||
                          ""
                        }
                        onChange={(e) =>
                          setEditingBanner(
                            {
                              ...editingBanner,
                              href: e.target
                                .value,
                            }
                          )
                        }
                        className="w-full rounded-[25px] border-2 border-transparent bg-slate-50 p-5 text-sm font-black outline-none transition-all focus:border-blue-500"
                        placeholder="/promotions/..."
                      />

                    </div>

                    {/* DESCRIPTION */}

                    <div className="space-y-1 md:col-span-2">

                      <label className="ml-4 text-[10px] font-black uppercase text-slate-400">
                        Full Description
                      </label>

                      <textarea
                        value={
                          editingBanner.description ||
                          ""
                        }
                        onChange={(e) =>
                          setEditingBanner(
                            {
                              ...editingBanner,
                              description:
                                e.target
                                  .value,
                            }
                          )
                        }
                        className="h-32 w-full resize-none rounded-[25px] border-2 border-transparent bg-slate-50 p-5 text-sm font-bold outline-none transition-all focus:border-blue-500"
                        placeholder="Tulis detail lengkap promo di sini..."
                      />

                    </div>

                    {/* ACTIVE SWITCH */}

                    <div className="mb-2 flex items-center justify-between rounded-[25px] border-2 border-slate-100 bg-slate-50 p-5 md:col-span-2">

                      <div className="flex flex-col">

                        <span className="text-[10px] font-black uppercase text-slate-400">
                          Banner Visibility
                        </span>

                        <span className="text-sm font-bold uppercase tracking-wide">
                          {editingBanner.is_active
                            ? "🟢 Link Aktif"
                            : "🟡 Link Mati (Hanya Tampilan)"}
                        </span>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setEditingBanner(
                            {
                              ...editingBanner,
                              is_active:
                                !editingBanner.is_active,
                            }
                          )
                        }
                        className={`rounded-2xl px-6 py-3 text-[10px] font-black transition-all ${
                          editingBanner.is_active
                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200"
                            : "bg-rose-500 text-white shadow-lg shadow-rose-200"
                        }`}
                      >
                        {editingBanner.is_active
                          ? "MATIKAN"
                          : "AKTIFKAN"}
                      </button>

                    </div>

                    {/* SAVE */}

                    <button
                      type="button"
                      onClick={
                        handleSaveBanner
                      }
                      disabled={
                        uploading ||
                        savingBanner
                      }
                      className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-sm font-bold uppercase tracking-wider text-white shadow-xl transition-all hover:bg-indigo-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2 cursor-pointer"
                    >
                      {savingBanner ? (
                        <>
                          <Loader2
                            size={18}
                            className="animate-spin"
                          />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          Save Configuration
                        </>
                      )}
                    </button>

                  </div>

                </div>

              </div>
            )}

          </div>

        </div>
      )}

      {/* ===================================================
          VOUCHER CONSOLE
      =================================================== */}

      {showVoucherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 p-4 backdrop-blur-md">

          <div className="relative flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[50px] bg-white p-6 shadow-2xl md:p-10">

            {/* HEADER */}

            <button
              type="button"
              onClick={() =>
                setShowVoucherModal(false)
              }
              className="absolute right-6 top-6 z-50 rounded-full bg-rose-100 p-2 text-rose-600 transition-all hover:bg-rose-200 md:right-8 md:top-8"
            >
              <X size={24} />
            </button>

            <div className="mb-8 flex flex-col gap-4 border-b pb-8 pr-12 md:flex-row md:items-center md:justify-between">

              <h4 className="text-2xl font-black tracking-tight text-slate-900">
                Voucher Console
              </h4>

              <div className="flex flex-wrap items-center gap-2">

                <div className="flex gap-1 rounded-2xl border bg-slate-100 p-1.5">

                  {[
                    "ALL",
                    "ACTIVE",
                    "PENDING",
                    "EXPIRED",
                  ].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() =>
                        setActiveVoucherFilter(
                          tab
                        )
                      }
                      className={`
                        rounded-xl px-4 py-2
                        text-[9px] font-black transition-all
                        ${
                          activeVoucherFilter ===
                          tab
                            ? "bg-slate-900 text-white shadow-md"
                            : "text-slate-500 hover:bg-white"
                        }
                      `}
                    >
                      {tab}
                    </button>
                  ))}

                </div>

                <button
                  type="button"
                  onClick={
                    handleAddVoucher
                  }
                  className="flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3.5 text-[10px] font-black text-white shadow-lg transition-all hover:bg-orange-600 active:scale-95"
                >
                  <Plus size={14} />
                  TAMBAH
                </button>

              </div>

            </div>

            {/* VOUCHER LIST */}

            <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto pr-2">

              {loadingVouchers ? (
                <div className="flex min-h-60 items-center justify-center">

                  <div className="flex items-center gap-3 text-sm font-bold text-slate-400">

                    <Loader2
                      size={20}
                      className="animate-spin"
                    />

                    Memuat voucher...

                  </div>

                </div>
              ) : filteredVouchers.length ===
                0 ? (
                <div className="flex min-h-60 flex-col items-center justify-center rounded-[35px] border border-dashed border-slate-200 bg-slate-50 text-center">

                  <Ticket
                    size={40}
                    className="text-slate-300"
                  />

                  <p className="mt-4 text-sm font-black uppercase text-slate-400">
                    Tidak ada voucher
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Belum ada voucher pada filter
                    ini.
                  </p>

                </div>
              ) : (
                filteredVouchers.map(
                  (voucher) => {

                    const status =
                      getDerivedStatus(
                        voucher
                      );

                    let cardStyle =
                      "bg-slate-50 border-slate-100";

                    let badge:
                      | React.ReactNode
                      | null = null;

                    if (
                      status ===
                      VOUCHER_STATUS.LIVE
                    ) {
                      cardStyle =
                        "bg-emerald-50 border-emerald-200 shadow-lg shadow-emerald-100/50";

                      badge = (
                        <div className="absolute left-0 top-0 z-10 rounded-br-2xl rounded-tl-[35px] bg-emerald-500 px-3.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white">
                          <CheckCircle2
                            size={10}
                            className="mr-1 inline"
                          />
                          LIVE
                        </div>
                      );
                    } else if (
                      status ===
                      VOUCHER_STATUS.EXPIRED
                    ) {
                      cardStyle =
                        "bg-rose-50 border-rose-200 opacity-80";

                      badge = (
                        <div className="absolute left-0 top-0 z-10 rounded-br-2xl rounded-tl-[35px] bg-rose-500 px-3.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white">
                          <AlertCircle
                            size={10}
                            className="mr-1 inline"
                          />
                          KADALUARSA
                        </div>
                      );
                    } else if (
                      status ===
                      VOUCHER_STATUS.PENDING
                    ) {
                      cardStyle =
                        "bg-amber-50 border-amber-200";

                      badge = (
                        <div className="absolute left-0 top-0 z-10 rounded-br-2xl rounded-tl-[35px] bg-amber-500 px-3.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white">
                          <Clock
                            size={10}
                            className="mr-1 inline"
                          />
                          PENDING
                        </div>
                      );
                    } else if (
                      status ===
                      VOUCHER_STATUS.SOLD_OUT
                    ) {
                      cardStyle =
                        "bg-slate-100 border-slate-300 grayscale";

                      badge = (
                        <div className="absolute left-0 top-0 z-10 rounded-br-2xl rounded-tl-[35px] bg-slate-600 px-3.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white">
                          <Ban
                            size={10}
                            className="mr-1 inline"
                          />
                          HABIS
                        </div>
                      );
                    } else if (
                      status ===
                      VOUCHER_STATUS.OFF
                    ) {
                      cardStyle =
                        "bg-slate-50 border-slate-200";

                      badge = (
                        <div className="absolute left-0 top-0 z-10 rounded-br-2xl rounded-tl-[35px] bg-slate-500 px-3.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white">
                          OFF
                        </div>
                      );
                    }

                    return (
                      <div
                        key={voucher.id}
                        className={`relative rounded-[40px] border p-6 transition-all md:p-8 ${cardStyle}`}
                      >

                        {badge}

                        {/* DELETE */}

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteVoucher(
                              voucher.id
                            )
                          }
                          className="absolute right-4 top-4 text-slate-300 transition-all hover:text-rose-500 active:scale-90"
                        >
                          <Trash2 size={18} />
                        </button>

                        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end">

                          {/* LEFT */}

                          <div className="w-full space-y-4 lg:w-1/3">

                            <div>

                              <label className="ml-2 text-[8px] font-black uppercase text-slate-400">
                                KODE VOUCHER
                              </label>

                              <input
                                type="text"
                                className="w-full rounded-2xl border border-slate-100 bg-white p-4 font-black uppercase shadow-sm outline-none transition-all focus:border-orange-500"
                                value={
                                  voucher.code ||
                                  ""
                                }
                                onChange={(e) =>
                                  updateVoucherLocal(
                                    voucher.id,
                                    "code",
                                    e.target.value.toUpperCase()
                                  )
                                }
                              />

                            </div>

                            <div>

                              <label className="ml-2 text-[8px] font-black uppercase text-slate-400">
                                TARGET BRAND
                              </label>

                              <div className="relative">

                                <input
                                  list="categoryOptions"
                                  className="w-full rounded-2xl border border-slate-100 bg-white p-4 pr-10 font-black uppercase shadow-sm outline-none"
                                  value={
                                    voucher.category ||
                                    "all"
                                  }
                                  placeholder="Semua Brand..."
                                  onChange={(e) =>
                                    updateVoucherLocal(
                                      voucher.id,
                                      "category",
                                      e.target.value.toLowerCase()
                                    )
                                  }
                                />

                                <Layers
                                  size={14}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300"
                                />

                              </div>

                            </div>

                          </div>

                          {/* MIDDLE */}

                          <div className="w-full space-y-4 lg:w-2/3">

                            <div>

                              <label className="ml-2 text-[8px] font-black uppercase text-slate-400">
                                NOMINAL DISKON (RP)
                              </label>

                              <input
                                type="number"
                                min={0}
                                className="w-full rounded-2xl border border-slate-100 bg-white p-4 font-black outline-none transition-all focus:border-orange-500"
                                value={
                                  voucher.discount_amount ??
                                  0
                                }
                                onChange={(e) =>
                                  updateVoucherLocal(
                                    voucher.id,
                                    "discount_amount",
                                    Number(
                                      e.target
                                        .value
                                    )
                                  )
                                }
                              />

                            </div>

                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

                              <div>

                                <label className="text-[7px] font-black uppercase text-emerald-600">
                                  Kuota
                                </label>

                                <input
                                  type="number"
                                  min={0}
                                  className="w-full rounded-xl border-emerald-100 bg-emerald-50 p-3 text-xs font-black text-emerald-700"
                                  value={
                                    voucher.global_limit ??
                                    0
                                  }
                                  onChange={(e) =>
                                    updateVoucherLocal(
                                      voucher.id,
                                      "global_limit",
                                      Number(
                                        e.target
                                          .value
                                      )
                                    )
                                  }
                                />

                              </div>

                              <div>

                                <label className="text-[7px] font-black uppercase text-blue-600">
                                  Limit/U
                                </label>

                                <input
                                  type="number"
                                  min={1}
                                  className="w-full rounded-xl border-blue-100 bg-blue-50 p-3 text-xs font-black text-blue-700"
                                  value={
                                    voucher.usage_limit ??
                                    1
                                  }
                                  onChange={(e) =>
                                    updateVoucherLocal(
                                      voucher.id,
                                      "usage_limit",
                                      Number(
                                        e.target
                                          .value
                                      )
                                    )
                                  }
                                />

                              </div>

                              <div>

                                <label className="text-[7px] font-black uppercase text-slate-400">
                                  Mulai
                                </label>

                                <input
                                  type="date"
                                  className="w-full rounded-xl border border-slate-100 bg-white p-3 text-[9px] font-black"
                                  value={normalizeDateValue(
                                    voucher.valid_from
                                  )}
                                  onChange={(e) =>
                                    updateVoucherLocal(
                                      voucher.id,
                                      "valid_from",
                                      e.target
                                        .value
                                    )
                                  }
                                />

                              </div>

                              <div>

                                <label className="text-[7px] font-black uppercase text-slate-400">
                                  Selesai
                                </label>

                                <input
                                  type="date"
                                  className="w-full rounded-xl border border-slate-100 bg-white p-3 text-[9px] font-black"
                                  value={normalizeDateValue(
                                    voucher.expired_at
                                  )}
                                  onChange={(e) =>
                                    updateVoucherLocal(
                                      voucher.id,
                                      "expired_at",
                                      e.target
                                        .value
                                    )
                                  }
                                />

                              </div>

                            </div>

                          </div>

                          {/* ACTION */}

                          <div className="flex min-w-22.5 flex-row gap-2 lg:flex-col">

                            <button
                              type="button"
                              onClick={() =>
                                updateVoucherLocal(
                                  voucher.id,
                                  "is_active",
                                  !voucher.is_active
                                )
                              }
                              className={`
                                grow rounded-2xl py-4
                                text-[9px] font-black uppercase
                                shadow-md transition-all active:scale-95
                                ${
                                  voucher.is_active
                                    ? "bg-emerald-500 text-white shadow-emerald-200"
                                    : "bg-slate-200 text-slate-400"
                                }
                              `}
                            >
                              {voucher.is_active
                                ? "ON"
                                : "OFF"}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateVoucher(
                                  voucher
                                )
                              }
                              className="flex grow items-center justify-center rounded-2xl bg-slate-900 py-4 text-white shadow-lg transition-all hover:bg-blue-600 active:scale-95"
                            >
                              <Save
                                size={18}
                              />
                            </button>

                          </div>

                        </div>

                        {/* USAGE INFO */}

                        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-200/60 pt-4">

                          <span className="rounded-full bg-white/70 px-3 py-1 text-[8px] font-black uppercase text-slate-500">
                            Digunakan:{" "}
                            {voucher.current_usage ||
                              0}
                          </span>

                          <span className="rounded-full bg-white/70 px-3 py-1 text-[8px] font-black uppercase text-slate-500">
                            Kuota:{" "}
                            {voucher.global_limit >
                            0
                              ? voucher.global_limit
                              : "∞"}
                          </span>

                          {voucher.category && (
                            <span className="rounded-full bg-white/70 px-3 py-1 text-[8px] font-black uppercase text-slate-500">
                              {voucher.category}
                            </span>
                          )}

                        </div>

                      </div>
                    );
                  }
                )
              )}

            </div>

          </div>

        </div>
      )}

      {/* ===================================================
          PRIORITY ALERT MODAL
      =================================================== */}

      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          <div
            className="absolute inset-0 bg-slate-900/90 backdrop-blur-md"
            onClick={() =>
              setSelectedAlert(null)
            }
          />

          <div className="relative w-full max-w-md animate-in rounded-[40px] border border-slate-700 bg-[#0F172A] p-8 text-center text-white shadow-2xl zoom-in-95 duration-300">

            <AlertCircle
              size={40}
              className="mx-auto mb-4 text-blue-500"
            />

            <p className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">
              {selectedAlert.impact_level}
            </p>

            <h3 className="mb-3 text-xl font-black tracking-tight">
              {selectedAlert.title}
            </h3>

            <p className="mb-2 text-xs font-black uppercase text-slate-500">
              {formatDateIndonesia(
                selectedAlert.event_date,
                {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }
              )}
            </p>

            <p className="mb-6 text-sm text-slate-400">
              {selectedAlert.description ||
                "No detail provided."}
            </p>

            <button
              type="button"
              onClick={() =>
                setSelectedAlert(null)
              }
              className="w-full rounded-2xl bg-white py-3.5 text-xs font-bold uppercase tracking-wider text-slate-900 transition hover:bg-slate-100 cursor-pointer"
            >
              Tutup
            </button>

          </div>

        </div>
      )}

      {/* ===================================================
          GLOBAL STYLE
      =================================================== */}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }

        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
        }
      `}</style>

    </div>
  );
}
