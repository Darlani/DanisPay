"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import { Landmark, Loader2, ArrowUpDown, ImagePlus, CheckCircle2, XCircle, Trash2, Plus } from "lucide-react";

export default function PaymentManagement() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  
  // State untuk Sorting
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payments');
      const data = await res.json();
      if (data && !data.error) setPayments(data);
    } catch (err) {
      console.error("Gagal mengambil data", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  // --- LOGIKA SORTING ---
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

const sortedPayments = [...payments].sort((a, b) => {
    // 1. PRIORITAS: Yang AKTIF (is_maintenance: false) selalu di atas [cite: 2026-02-11]
    if (a.is_maintenance !== b.is_maintenance) {
      return a.is_maintenance ? 1 : -1;
    }

    // 2. Sorting tambahan berdasarkan klik header tabel
    if (!sortConfig) return 0;
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // --- LOGIKA INLINE EDITING ---
  const handleLocalChange = (id: string, field: string, value: any) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

const handleSaveBlur = async (id: string, field: string, value: any) => {
    let finalValue = value;
    
    // Fitur Otomatis CAPITALIZE untuk Nama Bank [cite: 2026-02-11]
    if (field === 'name' && typeof value === 'string') {
      finalValue = value.toUpperCase();
      handleLocalChange(id, 'name', finalValue); // Update UI seketika
    }

    if ((field === 'start_hour' || field === 'end_hour' || field === 'min_price') && value === '') {
      finalValue = null;
    }
    
    await fetch('/api/admin/payments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, [field]: finalValue })
    });
  };

// --- LOGIKA TOGGLE (INSTANT SAVE) ---
  const handleToggle = async (id: string, field: string, currentValue: boolean) => {
    const newValue = !currentValue;
    handleLocalChange(id, field, newValue); 
    
    // UPDATE LEWAT BACKEND API (Arahkan ke rute MacroDroid)
    await fetch('/api/admin/payments', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, [field]: newValue })
    });
  };

// --- LOGIKA TAMBAH METODE BAYAR ---
  const handleAddPayment = async () => {
    setLoading(true);
    
    // Kita buat ID acak biar namanya selalu unik dan tidak nabrak aturan database
    const randomId = Math.floor(Math.random() * 1000);

    const newPayment = {
      name: `BANK BARU ${randomId}`,
      method_key: `bank_baru_${randomId}`,
      account_name: "-", // Isi default string kosong/strip agar Supabase tidak marah
      account_no: "-",
      logo_url: "",
      min_price: 0,
      is_maintenance: true,
      is_qr: false
    };
    
    try {
      // INSERT LEWAT BACKEND API
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPayment)
      });
      
      // Kita tangkap pesan error dari backend kalau masih gagal
      const data = await res.json();
      if (data.error) {
        console.error("Supabase Error:", data.error);
        alert("Gagal menambah bank: " + data.error);
      }
    } catch (err) {
      console.error("Network Error:", err);
    }
    
    await fetchPayments(); 
  };

  // --- LOGIKA HAPUS METODE BAYAR ---
  const handleDeletePayment = async (id: string, name: string) => {
    if (!window.confirm(`Yakin ingin menghapus metode pembayaran ${name}?`)) return;
    setPayments(prev => prev.filter(p => p.id !== id)); 
    
    // DELETE LEWAT BACKEND API
    await fetch(`/api/admin/payments?id=${id}`, {
      method: 'DELETE'
    });
  };

// --- LOGIKA UPLOAD LOGO ---
  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingId(id);
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${id}-${Math.random()}.${fileExt}`;
      const filePath = `payment-logos/${fileName}`;

      // 1. Upload file ke bucket 'Payment' (P Kapital!)
      const { error: errorStatus } = await supabase.storage
        .from('Payment')
        .upload(filePath, file);

      // Cek apakah ada error saat upload
      if (errorStatus) throw errorStatus;

      // 2. Ambil URL publik gambar yang baru diupload
      const { data } = supabase.storage
        .from('Payment')
        .getPublicUrl(filePath);
      
      const newPublicUrl = data.publicUrl;
      
      // 3. Update tampilan lokal dan simpan ke database
      handleLocalChange(id, 'logo_url', newPublicUrl);
      await handleSaveBlur(id, 'logo_url', newPublicUrl);

    } catch (error: any) {
      alert(`Gagal upload: ${error.message || 'Pastikan RLS Policy sudah di-set!'}`);
      console.error("Upload error details:", error);
    } finally {
      setUploadingId(null);
    }
  };

  if (loading) return <div className="flex justify-center items-center py-32"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="space-y-8 font-sans animate-in fade-in duration-500 pb-20">
      {/* HEADER */}
      <div className="flex items-center justify-between bg-white p-6 rounded-[30px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-blue-50 rounded-2xl text-blue-600">
            <Landmark size={28} />
          </div>
<div>
            <h2 className="text-2xl font-black italic uppercase text-slate-800 tracking-tight">Payment Routes</h2>
            <p className="text-xs text-slate-400 font-medium">Manajemen data pembayaran secara real-time (Auto-Save).</p>
          </div>
        </div>
        <button onClick={handleAddPayment} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95">
          <Plus size={16} /> Tambah Bank
        </button>
      </div>

      {/* TABEL PROFESIONAL INLINE-EDIT */}
      <div className="bg-white rounded-[35px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar pb-4">
          <table className="w-full min-w-300 text-left border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-100">
              <tr className="text-[10px] text-slate-500 font-black tracking-widest uppercase italic">
                <th className="px-5 py-4 cursor-pointer hover:text-blue-600" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-2">Metode / Bank <ArrowUpDown size={12}/></div>
                </th>
                <th className="px-5 py-4">Account Name</th>
                <th className="px-5 py-4">Account No</th>
                <th className="px-5 py-4 cursor-pointer hover:text-blue-600 text-center" onClick={() => handleSort('min_price')}>
                  <div className="flex items-center justify-center gap-2">Min Harga (Rp) <ArrowUpDown size={12}/></div>
                </th>
                <th className="px-5 py-4 text-center">Jam Opr (Start - End)</th>
                <th className="px-5 py-4 text-center cursor-pointer hover:text-blue-600" onClick={() => handleSort('is_qr')}>
                  <div className="flex items-center justify-center gap-2">Is QR? <ArrowUpDown size={12}/></div>
                </th>
                <th className="px-5 py-4 text-center cursor-pointer hover:text-blue-600" onClick={() => handleSort('is_maintenance')}>
                  <div className="flex items-center justify-center gap-2">Status <ArrowUpDown size={12}/></div>
                </th>
                <th className="px-5 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedPayments.map((pay) => (
                <tr key={pay.id} className={`hover:bg-slate-50/50 transition-colors group ${pay.is_maintenance ? 'bg-rose-50/20' : ''}`}>
                  
                  {/* LOGO & NAMA METODE */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-10 bg-white rounded-xl border border-slate-100 flex items-center justify-center shadow-sm overflow-hidden group/img cursor-pointer">
                        {uploadingId === pay.id ? (
                          <Loader2 className="animate-spin text-blue-500" size={16} />
                        ) : (
                          <>
                    <img 
                    // Pakai link otomatis agar tidak 404 lagi
                    src={pay.logo_url || `https://placehold.co/100x60/e2e8f0/64748b?text=${pay.name}`} 
                    alt={pay.name} 
                    className="max-w-full max-h-full object-contain p-1"
                    // Jika link dari database rusak, tampilkan kotak abu-abu rapi
                    onError={(e) => { e.currentTarget.src = `https://placehold.co/100x60/e2e8f0/64748b?text=${pay.name}`; }}
                    />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-all">
                              <ImagePlus size={16} className="text-white" />
                            </div>
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => handleUploadLogo(e, pay.id)}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              title="Upload Logo Baru"
                            />
                          </>
                        )}
                      </div>
                      <div className="flex-1 min-w-30">
                        <input
                          type="text"
                          value={pay.name || ''}
                          placeholder="Nama Bank..."
                          onChange={(e) => handleLocalChange(pay.id, 'name', e.target.value)}
                          onBlur={(e) => handleSaveBlur(pay.id, 'name', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 outline-none font-black text-slate-800 text-xs uppercase italic block pb-0.5 transition-all"
                          title="Klik untuk mengedit nama bank"
                        />
                        <span className="text-[9px] text-slate-400 tracking-widest uppercase block mt-0.5">{pay.method_key}</span>
                      </div>
                    </div>
                  </td>

                  {/* ACCOUNT NAME (INLINE EDIT) */}
                  <td className="px-5 py-3">
                    <input 
                      type="text" 
                      value={pay.account_name || ''}
                      placeholder="Nama Rekening..."
                      onChange={(e) => handleLocalChange(pay.id, 'account_name', e.target.value)}
                      onBlur={(e) => handleSaveBlur(pay.id, 'account_name', e.target.value)}
                      className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 outline-none text-xs font-bold text-slate-700 py-1 transition-all"
                    />
                  </td>

                  {/* ACCOUNT NO (INLINE EDIT) */}
                  <td className="px-5 py-3">
                    <input 
                      type="text" 
                      value={pay.account_no || ''}
                      placeholder="Nomor Rekening..."
                      onChange={(e) => handleLocalChange(pay.id, 'account_no', e.target.value)}
                      onBlur={(e) => handleSaveBlur(pay.id, 'account_no', e.target.value)}
                      className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-500 outline-none text-xs font-bold text-slate-700 py-1 transition-all"
                    />
                  </td>

                  {/* MIN HARGA (INLINE EDIT) */}
                  <td className="px-5 py-3">
                    <div className="flex justify-center">
                      <input 
                        type="number" 
                        value={pay.min_price || ''}
                        placeholder="0"
                        onChange={(e) => handleLocalChange(pay.id, 'min_price', e.target.value)}
                        onBlur={(e) => handleSaveBlur(pay.id, 'min_price', e.target.value)}
                        className="w-24 text-center bg-transparent border border-transparent hover:border-slate-200 hover:bg-white focus:bg-white focus:border-blue-500 outline-none rounded-lg text-xs font-bold text-slate-700 py-1.5 transition-all"
                      />
                    </div>
                  </td>

                  {/* JAM OPERASIONAL (INLINE EDIT) */}
                  <td className="px-5 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <input 
                        type="number" 
                        placeholder="00" 
                        value={pay.start_hour ?? ''} 
                        onChange={(e) => handleLocalChange(pay.id, 'start_hour', e.target.value)}
                        onBlur={(e) => handleSaveBlur(pay.id, 'start_hour', e.target.value)}
                        className="w-12 text-center bg-transparent border border-transparent hover:border-slate-200 hover:bg-white focus:border-blue-500 outline-none rounded-md text-xs font-bold py-1 transition-all" 
                      />
                      <span className="text-slate-300 font-bold">-</span>
                      <input 
                        type="number" 
                        placeholder="23" 
                        value={pay.end_hour ?? ''} 
                        onChange={(e) => handleLocalChange(pay.id, 'end_hour', e.target.value)}
                        onBlur={(e) => handleSaveBlur(pay.id, 'end_hour', e.target.value)}
                        className="w-12 text-center bg-transparent border border-transparent hover:border-slate-200 hover:bg-white focus:border-blue-500 outline-none rounded-md text-xs font-bold py-1 transition-all" 
                      />
                    </div>
                  </td>

                  {/* TOGGLE: IS QR */}
                  <td className="px-5 py-3 text-center">
                    <button 
                      onClick={() => handleToggle(pay.id, 'is_qr', pay.is_qr)}
                      className={`p-1.5 rounded-xl transition-all active:scale-90 ${pay.is_qr ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                      title={pay.is_qr ? "Metode QR Aktif" : "Bukan Metode QR"}
                    >
                      {pay.is_qr ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                    </button>
                  </td>

                  {/* TOGGLE: STATUS (ACTIVE / MAINTENANCE) */}
                  <td className="px-5 py-3 text-center">
                    <button 
                      onClick={() => handleToggle(pay.id, 'is_maintenance', pay.is_maintenance)}
                      className={`w-full py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border ${
                        pay.is_maintenance 
                        ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100' 
                        : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                      }`}
                    >
                      {pay.is_maintenance ? "Inactive" : "Active"}
                    </button>
                </td>

                  {/* TOMBOL HAPUS */}
                  <td className="px-5 py-3 text-center">
                    <button 
                      onClick={() => handleDeletePayment(pay.id, pay.name)}
                      className="p-2 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                      title="Hapus Metode Pembayaran"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}