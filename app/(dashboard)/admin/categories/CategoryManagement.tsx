"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import { LayoutGrid, Plus, Trash2, Edit3, Search, Tag, AlertCircle, RefreshCw } from "lucide-react";

export default function CategoryManagement() {
  const [categories, setCategories] = useState<any[]>([]);
  const [newCat, setNewCat] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // 1. FETCH DATA (READ) - Langsung dari tabel 'categories'
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true }); // Urutkan A-Z
      
      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
      console.error("Error fetching categories:", err.message);
      alert("Gagal mengambil data kategori: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // 2. ADD DATA (CREATE)
  const handleAdd = async () => {
    if (!newCat.trim()) return alert("NAMA KATEGORI TIDAK BOLEH KOSONG");
    setSubmitting(true);

    // Bikin slug otomatis (contoh: "Game Mobile" -> "game-mobile")
    const slug = newCat.toLowerCase().trim().replace(/\s+/g, '-');

    try {
      const { error } = await supabase
        .from('categories')
        .insert([{ name: newCat, slug }]);

      if (error) throw error;

      alert(`SUKSES! Kategori "${newCat}" berhasil ditambahkan.`);
      setNewCat(""); // Reset input
      fetchCategories(); // Refresh tabel
    } catch (err: any) {
      console.error("Error adding:", err.message);
      alert("Gagal menambah kategori (Mungkin nama sudah ada?): " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 3. DELETE DATA
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus kategori "${name}" secara permanen?`)) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchCategories(); // Refresh list setelah hapus
    } catch (err: any) {
      alert("Gagal menghapus: " + err.message);
    }
  };

  // 4. UPDATE DATA (Simple Edit via Prompt)
  const handleEdit = async (id: string, oldName: string) => {
    const newName = prompt("Ubah nama kategori:", oldName);
    if (!newName || newName === oldName) return;

    const newSlug = newName.toLowerCase().trim().replace(/\s+/g, '-');

    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: newName, slug: newSlug })
        .eq('id', id);

      if (error) throw error;
      fetchCategories();
    } catch (err: any) {
      alert("Gagal update: " + err.message);
    }
  };

  // Filter pencarian di client-side
  const filteredCategories = categories.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans text-slate-900">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3 text-slate-900">
            <span className="bg-slate-900 text-white p-2 rounded-xl shadow-sm"><LayoutGrid size={22} /></span>
            Kategori Manager
          </h2>
          <p className="text-xs text-slate-400 font-normal mt-1 ml-11">
            Database Live Mode: Terhubung ke Supabase
          </p>
        </div>
        
        <div className="relative w-full md:w-64">
           <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
           <input
            type="text"
            placeholder="Cari kategori..."
            className="w-full bg-white border border-slate-200 pl-9 pr-4 py-2.5 rounded-xl outline-none focus:border-blue-500 text-xs font-medium text-slate-800 placeholder:text-slate-400 transition-all shadow-2xs focus:shadow-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        
        {/* FORM INPUT */}
        <div className="lg:col-span-4 h-fit">
          <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-xs border border-slate-200/80 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/70 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            
            <h4 className="relative z-10 text-slate-900 text-xs sm:text-sm font-bold tracking-tight flex items-center gap-2 mb-5">
              <Plus size={16} className="text-emerald-600"/> Tambah Kategori Baru
            </h4>
            
            <div className="relative z-10 space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 ml-1 mb-1.5 block">Nama Kategori</label>
                <input
                  type="text"
                  placeholder="Contoh: Voucher Game, Pulsa..."
                  className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 text-xs font-medium text-slate-800 placeholder:text-slate-400 transition-all"
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  disabled={submitting}
                />
              </div>
              
              <button 
                onClick={handleAdd}
                disabled={submitting}
                className="w-full py-3 bg-slate-900 text-white rounded-xl hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center gap-2 text-xs font-bold shadow-sm hover:shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? <RefreshCw className="animate-spin" size={14}/> : <Tag size={14} />} 
                {submitting ? "Menyimpan..." : "Simpan Kategori"}
              </button>
            </div>

            <div className="mt-5 pt-5 border-t border-slate-100">
                <p className="text-[11px] text-slate-500 leading-relaxed flex gap-2">
                    <AlertCircle size={14} className="shrink-0 text-amber-500 mt-0.5"/>
                    <span>Sistem akan otomatis membuat <b>slug</b> (URL-friendly) dari nama kategori yang Anda input.</span>
                </p>
            </div>
          </div>
        </div>

        {/* LIST TABLE */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-3xl shadow-xs border border-slate-200/80 overflow-hidden min-h-100">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-bold uppercase tracking-wider">public.categories ({categories.length})</span>
              <button onClick={fetchCategories} className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer flex items-center gap-1.5">
                <RefreshCw size={11} className={loading ? "animate-spin" : ""}/> Refresh DB
              </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                    <th className="px-6 py-3 pl-8">Nama & Slug</th>
                    <th className="px-6 py-3 text-right pr-8">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {loading ? (
                    <tr><td colSpan={2} className="p-10 text-center text-xs text-slate-400 font-medium animate-pulse">Menghubungkan ke database Supabase...</td></tr>
                    ) : filteredCategories.length > 0 ? (
                        filteredCategories.map((cat, i) => (
                        <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors group cursor-default">
                            <td className="px-6 py-4 pl-8">
                            <div className="flex items-center gap-3">
                                <span className="text-slate-400 font-mono text-[10px] w-5">#{i+1}</span>
                                <div className="flex flex-col">
                                  <span className="bg-slate-100 w-fit text-slate-800 px-2.5 py-0.5 mb-1 rounded-lg text-xs font-bold tracking-normal border border-slate-200 group-hover:bg-white group-hover:border-blue-200 group-hover:text-blue-600 transition-all shadow-2xs">
                                  {cat.name}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono font-medium">slug: {cat.slug}</span>
                                </div>
                            </div>
                            </td>
                            <td className="px-6 py-4 text-right pr-8">
                            <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <button onClick={() => handleEdit(cat.id, cat.name)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer" title="Edit Nama"><Edit3 size={14}/></button>
                                <button onClick={() => handleDelete(cat.id, cat.name)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer" title="Hapus Permanen"><Trash2 size={14}/></button>
                            </div>
                            </td>
                        </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={2} className="py-20 text-center">
                                <p className="text-slate-400 text-xs font-medium">Kategori tidak ditemukan</p>
                            </td>
                        </tr>
                    )}
                </tbody>
                </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}