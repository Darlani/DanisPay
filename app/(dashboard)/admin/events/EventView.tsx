"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/utils/supabaseClient";
import {
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  FileText,
  Plus,
  X,
  Save,
  Trash2,
  Upload,
  Bell,
  Ticket,
  Banknote,
  CheckCircle2,
  Loader2,
  Ban,
  Layers
} from "lucide-react";
import imageCompression from "browser-image-compression";

// Type definition agar TypeScript senang
interface AdminEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  impact_level: string;
}

export default function EventView() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [viewDate, setViewDate] = useState(new Date());

  // State Modal Control
  const [showInputModal, setShowInputModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [selectedDayEvents, setSelectedDayEvents] = useState<AdminEvent[]>([]);
  const [selectedDateLabel, setSelectedDateLabel] = useState("");

  // State Form Kalender
  const [selectedDateInput, setSelectedDateInput] = useState<number>(new Date().getDate());
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newImpact, setNewImpact] = useState("Medium");
  const [selectedAlert, setSelectedAlert] = useState<AdminEvent | null>(null);

  // State Banner
  const [bannerList, setBannerList] = useState<any[]>([]);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState("");

  // State Promo Voucher
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [activeVoucherFilter, setActiveVoucherFilter] = useState("ALL");
  const [availableBrands, setAvailableBrands] = useState<any[]>([]);

  const today = new Date();

  // ==========================
  // 1. DATA FETCHING
  // ==========================
  const fetchEvents = async () => {
    const { data } = await supabase.from("admin_events").select("*");
    if (data) setEvents(data);
    setLoading(false);
  };

  const fetchBanners = async () => {
    const { data } = await supabase.from("banners").select("*").order("id", { ascending: true });
    if (data) {
      const slots = [...data];
      while (slots.length < 9) {
        slots.push({ id: null, alt: "Slot Kosong", src: "", isPlaceholder: true });
      }
      setBannerList(slots);
    }
  };

  const fetchVouchers = async () => {
    try {
      const { data: brandsData } = await supabase.from('brands').select('name').order('name', { ascending: true });
      if (brandsData) setAvailableBrands(brandsData);
      const { data: promoData } = await supabase.from('promos').select('*').order('created_at', { ascending: false });
      if (promoData) {
        const vouchersWithUsage = await Promise.all(promoData.map(async (p) => {
          const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true })
            .eq('voucher_code', p.code).in('status', ['success', 'paid', 'settlement']); 
          return { ...p, current_usage: count || 0 }; 
        }));
        setVouchers(vouchersWithUsage);
      }
    } catch (err: any) { console.error("Error:", err.message); }
  };

  useEffect(() => {
    fetchEvents();
    fetchVouchers();
  }, []);

  useEffect(() => {
    if (showBannerModal) fetchBanners();
  }, [showBannerModal]);

  // ==========================
  // 2. LOGIC HANDLERS
  // ==========================
  const changeMonth = (offset: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1));
  };

  const handleDateClick = (day: number, dayEvents: AdminEvent[]) => {
    setSelectedDateLabel(`${day} ${viewDate.toLocaleString("id-ID", { month: "long" })} ${viewDate.getFullYear()}`);
    setSelectedDayEvents(dayEvents);
    if (dayEvents.length > 0) {
      setShowDetailModal(true);
    } else {
      setSelectedDateInput(day);
      setShowInputModal(true);
    }
  };

  const handleSaveEvent = async () => {
    if (!newTitle) return;
    const formattedDate = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDateInput).padStart(2, "0")}`;
    const { error } = await supabase.from("admin_events").insert([
      { title: newTitle, description: newDescription, event_date: formattedDate, impact_level: newImpact },
    ]);
    if (!error) {
      setNewTitle(""); setNewDescription(""); setShowInputModal(false); fetchEvents();
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    try {
      const file = e.target.files[0];
      const compressed = await imageCompression(file, { maxSizeMB: 0.4, maxWidthOrHeight: 1280 });
      const fileName = `promotions/${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage.from("banners").upload(fileName, compressed);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("banners").getPublicUrl(fileName);
      setPreviewImage(data.publicUrl);
    } catch (err) { alert("Upload gagal!"); } finally { setUploading(false); }
  };

  const handleSaveBanner = async () => {
    if (!editingBanner) return;
    const payload = {
      src: previewImage || editingBanner.src,
      alt: editingBanner.alt,
      promo: editingBanner.promo,
      href: editingBanner.href,
      category: editingBanner.category,
      description: editingBanner.description,
      promo_code: editingBanner.promo_code,
      cashback: editingBanner.cashback,
      is_active: editingBanner.is_active // TAMBAHKAN INI BOS
    };
    const { error } = editingBanner.id 
      ? await supabase.from("banners").update(payload).eq("id", editingBanner.id)
      : await supabase.from("banners").insert([payload]);
    if (!error) {
      setEditingBanner(null); setPreviewImage(""); fetchBanners();
    }
  };

  const handleUpdateVoucher = async (voucher: any) => {
    try { 
      await supabase.from('promos').update({ 
        code: voucher.code, discount_amount: voucher.discount_amount, is_active: voucher.is_active, 
        valid_from: voucher.valid_from, expired_at: voucher.expired_at, category: voucher.category,
        global_limit: voucher.global_limit, usage_limit: voucher.usage_limit 
      }).eq('id', voucher.id); 
      alert("VOUCHER DISIMPAN!"); fetchVouchers(); 
    } catch (err: any) { alert(err.message); }
  };

  const getDerivedStatus = (v: any) => {
    const now = new Date();
    const from = v.valid_from ? new Date(v.valid_from) : null;
    const exp = v.expired_at ? new Date(v.expired_at) : null;
    now.setHours(0,0,0,0);
    if(from) from.setHours(0,0,0,0);
    if(exp) exp.setHours(0,0,0,0);
    if (!v.is_active) return "OFF"; 
    if (v.global_limit > 0 && (v.current_usage || 0) >= v.global_limit) return "SOLD_OUT";
    if (exp && now > exp) return "EXPIRED";
    if (from && now < from) return "PENDING";
    return "LIVE";
  };

  const filteredVouchers = useMemo(() => {
    if (activeVoucherFilter === "ALL") return vouchers;
    return vouchers.filter(v => {
      const s = getDerivedStatus(v);
      if (activeVoucherFilter === "ACTIVE") return s === "LIVE";
      if (activeVoucherFilter === "EXPIRED") return s === "EXPIRED" || s === "SOLD_OUT"; 
      if (activeVoucherFilter === "PENDING") return s === "PENDING" || s === "OFF"; 
      return true;
    });
  }, [vouchers, activeVoucherFilter]);

  const sortedEvents = useMemo(() => {
    const impactPriority: Record<string, number> = { Critical: 1, High: 2, Promo: 3, Medium: 4, Low: 5 };
    return [...events]
      .filter((e) => new Date(e.event_date) >= new Date(new Date().setHours(0, 0, 0, 0)))
      .sort((a, b) => (impactPriority[a.impact_level] || 99) - (impactPriority[b.impact_level] || 99));
  }, [events]);

  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();

  if (loading) return <div className="p-10 text-center uppercase font-black italic"><Loader2 className="animate-spin inline mr-2"/> SYNCING DATABASE...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-700 p-2 md:p-6 text-slate-800">
      
      <datalist id="categoryOptions">
        <option value="all">💎 SEMUA PRODUK</option>
        {availableBrands.map((brand, idx) => (
          <option key={idx} value={brand.name.toLowerCase()}>📦 {brand.name.toUpperCase()}</option>
        ))}
      </datalist>
      
      {/* HEADER */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl md:text-5xl font-black italic uppercase text-slate-900 tracking-tighter">Event Hub</h2>
        <p className="text-sm text-slate-400 font-bold italic">Manajemen Jadwal & Promo DanisPay.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-4">
          
          <div className="flex items-center justify-between bg-white p-4 rounded-[30px] border border-slate-100 shadow-sm">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-100 rounded-full active:scale-90"><ChevronLeft/></button>
            <div className="text-center">
              <span className="text-xl font-black uppercase italic text-slate-800 tracking-tighter">{viewDate.toLocaleString("id-ID", { month: "long", year: "numeric" })}</span>
            </div>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-100 rounded-full active:scale-90"><ChevronRight/></button>
          </div>

          <div className="bg-white rounded-[40px] md:rounded-[55px] p-6 md:p-12 border border-slate-100 shadow-2xl relative overflow-hidden">
            <div className="grid grid-cols-7 gap-2 md:gap-4 text-center">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d} className="text-[10px] font-black text-slate-300 uppercase pb-4 tracking-widest">{d}</div>)}
              {Array.from({ length: firstDayOfMonth }).map((_, pt) => <div key={`pad-${pt}`} className="h-16 md:h-28 opacity-0" />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isToday = day === today.getDate() && viewDate.getMonth() === today.getMonth();
                const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayEvents = events.filter(e => e.event_date === dateStr);

                return (
                  <div key={i} onClick={() => handleDateClick(day, dayEvents)}
                    className={`h-16 md:h-28 rounded-[20px] md:rounded-[35px] p-3 md:p-5 transition-all hover:scale-95 cursor-pointer border-2 relative flex flex-col justify-between 
                    ${isToday ? 'border-blue-500 bg-blue-50' : dayEvents.length > 0 ? 'border-slate-100 bg-slate-50' : 'border-slate-50 bg-slate-50/20'}`}>
                    <span className={`text-sm md:text-xl font-black ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>{day}</span>
                    <div className="flex flex-wrap gap-1">
                      {dayEvents.map((e, idx) => <div key={idx} className={`h-1.5 w-1.5 rounded-full ${e.impact_level === 'Critical' ? 'bg-rose-500' : 'bg-blue-500'}`} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={() => setShowBannerModal(true)} className="bg-slate-900 rounded-[40px] p-8 flex items-center justify-between group cursor-pointer transition-all hover:bg-slate-800 shadow-xl">
              <div className="text-left">
                <h4 className="text-xl font-black italic uppercase text-white">Banner Ads</h4>
                <p className="text-slate-500 text-[9px] font-black uppercase">9 Slots Manager</p>
              </div>
              <Upload className="text-white group-hover:rotate-12 transition-all" size={24}/>
            </button>
            <button onClick={() => setShowVoucherModal(true)} className="bg-purple-600 rounded-[40px] p-8 flex items-center justify-between group cursor-pointer transition-all hover:bg-purple-700 shadow-xl shadow-purple-200/50">
              <div className="text-left">
                <h4 className="text-xl font-black italic uppercase text-white">Promo Vouchers</h4>
                <p className="text-purple-300 text-[9px] font-black uppercase">{vouchers.length} Codes Active</p>
              </div>
              <Ticket className="text-white group-hover:scale-110 transition-all" size={24}/>
            </button>
          </div>
        </div>

        {/* SIDEBAR ALERTS */}
        <div className="lg:col-span-4 lg:sticky lg:top-6 space-y-6">
          <div className="bg-slate-900 rounded-[45px] p-8 text-white shadow-2xl relative overflow-hidden">
            <h4 className="font-black italic uppercase text-xs mb-8 flex items-center gap-3 tracking-[0.2em] text-blue-400"><AlertCircle size={20}/> Priority Alerts</h4>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {sortedEvents.map(event => (
                <div key={event.id} onClick={() => setSelectedAlert(event)} className="p-5 bg-white/5 border border-white/10 rounded-[30px] hover:bg-white/10 transition-all cursor-pointer group">
                  <span className="text-[10px] text-slate-500 font-black uppercase mb-2 block">{event.event_date}</span>
                  <p className="text-sm font-black uppercase italic tracking-tight group-hover:text-blue-400">{event.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ==========================
          MODALS AREA (SEMUA DI SINI)
      ========================== */}

      {/* MODAL 1: ADD MEMO */}
      {showInputModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[45px] p-8 shadow-2xl relative">
            <button onClick={() => setShowInputModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900"><X/></button>
            <h3 className="text-3xl font-black italic uppercase text-slate-900 mb-8 tracking-tighter">Add Memo</h3>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <input type="number" value={selectedDateInput} onChange={(e) => setSelectedDateInput(Number(e.target.value))} className="p-5 bg-slate-50 rounded-[25px] font-black outline-none border-2 border-transparent focus:border-blue-500" placeholder="Day" />
                <select value={newImpact} onChange={(e) => setNewImpact(e.target.value)} className="p-5 bg-slate-50 rounded-[25px] font-black outline-none border-2 border-transparent focus:border-blue-500">
                  <option value="Low">Low</option><option value="Medium">Medium</option><option value="Promo">Promo</option><option value="High">High</option><option value="Critical">Critical</option>
                </select>
              </div>
              <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full p-5 bg-slate-50 rounded-[25px] font-black outline-none border-2 border-transparent focus:border-blue-500" placeholder="Memo Title" />
              <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className="w-full p-5 bg-slate-50 rounded-[25px] font-bold h-32 outline-none border-2 border-transparent focus:border-blue-500" placeholder="Description..." />
              <button onClick={handleSaveEvent} className="w-full py-5 bg-slate-900 text-white rounded-[30px] font-black uppercase italic hover:bg-blue-600 transition-all">Save Memo</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DETAIL PER HARI */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-xl rounded-[45px] p-8 shadow-2xl relative">
            <button onClick={() => setShowDetailModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-900"><X/></button>
            <p className="text-xs text-blue-600 font-black uppercase mb-8 italic tracking-widest">{selectedDateLabel}</p>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {selectedDayEvents.map(event => (
                <div key={event.id} className="p-6 bg-slate-50 rounded-[35px] border-2 border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] px-3 py-1 bg-blue-600 text-white rounded-full font-black uppercase">{event.impact_level}</span>
                    <button onClick={async () => { if(confirm("Hapus?")) { await supabase.from('admin_events').delete().eq('id', event.id); fetchEvents(); setShowDetailModal(false); } }} className="text-slate-300 hover:text-rose-500"><Trash2 size={20}/></button>
                  </div>
                  <h4 className="text-xl font-black italic uppercase text-slate-900 mb-2">{event.title}</h4>
                  <p className="text-sm text-slate-500 font-medium">{event.description || "No detail provided."}</p>
                </div>
              ))}
              <button onClick={() => { setShowDetailModal(false); setShowInputModal(true); }} className="w-full py-4 border-2 border-dashed border-slate-200 text-slate-400 rounded-3xl font-black uppercase text-xs hover:border-blue-300 hover:text-blue-500 transition-all">+ Add more to this day</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: BANNER MANAGER */}
      {showBannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[50px] p-10 shadow-2xl relative flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-8 pb-4 border-b">
              <h3 className="text-3xl font-black italic uppercase text-slate-900 tracking-tighter">System Banners</h3>
              <button onClick={() => setShowBannerModal(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-all text-slate-500"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-y-auto pr-4 grid grid-cols-1 md:grid-cols-3 gap-6 custom-scrollbar">
              {bannerList.map((banner, index) => (
                <div key={index} className="bg-slate-50 border border-slate-100 rounded-[35px] overflow-hidden flex flex-col group hover:border-blue-500/30 transition-all">
                  <div className="relative h-44 bg-slate-200">
                    {banner.src ? <img src={banner.src} className="w-full h-full object-cover" alt={banner.alt} /> : <div className="w-full h-full flex items-center justify-center text-slate-300 font-black italic uppercase text-xs">Slot {index + 1} Empty</div>}
                  </div>
                  <div className="p-6 space-y-3">
                    <div className="flex items-center gap-2 mt-1">
  <div className={`h-1.5 w-1.5 rounded-full ${banner.href ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
  <span className="text-[8px] font-black uppercase text-slate-400">
    {banner.href ? "Link Active" : "No Navigation"}
  </span>
</div>
                    <button onClick={() => { setEditingBanner(banner); setPreviewImage(banner.src); }} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-blue-600 transition-colors">Configure Slot</button>
                  </div>
                </div>
              ))}
            </div>
{editingBanner && (
              <div className="absolute inset-0 bg-white/98 z-50 p-10 flex flex-col animate-in slide-in-from-right duration-300">
                <div className="flex justify-between items-center mb-10 pb-6 border-b">
                  <div>
                    <h4 className="text-3xl font-black italic uppercase text-slate-900 tracking-tighter">Slot Configuration</h4>
                    <p className="text-xs font-bold text-blue-600 uppercase">Updating "{editingBanner.alt || 'New Slot'}"</p>
                  </div>
                  <button onClick={() => { setEditingBanner(null); setPreviewImage(""); }} className="text-xs font-black text-rose-500 uppercase tracking-widest underline hover:text-rose-700">
                    Cancel Editor
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 overflow-y-auto pr-4 pb-10 custom-scrollbar">
                  {/* PREVIEW IMAGE */}
                  <div className="space-y-6">
                    <div className="relative aspect-video rounded-[40px] overflow-hidden border-4 border-slate-100 bg-slate-50 group shadow-lg cursor-pointer">
                      {previewImage || editingBanner.src ? (
                        <img src={previewImage || editingBanner.src} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 italic font-black text-xs uppercase">Click to Upload Image</div>
                      )}
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                  </div>

{/* FORM INPUT LENGKAP */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* TITLE */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Banner Title (alt)</label>
                      <input type="text" value={editingBanner.alt || ""} onChange={(e) => setEditingBanner({ ...editingBanner, alt: e.target.value })} className="w-full p-5 bg-slate-50 rounded-[25px] font-black outline-none border-2 border-transparent focus:border-blue-500 transition-all text-sm" placeholder="Contoh: Promo MLBB" />
                    </div>

                    {/* TAG PROMO (YANG SEMPAT HILANG) */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Tag Promo (Teks Kecil)</label>
                      <input type="text" value={editingBanner.promo || ""} onChange={(e) => setEditingBanner({ ...editingBanner, promo: e.target.value })} className="w-full p-5 bg-slate-50 rounded-[25px] font-black outline-none border-2 border-transparent focus:border-blue-500 transition-all text-sm" placeholder="Contoh: Diskon 20%" />
                    </div>

                    {/* CATEGORY (YANG SEMPAT HILANG) */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Category</label>
                      <select value={editingBanner.category || "game"} onChange={(e) => setEditingBanner({ ...editingBanner, category: e.target.value })} className="w-full p-5 bg-slate-50 rounded-[25px] font-black outline-none border-2 border-transparent focus:border-blue-500 transition-all text-sm appearance-none">
                        <option value="game">Game</option>
                        <option value="ppob">PPOB</option>
                        <option value="entertainment">Entertainment</option>
                        <option value="affiliate">Affiliate</option>
                      </select>
                    </div>

                    {/* PROMO CODE */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4 flex items-center gap-2"><Ticket size={12} /> Promo Code</label>
                      <input type="text" value={editingBanner.promo_code || ""} onChange={(e) => setEditingBanner({ ...editingBanner, promo_code: e.target.value })} className="w-full p-5 bg-blue-50 text-blue-700 rounded-[25px] font-black outline-none border-2 border-blue-200 text-sm" placeholder="KODEPROMO" />
                    </div>

                    {/* CASHBACK */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4 flex items-center gap-2"><Banknote size={12} /> Cashback</label>
                      <input type="text" value={editingBanner.cashback || ""} onChange={(e) => setEditingBanner({ ...editingBanner, cashback: e.target.value })} className="w-full p-5 bg-emerald-50 text-emerald-700 rounded-[25px] font-black outline-none border-2 border-emerald-200 text-sm" placeholder="5%" />
                    </div>

                    {/* HREF */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Navigation Link (Href)</label>
                      <input type="text" value={editingBanner.href || ""} onChange={(e) => setEditingBanner({ ...editingBanner, href: e.target.value })} className="w-full p-5 bg-slate-50 rounded-[25px] font-black outline-none border-2 border-transparent focus:border-blue-500 transition-all text-sm" placeholder="/promotions/..." />
                    </div>

                    {/* DESCRIPTION */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-4">Full Description</label>
                      <textarea value={editingBanner.description || ""} onChange={(e) => setEditingBanner({ ...editingBanner, description: e.target.value })} className="w-full p-5 bg-slate-50 rounded-[25px] font-bold h-32 outline-none border-2 border-transparent focus:border-blue-500 transition-all text-sm resize-none" placeholder="Tulis detail lengkap promo di sini..." />
                    </div>

                    {/* TOMBOL SAKLAR AKTIF/NON-AKTIF */}
                    <div className="md:col-span-2 flex items-center justify-between bg-slate-50 p-5 rounded-[25px] border-2 border-slate-100 mb-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-slate-400">Banner Visibility</span>
                        <span className="text-sm font-black italic uppercase">
                        {editingBanner.is_active ? '🟢 Link Aktif' : '🟡 Link Mati (Hanya Tampilan)'}
                      </span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setEditingBanner({ ...editingBanner, is_active: !editingBanner.is_active })}
                        className={`px-8 py-3 rounded-2xl text-[10px] font-black transition-all ${editingBanner.is_active ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-rose-500 text-white shadow-lg shadow-rose-200'}`}
                      >
                        {editingBanner.is_active ? 'MATIKAN SEKARANG' : 'AKTIFKAN KEMBALI'}
                      </button>
                    </div>

                    <button onClick={handleSaveBanner} disabled={uploading} className="md:col-span-2 py-6 bg-slate-900 text-white rounded-[30px] font-black italic uppercase tracking-[0.2em] shadow-xl hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 mt-4">
                      {uploading ? "Uploading Image..." : "Save Configuration"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 5: VOUCHER CONSOLE */}
      {showVoucherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[50px] p-10 shadow-2xl relative flex flex-col overflow-hidden">
            <button onClick={() => setShowVoucherModal(false)} className="absolute top-8 right-8 p-2 bg-rose-100 text-rose-600 rounded-full hover:bg-rose-200 transition-all z-50">
              <X size={24} />
            </button>
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 border-b pb-8 gap-4">
              <h4 className="text-3xl font-black italic uppercase text-slate-900 tracking-tighter">Voucher Console</h4>
              <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl border">
                {["ALL", "ACTIVE", "PENDING", "EXPIRED"].map((tab) => (
                  <button key={tab} onClick={() => setActiveVoucherFilter(tab)} className={`px-6 py-2 rounded-xl text-[9px] font-black transition-all ${activeVoucherFilter === tab ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-white"}`}>{tab}</button>
                ))}
              </div>
              <button onClick={() => { const code = prompt("KODE VOUCHER BARU:"); if(code) supabase.from('promos').insert([{ code: code.toUpperCase(), is_active: true, global_limit: 100, usage_limit: 1 }]).then(() => fetchVouchers()) }} className="bg-slate-900 text-white text-[10px] px-8 py-3.5 rounded-full hover:bg-purple-600 font-black shadow-lg flex items-center gap-2 active:scale-95 transition-all"><Plus size={14} /> TAMBAH</button>
            </div>
<div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
              {filteredVouchers.map((v) => {
                const s = getDerivedStatus(v);
                
                // LOGIK WARNA DYNAMIC
                let cardStyle = "bg-slate-50 border-slate-100";
                let badge = null;
                
                if (s === "LIVE") { 
                  cardStyle = "bg-emerald-50 border-emerald-200 shadow-lg shadow-emerald-100/50"; 
                  badge = <div className="absolute top-0 left-0 bg-emerald-500 text-white text-[9px] px-4 py-1.5 rounded-br-2xl rounded-tl-[35px] font-black z-10 animate-in fade-in italic uppercase tracking-tighter"><CheckCircle2 size={10} className="inline mr-1"/> LIVE</div>; 
                }
                else if (s === "EXPIRED") { 
                  cardStyle = "bg-rose-50 border-rose-200 opacity-80"; 
                  badge = <div className="absolute top-0 left-0 bg-rose-500 text-white text-[9px] px-4 py-1.5 rounded-br-2xl rounded-tl-[35px] font-black z-10 italic uppercase tracking-tighter"><AlertCircle size={10} className="inline mr-1"/> KADALUARSA</div>; 
                }
                else if (s === "PENDING") { 
                  cardStyle = "bg-amber-50 border-amber-200"; 
                  badge = <div className="absolute top-0 left-0 bg-amber-500 text-white text-[9px] px-4 py-1.5 rounded-br-2xl rounded-tl-[35px] font-black z-10 italic uppercase tracking-tighter"><Clock size={10} className="inline mr-1"/> PENDING</div>; 
                }
                else if (s === "SOLD_OUT") { 
                  cardStyle = "bg-slate-100 border-slate-300 grayscale"; 
                  badge = <div className="absolute top-0 left-0 bg-slate-600 text-white text-[9px] px-4 py-1.5 rounded-br-2xl rounded-tl-[35px] font-black z-10 italic uppercase tracking-tighter"><Ban size={10} className="inline mr-1"/> HABIS</div>; 
                }

                return (
                  <div key={v.id} className={`p-8 rounded-[40px] border relative transition-all group ${cardStyle}`}>
                    {badge}
                    <button onClick={() => { if(confirm("Hapus?")) supabase.from('promos').delete().eq('id', v.id).then(() => fetchVouchers()) }} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 active:scale-90 transition-all">
                      <Trash2 size={18} />
                    </button>
                    
                    <div className="flex flex-col lg:flex-row gap-8 mt-4 items-end">
                      <div className="w-full lg:w-1/3 space-y-4">
                        <div>
                          <label className="text-[8px] font-black uppercase text-slate-400 ml-2">KODE VOUCHER</label>
                          <input type="text" className="w-full bg-white border border-slate-100 p-4 rounded-2xl font-black uppercase shadow-sm focus:border-purple-500 outline-none transition-all" value={v.code} onChange={(e) => { const n = [...vouchers]; n[vouchers.findIndex(x => x.id === v.id)].code = e.target.value.toUpperCase(); setVouchers(n); }} />
                        </div>
                        <div>
                          <label className="text-[8px] font-black uppercase text-slate-400 ml-2">TARGET BRAND</label>
                          <div className="relative">
                            <input list="categoryOptions" className="w-full bg-white border border-slate-100 p-4 rounded-2xl font-black uppercase shadow-sm outline-none" value={v.category} placeholder="Semua Brand..." onChange={(e) => { const n = [...vouchers]; n[vouchers.findIndex(x => x.id === v.id)].category = e.target.value.toLowerCase(); setVouchers(n); }} />
                            <Layers size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300"/>
                          </div>
                        </div>
                      </div>

                      <div className="w-full lg:w-2/3 space-y-4">
                        <div>
                          <label className="text-[8px] font-black uppercase text-slate-400 ml-2">NOMINAL DISKON (RP)</label>
                          <input type="number" className="w-full bg-white border border-slate-100 p-4 rounded-2xl font-black outline-none focus:border-purple-500 transition-all" value={v.discount_amount} onChange={(e) => { const n = [...vouchers]; n[vouchers.findIndex(x => x.id === v.id)].discount_amount = Number(e.target.value); setVouchers(n); }} />
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                          <div><label className="text-[7px] font-black uppercase text-emerald-600">Kuota</label><input type="number" className="w-full p-3 bg-emerald-50 border-emerald-100 rounded-xl font-black text-xs text-emerald-700" value={v.global_limit} onChange={(e) => { const n = [...vouchers]; n[vouchers.findIndex(x => x.id === v.id)].global_limit = Number(e.target.value); setVouchers(n); }} /></div>
                          <div><label className="text-[7px] font-black uppercase text-blue-600">Limit/U</label><input type="number" className="w-full p-3 bg-blue-50 border-blue-100 rounded-xl font-black text-xs text-blue-700" value={v.usage_limit} onChange={(e) => { const n = [...vouchers]; n[vouchers.findIndex(x => x.id === v.id)].usage_limit = Number(e.target.value); setVouchers(n); }} /></div>
                          <div><label className="text-[7px] font-black uppercase text-slate-400">Mulai</label><input type="date" className="w-full p-3 bg-white border border-slate-100 rounded-xl font-black text-[9px]" value={v.valid_from || ""} onChange={(e) => { const n = [...vouchers]; n[vouchers.findIndex(x => x.id === v.id)].valid_from = e.target.value; setVouchers(n); }} /></div>
                          <div><label className="text-[7px] font-black uppercase text-slate-400">Selesai</label><input type="date" className="w-full p-3 bg-white border border-slate-100 rounded-xl font-black text-[9px]" value={v.expired_at || ""} onChange={(e) => { const n = [...vouchers]; n[vouchers.findIndex(x => x.id === v.id)].expired_at = e.target.value; setVouchers(n); }} /></div>
                        </div>
                      </div>

                      <div className="flex flex-row lg:flex-col gap-2 min-w-25">
                        <button onClick={() => { const n = [...vouchers]; n[vouchers.findIndex(x => x.id === v.id)].is_active = !v.is_active; setVouchers(n); }} className={`grow py-4 rounded-2xl text-[9px] font-black uppercase transition-all shadow-md active:scale-95 ${v.is_active ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-slate-200 text-slate-400'}`}>{v.is_active ? 'ON' : 'OFF'}</button>
                        <button onClick={() => handleUpdateVoucher(v)} className="grow bg-slate-900 text-white py-4 rounded-2xl shadow-lg hover:bg-blue-600 transition-all flex items-center justify-center active:scale-95"><Save size={18}/></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRIORITY ALERTS */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" onClick={() => setSelectedAlert(null)}/>
          <div className="relative w-full max-w-md bg-[#0F172A] border border-slate-700 rounded-[40px] shadow-2xl p-8 text-center text-white animate-in zoom-in-95 duration-300">
            <AlertCircle size={40} className="mx-auto mb-4 text-blue-500"/>
            <h3 className="text-2xl font-black italic uppercase mb-4">{selectedAlert.title}</h3>
            <p className="text-slate-400 text-sm mb-6">{selectedAlert.description || "No detail provided."}</p>
            <button onClick={() => setSelectedAlert(null)} className="w-full py-4 bg-white text-slate-900 rounded-[25px] font-black uppercase italic">Tutup</button>
          </div>
        </div>
      )}

      {/* Global Style Animation */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>

    </div>
  );
}