"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/utils/supabaseClient";
import {
  Activity,
  ArrowUpDown,
  CheckCircle2,
  ChevronRight,
  ImagePlus,
  Landmark,
  Loader2,
  Plus,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type Payment = {
  id: string;
  name?: string;
  method_key?: string;
  account_name?: string;
  account_no?: string;
  logo_url?: string | null;
  min_price?: number | null;
  start_hour?: number | null;
  end_hour?: number | null;
  is_qr?: boolean;
  is_maintenance?: boolean;
  is_pending?: boolean;
};

type SortConfig = {
  key: keyof Payment;
  direction: "asc" | "desc";
} | null;

type NotificationType = "success" | "error" | "info";

type NotificationState = {
  type: NotificationType;
  message: string;
} | null;

type HealthStatus =
  | "online"
  | "warning"
  | "error"
  | "checking";

type HealthItem = {
  status: HealthStatus;
  label: string;
  detail: string;
};

type SystemHealth = {
  checked_at: string | null;
  statuses: {
    qris_generator: HealthItem;
    dana_dynamic: HealthItem;
    dana_static: HealthItem;
    gopay_static: HealthItem;
    database: HealthItem;
    auto_save: HealthItem;
  };
};

type DeletePendingPayment = {
  id: string;
  name: string;
};

const PAYMENT_CACHE_KEY =
  "dapay-payment-management-cache-v1";

/* =========================================================
   QRIS PROVIDERS
========================================================= */

const QRIS_PROVIDERS = [
  {
    id: "dana_dynamic",
    name: "DANA Dynamic",
    role: "PRIMARY",
    desc: "QR utama dengan nominal otomatis masuk ke QRIS.",
    iconClass:
      "bg-gradient-to-br from-sky-500 to-cyan-400",
    accent: "from-sky-500 to-cyan-400",
    dot: "bg-sky-400",
  },
  {
    id: "dana_static",
    name: "DANA Static",
    role: "FALLBACK 01",
    desc: "Fallback pertama jika DANA Dynamic bermasalah.",
    iconClass:
      "bg-gradient-to-br from-blue-400 to-indigo-400",
    accent: "from-blue-400 to-indigo-400",
    dot: "bg-blue-400",
  },
  {
    id: "gopay_static",
    name: "GoPay Static",
    role: "FALLBACK 02",
    desc: "Backup berikutnya dengan QR tetap.",
    iconClass:
      "bg-gradient-to-br from-emerald-400 to-green-400",
    accent: "from-emerald-400 to-green-400",
    dot: "bg-emerald-500",
  },
] as const;

/* =========================================================
   HELPERS
========================================================= */

function normalizePayment(raw: any): Payment {
  return {
    id: String(raw?.id ?? ""),
    name: raw?.name ?? "",
    method_key: raw?.method_key ?? "",
    account_name: raw?.account_name ?? "",
    account_no: raw?.account_no ?? "",
    logo_url:
      raw?.logo_url == null
        ? null
        : String(raw.logo_url),
    min_price:
      raw?.min_price == null ||
      raw?.min_price === ""
        ? null
        : Number(raw.min_price),
    start_hour:
      raw?.start_hour == null ||
      raw?.start_hour === ""
        ? null
        : Number(raw.start_hour),
    end_hour:
      raw?.end_hour == null ||
      raw?.end_hour === ""
        ? null
        : Number(raw.end_hour),
    is_qr: Boolean(raw?.is_qr),
    is_maintenance: Boolean(
      raw?.is_maintenance
    ),
    is_pending: Boolean(raw?.is_pending),
  };
}

function isTemporaryPaymentId(
  id: string | number
) {
  return String(id).startsWith(
    "temp-payment-"
  );
}

function isValidDatabasePaymentId(
  id: string | number
) {
  return /^\d+$/.test(String(id));
}

function getPaymentPlaceholder(
  name?: string
) {
  const text = encodeURIComponent(
    name || "PAY"
  );

  return `https://placehold.co/100x60/e2e8f0/64748b?text=${text}`;
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function PaymentManagement() {
  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = new Headers(options.headers || {});
    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
    }
    return fetch(url, { ...options, headers });
  };

  /* =======================================================
     NOTIFICATION
  ======================================================= */

  const [
    notification,
    setNotification,
  ] = useState<NotificationState>(
    null
  );

  const notificationTimerRef =
    useRef<number | null>(null);

  const showNotification = (
    type: NotificationType,
    message: string
  ) => {
    if (notificationTimerRef.current) {
      window.clearTimeout(
        notificationTimerRef.current
      );
    }

    setNotification({
      type,
      message,
    });

    notificationTimerRef.current =
      window.setTimeout(() => {
        setNotification(null);
        notificationTimerRef.current = null;
      }, 4000);
  };

  /* =======================================================
     PAYMENTS
  ======================================================= */

  const [payments, setPayments] =
    useState<Payment[]>([]);

  const [
    paymentsSyncing,
    setPaymentsSyncing,
  ] = useState(false);

  const [
    paymentsCacheLoaded,
    setPaymentsCacheLoaded,
  ] = useState(false);

  const [
    addingPayment,
    setAddingPayment,
  ] = useState(false);

  const [
    uploadingId,
    setUploadingId,
  ] = useState<string | null>(null);

  const [
    sortConfig,
    setSortConfig,
  ] = useState<SortConfig>(null);

  /* =======================================================
     DELETE
  ======================================================= */

  const [
    deleteConfirmOpen,
    setDeleteConfirmOpen,
  ] = useState(false);

  const [
    deletePendingPayment,
    setDeletePendingPayment,
  ] = useState<DeletePendingPayment | null>(
    null
  );

  const [
    deleteSaving,
    setDeleteSaving,
  ] = useState(false);

  /* =======================================================
     QRIS
  ======================================================= */

  const [
    qrisProvider,
    setQrisProvider,
  ] = useState<string>(
    "dana_dynamic"
  );

  const [
    qrisLoading,
    setQrisLoading,
  ] = useState(true);

  const [
    qrisSaving,
    setQrisSaving,
  ] = useState(false);

  const [
    qrisMessage,
    setQrisMessage,
  ] = useState("");

  const [
    qrisError,
    setQrisError,
  ] = useState("");

  const [
    qrisUpdatedAt,
    setQrisUpdatedAt,
  ] = useState<string | null>(null);

  const [
    qrisHistory,
    setQrisHistory,
  ] = useState<
    Array<{
      id: string;
      created_at: string;
      details: string | null;
    }>
  >([]);

  const [
    qrisHistoryOpen,
    setQrisHistoryOpen,
  ] = useState(false);

  const [
    qrisHistoryLoading,
    setQrisHistoryLoading,
  ] = useState(false);

  const [
    qrisConfirmOpen,
    setQrisConfirmOpen,
  ] = useState(false);

  const [
    qrisPendingProvider,
    setQrisPendingProvider,
  ] = useState<string | null>(null);

  const [
    generatorChoiceOpen,
    setGeneratorChoiceOpen,
  ] = useState(false);

  /* =======================================================
     SYSTEM HEALTH
  ======================================================= */

  const [
    systemHealth,
    setSystemHealth,
  ] = useState<SystemHealth | null>(
    null
  );

  const [
    systemHealthLoading,
    setSystemHealthLoading,
  ] = useState(true);

  const [
    systemHealthError,
    setSystemHealthError,
  ] = useState("");

  /* =======================================================
     CACHE
  ======================================================= */

  const savePaymentCache = (
    rows: Payment[]
  ) => {
    try {
      if (
        typeof window === "undefined"
      ) {
        return;
      }

      const cacheableRows =
        rows.filter(
          (row) =>
            !row.is_pending &&
            !isTemporaryPaymentId(row.id)
        );

      localStorage.setItem(
        PAYMENT_CACHE_KEY,
        JSON.stringify(cacheableRows)
      );
    } catch (error) {
      console.warn(
        "Gagal menyimpan cache pembayaran:",
        error
      );
    }
  };

  const loadPaymentCache = () => {
    try {
      if (
        typeof window === "undefined"
      ) {
        setPaymentsCacheLoaded(true);
        return;
      }

      const raw =
        localStorage.getItem(
          PAYMENT_CACHE_KEY
        );

      if (!raw) {
        setPaymentsCacheLoaded(true);
        return;
      }

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        setPaymentsCacheLoaded(true);
        return;
      }

      setPayments(
        parsed.map(normalizePayment)
      );
    } catch (error) {
      console.warn(
        "Gagal membaca cache pembayaran:",
        error
      );
    } finally {
      setPaymentsCacheLoaded(true);
    }
  };

  /* =======================================================
     FETCH PAYMENTS
  ======================================================= */

  const fetchPayments = async (
    silent = false
  ) => {
    if (!silent) {
      setPaymentsSyncing(true);
    }

    try {
      const res = await fetchWithAuth("/api/admin/payments",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data =
        await res.json();

      if (
        !res.ok ||
        data?.error
      ) {
        throw new Error(
          data?.error ||
            "Gagal mengambil data pembayaran."
        );
      }

      const rows =
        Array.isArray(data)
          ? data
          : [];

      const normalizedRows =
        rows.map(normalizePayment);

      setPayments(
        (current) => {
          const pendingRows =
            current.filter(
              (item) =>
                item.is_pending &&
                isTemporaryPaymentId(
                  item.id
                )
            );

          const merged = [
            ...normalizedRows,
            ...pendingRows,
          ];

          savePaymentCache(
            normalizedRows
          );

          return merged;
        }
      );
    } catch (error) {
      console.error(
        "PAYMENT GET ERROR:",
        error
      );

      if (
        payments.length === 0 &&
        paymentsCacheLoaded
      ) {
        showNotification(
          "error",
          error instanceof Error
            ? error.message
            : "Gagal mengambil data pembayaran."
        );
      }
    } finally {
      setPaymentsSyncing(false);
    }
  };

  /* =======================================================
     QRIS FETCH
  ======================================================= */

  const fetchQrisSettings =
    async () => {
      setQrisLoading(true);
      setQrisError("");

      try {
        const res = await fetchWithAuth("/api/admin/qris/settings",
          {
            cache: "no-store",
          }
        );

        const data =
          await res.json();

        if (
          !res.ok ||
          !data.success
        ) {
          throw new Error(
            data.error ||
              "Gagal membaca setting QRIS."
          );
        }

        setQrisProvider(
          data.data?.active_provider ||
            "dana_dynamic"
        );

        setQrisUpdatedAt(
          data.data?.updated_at ||
            null
        );

        setQrisHistory(
          Array.isArray(
            data.data?.history
          )
            ? data.data.history
            : []
        );
      } catch (error) {
        console.error(
          "QRIS SETTINGS ERROR:",
          error
        );

        setQrisError(
          error instanceof Error
            ? error.message
            : "Gagal membaca setting QRIS."
        );
      } finally {
        setQrisLoading(false);
      }
    };

  /* =======================================================
     QRIS HISTORY
  ======================================================= */

  const fetchQrisHistory =
    async () => {
      setQrisHistoryLoading(
        true
      );

      try {
        const res = await fetchWithAuth("/api/admin/qris/settings",
          {
            cache: "no-store",
          }
        );

        const data =
          await res.json();

        if (
          !res.ok ||
          !data.success
        ) {
          throw new Error(
            data.error ||
              "Gagal membaca riwayat QRIS."
          );
        }

        setQrisHistory(
          Array.isArray(
            data.data?.history
          )
            ? data.data.history
            : []
        );
      } catch (error) {
        console.error(
          "QRIS HISTORY ERROR:",
          error
        );
      } finally {
        setQrisHistoryLoading(
          false
        );
      }
    };

  const handleOpenQrisHistory =
    async () => {
      setQrisHistoryOpen(true);
      await fetchQrisHistory();
    };

  /* =======================================================
     SYSTEM HEALTH
  ======================================================= */

  const fetchSystemHealth =
    async (
      silent = false
    ) => {
      if (!silent) {
        setSystemHealthLoading(
          true
        );
      }

      try {
        const res = await fetchWithAuth("/api/admin/system-health",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data =
          await res.json();

        if (
          !res.ok ||
          !data.success
        ) {
          throw new Error(
            data.error ||
              "Gagal membaca status kesehatan sistem."
          );
        }

        setSystemHealth(data);
        setSystemHealthError("");
      } catch (error) {
        console.error(
          "SYSTEM HEALTH ERROR:",
          error
        );

        setSystemHealthError(
          error instanceof Error
            ? error.message
            : "Status sistem tidak dapat diperiksa."
        );
      } finally {
        if (!silent) {
          setSystemHealthLoading(
            false
          );
        }
      }
    };

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
  // Load cache payment terlebih dahulu agar UI langsung tampil.
  loadPaymentCache();

  // Sinkronisasi payment di background.
  fetchPayments(true);

  // Baca setting QRIS saat halaman dibuka.
  fetchQrisSettings();

  // Health check hanya 1x saat halaman dibuka.
  // Tidak ada polling 30 detik / 1 menit / 1 hari.
  fetchSystemHealth();

  return () => {
    if (notificationTimerRef.current) {
      window.clearTimeout(notificationTimerRef.current);
    }
  };
}, []);

  /* =======================================================
     SORT
  ======================================================= */

  const handleSort = (
    key: keyof Payment
  ) => {
    let direction:
      | "asc"
      | "desc" = "asc";

    if (
      sortConfig?.key === key &&
      sortConfig.direction ===
        "asc"
    ) {
      direction = "desc";
    }

    setSortConfig({
      key,
      direction,
    });
  };

  const sortedPayments =
    useMemo(() => {
      return [...payments].sort(
        (a, b) => {
          /*
           * Active di atas.
           */
          if (
            a.is_maintenance !==
            b.is_maintenance
          ) {
            return a.is_maintenance
              ? 1
              : -1;
          }

          /*
           * Pending selalu terakhir.
           */
          if (
            a.is_pending !==
            b.is_pending
          ) {
            return a.is_pending
              ? 1
              : -1;
          }

          /*
           * Tidak ada sorting:
           * pertahankan urutan server.
           */
          if (!sortConfig) {
            return 0;
          }

          const av =
            a[sortConfig.key];

          const bv =
            b[sortConfig.key];

          if (av === bv) {
            return 0;
          }

          if (av == null) {
            return sortConfig.direction ===
              "asc"
              ? -1
              : 1;
          }

          if (bv == null) {
            return sortConfig.direction ===
              "asc"
              ? 1
              : -1;
          }

          return av < bv
            ? sortConfig.direction ===
              "asc"
              ? -1
              : 1
            : sortConfig.direction ===
              "asc"
            ? 1
            : -1;
        }
      );
    }, [payments, sortConfig]);

  /* =======================================================
     LOCAL CHANGE
  ======================================================= */

  const handleLocalChange = (
    id: string | number,
    field: string,
    value: unknown
  ) => {
    const safeId = String(id);

    setPayments(
      (prev) =>
        prev.map((payment) =>
          payment.id === safeId
            ? {
                ...payment,
                [field]: value,
              }
            : payment
        )
    );
  };

  /* =======================================================
     SAVE ON BLUR
  ======================================================= */

  const handleSaveBlur =
    async (
      id: string | number,
      field: string,
      value: unknown
    ) => {
      const safeId = String(id);

      if (
        isTemporaryPaymentId(
          safeId
        )
      ) {
        return;
      }

      if (
        !isValidDatabasePaymentId(
          safeId
        )
      ) {
        return;
      }

      let finalValue = value;

      if (
        field === "name" &&
        typeof value === "string"
      ) {
        finalValue =
          value
            .trim()
            .toUpperCase();

        handleLocalChange(
          safeId,
          "name",
          finalValue
        );
      }

      if (
        field ===
          "method_key" &&
        typeof value === "string"
      ) {
        finalValue =
          value
            .trim()
            .toLowerCase()
            .replace(
              /\s+/g,
              "_"
            )
            .replace(
              /[^a-z0-9_-]/g,
              ""
            );

        handleLocalChange(
          safeId,
          "method_key",
          finalValue
        );
      }

      if (
        [
          "start_hour",
          "end_hour",
          "min_price",
        ].includes(field) &&
        value === ""
      ) {
        finalValue = null;
      }

      try {
        const res =
          await fetchWithAuth("/api/admin/payments",
            {
              method: "PATCH",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify(
                {
                  id: safeId,
                  [field]:
                    finalValue,
                }
              ),
            }
          );

        if (!res.ok) {
          const data =
            await res
              .json()
              .catch(
                () => null
              );

          throw new Error(
            data?.error ||
              "Gagal menyimpan perubahan."
          );
        }

        setPayments(
          (current) => {
            savePaymentCache(
              current
            );
            return current;
          }
        );
      } catch (error) {
        console.error(
          "PAYMENT SAVE ERROR:",
          error
        );

        showNotification(
          "error",
          error instanceof Error
            ? error.message
            : "Gagal menyimpan perubahan."
        );
      }
    };

  /* =======================================================
     TOGGLE
  ======================================================= */

  const handleToggle =
    async (
      id: string | number,
      field: string,
      currentValue: boolean
    ) => {
      const safeId = String(id);

      if (
        isTemporaryPaymentId(
          safeId
        ) ||
        !isValidDatabasePaymentId(
          safeId
        )
      ) {
        return;
      }

      const newValue =
        !currentValue;

      handleLocalChange(
        safeId,
        field,
        newValue
      );

      try {
        const res =
          await fetchWithAuth("/api/admin/payments",
            {
              method: "PATCH",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify(
                {
                  id: safeId,
                  [field]:
                    newValue,
                }
              ),
            }
          );

        if (!res.ok) {
          const data =
            await res
              .json()
              .catch(
                () => null
              );

          throw new Error(
            data?.error ||
              "Gagal mengubah status."
          );
        }

        setPayments(
          (current) => {
            savePaymentCache(
              current
            );
            return current;
          }
        );
      } catch (error) {
        console.error(
          "PAYMENT TOGGLE ERROR:",
          error
        );

        handleLocalChange(
          safeId,
          field,
          currentValue
        );

        showNotification(
          "error",
          error instanceof Error
            ? error.message
            : "Gagal mengubah status."
        );
      }
    };

  /* =======================================================
     ADD PAYMENT
  ======================================================= */

  const handleAddPayment =
    async () => {
      if (addingPayment) {
        return;
      }

      setAddingPayment(true);

      const randomId =
        Math.floor(
          Math.random() *
            1000000
        );

      const tempId =
        `temp-payment-${Date.now()}-${randomId}`;

      const optimisticPayment: Payment =
        {
          id: tempId,
          name: `BANK BARU ${randomId}`,
          method_key: `bank_baru_${randomId}`,
          account_name: "-",
          account_no: "-",
          logo_url: null,
          min_price: 0,
          start_hour: null,
          end_hour: null,
          is_maintenance: true,
          is_qr: false,
          is_pending: true,
        };

      /*
       * Langsung tampil paling bawah.
       */
      setPayments(
        (prev) => [
          ...prev,
          optimisticPayment,
        ]
      );

      try {
        const res =
          await fetchWithAuth("/api/admin/payments",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify(
                {
                  name:
                    optimisticPayment.name,
                  method_key:
                    optimisticPayment.method_key,
                  account_name:
                    optimisticPayment.account_name,
                  account_no:
                    optimisticPayment.account_no,
                  logo_url:
                    optimisticPayment.logo_url,
                  min_price:
                    optimisticPayment.min_price,
                  start_hour:
                    optimisticPayment.start_hour,
                  end_hour:
                    optimisticPayment.end_hour,
                  is_maintenance:
                    optimisticPayment.is_maintenance,
                  is_qr:
                    optimisticPayment.is_qr,
                }
              ),
            }
          );

        const data =
          await res.json();

        if (
          !res.ok ||
          data?.error
        ) {
          throw new Error(
            data?.error ||
              "Gagal menambah metode pembayaran."
          );
        }

        const rawCreatedPayment =
          data?.data?.payment ??
          data?.data ??
          data?.payment ??
          null;

        if (
          !rawCreatedPayment?.id
        ) {
          throw new Error(
            "ID dari database tidak diterima."
          );
        }

        const createdPayment =
          normalizePayment(
            rawCreatedPayment
          );

        setPayments(
          (prev) =>
            prev.map(
              (payment) =>
                payment.id ===
                tempId
                  ? {
                      ...createdPayment,
                      is_pending:
                        false,
                    }
                  : payment
            )
        );

        setPayments(
          (current) => {
            savePaymentCache(
              current
            );
            return current;
          }
        );

        showNotification(
          "success",
          `${optimisticPayment.name} berhasil ditambahkan.`
        );
      } catch (error) {
        console.error(
          "PAYMENT ADD ERROR:",
          error
        );

        setPayments(
          (prev) =>
            prev.filter(
              (payment) =>
                payment.id !==
                tempId
            )
        );

        showNotification(
          "error",
          "Gagal menambah bank: " +
            (error instanceof Error
              ? error.message
              : "Terjadi kesalahan pada server.")
        );
      } finally {
        setAddingPayment(
          false
        );
      }
    };

  /* =======================================================
     DELETE OPEN
  ======================================================= */

  const openDelete = (
    id: string | number,
    name?: string,
    isPending = false
  ) => {
    if (deleteSaving) {
      return;
    }

    const safeId = String(id);

    if (
      isPending ||
      isTemporaryPaymentId(
        safeId
      )
    ) {
      showNotification(
        "info",
        "Metode pembayaran masih dalam proses penyimpanan. Silakan tunggu sampai selesai."
      );
      return;
    }

    if (
      !isValidDatabasePaymentId(
        safeId
      )
    ) {
      showNotification(
        "error",
        "ID metode pembayaran tidak valid."
      );
      return;
    }

    setDeletePendingPayment({
      id: safeId,
      name:
        name ||
        "Metode Pembayaran",
    });

    setDeleteConfirmOpen(true);
  };

  /* =======================================================
     DELETE
  ======================================================= */

  const confirmDelete =
    async () => {
      if (
        !deletePendingPayment ||
        deleteSaving
      ) {
        return;
      }

      const {
        id,
        name,
      } = deletePendingPayment;

      const safeId = String(id);

      if (
        !isValidDatabasePaymentId(
          safeId
        )
      ) {
        setDeleteConfirmOpen(
          false
        );
        setDeletePendingPayment(
          null
        );

        showNotification(
          "error",
          "ID metode pembayaran tidak valid."
        );

        return;
      }

      setDeleteSaving(true);

      const backupPayments =
        payments;

      /*
       * Optimistic delete.
       */
      setPayments(
        (prev) =>
          prev.filter(
            (payment) =>
              payment.id !==
              safeId
          )
      );

      try {
        const res =
          await fetchWithAuth(`/api/admin/payments?id=${encodeURIComponent(
              safeId
            )}`,
            {
              method: "DELETE",
            }
          );

        const data =
          await res.json();

        if (
          !res.ok ||
          data?.error
        ) {
          throw new Error(
            data?.error ||
              "Gagal menghapus metode pembayaran."
          );
        }

        setPayments(
          (current) => {
            savePaymentCache(
              current
            );
            return current;
          }
        );

        setDeleteConfirmOpen(
          false
        );
        setDeletePendingPayment(
          null
        );

        showNotification(
          "success",
          `Metode pembayaran ${name} berhasil dihapus.`
        );
      } catch (error) {
        console.error(
          "DELETE PAYMENT ERROR:",
          error
        );

        /*
         * Kembalikan data lama
         * jika DELETE gagal.
         */
        setPayments(
          backupPayments
        );

        showNotification(
          "error",
          error instanceof Error
            ? error.message
            : "Gagal menghapus metode pembayaran."
        );
      } finally {
        setDeleteSaving(
          false
        );
      }
    };

  const closeDelete = () => {
    if (deleteSaving) {
      return;
    }

    setDeleteConfirmOpen(
      false
    );
    setDeletePendingPayment(
      null
    );
  };

  /* =======================================================
     UPLOAD LOGO
  ======================================================= */

  const handleUploadLogo =
    async (
      e: React.ChangeEvent<HTMLInputElement>,
      id: string | number
    ) => {
      const file =
        e.target.files?.[0];

      if (!file) {
        return;
      }

      const safeId = String(id);

      if (
        !isValidDatabasePaymentId(
          safeId
        )
      ) {
        e.target.value = "";
        return;
      }

      const payment =
        payments.find(
          (item) =>
            item.id ===
            safeId
        );

      if (
        payment?.is_pending ||
        isTemporaryPaymentId(
          safeId
        )
      ) {
        showNotification(
          "info",
          "Metode pembayaran masih dalam proses penyimpanan."
        );

        e.target.value = "";
        return;
      }

      try {
        setUploadingId(
          safeId
        );

        const fileExt =
          file.name
            .split(".")
            .pop() || "png";

        const fileName =
          `logo-${safeId}-${Math.random()}.${fileExt}`;

        const filePath =
          `payment-logos/${fileName}`;

        const {
          error: uploadError,
        } =
          await supabase.storage
            .from("Payment")
            .upload(
              filePath,
              file
            );

        if (uploadError) {
          throw uploadError;
        }

        const {
          data,
        } =
          supabase.storage
            .from("Payment")
            .getPublicUrl(
              filePath
            );

        handleLocalChange(
          safeId,
          "logo_url",
          data.publicUrl
        );

        await handleSaveBlur(
          safeId,
          "logo_url",
          data.publicUrl
        );
      } catch (error) {
        console.error(
          "UPLOAD LOGO ERROR:",
          error
        );

        showNotification(
          "error",
          error instanceof Error
            ? error.message
            : "Gagal upload logo."
        );
      } finally {
        setUploadingId(
          null
        );

        e.target.value = "";
      }
    };

  /* =======================================================
     QRIS SWITCH
  ======================================================= */

  const handleQrisSwitch = (
    provider: string
  ) => {
    if (
      provider === qrisProvider ||
      qrisSaving
    ) {
      return;
    }

    setQrisPendingProvider(
      provider
    );

    setQrisConfirmOpen(true);
  };

  const confirmQrisSwitch =
    async () => {
      if (
        !qrisPendingProvider ||
        qrisSaving
      ) {
        return;
      }

      const providerNames: Record<
        string,
        string
      > = {
        dana_dynamic:
          "DANA Dynamic",
        dana_static:
          "DANA Static",
        gopay_static:
          "GoPay Static",
      };

      const providerName =
        providerNames[
          qrisPendingProvider
        ] ||
        qrisPendingProvider;

      setQrisConfirmOpen(
        false
      );

      setQrisSaving(true);
      setQrisMessage("");
      setQrisError("");

      try {
        const res =
          await fetchWithAuth("/api/admin/qris/settings",
            {
              method: "PUT",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify(
                {
                  provider:
                    qrisPendingProvider,
                }
              ),
            }
          );

        const data =
          await res.json();

        if (
          !res.ok ||
          !data.success
        ) {
          throw new Error(
            data.error ||
              "Gagal mengganti provider QRIS."
          );
        }

        setQrisProvider(
          qrisPendingProvider
        );

        setQrisUpdatedAt(
          data.data?.updated_at ||
            new Date().toISOString()
        );

        setQrisMessage(
          `QRIS berhasil diganti ke ${providerName}.`
        );

        showNotification(
          "success",
          `QRIS berhasil diganti ke ${providerName}.`
        );

        if (
          Array.isArray(
            data.data?.history
          )
        ) {
          setQrisHistory(
            data.data.history
          );
        }
      } catch (error) {
        console.error(
          "QRIS SWITCH ERROR:",
          error
        );

        const message =
          error instanceof Error
            ? error.message
            : "Gagal mengganti QRIS.";

        setQrisError(message);

        showNotification(
          "error",
          message
        );
      } finally {
        setQrisSaving(
          false
        );

        setQrisPendingProvider(
          null
        );
      }
    };

  /* =======================================================
     FORMAT DATE
  ======================================================= */

  const formatQrisDate = (
    value: string | null
  ) => {
    if (!value) {
      return "Belum pernah diubah";
    }

    return `${new Date(
      value
    ).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone:
        "Asia/Jakarta",
    })} WIB`;
  };

  /* =======================================================
     COUNTERS
  ======================================================= */

  const activeCount =
    payments.filter(
      (payment) =>
        !payment.is_maintenance
    ).length;

  const qrCount =
    payments.filter(
      (payment) =>
        payment.is_qr
    ).length;

  const inactiveCount =
    payments.filter(
      (payment) =>
        payment.is_maintenance
    ).length;

  const activeProviderName =
    QRIS_PROVIDERS.find(
      (provider) =>
        provider.id ===
        qrisProvider
    )?.name ||
    "DANA Dynamic";

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="w-full space-y-5 pb-14 font-sans text-slate-900">

      {/* ===================================================
          NOTIFICATION
      =================================================== */}

      {notification && (
        <div className="fixed right-5 top-5 z-140 w-[min(380px,calc(100vw-40px))]">
          <div
            className={`flex items-start gap-3 rounded-2xl border bg-white px-4 py-3 shadow-[0_18px_50px_rgba(15,23,42,0.15)] animate-in fade-in slide-in-from-top-2 duration-200 ${
              notification.type ===
              "success"
                ? "border-emerald-100"
                : notification.type ===
                  "error"
                ? "border-rose-100"
                : "border-blue-100"
            }`}
          >
            <div
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                notification.type ===
                "success"
                  ? "bg-emerald-50 text-emerald-600"
                  : notification.type ===
                    "error"
                  ? "bg-rose-50 text-rose-600"
                  : "bg-blue-50 text-blue-600"
              }`}
            >
              {notification.type ===
              "success" ? (
                <CheckCircle2
                  size={16}
                />
              ) : notification.type ===
                "error" ? (
                <XCircle size={16} />
              ) : (
                <ShieldCheck
                  size={16}
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p
                className={`text-[8px] font-black uppercase tracking-widest ${
                  notification.type ===
                  "success"
                    ? "text-emerald-600"
                    : notification.type ===
                      "error"
                    ? "text-rose-600"
                    : "text-blue-600"
                }`}
              >
                {notification.type ===
                "success"
                  ? "Berhasil"
                  : notification.type ===
                    "error"
                  ? "Terjadi Kesalahan"
                  : "Informasi"}
              </p>

              <p className="mt-1 text-[10px] font-medium leading-relaxed text-slate-600">
                {notification.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setNotification(null)
              }
              className="rounded-lg p-1 text-slate-300 transition hover:bg-slate-100 hover:text-slate-500"
            >
              <XCircle size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ===================================================
          HEADER
      =================================================== */}

      <section className="rounded-[22px] border border-slate-200/80 bg-white px-5 py-4 shadow-[0_8px_30px_rgba(15,23,42,0.04)] md:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
              <Landmark size={19} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-slate-950 md:text-[22px]">
                  Payment Management
                </h1>

                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-emerald-600">
                  LIVE
                </span>
              </div>

              <p className="mt-0.5 text-[10px] font-medium text-slate-400 md:text-[11px]">
                Kelola metode pembayaran dan provider QRIS
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              fetchPayments(false)
            }
            disabled={
              paymentsSyncing
            }
            className="inline-flex h-8 w-fit items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[8px] font-black uppercase tracking-wider text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={11}
              className={
                paymentsSyncing
                  ? "animate-spin"
                  : ""
              }
            />
            Refresh
          </button>
        </div>
      </section>

      {/* ===================================================
          SUMMARY
      =================================================== */}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<Landmark size={18} />}
          iconClass="bg-blue-600"
          label="Total Metode"
          value={payments.length}
          note="Metode pembayaran"
        />

        <SummaryCard
          icon={
            <CheckCircle2 size={18} />
          }
          iconClass="bg-emerald-500"
          label="Metode Aktif"
          value={activeCount}
          note="Siap menerima pembayaran"
        />

        <SummaryCard
          icon={<QrCode size={18} />}
          iconClass="bg-violet-500"
          label="QR Aktif"
          value={qrCount}
          note="Metode berbasis QR"
        />

        <SummaryCard
          icon={<Zap size={18} />}
          iconClass="bg-orange-500"
          label="Metode Tidak Aktif"
          value={inactiveCount}
          note="Metode pembayaran nonaktif"
        />
      </section>

      {/* ===================================================
          QRIS + SYSTEM
      =================================================== */}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">

        {/* QRIS */}

        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:px-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <QrCode size={20} />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-black tracking-tight text-slate-950 md:text-base">
                      QRIS Management
                    </h2>

                    <span className="rounded-full bg-blue-50 px-2 py-1 text-[7px] font-black uppercase tracking-widest text-blue-600">
                      AUTO FALLBACK
                    </span>

                    {qrisLoading && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[7px] font-black uppercase tracking-widest text-slate-400">
                        <Loader2
                          size={9}
                          className="animate-spin"
                        />
                        Sync
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                    Pilih provider QRIS aktif untuk order baru
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                <span className="text-[7px] font-black uppercase tracking-widest text-emerald-600">
                  System Ready
                </span>
              </div>
            </div>
          </div>

          <div className="px-5 py-5 md:px-6">
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3">
              <ShieldCheck
                size={17}
                className="mt-0.5 shrink-0 text-blue-600"
              />

              <div>
                <p className="text-[9px] font-black uppercase tracking-wide text-blue-800">
                  Strategi DaPay
                </p>

                <p className="mt-0.5 text-[9px] font-medium leading-relaxed text-blue-600 md:text-[10px]">
                  DANA Dynamic menjadi provider utama.
                  Jika generator gagal, sistem mencoba
                  DANA Static lalu GoPay Static.
                  Provider tetap dapat diganti manual.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {QRIS_PROVIDERS.map(
                (provider) => {
                  const active =
                    qrisProvider ===
                    provider.id;

                  return (
                    <button
                      key={
                        provider.id
                      }
                      type="button"
                      disabled={
                        qrisSaving
                      }
                      onClick={() =>
                        handleQrisSwitch(
                          provider.id
                        )
                      }
                      className={`group relative min-h-43.5 overflow-hidden rounded-[20px] border p-4 text-left transition-all ${
                        active
                          ? "border-blue-500 bg-blue-50/65 shadow-[0_7px_20px_rgba(37,99,235,0.10)]"
                          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"
                      }`}
                    >
                      <div
                        className={`absolute inset-x-0 top-0 h-0.5 bg-linear-to-r ${provider.accent}`}
                      />

                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm ${provider.iconClass}`}
                          >
                            <QrCode
                              size={17}
                            />
                          </div>

                          <div>
                            <p className="text-[11px] font-black tracking-tight text-slate-900">
                              {
                                provider.name
                              }
                            </p>

                            <div className="mt-1 flex items-center gap-1.5">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${provider.dot}`}
                              />

                              <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">
                                {
                                  provider.role
                                }
                              </span>
                            </div>
                          </div>
                        </div>

                        {active ? (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white">
                            <CheckCircle2
                              size={14}
                            />
                          </span>
                        ) : (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-300 transition group-hover:bg-slate-200 group-hover:text-slate-500">
                            <ChevronRight
                              size={14}
                            />
                          </span>
                        )}
                      </div>

                      <p className="mt-4 min-h-9 text-[9px] font-medium leading-relaxed text-slate-400">
                        {
                          provider.desc
                        }
                      </p>

                      <div className="mt-3 flex items-center justify-between">
                        <span
                          className={`rounded-lg px-2.5 py-1 text-[7px] font-black uppercase tracking-wider ${
                            active
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {active
                            ? "AKTIF"
                            : "GUNAKAN"}
                        </span>

                        {provider.id ===
                          "dana_dynamic" && (
                          <span className="flex items-center gap-1 text-[7px] font-black uppercase tracking-wider text-emerald-600">
                            <Zap size={10} />
                            PRIMARY
                          </span>
                        )}
                      </div>
                    </button>
                  );
                }
              )}
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  size={15}
                  className="text-blue-600"
                />

                <p className="text-[9px] font-medium text-slate-500">
                  Provider aktif saat ini:
                  <span className="ml-1 font-black text-blue-700">
                    {
                      activeProviderName
                    }
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[8px] font-bold text-slate-400">
                  Terakhir diubah:{" "}
                  {formatQrisDate(
                    qrisUpdatedAt
                  )}
                </span>

                <button
                  type="button"
                  onClick={
                    handleOpenQrisHistory
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[8px] font-black uppercase tracking-wider text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                >
                  <Activity
                    size={11}
                  />
                  Lihat Riwayat Perubahan
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50/50 px-4 py-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                    <Zap size={15} />
                  </div>

                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wide text-violet-800">
                      Pengujian QRIS
                    </p>

                    <p className="mt-0.5 text-[9px] font-medium leading-relaxed text-violet-700/80">
                      Uji generator QRIS atau analisis QRIS
                      static dan dynamic melalui tool pengujian DaPay.
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setGeneratorChoiceOpen(
                        true
                      )
                    }
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 text-[8px] font-black uppercase tracking-wider text-white shadow-[0_5px_15px_rgba(124,58,237,0.16)] transition hover:bg-violet-700"
                  >
                    <QrCode size={11} />
                    Uji Generator
                  </button>

                  <a
                    href="/qris-analyzer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 text-[8px] font-black uppercase tracking-wider text-violet-600 transition hover:border-violet-300 hover:bg-violet-50"
                  >
                    <Activity size={11} />
                    Analyzer QRIS
                  </a>
                </div>
              </div>
            </div>

            {(qrisMessage ||
              qrisError) && (
              <div
                className={`mt-3 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 ${
                  qrisError
                    ? "border-rose-100 bg-rose-50"
                    : "border-emerald-100 bg-emerald-50"
                }`}
              >
                {qrisError ? (
                  <XCircle
                    size={15}
                    className="mt-0.5 shrink-0 text-rose-500"
                  />
                ) : (
                  <CheckCircle2
                    size={15}
                    className="mt-0.5 shrink-0 text-emerald-500"
                  />
                )}

                <p
                  className={`text-[9px] font-bold leading-relaxed ${
                    qrisError
                      ? "text-rose-600"
                      : "text-emerald-600"
                  }`}
                >
                  {qrisError ||
                    qrisMessage}
                </p>
              </div>
            )}

            {qrisSaving && (
              <div className="mt-3 flex items-center justify-center gap-2 text-[8px] font-black uppercase tracking-widest text-blue-600">
                <RefreshCw
                  size={12}
                  className="animate-spin"
                />
                Menyimpan provider...
              </div>
            )}
          </div>
        </section>

        {/* SYSTEM */}

        <aside className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div>
            <h2 className="text-base font-black tracking-tight text-slate-950">
              Ringkasan Sistem
            </h2>

            <p className="mt-1 text-[10px] font-medium text-slate-400">
              Status sistem pembayaran
            </p>
          </div>

          <div className="mt-5 divide-y divide-slate-100">
            {systemHealthLoading &&
            !systemHealth ? (
              <>
                {[
                  "QRIS Generator",
                  "DANA Dynamic",
                  "DANA Static",
                  "GoPay Static",
                  "Database",
                  "Auto Save",
                ].map(
                  (label) => (
                    <SystemStatus
                      key={label}
                      label={label}
                      status="checking"
                      value="Memeriksa..."
                      detail="Sedang memeriksa sistem..."
                    />
                  )
                )}
              </>
            ) : (
              <>
                <SystemStatus
                  label="QRIS Generator"
                  status={
                    systemHealth
                      ?.statuses
                      .qris_generator
                      ?.status ||
                    "error"
                  }
                  value={
                    systemHealth
                      ?.statuses
                      .qris_generator
                      ?.label ||
                    "Error"
                  }
                  detail={
                    systemHealth
                      ?.statuses
                      .qris_generator
                      ?.detail
                  }
                />

                <SystemStatus
                  label="DANA Dynamic"
                  status={
                    systemHealth
                      ?.statuses
                      .dana_dynamic
                      ?.status ||
                    "error"
                  }
                  value={
                    systemHealth
                      ?.statuses
                      .dana_dynamic
                      ?.label ||
                    "Error"
                  }
                  detail={
                    systemHealth
                      ?.statuses
                      .dana_dynamic
                      ?.detail
                  }
                />

                <SystemStatus
                  label="DANA Static"
                  status={
                    systemHealth
                      ?.statuses
                      .dana_static
                      ?.status ||
                    "error"
                  }
                  value={
                    systemHealth
                      ?.statuses
                      .dana_static
                      ?.label ||
                    "Error"
                  }
                  detail={
                    systemHealth
                      ?.statuses
                      .dana_static
                      ?.detail
                  }
                />

                <SystemStatus
                  label="GoPay Static"
                  status={
                    systemHealth
                      ?.statuses
                      .gopay_static
                      ?.status ||
                    "error"
                  }
                  value={
                    systemHealth
                      ?.statuses
                      .gopay_static
                      ?.label ||
                    "Error"
                  }
                  detail={
                    systemHealth
                      ?.statuses
                      .gopay_static
                      ?.detail
                  }
                />

                <SystemStatus
                  label="Database"
                  status={
                    systemHealth
                      ?.statuses
                      .database
                      ?.status ||
                    "error"
                  }
                  value={
                    systemHealth
                      ?.statuses
                      .database
                      ?.label ||
                    "Error"
                  }
                  detail={
                    systemHealth
                      ?.statuses
                      .database
                      ?.detail
                  }
                />

                <SystemStatus
                  label="Auto Save"
                  status={
                    systemHealth
                      ?.statuses
                      .auto_save
                      ?.status ||
                    "error"
                  }
                  value={
                    systemHealth
                      ?.statuses
                      .auto_save
                      ?.label ||
                    "Error"
                  }
                  detail={
                    systemHealth
                      ?.statuses
                      .auto_save
                      ?.detail
                  }
                />
              </>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              {systemHealthError ? (
                <p
                  className="truncate text-[8px] font-bold text-rose-500"
                  title={
                    systemHealthError
                  }
                >
                  {systemHealthError}
                </p>
              ) : (
                <p className="text-[8px] font-medium text-slate-400">
                  {systemHealth?.checked_at
                    ? `Terakhir diperiksa ${new Date(
                        systemHealth.checked_at
                      ).toLocaleTimeString(
                        "id-ID",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          timeZone:
                            "Asia/Jakarta",
                        }
                      )} WIB`
                    : "Belum diperiksa"}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => fetchSystemHealth()}
              disabled={systemHealthLoading}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[7px] font-black uppercase tracking-wider text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={10}
                className={systemHealthLoading ? "animate-spin" : ""}
              />
              Periksa
            </button>
          </div>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Zap size={14} />
              </div>

              <div>
                <p className="text-[9px] font-black text-blue-900">
                  Tips
                </p>

                <p className="mt-1 text-[9px] font-medium leading-relaxed text-blue-700/80">
                  Pastikan QRIS DANA Static sudah terisi
                  agar DANA Dynamic memiliki fallback saat
                  generator bermasalah.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ===================================================
          PAYMENT METHODS
      =================================================== */}

      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <h2 className="text-sm font-black tracking-tight text-slate-950 md:text-base">
              Metode Pembayaran
            </h2>

            <p className="mt-0.5 text-[10px] font-medium text-slate-400">
              Kelola semua metode pembayaran
            </p>
          </div>

          <button
            type="button"
            onClick={
              handleAddPayment
            }
            disabled={addingPayment}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-[9px] font-black uppercase tracking-wide text-white shadow-[0_5px_15px_rgba(37,99,235,0.18)] transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {addingPayment ? (
              <>
                <Loader2
                  size={14}
                  className="animate-spin"
                />
                Menambahkan...
              </>
            ) : (
              <>
                <Plus size={14} />
                Tambah Metode
              </>
            )}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-245 border-collapse text-left">
            <thead className="border-b border-slate-100 bg-slate-50/70">
              <tr className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                <th className="px-5 py-3.5">
                  <button
                    type="button"
                    onClick={() =>
                      handleSort(
                        "name"
                      )
                    }
                    className="flex items-center gap-1.5 hover:text-blue-600"
                  >
                    Metode / Bank
                    <ArrowUpDown
                      size={10}
                    />
                  </button>
                </th>

                <th className="px-4 py-3.5">
                  Account Name
                </th>

                <th className="px-4 py-3.5">
                  Account No
                </th>

                <th className="px-4 py-3.5 text-center">
                  <button
                    type="button"
                    onClick={() =>
                      handleSort(
                        "min_price"
                      )
                    }
                    className="mx-auto flex items-center gap-1.5 hover:text-blue-600"
                  >
                    Min Harga
                    <ArrowUpDown
                      size={10}
                    />
                  </button>
                </th>

                <th className="px-4 py-3.5 text-center">
                  Jam Operasional
                </th>

                <th className="px-4 py-3.5 text-center">
                  <button
                    type="button"
                    onClick={() =>
                      handleSort(
                        "is_qr"
                      )
                    }
                    className="mx-auto flex items-center gap-1.5 hover:text-blue-600"
                  >
                    QR
                    <ArrowUpDown
                      size={10}
                    />
                  </button>
                </th>

                <th className="px-4 py-3.5 text-center">
                  <button
                    type="button"
                    onClick={() =>
                      handleSort(
                        "is_maintenance"
                      )
                    }
                    className="mx-auto flex items-center gap-1.5 hover:text-blue-600"
                  >
                    Status
                    <ArrowUpDown
                      size={10}
                    />
                  </button>
                </th>

                <th className="px-4 py-3.5 text-center">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {sortedPayments.map(
                (payment) => {
                  const placeholderUrl =
                    getPaymentPlaceholder(
                      payment.name
                    );

                  return (
                    <tr
                      key={
                        payment.id
                      }
                      className={`group transition-colors hover:bg-slate-50/70 ${
                        payment.is_maintenance
                          ? "bg-rose-50/20"
                          : ""
                      } ${
                        payment.is_pending
                          ? "opacity-70"
                          : ""
                      }`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="group/img relative flex h-9 w-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm">
                            {uploadingId ===
                            payment.id ? (
                              <Loader2
                                className="animate-spin text-blue-500"
                                size={14}
                              />
                            ) : (
                              <>
                                <img
                                  src={
                                    payment.logo_url ||
                                    placeholderUrl
                                  }
                                  alt={
                                    payment.name ||
                                    "Payment"
                                  }
                                  className="max-h-full max-w-full object-contain p-1"
                                  onError={(
                                    event
                                  ) => {
                                    event.currentTarget.src =
                                      placeholderUrl;
                                  }}
                                />

                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 opacity-0 transition-opacity group-hover/img:opacity-100">
                                  <ImagePlus
                                    size={14}
                                    className="text-white"
                                  />
                                </div>

                                <input
                                  type="file"
                                  accept="image/*"
                                  disabled={
                                    payment.is_pending
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    handleUploadLogo(
                                      event,
                                      payment.id
                                    )
                                  }
                                  className="absolute inset-0 cursor-pointer opacity-0"
                                  title="Upload Logo Baru"
                                />
                              </>
                            )}
                          </div>

                          <div className="min-w-28">
                            <input
                              type="text"
                              value={
                                payment.name ||
                                ""
                              }
                              placeholder="Nama Bank..."
                              onChange={(
                                event
                              ) =>
                                handleLocalChange(
                                  payment.id,
                                  "name",
                                  event
                                    .target
                                    .value
                                )
                              }
                              disabled={
                                payment.is_pending
                              }
                              onBlur={(
                                event
                              ) =>
                                handleSaveBlur(
                                  payment.id,
                                  "name",
                                  event
                                    .target
                                    .value
                                )
                              }
                              className="block w-full border-b border-transparent bg-transparent pb-0.5 text-[10px] font-black uppercase text-slate-800 outline-none hover:border-slate-200 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                            />

                            <input
                              type="text"
                              value={
                                payment.method_key ||
                                ""
                              }
                              placeholder="method_key..."
                              onChange={(
                                event
                              ) =>
                                handleLocalChange(
                                  payment.id,
                                  "method_key",
                                  event
                                    .target
                                    .value
                                )
                              }
                              onBlur={(
                                event
                              ) =>
                                handleSaveBlur(
                                  payment.id,
                                  "method_key",
                                  event
                                    .target
                                    .value
                                )
                              }
                              disabled={
                                payment.is_pending
                              }
                              className="mt-0.5 block w-full max-w-32 border-b border-transparent bg-transparent pb-0.5 text-[7px] font-bold tracking-widest text-slate-400 outline-none hover:border-slate-200 focus:border-blue-500 focus:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                            />

                            {payment.is_pending && (
                              <div className="mt-1 flex items-center gap-1">
                                <Loader2
                                  size={8}
                                  className="animate-spin text-blue-500"
                                />

                                <span className="text-[6px] font-black uppercase tracking-widest text-blue-500">
                                  Menyimpan
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={
                            payment.account_name ||
                            ""
                          }
                          placeholder="Nama Rekening..."
                          onChange={(
                            event
                          ) =>
                            handleLocalChange(
                              payment.id,
                              "account_name",
                              event
                                .target
                                .value
                            )
                          }
                          onBlur={(
                            event
                          ) =>
                            handleSaveBlur(
                              payment.id,
                              "account_name",
                              event
                                .target
                                .value
                            )
                          }
                          disabled={
                            payment.is_pending
                          }
                          className="w-full max-w-36 border-b border-transparent bg-transparent py-1 text-[9px] font-bold text-slate-700 outline-none hover:border-slate-200 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={
                            payment.account_no ||
                            ""
                          }
                          placeholder="Nomor Rekening..."
                          onChange={(
                            event
                          ) =>
                            handleLocalChange(
                              payment.id,
                              "account_no",
                              event
                                .target
                                .value
                            )
                          }
                          onBlur={(
                            event
                          ) =>
                            handleSaveBlur(
                              payment.id,
                              "account_no",
                              event
                                .target
                                .value
                            )
                          }
                          disabled={
                            payment.is_pending
                          }
                          className="w-full max-w-36 border-b border-transparent bg-transparent py-1 text-[9px] font-bold text-slate-700 outline-none hover:border-slate-200 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </td>

                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          value={
                            payment.min_price ??
                            ""
                          }
                          placeholder="0"
                          onChange={(
                            event
                          ) =>
                            handleLocalChange(
                              payment.id,
                              "min_price",
                              event
                                .target
                                .value
                            )
                          }
                          onBlur={(
                            event
                          ) =>
                            handleSaveBlur(
                              payment.id,
                              "min_price",
                              event
                                .target
                                .value
                            )
                          }
                          disabled={
                            payment.is_pending
                          }
                          className="w-20 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-center text-[9px] font-bold text-slate-700 outline-none hover:border-slate-200 hover:bg-white focus:border-blue-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        />
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            placeholder="00"
                            value={
                              payment.start_hour ??
                              ""
                            }
                            onChange={(
                              event
                            ) =>
                              handleLocalChange(
                                payment.id,
                                "start_hour",
                                event
                                  .target
                                  .value
                              )
                            }
                            onBlur={(
                              event
                            ) =>
                              handleSaveBlur(
                                payment.id,
                                "start_hour",
                                event
                                  .target
                                  .value
                              )
                            }
                            disabled={
                              payment.is_pending
                            }
                            className="w-9 rounded-md border border-transparent bg-transparent py-1 text-center text-[9px] font-bold outline-none hover:border-slate-200 hover:bg-white focus:border-blue-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                          />

                          <span className="text-[9px] font-bold text-slate-300">
                            —
                          </span>

                          <input
                            type="number"
                            placeholder="23"
                            value={
                              payment.end_hour ??
                              ""
                            }
                            onChange={(
                              event
                            ) =>
                              handleLocalChange(
                                payment.id,
                                "end_hour",
                                event
                                  .target
                                  .value
                              )
                            }
                            onBlur={(
                              event
                            ) =>
                              handleSaveBlur(
                                payment.id,
                                "end_hour",
                                event
                                  .target
                                  .value
                              )
                            }
                            disabled={
                              payment.is_pending
                            }
                            className="w-9 rounded-md border border-transparent bg-transparent py-1 text-center text-[9px] font-bold outline-none hover:border-slate-200 hover:bg-white focus:border-blue-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                          />
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          disabled={
                            payment.is_pending
                          }
                          onClick={() =>
                            handleToggle(
                              payment.id,
                              "is_qr",
                              Boolean(
                                payment.is_qr
                              )
                            )
                          }
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition-all active:scale-90 ${
                            payment.is_qr
                              ? "bg-blue-50 text-blue-600"
                              : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                          }`}
                        >
                          {payment.is_qr ? (
                            <CheckCircle2
                              size={15}
                            />
                          ) : (
                            <XCircle
                              size={15}
                            />
                          )}
                        </button>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          disabled={
                            payment.is_pending
                          }
                          onClick={() =>
                            handleToggle(
                              payment.id,
                              "is_maintenance",
                              Boolean(
                                payment.is_maintenance
                              )
                            )
                          }
                          className={`rounded-lg border px-3 py-1.5 text-[7px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                            payment.is_maintenance
                              ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                              : "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                          }`}
                        >
                          {payment.is_maintenance
                            ? "Inactive"
                            : "Active"}
                        </button>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          disabled={
                            Boolean(
                              payment.is_pending
                            )
                          }
                          onClick={() =>
                            openDelete(
                              payment.id,
                              payment.name,
                              Boolean(
                                payment.is_pending
                              )
                            )
                          }
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
                            payment.is_pending
                              ? "cursor-not-allowed bg-slate-100 text-slate-300"
                              : "bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white"
                          }`}
                        >
                          <Trash2
                            size={14}
                          />
                        </button>
                      </td>
                    </tr>
                  );
                }
              )}

              {payments.length === 0 &&
                paymentsCacheLoaded &&
                !paymentsSyncing && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-12 text-center"
                    >
                      <div className="mx-auto flex max-w-xs flex-col items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                          <Activity
                            size={18}
                          />
                        </div>

                        <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          Belum ada metode pembayaran
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
              {payments.length} payment routes
            </p>

            <div className="flex items-center gap-2">
              {paymentsSyncing ? (
                <>
                  <RefreshCw
                    size={9}
                    className="animate-spin text-blue-400"
                  />

                  <span className="text-[8px] font-semibold text-blue-400">
                    Sinkronisasi...
                  </span>
                </>
              ) : (
                <p className="text-[8px] font-medium text-slate-400">
                  Perubahan tersimpan otomatis
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================
          DELETE MODAL
      =================================================== */}

      {deleteConfirmOpen &&
        deletePendingPayment && (
          <div
            className="fixed inset-0 z-120 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-md"
            onClick={closeDelete}
          >
            <div
              className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.22)]"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="relative overflow-hidden px-6 pb-5 pt-6">
                <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-rose-100/60 blur-2xl" />

                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-rose-500 to-red-600 text-white">
                      <Trash2 size={20} />
                    </div>

                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-rose-600">
                        PAYMENT MANAGEMENT
                      </p>

                      <h3 className="mt-0.5 text-base font-black tracking-tight text-slate-900">
                        Hapus Metode Pembayaran?
                      </h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={
                      deleteSaving
                    }
                    onClick={
                      closeDelete
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
                  >
                    <XCircle
                      size={19}
                    />
                  </button>
                </div>
              </div>

              <div className="px-6 pb-6">
                <p className="text-center text-[11px] font-medium leading-relaxed text-slate-500">
                  Anda akan menghapus metode pembayaran berikut secara permanen dari sistem.
                </p>

                <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-rose-500 shadow-sm">
                      <Landmark size={17} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[8px] font-black uppercase tracking-widest text-rose-400">
                        Metode yang akan dihapus
                      </p>

                      <p className="mt-1 truncate text-sm font-black text-slate-800">
                        {
                          deletePendingPayment.name
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck
                      size={16}
                      className="mt-0.5 shrink-0 text-amber-600"
                    />

                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wide text-amber-800">
                        Perhatian
                      </p>

                      <p className="mt-1 text-[9px] font-medium leading-relaxed text-amber-700">
                        Tindakan ini akan menghapus metode pembayaran dari database dan tidak dapat dibatalkan.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={
                      deleteSaving
                    }
                    onClick={
                      closeDelete
                    }
                    className="h-11 rounded-xl border border-slate-200 bg-white text-[9px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-50"
                  >
                    Batal
                  </button>

                  <button
                    type="button"
                    disabled={
                      deleteSaving
                    }
                    onClick={
                      confirmDelete
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 text-[9px] font-black uppercase tracking-wider text-white hover:bg-rose-700 disabled:opacity-60"
                  >
                    {deleteSaving ? (
                      <>
                        <Loader2
                          size={14}
                          className="animate-spin"
                        />
                        Menghapus...
                      </>
                    ) : (
                      <>
                        <Trash2
                          size={14}
                        />
                        Hapus Metode
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* ===================================================
          GENERATOR CHOICE
      =================================================== */}

      {generatorChoiceOpen && (
        <div
          className="fixed inset-0 z-130 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-md"
          onClick={() =>
            setGeneratorChoiceOpen(
              false
            )
          }
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.22)]"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="relative overflow-hidden px-6 pb-5 pt-6">
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-violet-600 to-indigo-500 text-white">
                    <QrCode size={21} />
                  </div>

                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-600">
                      QRIS TESTING
                    </p>

                    <h3 className="mt-0.5 text-base font-black tracking-tight text-slate-900">
                      Pilih Generator QRIS
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setGeneratorChoiceOpen(
                      false
                    )
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
                >
                  <XCircle
                    size={19}
                  />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 px-6 pb-6 sm:grid-cols-2">
              <a
                href="/qris-generator"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  setGeneratorChoiceOpen(
                    false
                  )
                }
                className="group relative overflow-hidden rounded-2xl border border-blue-200 bg-blue-50/60 p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-sky-500 to-cyan-400 text-white">
                    <QrCode size={17} />
                  </div>

                  <ChevronRight
                    size={16}
                    className="text-blue-400"
                  />
                </div>

                <p className="mt-4 text-sm font-black text-slate-900">
                  DANA
                </p>

                <p className="mt-1 text-[9px] font-medium leading-relaxed text-slate-500">
                  Uji generator DANA Dynamic menggunakan QRIS yang dikonfigurasi di sistem.
                </p>

                <div className="mt-4 inline-flex rounded-lg bg-blue-600 px-2.5 py-1 text-[7px] font-black uppercase tracking-wider text-white">
                  Buka Generator
                </div>
              </a>

              <button
                type="button"
                onClick={() => {
                  setGeneratorChoiceOpen(
                    false
                  );

                  showNotification(
                    "info",
                    "Generator provider lain belum tersedia."
                  );
                }}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-slate-100"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-slate-500">
                    <Zap size={17} />
                  </div>

                  <ChevronRight
                    size={16}
                    className="text-slate-300"
                  />
                </div>

                <p className="mt-4 text-sm font-black text-slate-700">
                  Provider Lain
                </p>

                <p className="mt-1 text-[9px] font-medium leading-relaxed text-slate-400">
                  Generator untuk provider lain akan tersedia pada pengembangan berikutnya.
                </p>

                <div className="mt-4 inline-flex rounded-lg bg-slate-200 px-2.5 py-1 text-[7px] font-black uppercase tracking-wider text-slate-400">
                  Segera Hadir
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          QRIS HISTORY
      =================================================== */}

      {qrisHistoryOpen && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm"
          onClick={() =>
            setQrisHistoryOpen(
              false
            )
          }
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Riwayat Perubahan QRIS
                </h3>

                <p className="mt-0.5 text-[9px] font-medium text-slate-400">
                  Perubahan provider yang tersimpan di sistem.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setQrisHistoryOpen(
                    false
                  )
                }
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
              >
                <XCircle
                  size={18}
                />
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-5">
              {qrisHistoryLoading ? (
                <div className="flex items-center justify-center py-10 text-blue-600">
                  <RefreshCw
                    size={18}
                    className="animate-spin"
                  />
                </div>
              ) : qrisHistory.length ===
                0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                  <Activity
                    className="mx-auto mb-2 text-slate-300"
                    size={22}
                  />

                  <p className="text-[9px] font-bold text-slate-400">
                    Belum ada riwayat perubahan provider QRIS.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {qrisHistory.map(
                    (item) => (
                      <div
                        key={
                          item.id
                        }
                        className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                              <Activity
                                size={13}
                              />
                            </div>

                            <div>
                              <p className="text-[9px] font-black text-slate-700">
                                Provider QRIS diubah
                              </p>

                              <p className="mt-1 text-[9px] leading-relaxed text-slate-500">
                                {item.details ||
                                  "Perubahan provider QRIS."}
                              </p>
                            </div>
                          </div>

                          <span className="shrink-0 text-[8px] font-bold text-slate-400">
                            {formatQrisDate(
                              item.created_at
                            )}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          QRIS SWITCH CONFIRMATION
      =================================================== */}

      {qrisConfirmOpen &&
        qrisPendingProvider && (
          <div
            className="fixed inset-0 z-110 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-md"
            onClick={() => {
              if (!qrisSaving) {
                setQrisConfirmOpen(
                  false
                );
                setQrisPendingProvider(
                  null
                );
              }
            }}
          >
            <div
              className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.22)]"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="relative overflow-hidden px-6 pb-5 pt-6">
                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-blue-600 to-cyan-500 text-white">
                      <QrCode
                        size={21}
                      />
                    </div>

                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-600">
                        QRIS MANAGEMENT
                      </p>

                      <h3 className="mt-0.5 text-base font-black tracking-tight text-slate-900">
                        Ganti Provider QRIS?
                      </h3>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={
                      qrisSaving
                    }
                    onClick={() => {
                      setQrisConfirmOpen(
                        false
                      );

                      setQrisPendingProvider(
                        null
                      );
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
                  >
                    <XCircle
                      size={19}
                    />
                  </button>
                </div>
              </div>

              <div className="px-6 pb-6">
                <p className="text-center text-[11px] font-medium leading-relaxed text-slate-500">
                  Anda akan mengganti provider QRIS aktif untuk transaksi baru.
                </p>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                        Provider Aktif
                      </p>

                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-500">
                          <QrCode
                            size={14}
                          />
                        </div>

                        <p className="truncate text-[10px] font-black text-slate-700">
                          {QRIS_PROVIDERS.find(
                            (item) =>
                              item.id ===
                              qrisProvider
                          )?.name ||
                            "DANA Dynamic"}
                        </p>
                      </div>
                    </div>

                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm ring-1 ring-slate-200">
                      <ChevronRight
                        size={15}
                      />
                    </div>

                    <div className="min-w-0 flex-1 text-right">
                      <p className="text-[8px] font-black uppercase tracking-widest text-blue-500">
                        Provider Baru
                      </p>

                      <div className="mt-2 flex items-center justify-end gap-2">
                        <p className="truncate text-[10px] font-black text-blue-700">
                          {QRIS_PROVIDERS.find(
                            (item) =>
                              item.id ===
                              qrisPendingProvider
                          )?.name ||
                            qrisPendingProvider}
                        </p>

                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                          <QrCode
                            size={14}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck
                      size={16}
                      className="mt-0.5 shrink-0 text-amber-600"
                    />

                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wide text-amber-800">
                        Perhatian
                      </p>

                      <p className="mt-1 text-[9px] font-medium leading-relaxed text-amber-700">
                        Order baru akan menggunakan provider ini. Order yang sudah memiliki QRIS tidak akan berubah.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={
                      qrisSaving
                    }
                    onClick={() => {
                      setQrisConfirmOpen(
                        false
                      );

                      setQrisPendingProvider(
                        null
                      );
                    }}
                    className="h-11 rounded-xl border border-slate-200 bg-white text-[9px] font-black uppercase tracking-wider text-slate-500 hover:bg-slate-50"
                  >
                    Batal
                  </button>

                  <button
                    type="button"
                    disabled={
                      qrisSaving
                    }
                    onClick={
                      confirmQrisSwitch
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 text-[9px] font-black uppercase tracking-wider text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {qrisSaving ? (
                      <>
                        <Loader2
                          size={14}
                          className="animate-spin"
                        />
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <CheckCircle2
                          size={14}
                        />
                        Ganti QRIS
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  icon,
  iconClass,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  value: React.ReactNode;
  note: string;
}) {
  return (
    <div className="flex min-h-23 items-center gap-3.5 rounded-[18px] border border-slate-200/80 bg-white px-4 py-4 shadow-[0_6px_24px_rgba(15,23,42,0.035)]">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${iconClass}`}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[9px] font-semibold text-slate-400">
          {label}
        </p>

        <p className="mt-0.5 text-[19px] font-black tracking-tight text-slate-900">
          {value}
        </p>

        <p className="mt-0.5 truncate text-[8px] font-medium text-slate-400">
          {note}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   SYSTEM STATUS
========================================================= */

function SystemStatus({
  label,
  status,
  value,
  detail,
}: {
  label: string;
  status: HealthStatus;
  value: string;
  detail?: string;
}) {
  const styles = {
    online: {
      dot: "bg-emerald-500",
      text: "text-emerald-600",
    },
    warning: {
      dot: "bg-amber-500",
      text: "text-amber-600",
    },
    error: {
      dot: "bg-rose-500",
      text: "text-rose-600",
    },
    checking: {
      dot: "bg-slate-300 animate-pulse",
      text: "text-slate-400",
    },
  }[status];

  return (
    <div
      className="flex items-center justify-between gap-3 py-2.5"
      title={detail || value}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={`h-2.5 w-2.5 shrink-0 rounded-full ${styles.dot}`}
        />

        <span className="truncate text-[9px] font-bold text-slate-700">
          {label}
        </span>
      </div>

      <span
        className={`shrink-0 text-[9px] font-semibold ${styles.text}`}
      >
        {value}
      </span>
    </div>
  );
}