"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/supabaseClient";
import { 
  Package, Plus, Search, Trash2, Edit3, Save, X, 
  Layers, Loader2, TrendingUp, Zap, DollarSign, Activity, Lock, Unlock
} from "lucide-react";

interface MarginConfig {
  label: string;
  minCost: number;
  maxCost: number;
  min: number;
  max: number;
  minDisc: number;
  maxDisc: number;
}

export default function ProductManagement() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [brandsList, setBrandsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [isBulking, setIsBulking] = useState(false);
  const [checkingSku, setCheckingSku] = useState(false);
  const [promoLabel, setPromoLabel] = useState("HOT DEAL");
  const [launchOptions, setLaunchOptions] = useState({ promo: true, lock: false });
  const [showLaunchMenu, setShowLaunchMenu] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [savingStrategy, setSavingStrategy] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'updated_at', direction: 'desc' });

  // --- STATE UTAMA ---
  const [formData, setFormData] = useState({
    name: "", brand_id: "", sku: "", price: "", cost: "", margin_item: "", category_id: "", stock: "999",
    discount: "0", 
    lock_margin: false,
    sub_brand: "",
    provider: "DIGIFLAZZ"
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
const [allStrategies, setAllStrategies] = useState<any>({
    DEFAULT: [
      { label: "< 10rb", minCost: 0, maxCost: 9999, min: 20, max: 30, minDisc: 2, maxDisc: 5 },
      { label: "10rb-50rb", minCost: 10000, maxCost: 50000, min: 18, max: 23, minDisc: 3, maxDisc: 7 },
      { label: "50rb-100rb", minCost: 50001, maxCost: 100000, min: 15, max: 20, minDisc: 5, maxDisc: 10 },
      { label: "100rb-500rb", minCost: 100001, maxCost: 500000, min: 13, max: 17, minDisc: 5, maxDisc: 15 },
      { label: "500rb-1jt", minCost: 500001, maxCost: 1000000, min: 10, max: 15, minDisc: 2, maxDisc: 8 },
      { label: "> 1jt", minCost: 1000001, maxCost: 999999999, min: 9, max: 11, minDisc: 1, maxDisc: 5 },
    ],
    "DIGITAL SERVICES": [
      { label: "SERVICE", minCost: 0, maxCost: 99999999, min: 10, max: 20, minDisc: 1, maxDisc: 5 },
    ],
    "E-WALLET & SALDO": [
      { label: "TOPUP", minCost: 0, maxCost: 99999999, min: 1, max: 3, minDisc: 0, maxDisc: 1 },
    ],
    "ENTERTAINMENT & SUBSCRIPTION": [ 
      { label: "STREAM/VOD", minCost: 0, maxCost: 100000, min: 15, max: 25, minDisc: 3, maxDisc: 7 },
      { label: "EVENT/TIKET", minCost: 100001, maxCost: 99999999, min: 10, max: 15, minDisc: 1, maxDisc: 5 },
    ],
    GAME: [
      { label: "KECIL", minCost: 0, maxCost: 15000, min: 25, max: 35, minDisc: 5, maxDisc: 10 },
      { label: "MEDIUM", minCost: 15001, maxCost: 100000, min: 15, max: 25, minDisc: 5, maxDisc: 12 },
      { label: "SULTAN", minCost: 100001, maxCost: 500000, min: 10, max: 18, minDisc: 3, maxDisc: 8 },
      { label: "WHALE", minCost: 500001, maxCost: 999999999, min: 8, max: 12, minDisc: 1, maxDisc: 5 },
    ],
    MARKETPLACE: [
      { label: "GIFT CARD", minCost: 0, maxCost: 99999999, min: 3, max: 6, minDisc: 0, maxDisc: 1 },
    ],
    OTHER: [
      { label: "LAINNYA", minCost: 0, maxCost: 99999999, min: 10, max: 15, minDisc: 0, maxDisc: 0 },
    ],
    "PRODUCTIVITY & SOFTWARE": [
      { label: "TOOLS", minCost: 0, maxCost: 99999999, min: 15, max: 30, minDisc: 2, maxDisc: 8 },
    ],
    "PULSA & DATA SELULER": [
      { label: "KECIL", minCost: 0, maxCost: 15000, min: 2, max: 4, minDisc: 0, maxDisc: 0 },
      { label: "MEDIUM", minCost: 15001, maxCost: 100000, min: 1.5, max: 3, minDisc: 0, maxDisc: 1 },
      { label: "BESAR", minCost: 100001, maxCost: 99999999, min: 1, max: 2, minDisc: 0, maxDisc: 1 },
    ],
    "SOCIAL & KONTEN": [
      { label: "BOOSTING", minCost: 0, maxCost: 50000, min: 30, max: 60, minDisc: 5, maxDisc: 15 },
      { label: "PREMIUM", minCost: 50001, maxCost: 99999999, min: 20, max: 35, minDisc: 5, maxDisc: 10 },
    ],
    "TAGIHAN PASCABAYAR": [
      { label: "BILL", minCost: 0, maxCost: 99999999, min: 1, max: 2, minDisc: 0, maxDisc: 0 },
    ],
    "TAGIHAN PRABAYAR": [
      { label: "TOKEN", minCost: 0, maxCost: 99999999, min: 1, max: 3, minDisc: 0, maxDisc: 0 },
    ],
    TRAVEL: [
      { label: "TIKET", minCost: 0, maxCost: 99999999, min: 3, max: 7, minDisc: 0, maxDisc: 2 },
    ],
    "VOUCHER & GIFT CARD": [
      { label: "DIGITAL", minCost: 0, maxCost: 99999999, min: 8, max: 15, minDisc: 1, maxDisc: 3 },
    ]
});

  const [activeStrategyName, setActiveStrategyName] = useState("DEFAULT");
  const [marginConfigs, setMarginConfigs] = useState(allStrategies.DEFAULT);
  const [digiBalance, setDigiBalance] = useState<number | null>(null);
  const [globalCashback, setGlobalCashback] = useState(3);
  const [quickEditing, setQuickEditing] = useState<{id: string, field: string} | null>(null);
  const [quickValue, setQuickValue] = useState<string | number>("");
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    if (allStrategies[activeStrategyName]) {
      setMarginConfigs(allStrategies[activeStrategyName]);
    } else {
      setMarginConfigs(allStrategies.DEFAULT);
      setActiveStrategyName("DEFAULT");
    }
  }, [activeStrategyName, allStrategies]);

  const getMarginRange = (cost: number) => {
    const config = marginConfigs.find((c: any) => cost >= c.minCost && cost <= c.maxCost);
    return config 
      ? { min: config.min, max: config.max, minDisc: config.minDisc || 0, maxDisc: config.maxDisc || 0 } 
      : { min: 10, max: 15, minDisc: 0, maxDisc: 0 };
  };

  const resetForm = () => {
    setIsEditing(null);
    setFormData({ 
      name: "", brand_id: "", sku: "", price: "", cost: "", margin_item: "", category_id: "", stock: "999", 
      discount: "0", 
      lock_margin: false, 
      sub_brand: "", 
      provider: "DIGIFLAZZ" 
    });
  };

  const logActivity = async (action: string, details: string) => {
    try {
      await supabase.from('activity_logs').insert({ 
        action: action, 
        details: details, 
        created_at: new Date().toISOString()
      });
      fetchLogs(); 
    } catch (err) {
      console.error("GAGAL CATAT LOG:", err);
    }
  };

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    if (data) setLogs(data);
  };

async function fetchLiveBalance() {
    try {
      const res = await fetch('/api/digiflazz/balance'); 
      const data = await res.json();
      
      if (data.success) {
        // Langsung set ke state, gak perlu pusing update supabase di sini lagi bos!
        setDigiBalance(data.balance); 
      } else {
        alert("CEK SALDO GAGAL: " + (data.message || data.error));
      }
    } catch (err) {
      console.error("Gagal sinkron saldo:", err);
      alert("Server API Balance tidak merespon!");
    }
  };

  async function fetchData() {
    setLoading(true);
    try {
      const { data: productData, error: prodError } = await supabase
        .from('products')
        .select(`*, provider, cashback, categories!products_category_id_fkey (name), brands!products_brand_id_fkey (name)`)
        .order('updated_at', { ascending: false });

      if (prodError) throw prodError;
      setProducts(productData || []);

      const { data: settingsData } = await supabase
        .from('store_settings')
        .select('*')
        .limit(1)
        .single();

      if (settingsData && settingsData.margin_json) {
        setAllStrategies((prev: any) => ({
          ...prev, 
          ...settingsData.margin_json 
        }));

        const dbMargin = settingsData.margin_json[activeStrategyName];
        const codeMargin = allStrategies[activeStrategyName];
        setMarginConfigs(dbMargin || codeMargin || allStrategies.DEFAULT);
        setGlobalCashback(settingsData.cashback_percent || 3);
        setDigiBalance(settingsData.balance_digiflazz || 0); 
      }

      const { data: catData } = await supabase.from('categories').select('id, name').order('name');
      setCategories(catData || []);

      const { data: brandData } = await supabase
        .from('brands')
        // Tarik category_id sebagai foreign key bos
        .select('id, name, category_id, slug') 
        .order('name');
      setBrandsList(brandData || []);

    } catch (err: any) { 
      console.error("❌ SUPABASE_FETCH_ERROR:", err.message);
      if (err.message === "Failed to fetch") {
        alert("KONEKSI KE DATABASE TERPUTUS!");
      }
    } finally { 
      setLoading(false); 
    }
  }

  useEffect(() => { 
    fetchData(); 
    fetchLogs();
  }, []);

  const handleDigiflazzSync = async () => {
    if (!confirm("AMBIL HARGA TERBARU DARI DIGIFLAZZ?")) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/digiflazz/sync'); 
      const result = await res.json();
      if (result.success) {
        alert(`BOOM! ${result.message}\nTOTAL: ${result.updated} PRODUK BERHASIL DISINKRONKAN.`);
        fetchData(); 
        fetchLiveBalance(); 
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) { 
      alert("GAGAL SINKRON: " + err.message);
    } finally { 
      setSyncing(false); 
    }
  };

  const handleQuickUpdate = async (id: string, field: string, value: any) => {
    const finalValue = (field === 'promo_label' || field === 'lock_margin') ? value : Number(value);
    try {
      const res = await fetch('/api/admin/products/quick-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, field, value: finalValue, globalCashback })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setQuickEditing(null);
      fetchData(); 
    } catch (err: any) {
      alert("GAGAL UPDATE: " + err.message);
    }
  };

  const getUnitByBrand = (brandName: string) => {
    const name = brandName.toLowerCase();
    if (name.includes("mobile legends") || name.includes("free fire")) return "Diamonds";
    if (name.includes("pubg")) return "UC";
    if (name.includes("honor of kings")) return "Tokens";
    if (name.includes("genshin")) return "Genesis Crystals";
    if (name.includes("valorant")) return "Points";
    if (name.includes("voucher") || name.includes("gift card")) return "Voucher";
    const pulsaBrands = ["telkomsel", "indosat", "xl", "tri", "axis", "smartfren"];
    if (pulsaBrands.some(b => name.includes(b))) return "Pulsa/Data";
    if (name.includes("token listrik")) return "kWh";
    const subBrands = ["netflix", "spotify", "vidio", "canva"];
    if (subBrands.some(b => name.includes(b))) return "Sub";
    return "Unit"; 
  };

  const saveGlobalSettings = async () => {
    setSavingStrategy(true);
    try {
      const updatedStrategies = { ...allStrategies, [activeStrategyName]: marginConfigs };
      const res = await fetch('/api/admin/products/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategies: updatedStrategies,
          cashback: globalCashback
        })
      });
      if (!res.ok) throw new Error("Gagal simpan setting");
      setAllStrategies(updatedStrategies);
      logActivity("UPDATE STRATEGI", `Profil ${activeStrategyName} Berhasil Disimpan.`);
      alert(`STRATEGI ${activeStrategyName} BERHASIL DISIMPAN VIA SERVER!`);
    } catch (err: any) {
      alert("GAGAL SIMPAN: " + err.message);
    } finally {
      setSavingStrategy(false);
    }
  };

  const handleBulkPriceUpdate = async () => {
    if (!confirm("YAKIN UPDATE HARGA MASSAL?")) return;
    setIsBulking(true);
    try {
      const res = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allStrategies: allStrategies, globalCashback: globalCashback })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      logActivity("SMART UPDATE", `Sukses update ${result.updatedCount} produk via Server.`);
      alert(`BERHASIL! ${result.updatedCount} PRODUK DI-UPDATE OLEH SERVER.`);
      fetchData(); 
    } catch (err: any) {
      alert("ERROR: " + err.message);
    } finally {
      setIsBulking(false);
    }
  };

const handleFlashSale = async () => {
    if (selectedIds.length === 0) return alert("PILIH PRODUK DULU, BOS!");
    const tasks = [];
    if (launchOptions.promo) tasks.push(`PROMO "${promoLabel}"`);
    if (launchOptions.lock) tasks.push(`LOCK MARGIN`);
    if (tasks.length === 0) return alert("PILIH MINIMAL SATU AKSI (PROMO/LOCK)!");
    if (!confirm(`JALANKAN ${tasks.join(" & ")} UNTUK ${selectedIds.length} PRODUK?`)) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/products/flash-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // KUNCI PERBAIKAN: Kirim allStrategies dan globalCashback secara utuh!
        body: JSON.stringify({ 
            selectedIds, 
            launchOptions, 
            promoLabel, 
            allStrategies, 
            globalCashback 
        })
      });
      if (!res.ok) throw new Error("Gagal Flash Sale");
      logActivity("SMART LAUNCH", `${tasks.join(" & ")} aktif untuk ${selectedIds.length} produk.`);
      alert(`BERHASIL! ${tasks.join(" & ")} SUDAH AKTIF VIA SERVER.`);
      setSelectedIds([]); 
      fetchData();
    } catch (err: any) {
      alert("GAGAL: " + err.message);
    } finally {
      setSyncing(false);
    }
};

  const handleStopLock = async () => {
    if (selectedIds.length === 0) return alert("PILIH PRODUK DULU!");
    if (!confirm(`BUKA SEMUA GEMBOK (UNLOCK) UNTUK ${selectedIds.length} PRODUK?`)) return;
    setSyncing(true);
    try {
      const { error } = await supabase.from('products').update({ lock_margin: false }).in('id', selectedIds);
      if (error) throw error;
      logActivity("STOP LOCK", `Membuka kunci margin untuk ${selectedIds.length} produk.`);
      alert("SEMUA GEMBOK BERHASIL DIBUKA!");
      setSelectedIds([]);
      fetchData();
    } catch (err: any) {
      alert("GAGAL: " + err.message);
    } finally {
      setSyncing(false);
    }
  };

const handleStopFlashSale = async () => {
  if (selectedIds.length === 0) return alert("PILIH PRODUK DULU!");
  if (!confirm("HAPUS SEMUA DISKON & LABEL PROMO PADA PRODUK TERPILIH?")) return;
  setSyncing(true);
  try {
    // Kita lempar ke API khusus unpromo bos
    const res = await fetch('/api/admin/products/unpromo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        selectedIds, 
        globalCashback // Kirim settingan cashback terbaru
      })
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Gagal Unpromo");

    logActivity("STOP PROMO", `Menghentikan promo untuk ${selectedIds.length} produk.`);
    alert(`BOOM! PROMO MATI. ${result.updatedCount} PRODUK KEMBALI NORMAL.`);
    setSelectedIds([]);
    fetchData();
  } catch (err: any) {
    alert("GAGAL: " + err.message);
  } finally {
    setSyncing(false);
  }
};

  const handleExportCSV = () => {
    if (products.length === 0) return alert("DATA KOSONG, TIDAK ADA YANG BISA DI-EXPORT!");
    const headers = ["SKU", "KATEGORI", "BRAND", "NAMA PRODUK", "MODAL", "HARGA JUAL", "MARGIN (%)", "NET PROFIT"];
    const rows = products.map(p => [
      p.sku || "-", p.categories?.name || "-", p.brands?.name || "-", p.name, p.cost, p.price, p.margin_item,
      (p.price - p.cost - Math.floor(p.price * (globalCashback / 100)))
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `DANISPAY_PRODUCTS_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleCheckSKU = async () => {
    if (!formData.sku) return alert("ISI KODE SKU DULU, BOS!");
    setCheckingSku(true);
    try {
      const { data: itemData, error } = await supabase.from('items').select('*').eq('sku', formData.sku).single();
      if (error || !itemData) return alert("SKU TIDAK DITEMUKAN DI GUDANG ITEMS!");

      // ambil data aman, cover format digiflazz (product_name, price, brand)
      const fetchedSubBrand = itemData.sub_brand_slug || itemData.type || "";
      const itemBrand = itemData.brand_slug || itemData.brand || "";
      const itemName = itemData.name || itemData.product_name || "";
      const itemModal = itemData.modal || itemData.price || 0;

      // logika pencarian brand lebih pintar
      const foundBrand = brandsList.find(b => 
          (b.slug && itemBrand.toLowerCase() === b.slug.toLowerCase()) || 
          (b.name && itemBrand.toLowerCase().includes(b.name.toLowerCase())) ||
          (b.name && b.name.toLowerCase().includes(itemBrand.toLowerCase()))
      );

      // logika pencarian kategori
      const foundCategory = categories.find(c => 
          (foundBrand && foundBrand.category?.toLowerCase() === c.name?.toLowerCase()) ||
          (itemData.category && itemData.category.toLowerCase() === c.name?.toLowerCase())
      );

      const fetchedModal = Number(itemModal);
      const range = getMarginRange(fetchedModal);
      const autoMargin = range.min;

      const unit = foundBrand ? getUnitByBrand(foundBrand.name) : "";
      let cleanName = itemName; 
      
      // potong satuan (seperti "diamonds", "uc") dari belakang nama jika ada
      if (unit && cleanName.toLowerCase().endsWith(unit.toLowerCase())) {
          cleanName = cleanName.replace(new RegExp(unit, 'gi'), '').trim();
      }

      setFormData(prev => ({
        ...prev, 
        name: cleanName, 
        cost: String(fetchedModal), 
        margin_item: String(autoMargin), 
        brand_id: foundBrand ? String(foundBrand.id) : prev.brand_id,
        category_id: foundCategory ? String(foundCategory.id) : prev.category_id,
        sub_brand: fetchedSubBrand, 
        sku: itemData.sku || itemData.buyer_sku_code, 
        lock_margin: false
      }));

      if (foundCategory) {
        let strategyName = foundCategory.name.toUpperCase();
        if (strategyName === "STREAMING") strategyName = "ENTERTAINMENT";
        setActiveStrategyName(strategyName);
      }
      alert(`BOOM! DATA SKU "${itemData.sku}" DITEMUKAN & DISINKRONKAN.`);
    } finally { 
      setCheckingSku(false); 
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.brand_id || !formData.cost) return alert("LENGKAPI DATA!");
    setSubmitting(true);
    try {
      const selectedBrand = brandsList.find(b => String(b.id) === String(formData.brand_id));
      const rawPayload = {
        id: isEditing,
        name: formData.name.trim(),
        brand_id: Number(formData.brand_id),
        brand_name: selectedBrand ? selectedBrand.name : "",
        sku: formData.sku, sub_brand: formData.sub_brand, cost: Number(formData.cost),
        margin_item: Number(formData.margin_item), discount: Number(formData.discount), 
        category_id: formData.category_id || null, stock: Number(formData.stock),
        lock_margin: formData.lock_margin, provider: formData.provider, globalCashback: globalCashback 
      };

      const res = await fetch('/api/admin/products/single', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rawPayload)
      });
      if (!res.ok) throw new Error("Gagal simpan ke server");
      alert("BERHASIL SIMPAN!");
      resetForm(); fetchData();
    } catch (err: any) { alert(err.message); } finally { setSubmitting(false); }
  };

  const handleEditClick = (item: any) => {
    setIsEditing(item.id);
    const selectedBrand = brandsList.find(b => String(b.id) === String(item.brand_id));
    const unit = selectedBrand ? getUnitByBrand(selectedBrand.name) : "";
    let cleanName = item.name;
    if (unit && item.name.toLowerCase().endsWith(unit.toLowerCase())) {
        cleanName = item.name.replace(unit, '').trim();
    }
    setFormData({
        name: cleanName, brand_id: String(item.brand_id || ""), sku: item.sku || "",
        sub_brand: item.sub_brand || "", price: String(item.price), cost: String(item.cost), 
        margin_item: String(item.margin_item || "0"), discount: String(item.discount || "0"), 
        category_id: item.category_id || "", stock: String(item.stock),
        lock_margin: item.lock_margin || false, provider: item.provider || "DIGIFLAZZ"
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`YAKIN HAPUS PRODUK: ${name.toUpperCase()}?`)) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      logActivity("HAPUS PRODUK", `Menghapus produk: ${name.toUpperCase()}`);
      if (error) throw error;
      fetchData();
    } catch (err: any) { alert(err.message); }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`YAKIN HAPUS ${selectedIds.length} PRODUK SEKALIGUS?`)) return;
    try {
      const { error } = await supabase.from('products').delete().in('id', selectedIds);
      if (error) throw error;
      logActivity("HAPUS MASAL", `Menghapus ${selectedIds.length} produk sekaligus.`);
      setSelectedIds([]);
      fetchData();
      alert("SEMUA PRODUK TERPILIH BERHASIL DIHAPUS!");
    } catch (err: any) { alert("GAGAL HAPUS MASAL: " + err.message); }
  };

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
        const matchCategory = activeCategory ? String(p.category_id) === activeCategory : true;
        const normalize = (text: string) => text ? text.toString().toLowerCase().replace(/[^a-z0-9]/g, "") : "";
        const s = normalize(searchTerm);
        if (searchTerm.toLowerCase() === "stok:kritis") return matchCategory && p.stock <= 5;
        const searchableContent = normalize(`${p.sku || ''} ${p.name || ''} ${p.brands?.name || ''} ${p.categories?.name || ''} ${p.provider || ''} ${p.sub_brand || ''}`);
        return matchCategory && searchableContent.includes(s);
    });

    result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (sortConfig.key === 'category') { valA = a.categories?.name; valB = b.categories?.name; }
        if (sortConfig.key === 'brand') { valA = a.brands?.name; valB = b.brands?.name; }
        if (sortConfig.key === 'net') {
            const getNet = (item: any) => {
                const hJual = item.price || 0;
                const hSetelahDiskon = hJual - Math.floor(hJual * ((item.discount || 0) / 100));
                return hSetelahDiskon - (item.cost || 0) - (item.cashback || 0);
            };
            valA = getNet(a);
            valB = getNet(b);
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        return 0;
    });
    return result;
  }, [products, activeCategory, searchTerm, sortConfig]);

  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const handleSelectAllFiltered = (e: any) => {
    if (e.target.checked) {
        const filteredIds = filteredProducts.map(p => p.id);
        const newSelected = Array.from(new Set([...selectedIds, ...filteredIds]));
        setSelectedIds(newSelected);
    } else {
        const filteredIds = filteredProducts.map(p => p.id);
        setSelectedIds(selectedIds.filter(id => !filteredIds.includes(id)));
    }
  };

  const potentialProfit = useMemo(() => {
    return filteredProducts.reduce((acc, item) => {
      const stock = Number(item.stock) || 0;
      const modal = (Number(item.cost) || 0) * stock;
      const hargaJualAsli = Number(item.price) || 0;
      const diskonPersen = Number(item.discount) || 0;
      const hargaSetelahDiskon = hargaJualAsli - Math.floor(hargaJualAsli * (diskonPersen / 100));
      const omzetTotal = hargaSetelahDiskon * stock;

      let cbPerItem = 0;
      if (diskonPersen > 0) {
        const profitKotor = hargaSetelahDiskon - (Number(item.cost) || 0);
        if (profitKotor > 0) {
          const randomPersen = (item.id.charCodeAt(0) % 6) + 15;
          cbPerItem = Math.floor(profitKotor * (randomPersen / 100));
        }
      } else {
        cbPerItem = Math.floor(hargaSetelahDiskon * (globalCashback / 100));
      }

      const totalProfitBersih = (hargaSetelahDiskon - (Number(item.cost) || 0) - cbPerItem) * stock;
      return { totalOmzet: acc.totalOmzet + omzetTotal, totalModal: acc.totalModal + modal, totalProfit: acc.totalProfit + totalProfitBersih };
    }, { totalOmzet: 0, totalModal: 0, totalProfit: 0 });
  }, [filteredProducts, globalCashback]);

// 1. UPDATE UI SECARA INSTAN (Tanpa Loading)
const handleLocalChange = (id: string, field: string, value: any) => {
  // Catatan: Pastikan nilai kosong tetap kosong, tapi angka diproses sebagai Number agar tidak error kalkulasi
  const safeValue = value === "" ? "" : Number(value);
  setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: safeValue } : p));
};

// 2. SIMPAN KE DATABASE DI BELAKANG LAYAR (Silent Save)
const handleSilentSave = async (id: string, field: string, value: any) => {
  const finalValue = (field === 'promo_label' || field === 'lock_margin') ? value : Number(value);
  try {
    await fetch('/api/admin/products/quick-edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, field, value: finalValue, globalCashback })
    });
    
    // Tarik data terbaru diam-diam (Soft Refresh) biar hasil hitungan harga & profit otomatis update!
    const { data } = await supabase
      .from('products')
      .select(`*, provider, cashback, categories!products_category_id_fkey (name), brands!products_brand_id_fkey (name)`)
      .order('updated_at', { ascending: false });
    
    if (data) setProducts(data);
    
  } catch (err: any) {
    console.error("GAGAL UPDATE:", err.message);
  }
};

// 3. TOGGLE LANGSUNG (Untuk Lock Margin / Promo)
const handleToggleLock = async (id: string, currentValue: boolean) => {
  const newValue = !currentValue;
  handleLocalChange(id, 'lock_margin', newValue); // UI langsung ganti
  await handleSilentSave(id, 'lock_margin', newValue); // Database nyusul diam-diam
};

  return (
    <div className="animate-in fade-in duration-500 font-black italic uppercase text-slate-800 pb-10 px-4 max-w-400 mx-auto">
      {/* HEADER UTAMA */}
      <div className="flex justify-between items-end mb-0 mt-4 border-b-2 border-slate-100 pb-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl tracking-tighter flex items-center gap-2 font-black">
            <span className="bg-slate-900 text-white p-2 rounded-xl shadow-lg shadow-slate-200"><Package size={20} /></span>
            DANISPAY MANAGER
          </h2>
          <div className="flex items-center gap-4 ml-1">
            <div className="flex items-center gap-2">
              <div className={`h-1.5 w-1.5 rounded-full ${digiBalance && digiBalance < 100000 ? "bg-rose-500 animate-ping" : "bg-emerald-500"}`}></div>
              <span className="text-[8px] font-black text-slate-400 tracking-widest uppercase flex items-center gap-1">
                DIGI: 
                <span className={`ml-1 ${digiBalance && digiBalance < 100000 ? "text-rose-500" : "text-slate-800"}`}>
                  RP {digiBalance?.toLocaleString() || "0"}
                </span>
                <button onClick={fetchLiveBalance} className="hover:rotate-180 transition-all text-blue-500">
                  <TrendingUp size={10} />
                </button>
              </span>
            </div>
            <div className="h-3 w-px bg-slate-200"></div>
            <div className="flex items-center gap-2 opacity-50">
              <div className="h-1.5 w-1.5 rounded-full bg-slate-300"></div>
              <span className="text-[8px] font-black text-slate-400 tracking-widest uppercase flex items-center gap-1">
                UNI: <span className="ml-1 text-slate-400 italic">(SOON)</span><Lock size={10} className="text-slate-300" />
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-95 group">
            <Layers size={16} className="text-emerald-600 group-hover:text-white" /> EXPORT
          </button>
          <button onClick={handleDigiflazzSync} disabled={syncing} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl text-[10px] font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 group">
            {syncing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} className="animate-pulse" />} GET DIGIFLAZZ
          </button>
          <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-95 group">
            <TrendingUp size={16} className={loading ? "animate-spin" : "group-hover:rotate-12"} /> SYNC DATA
          </button>
        </div>
      </div>

      <div className={`mt-2 mb-3 p-1 rounded-[40px] border transition-all duration-300 ${isEditing ? "bg-amber-100 border-amber-300 shadow-xl" : "bg-white border-slate-100 shadow-sm"}`}>
        <div className="bg-slate-900 p-5 rounded-[30px] m-1 shadow-2xl border border-slate-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-full bg-linear-to-l from-blue-900/20 to-transparent pointer-events-none"/>
          <div className="flex flex-row items-center justify-between mb-1 gap-3 relative z-10 flex-nowrap overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 scrollbar-hide">
            <div className="flex items-center gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shrink-0"><TrendingUp size={18}/></div>
                <div className="flex flex-col gap-1 min-w-17.5">
                  <h3 className="text-white text-[10px] tracking-widest font-black italic uppercase leading-none">IRON GUARD</h3>
                  <select className="bg-transparent text-blue-400 text-[8px] font-black outline-none cursor-pointer hover:text-white transition-all border-none p-0 uppercase" value={activeStrategyName} onChange={(e) => setActiveStrategyName(e.target.value)}>
                    <option value="DEFAULT" className="bg-slate-900 text-white">PROFIL: DEFAULT</option>
                    {categories.map((cat: any) => (<option key={cat.id} value={cat.name.toUpperCase()} className="bg-slate-900 text-white">PROFIL: {cat.name.toUpperCase()}</option>))}
                  </select>
                </div>
              </div>
              <div className="h-8 w-px bg-slate-700 hidden md:block shrink-0"></div>
              <div className="flex items-center gap-2">
                <div className="bg-rose-500/20 px-2 py-1.5 rounded-xl border border-rose-500/20 flex flex-col min-w-18.75">
                  <span className="text-[5px] text-rose-500 font-bold uppercase tracking-wider">MODAL</span>
                  <span className="text-[8px] text-rose-400 font-black">RP {potentialProfit.totalModal.toLocaleString()}</span>
                </div>
                <div className="bg-emerald-500/10 px-2 py-1.5 rounded-xl border border-emerald-500/20 flex flex-col min-w-18.75">
                  <span className="text-[5px] text-emerald-500 font-bold uppercase tracking-wider">EST. CUAN</span>
                  <span className="text-[8px] text-emerald-400 font-black">RP {potentialProfit.totalProfit.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-2 bg-slate-950/50 px-3 py-1.5 rounded-xl border border-slate-800">
                <DollarSign size={14} className="text-amber-500 shrink-0"/>
                <div className="flex flex-col">
                  <span className="text-[6px] text-slate-500 font-bold uppercase">CASHBACK</span>
                  <div className="flex items-center gap-0.5">
                    <input type="number" className="w-6 bg-transparent text-amber-400 text-[10px] font-black outline-none" value={globalCashback} onChange={(e) => setGlobalCashback(Number(e.target.value))}/>
                    <span className="text-amber-500 text-[8px] font-black">%</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button onClick={handleBulkPriceUpdate} disabled={isBulking || syncing} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[8px] font-black px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5 border border-emerald-500/20 transition-all active:scale-95 shadow-lg shadow-emerald-900/20 shrink-0">
                {isBulking ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />} 
                <span>{isBulking ? "UPDATING..." : "BULK UPDATE"}</span>
              </button>
                <button onClick={saveGlobalSettings} disabled={savingStrategy} className="bg-blue-600 hover:bg-blue-500 text-white text-[8px] font-black px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5 border border-blue-500/20 transition-all active:scale-95 shadow-lg shadow-blue-900/20 shrink-0">
                  {savingStrategy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} <span>{savingStrategy ? "SAVING..." : "SAVE STRATEGY"}</span>
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {(marginConfigs || []).map((cfg: any, idx: number) => (
              <div key={idx} className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 flex flex-col gap-3 group-hover:border-slate-700 transition-all hover:shadow-lg hover:shadow-blue-900/20 backdrop-blur-sm">
                <div>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[9px] text-white font-black italic uppercase">{cfg.label}</span>
                    <span className="text-[7px] text-emerald-400 font-bold uppercase">MARGIN</span>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-900/80 rounded-xl p-1 border border-slate-800 shadow-inner">
                    <input type="number" className="w-full bg-transparent text-white text-[10px] font-bold text-center outline-none" value={cfg.min} onChange={(e) => { const val = Number(e.target.value); const n = [...marginConfigs]; n[idx].min = val; setMarginConfigs(n); setAllStrategies((prev: any) => ({ ...prev, [activeStrategyName]: n })); }} />
                    <span className="text-slate-600 text-[10px]">-</span>
                    <input type="number" className="w-full bg-transparent text-white text-[10px] font-bold text-center outline-none" value={cfg.max} onChange={(e) => { const val = Number(e.target.value); const n = [...marginConfigs]; n[idx].max = val; setMarginConfigs(n); setAllStrategies((prev: any) => ({ ...prev, [activeStrategyName]: n })); }} />
                    <span className="text-[8px] text-emerald-500 font-black pr-1">%</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[7px] text-slate-500 font-bold uppercase tracking-wider">RANDOM DISC</span>
                    <span className={`text-[7px] px-1.5 py-0.5 rounded-md font-bold ${cfg.maxDisc > 0 ? "text-rose-400 bg-rose-500/10" : "text-slate-500 bg-slate-800"}`}>{cfg.maxDisc > 0 ? "ON" : "OFF"}</span>
                  </div>
                  <div className="flex items-center gap-1 rounded-xl p-1 border border-slate-800 bg-slate-900/80 shadow-inner">
                    <input type="number" className="w-full bg-transparent text-rose-300 text-[10px] font-bold text-center outline-none" value={cfg.minDisc || 0} onChange={(e) => { const val = Number(e.target.value); const n = [...marginConfigs]; n[idx].minDisc = val; setMarginConfigs(n); setAllStrategies((prev: any) => ({ ...prev, [activeStrategyName]: n })); }} />
                    <span className="text-slate-700 text-[10px]">-</span>
                    <input type="number" className="w-full bg-transparent text-rose-300 text-[10px] font-bold text-center outline-none" value={cfg.maxDisc || 0} onChange={(e) => { const val = Number(e.target.value); const n = [...marginConfigs]; n[idx].maxDisc = val; setMarginConfigs(n); setAllStrategies((prev: any) => ({ ...prev, [activeStrategyName]: n })); }} />
                    <span className="text-[8px] text-rose-600 font-black pr-1">%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 pt-2">
          <div className="flex items-center justify-between mb-1 px-2">
            <span className="text-[10px] tracking-widest text-slate-400 font-black uppercase">{isEditing ? "SEDANG EDIT DATA" : "ENTRY PRODUK BARU"}</span>
            {isEditing && <button onClick={resetForm} className="text-[8px] text-amber-600 underline font-black">BATAL EDIT</button>}
          </div>

          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-4 gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[7px] text-blue-500 ml-1 font-bold italic uppercase tracking-widest">PROVIDER</label>
                <select className="w-full bg-blue-50 border border-blue-100 p-2.5 rounded-xl text-[10px] font-black outline-none h-10 focus:border-blue-400 transition-all cursor-pointer shadow-sm" value={formData.provider || "DIGIFLAZZ"} onChange={e => setFormData({...formData, provider: e.target.value})}>
                  <option value="DIGIFLAZZ">DIGIFLAZZ</option>
                  <option value="UNIPLAY">UNIPLAY</option>
                  <option value="MANUAL">MANUAL</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[7px] text-slate-400 ml-1 font-bold italic uppercase tracking-widest">KATEGORI</label>
              <select className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-black outline-none h-10 focus:border-blue-400 transition-all cursor-pointer shadow-sm" value={formData.category_id} onChange={(e) => {
                const catId = e.target.value; 
                const selectedCat = categories.find(c => String(c.id) === String(catId));
                // Ubah pencarian pakai category_id biar presisi 100%
                const firstMatchBrand = brandsList.find(b => String(b.category_id) === String(catId));
                setFormData({ ...formData, category_id: catId, brand_id: firstMatchBrand ? String(firstMatchBrand.id) : "" });
                if (selectedCat) { let strategyName = selectedCat.name.toUpperCase(); if (strategyName === "STREAMING") strategyName = "ENTERTAINMENT"; setActiveStrategyName(strategyName); } else { setActiveStrategyName("DEFAULT"); }
              }}>
                  <option value="">-- PILIH --</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[7px] text-slate-400 ml-1 font-bold italic uppercase tracking-widest">BRAND</label>
                <select className="w-full bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-black outline-none h-10 focus:border-blue-400 transition-all cursor-pointer shadow-sm" value={formData.brand_id} onChange={e => setFormData({...formData, brand_id: e.target.value})}>
                  <option value="">-- PILIH --</option>
                  {/* Tambahan aman: Pastikan data brand dan kategori di-lowercase dengan aman biar nggak error kalau ada yg null */}
                  {brandsList.filter((b: any) => { 
                      if (!formData.category_id) return true; 
                      // Langsung tembak pakai ID relasinya bos, nggak usah cocokin teks lagi
                      return String(b.category_id) === String(formData.category_id); 
                  }).map((b) => (
                      <option key={b.id} value={b.id}>{b.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[7px] text-rose-500 ml-1 font-bold italic uppercase tracking-widest">JUMLAH STOK</label>
                <input type="number" className="w-full bg-white border-2 border-slate-900 p-2.5 rounded-xl text-[10px] font-black outline-none h-10 focus:ring-2 focus:ring-rose-500/20 shadow-sm" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
              </div>
            </div>

            <div className="flex flex-row gap-4 mt-2">
              <div className="flex-3 flex flex-col gap-1">
                <label className="text-[7px] text-slate-400 ml-1 font-bold italic uppercase tracking-widest">NAMA PRODUK / JUMLAH</label>
                <div className="flex gap-2 relative">
                  <input type="text" placeholder="CONTOH: 50" className="flex-1 bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-[10px] font-black outline-none h-10 focus:border-blue-400 transition-all z-10 shadow-sm" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  <div className="bg-slate-900 text-white text-[8px] px-4 flex items-center rounded-xl font-bold italic min-w-17.5 justify-center text-center leading-tight shadow-md shrink-0">
                    {(() => { const b = brandsList.find(brand => String(brand.id) === String(formData.brand_id)); const isNumber = /^\d+$/.test(formData.name); return (b && isNumber) ? getUnitByBrand(b.name) : (b ? "UNIT" : "SATUAN"); })()}
                  </div>
                </div>
                <div className="pl-1 h-3">
                  {formData.name && /^\d+$/.test(formData.name) && formData.brand_id && (
                    <p className="text-[8px] text-emerald-600 font-bold italic animate-in fade-in">Akan disimpan sebagai: "{formData.name} {(() => { const b = brandsList.find(brand => String(brand.id) === String(formData.brand_id)); return b ? getUnitByBrand(b.name) : ""; })()}"</p>
                  )}
                </div>
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-[7px] text-slate-400 ml-1 font-bold italic uppercase tracking-widest">KODE SKU</label>
                <div className="flex gap-1 h-10">
                  <input type="text" placeholder="SKU..." className="flex-1 bg-slate-50 border border-slate-100 px-4 rounded-xl text-[10px] font-black outline-none text-blue-600 transition-all focus:border-blue-500 uppercase shadow-sm" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} />
                  <button type="button" onClick={handleCheckSKU} className="bg-blue-600 text-white px-3 rounded-xl hover:bg-blue-700 transition-all shadow-md flex items-center justify-center min-w-10">
                    {checkingSku ? <Loader2 size={12} className="animate-spin"/> : <Zap size={12}/>}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-2 mb-0.5">
              <div className="flex-[1.5] min-w-30 flex flex-col gap-0.5">
                <label className="text-[7px] text-rose-400 ml-1 font-bold italic uppercase">MODAL (COST)</label>
                <input type="number" className="w-full bg-rose-50 border border-rose-100 p-2 rounded-xl text-[10px] font-black outline-none h-9 text-rose-600 focus:border-rose-300" value={formData.cost} onChange={e => { const newCost = Number(e.target.value); const recommendedMargin = getMarginRange(newCost).min; setFormData({...formData, cost: e.target.value, margin_item: e.target.value ? String(recommendedMargin) : ""}); }} />
              </div>
              <div className="flex-[0.7] min-w-16 flex flex-col gap-0.5">
                <label className="text-[7px] text-orange-500 ml-1 font-bold italic uppercase">DISC (%)</label>
                <input type="number" className="w-full bg-orange-50 border border-orange-100 p-2 rounded-xl text-[10px] font-black outline-none h-9 text-orange-600 focus:border-orange-300 transition-all" value={formData.discount} onChange={e => setFormData({...formData, discount: e.target.value})} />
              </div>
              <div className="flex-[1.2] min-w-35 flex flex-col gap-0.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[7px] text-emerald-500 font-bold italic uppercase">MARGIN (%)</label>
                  <span className={`text-[5px] font-black uppercase px-1 rounded ${formData.lock_margin ? "bg-amber-100 text-amber-600" : "bg-blue-50 text-blue-400"}`}>{formData.lock_margin ? "LOCKED" : "AUTO"}</span>
                </div>
                <div className="flex gap-1 h-9">
                  <button type="button" onClick={() => setFormData({ ...formData, lock_margin: !formData.lock_margin })} className={`w-8 rounded-xl flex items-center justify-center transition-all border ${formData.lock_margin ? "bg-amber-500 text-white border-amber-600 shadow-sm" : "bg-slate-100 text-slate-400 border-slate-200"}`}>
                    {formData.lock_margin ? <Lock size={10} /> : <Unlock size={10} />}
                  </button>
                  <div className="relative flex-1">
                    <input type="number" className={`w-full h-full p-2 pr-6 rounded-xl text-[10px] font-black outline-none border ${ (() => { const modal = Number(formData.cost) || 0; const margin = Number(formData.margin_item) || 0; const disc = Number(formData.discount) || 0; const range = getMarginRange(modal); if (formData.lock_margin) return "bg-amber-50 border-amber-300 text-amber-700 focus:border-amber-500"; const hargaJual = Math.ceil((modal * (1 + margin / 100)) / 100) * 100; const hargaSetelahDiskon = hargaJual - Math.floor(hargaJual * (disc / 100)); const untungKotor = hargaSetelahDiskon - modal; const cbNormal = Math.floor(hargaSetelahDiskon * (globalCashback / 100)); const finalCB = Math.min(cbNormal, Math.max(0, Math.floor(untungKotor * 0.3))); const net = untungKotor - finalCB; return (!formData.lock_margin && (margin < range.min || net < 1000)) ? "bg-rose-50 border-rose-300 text-rose-600 animate-pulse" : "bg-emerald-50 border-emerald-100 text-emerald-600 focus:border-emerald-300"; })() }`} value={formData.margin_item} onChange={e => setFormData({...formData, margin_item: e.target.value})} />
                    <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black ${formData.lock_margin ? "text-amber-600" : "text-emerald-600"}`}>%</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-32.5 flex flex-col gap-0.5">
                <label className="text-[7px] text-amber-600 ml-1 font-bold italic uppercase">
                  {(() => { const modal = Number(formData.cost) || 0; const margin = Number(formData.margin_item) || 0; const disc = Number(formData.discount) || 0; const hargaJual = Math.ceil((modal * (1 + margin / 100)) / 100) * 100; const hargaSetelahDiskon = hargaJual - Math.floor(hargaJual * (disc / 100)); const untungKotor = hargaSetelahDiskon - modal; const cbNormal = Math.floor(hargaSetelahDiskon * (globalCashback / 100)); return (cbNormal > Math.floor(untungKotor * 0.3)) ? "CB (CAPPED 30%)" : `CASHBACK (${globalCashback}%)`; })()}
                </label>
                <div className={`h-9 px-3 rounded-xl flex items-center justify-between border-l-4 transition-all ${ (() => { const modal = Number(formData.cost) || 0; const margin = Number(formData.margin_item) || 0; const disc = Number(formData.discount) || 0; const hargaJual = Math.ceil((modal * (1 + margin / 100)) / 100) * 100; const hargaSetelahDiskon = hargaJual - Math.floor(hargaJual * (disc / 100)); const untungKotor = hargaSetelahDiskon - modal; const cbNormal = Math.floor(hargaSetelahDiskon * (globalCashback / 100)); const plafonMaks = Math.floor(untungKotor * 0.3); return (cbNormal > plafonMaks && untungKotor > 0) ? "bg-amber-100 border-amber-600" : "bg-amber-50 border-amber-200"; })() }`}>
                  <span className="text-[9px] text-amber-700 font-black italic">
                    -Rp {(() => { const modal = Number(formData.cost) || 0; const margin = Number(formData.margin_item) || 0; const disc = Number(formData.discount) || 0; const hargaJual = Math.ceil((modal * (1 + margin / 100)) / 100) * 100; const hargaSetelahDiskon = hargaJual - Math.floor(hargaJual * (disc / 100)); const untungKotor = hargaSetelahDiskon - modal; const cbNormal = Math.floor(hargaSetelahDiskon * (globalCashback / 100)); const plafonMaks = Math.max(0, Math.floor(untungKotor * 0.3)); return Math.min(cbNormal, plafonMaks).toLocaleString(); })()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-11 bg-slate-900 rounded-xl flex items-center justify-between px-4 border-l-4 border-blue-500 shadow-sm">
                <span className="text-[7px] text-blue-400 font-black uppercase tracking-tighter">HARGA JUAL:</span>
                <span className="text-xs text-white font-black">
                  Rp {(() => {
                    const modal = Number(formData.cost) || 0;
                    const margin = Number(formData.margin_item) || 0;
                    const disc = Number(formData.discount) || 0;
                    const hargaJualAsli = Math.ceil((modal * (1 + margin / 100)) / 100) * 100;
                    const hargaSetelahDiskon = hargaJualAsli - Math.floor(hargaJualAsli * (disc / 100));
                    return hargaSetelahDiskon.toLocaleString();
                  })()}
                </span>
              </div>
              <div className={`flex-[1.2] h-11 rounded-xl flex items-center justify-between px-4 transition-all shadow-sm ${ (() => { const modal = Number(formData.cost) || 0; const margin = Number(formData.margin_item) || 0; const disc = Number(formData.discount) || 0; const range = getMarginRange(modal); const hargaJual = Math.ceil((modal * (1 + margin / 100)) / 100) * 100; const hargaSetelahDiskon = hargaJual - Math.floor(hargaJual * (disc / 100)); const untungKotor = hargaSetelahDiskon - modal; const finalCB = Math.min(Math.floor(hargaSetelahDiskon * (globalCashback / 100)), Math.floor(untungKotor * 0.3)); const net = untungKotor - finalCB; return (net < 1000 || margin < range.min) ? "bg-rose-600" : "bg-emerald-500"; })() }`}>
                <span className="text-[7px] text-white/80 font-black uppercase tracking-tighter italic">NET (SPL):</span>
                <span className="text-xs text-white font-black">
                  Rp {(() => { const modal = Number(formData.cost) || 0; const margin = Number(formData.margin_item) || 0; const disc = Number(formData.discount) || 0; const hargaJual = Math.ceil((modal * (1 + margin / 100)) / 100) * 100; const hargaSetelahDiskon = hargaJual - Math.floor(hargaJual * (disc / 100)); const untungKotor = hargaSetelahDiskon - modal; const finalCB = Math.min(Math.floor(hargaSetelahDiskon * (globalCashback / 100)), Math.floor(untungKotor * 0.3)); return (untungKotor - finalCB).toLocaleString(); })()}
                </span>
              </div>
              <button onClick={handleSubmit} disabled={submitting} className={`px-6 h-11 rounded-xl text-[9px] font-black text-white transition-all shadow-md flex items-center justify-center gap-2 ${isEditing ? "bg-amber-500 hover:bg-amber-600" : "bg-slate-900 hover:bg-blue-600 active:scale-95"}`}>
                {submitting ? <Loader2 size={12} className="animate-spin"/> : <Save size={14}/>} {isEditing ? "UPDATE" : "SIMPAN"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-3 mb-1">
        <div className="relative w-full md:w-48 group">
          <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={12} />
          <select className="w-full bg-white border border-slate-200 pl-9 pr-8 py-2.5 rounded-2xl outline-none text-[9px] font-black appearance-none cursor-pointer shadow-sm hover:border-slate-300 transition-all focus:border-blue-400" value={activeCategory || ""} onChange={(e) => {
              const catId = e.target.value || null;
              setActiveCategory(catId);
              
              // Sinkronisasi otomatis ke Iron Guard Strategy
              if (catId) {
                const selectedCat = categories.find(c => String(c.id) === String(catId));
                if (selectedCat) {
                  let strategyName = selectedCat.name.toUpperCase();
                  if (strategyName === "STREAMING") strategyName = "ENTERTAINMENT";
                  setActiveStrategyName(strategyName);
                }
              } else {
                // Kalau balik ke "SEMUA KATEGORI", balikin strategi ke DEFAULT
                setActiveStrategyName("DEFAULT");
              }
            }}>
            <option value="">SEMUA KATEGORI</option>
            {categories.map((cat) => (<option key={cat.id} value={String(cat.id)}>{cat.name.toUpperCase()}</option>))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[8px]">▼</div>
        </div>
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={12} />
          <input type="text" placeholder="CARI NAMA PRODUK ATAU SKU..." className="w-full bg-white border border-slate-200 pl-9 pr-3 py-2.5 rounded-2xl outline-none text-[9px] font-black focus:border-blue-400 shadow-sm transition-all" value={searchTerm === "stok:kritis" ? "" : searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <button onClick={() => setSearchTerm(searchTerm === "stok:kritis" ? "" : "stok:kritis")} className={`w-full md:w-auto px-6 py-2.5 rounded-2xl text-[9px] font-black border transition-all flex items-center justify-center gap-2 ${searchTerm === "stok:kritis" ? "bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-200" : "bg-white text-rose-600 border-rose-100 hover:bg-rose-50"}`}>
          <Activity size={14} className={searchTerm === "stok:kritis" ? "animate-pulse" : ""}/> {searchTerm === "stok:kritis" ? "TAMPILKAN SEMUA" : "CEK STOK KRITIS"}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {selectedIds.length > 0 && (
          <div className="flex justify-between items-center bg-blue-50 border border-blue-200 p-3 mb-4 rounded-3xl animate-in slide-in-from-top duration-300 shadow-lg shadow-blue-100">
            <div className="flex items-center gap-3 ml-2">
              <div className="bg-blue-600 text-white p-2 rounded-xl"><Zap size={14} className="animate-pulse"/></div>
              <span className="text-[10px] font-black text-blue-900">{selectedIds.length} PRODUK TERPILIH</span>
            </div>
            <div className="flex gap-2 mr-1 items-center">
              <div className="flex gap-2 mr-1 items-center">
                <div className="bg-white border border-slate-200 rounded-2xl px-3 py-1 flex items-center gap-2 shadow-inner group-focus-within:border-blue-400 transition-colors">
                  <span className="text-[7px] text-slate-400 font-bold uppercase tracking-widest">LABEL:</span>
                  <input type="text" className="w-20 text-[10px] font-black text-slate-800 outline-none uppercase placeholder:text-slate-300 bg-transparent" placeholder="HOT DEAL" value={promoLabel} onChange={(e) => setPromoLabel(e.target.value.toUpperCase())} />
                </div>
                <div className="flex bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
                  <div className="flex items-center gap-3 px-3 bg-slate-50 border-r border-slate-100 py-1">
                    <label className="flex items-center gap-1.5 cursor-pointer group">
                      <input type="checkbox" checked={launchOptions.promo} onChange={(e) => setLaunchOptions({...launchOptions, promo: e.target.checked})} className="w-3 h-3 accent-amber-500 cursor-pointer" />
                      <span className="text-[8px] font-black text-slate-500 group-hover:text-amber-600">PROMO</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer group border-l border-slate-200 pl-3">
                      <input type="checkbox" checked={launchOptions.lock} onChange={(e) => setLaunchOptions({...launchOptions, lock: e.target.checked})} className="w-3 h-3 accent-blue-600 cursor-pointer" />
                      <span className="text-[8px] font-black text-slate-500 group-hover:text-blue-600 flex items-center gap-1"><Lock size={8}/> LOCK</span>
                    </label>
                  </div>
                  <button onClick={handleFlashSale} disabled={syncing} className={`px-5 py-2 text-[10px] font-black text-white transition-all active:scale-95 flex items-center gap-2 ${launchOptions.lock && !launchOptions.promo ? "bg-blue-600 hover:bg-blue-700" : "bg-orange-500 hover:bg-orange-600"}`}>
                    {syncing ? <Loader2 size={12} className="animate-spin"/> : <Zap size={12}/>} {syncing ? "RUNNING..." : "LAUNCH"}
                  </button>
                </div>
                <div className="flex bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden ml-2">
                  <button onClick={handleStopLock} disabled={syncing} className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-rose-600 text-[10px] font-black flex items-center gap-1 border-r border-slate-200 transition-all active:scale-95">
                    {syncing ? <Loader2 size={12} className="animate-spin"/> : <Unlock size={12}/>} UNLOCK
                  </button>
                  <button onClick={handleStopFlashSale} disabled={syncing} className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[10px] font-black flex items-center gap-1 transition-all active:scale-95">
                    <X size={12}/> UNPROMO
                  </button>
                </div>
              </div>
              <button onClick={handleBulkDelete} className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black px-5 py-2 rounded-2xl flex items-center gap-2 shadow-md shadow-rose-200 active:scale-95 transition-all">
                <Trash2 size={12}/> HAPUS
              </button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white text-[7px] tracking-widest uppercase italic border-b border-slate-800">
                <th className="px-3 py-3 border-r border-slate-700 text-center"><input type="checkbox" className="w-3 h-3 accent-rose-500 cursor-pointer" onChange={handleSelectAllFiltered} checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedIds.includes(p.id))} /></th>
                <th onClick={() => handleSort('provider')} className="px-3 py-3 border-r border-slate-700 text-center text-blue-400 cursor-pointer hover:bg-slate-800">PROVIDER {sortConfig.key === 'provider' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('sku')} className="px-3 py-3 border-r border-slate-700 text-center cursor-pointer hover:bg-slate-800">SKU / PROMO {sortConfig.key === 'sku' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('category')} className="px-3 py-3 border-r border-slate-700 text-center cursor-pointer hover:bg-slate-800">KAT / BRAND {sortConfig.key === 'category' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('sub_brand')} className="px-3 py-3 border-r border-slate-700 text-center text-amber-400 cursor-pointer hover:bg-slate-800">SUB BRAND {sortConfig.key === 'sub_brand' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('name')} className="px-3 py-3 border-r border-slate-700 text-center cursor-pointer hover:bg-slate-800">PRODUK {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('cost')} className="px-3 py-3 border-r border-slate-700 text-center cursor-pointer hover:bg-slate-800">MODAL {sortConfig.key === 'cost' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('discount')} className="px-3 py-3 border-r border-slate-700 text-center text-rose-400 cursor-pointer hover:bg-slate-800">DISC (%) {sortConfig.key === 'discount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('price')} className="px-3 py-3 border-r border-slate-700 text-center cursor-pointer hover:bg-slate-800">JUAL {sortConfig.key === 'price' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('margin_item')} className="px-3 py-3 border-r border-slate-700 text-center text-emerald-400 cursor-pointer hover:bg-slate-800">MARGIN (%) {sortConfig.key === 'margin_item' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('cashback')} className="px-3 py-3 border-r border-slate-700 text-center text-amber-500 cursor-pointer hover:bg-slate-800">CASHBACK {sortConfig.key === 'cashback' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th onClick={() => handleSort('net')} className="px-3 py-3 border-r border-slate-700 text-center text-blue-400 cursor-pointer hover:bg-slate-800">NET (SPL) {sortConfig.key === 'net' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                <th className="px-3 py-3 text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={13} className="p-5 text-center text-[8px] animate-pulse">SYNCHRONIZING DATABASE...</td></tr>
              ) : 
              filteredProducts.map((item) => {
                const hargaJualAsli = item.price || 0;
                const diskonPersen = item.discount || 0;
                const nominalDiskon = Math.floor(hargaJualAsli * (diskonPersen / 100));
                const hargaSetelahDiskon = hargaJualAsli - nominalDiskon;
                const cbNominal = item.cashback || 0;
                const profitKotor = hargaSetelahDiskon - item.cost;
                
                let textShare = "";
                if (diskonPersen > 0) {
                    textShare = "(PROMO)";
                } else {
                    const cbNormal = Math.floor(hargaSetelahDiskon * (globalCashback / 100));
                    if (cbNominal < cbNormal && profitKotor > 0) textShare = "(Capped 30%)";
                    if (cbNominal > cbNormal) textShare = "(MANUAL)"; 
                }
                const profitBersih = hargaSetelahDiskon - item.cost - cbNominal;

                return (
                  <tr key={item.id} className={`text-[9px] transition-colors ${item.stock <= 5 ? "bg-rose-50 hover:bg-rose-100/80" : "hover:bg-blue-50/50"}`}>
                    <td className="px-3 py-1.5 border-r border-slate-50 text-center">
                      <input type="checkbox" className="w-3 h-3 accent-rose-500 cursor-pointer" checked={selectedIds.includes(item.id)} onChange={() => { if (selectedIds.includes(item.id)) setSelectedIds(selectedIds.filter(id => id !== item.id)); else setSelectedIds([...selectedIds, item.id]); }} />
                    </td>
                    <td className="px-3 py-2 border-r border-slate-50 text-center">
                      <span className={`text-[8px] font-black px-2 py-1 rounded-lg italic ${item.provider === 'UNIPLAY' ? "bg-purple-100 text-purple-700 border border-purple-200" : "bg-blue-100 text-blue-700 border border-blue-200"}`}>{item.provider || "DIGIFLAZZ"}</span>
                    </td>
                    <td className="px-3 py-2 border-r border-slate-50">
                      <p className="font-bold text-blue-600 mb-1 uppercase">{item.sku || "-"}</p>
                      <div className="cursor-pointer group" onDoubleClick={() => { setQuickEditing({ id: item.id, field: 'promo_label' }); setQuickValue(item.promo_label || ""); }}>
                        {quickEditing?.id === item.id && quickEditing?.field === 'promo_label' ? (
                          <input autoFocus className="bg-amber-500 text-white px-1 rounded outline-none w-full text-[8px] font-black italic" value={quickValue} onChange={e => setQuickValue(e.target.value)} onBlur={() => handleQuickUpdate(item.id, 'promo_label', quickValue)} onKeyDown={e => e.key === 'Enter' && handleQuickUpdate(item.id, 'promo_label', quickValue)} />
                        ) : (
                          <span className={item.promo_label ? "bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded text-[6px] font-black uppercase" : "text-slate-300 italic text-[6px]"}>{item.promo_label || "No Label"}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 border-r border-slate-50 text-center">
                      <p className="font-black text-slate-800 uppercase">{item.categories?.name || "-"}</p>
                      <p className="text-slate-400 text-[7px] uppercase italic">{item.brands?.name || "-"}</p>
                    </td>
                    <td className="px-3 py-2 border-r border-slate-50 text-center font-bold text-amber-600 uppercase text-[8px]">{item.sub_brand || "-"}</td>
                    <td className="px-4 py-2 border-r border-slate-50 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-slate-800 font-black tracking-tight uppercase leading-none">{item.name}</span>
                        <span className={`text-[7px] font-black px-3 py-1 rounded-full shadow-sm min-w-20 text-center ${item.stock <= 5 ? "bg-rose-600 text-white animate-bounce" : item.stock <= 10 ? "bg-rose-100 text-rose-600 animate-pulse" : "bg-emerald-100 text-emerald-600"}`}>
                          {item.stock <= 5 ? `⚠️ KRITIS: ${item.stock}` : `STOK: ${item.stock}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-1.5 border-r border-slate-50 text-center text-rose-500 font-bold">Rp {item.cost?.toLocaleString()}</td>
                <td className="px-3 py-2 border-r border-slate-50 text-center">
                  <div className="flex flex-col items-center justify-center">
              <input 
                type="number" 
                // Catatan: Cek null dan 0 sekaligus agar React tidak komplain warning null
                value={(item.discount === 0 || item.discount === null) ? "" : item.discount}
                onChange={(e) => handleLocalChange(item.id, 'discount', e.target.value)}
                onBlur={(e) => handleSilentSave(item.id, 'discount', e.target.value || 0)}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className="w-10 bg-transparent text-rose-600 font-black text-center outline-none border-b border-transparent hover:border-rose-300 focus:border-rose-500 transition-all placeholder:text-rose-200"
              />
                    {item.discount > 0 && <span className="text-[6px] text-rose-400 font-medium italic mt-0.5">(Rp {nominalDiskon.toLocaleString()})</span>}
                  </div>
                </td>
                    <td className="px-3 py-2 border-r border-slate-50 text-center font-black">
                      {diskonPersen > 0 && <p className="text-[7px] text-slate-400 line-through">Rp {hargaJualAsli.toLocaleString()}</p>}
                      <p className={diskonPersen > 0 ? "text-emerald-600" : "text-slate-800"}>Rp {hargaSetelahDiskon.toLocaleString()}</p>
                    </td>
            <td className={`px-3 py-1.5 border-r border-slate-50 text-center font-black transition-colors align-middle ${item.lock_margin ? "bg-amber-50 text-amber-600" : "hover:bg-emerald-50 text-emerald-600"}`}>
              <div className="flex flex-col items-center justify-center gap-0.5">
                <div className="flex items-center justify-center gap-1.5">
                  <button onClick={() => handleToggleLock(item.id, item.lock_margin)} className="p-0.5 hover:bg-slate-200 rounded transition-all" title={item.lock_margin ? "Klik untuk UNLOCK" : "Klik untuk LOCK"}>
                    {item.lock_margin ? <Lock size={10} strokeWidth={3} className="text-amber-600" /> : <Unlock size={10} className="text-slate-300 hover:text-blue-500" />}
                  </button>
              <input 
                type="number"
                // Catatan: Saringan anti-null untuk kolom margin
                value={(item.margin_item === 0 || item.margin_item === null) ? "" : item.margin_item}
                onChange={(e) => handleLocalChange(item.id, 'margin_item', e.target.value)}
                onBlur={(e) => handleSilentSave(item.id, 'margin_item', e.target.value || 0)}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className="w-10 bg-transparent font-black text-center outline-none border-b border-transparent hover:border-emerald-300 focus:border-emerald-500 transition-all placeholder:text-emerald-200"
              />
                </div>
                <span className={`text-[7px] block font-medium leading-none ${item.lock_margin ? "text-amber-500" : "text-slate-400"}`}>
                  (Rp {(hargaJualAsli - item.cost).toLocaleString()})
                </span>
              </div>
            </td>
              <td className="px-3 py-1.5 border-r border-slate-50 text-center transition-all hover:bg-amber-50">
                <div className="flex flex-col items-center justify-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className={`text-[8px] font-bold ${diskonPersen > 0 ? "text-blue-500" : "text-amber-600"}`}>Rp</span>
                <input 
                  type="number" 
                  // Catatan: Saringan anti-null untuk kolom cashback
                  value={(item.cashback === 0 || item.cashback === null) ? "" : item.cashback}
                  onChange={(e) => handleLocalChange(item.id, 'cashback', e.target.value)}
                  onBlur={(e) => handleSilentSave(item.id, 'cashback', e.target.value || 0)}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  onFocus={(e) => e.target.select()}
                  placeholder="0"
                  className={`w-12 bg-transparent font-bold italic text-center outline-none border-b border-transparent hover:border-amber-300 focus:border-amber-500 transition-all placeholder:text-amber-200/50 ${diskonPersen > 0 ? "text-blue-500" : "text-amber-600"}`}
                />
                  </div>
                  {textShare && <span className="text-[6px] text-slate-400 font-bold bg-slate-100 px-1 rounded mt-0.5">{textShare}</span>}
                </div>
              </td>
                    <td className={`px-3 py-1.5 border-r border-slate-50 text-center font-black transition-all ${ (profitBersih < 1000 || cbNominal > profitBersih) ? "text-rose-600 animate-pulse bg-rose-50" : "text-blue-600 bg-blue-50/30" }`}>
                      <div className="flex flex-col items-center">
                        <span>Rp {profitBersih.toLocaleString()}</span>
                        {(profitBersih < 1000 || cbNominal > profitBersih) && (
                          <span className="text-[6px] font-black uppercase tracking-tighter mt-0.5 px-1 rounded bg-rose-600 text-white">{cbNominal > profitBersih ? "CB BOCOR!" : "LOW PROFIT"}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => handleEditClick(item)} className="p-1 text-amber-500 hover:bg-amber-100 rounded-lg"><Edit3 size={12}/></button>
                        <button onClick={() => handleDelete(item.id, item.name)} className="p-1 text-rose-500 hover:bg-rose-100 rounded-lg"><Trash2 size={12}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div> 
      </div>
    </div>
  ); 
}