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
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 font-black italic uppercase text-slate-800">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h2 className="text-3xl tracking-tighter flex items-center gap-3">
            <span className="bg-slate-900 text-white p-2 rounded-lg"><LayoutGrid size={24} /></span>
            KATEGORI MANAGER
          </h2>
          <p className="text-xs text-slate-400 normal-case font-medium italic mt-1 ml-12">
            Database Live Mode: Connected to Supabase
          </p>
        </div>
        
        <div className="relative w-full md:w-64">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
           <input 
            type="text" 
            placeholder="CARI KATEGORI..." 
            className="w-full bg-white border border-slate-200 pl-10 pr-4 py-3 rounded-2xl outline-none focus:border-blue-500 text-[10px] tracking-widest font-black transition-all shadow-sm focus:shadow-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* FORM INPUT */}
        <div className="lg:col-span-4 h-fit">
          <div className="bg-white p-8 rounded-[40px] shadow-lg shadow-slate-200/50 border border-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            
            <h4 className="relative z-10 text-slate-800 text-sm mb-6 tracking-widest flex items-center gap-2">
              <Plus size={16} className="text-emerald-600"/> BUAT DATABASE BARU
            </h4>
            
            <div className="relative z-10 space-y-4">
              <div>
                <label className="text-[9px] text-slate-400 ml-2 mb-1 block tracking-widest">NAMA LABEL</label>
                <input 
                  type="text" 
                  placeholder="CONTOH: VOUCHER..." 
                  className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500 text-xs italic font-black transition-all"
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  disabled={submitting}
                />
              </div>
              
              <button 
                onClick={handleAdd}
                disabled={submitting}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl hover:bg-emerald-600 active:scale-95 transition-all flex items-center justify-center gap-2 text-xs shadow-xl shadow-slate-300 hover:shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? <RefreshCw className="animate-spin" size={14}/> : <Tag size={14} />} 
                {submitting ? "MENYIMPAN..." : "SIMPAN KE DATABASE"}
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-50">
                <p className="text-[9px] text-slate-400 normal-case leading-relaxed flex gap-2">
                    <AlertCircle size={12} className="shrink-0 text-amber-500"/>
                    <span>System akan otomatis membuat <b>slug</b> (url-friendly) dari nama kategori yang anda input.</span>
                </p>
            </div>
          </div>
        </div>

        {/* LIST TABLE */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden min-h-100">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
              <span className="text-[10px] text-slate-500 tracking-[0.2em] font-bold">PUBLIC.CATEGORIES ({categories.length})</span>
              <button onClick={fetchCategories} className="text-[9px] text-blue-600 hover:underline cursor-pointer flex items-center gap-1">
                <RefreshCw size={10} className={loading ? "animate-spin" : ""}/> REFRESH DB
              </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                <thead className="bg-white text-[9px] text-slate-400 tracking-widest">
                    <tr>
                    <th className="px-8 py-6 pl-10">NAMA & SLUG</th>
                    <th className="px-8 py-6 text-right pr-10">ACTION</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {loading ? (
                    <tr><td colSpan={2} className="p-10 text-center text-xs text-slate-300 animate-pulse">MENGHUBUNGKAN KE SUPABASE...</td></tr>
                    ) : filteredCategories.length > 0 ? (
                        filteredCategories.map((cat, i) => (
                        <tr key={cat.id} className="hover:bg-blue-50/30 transition-colors group cursor-default">
                            <td className="px-8 py-5 pl-10">
                            <div className="flex items-center gap-4">
                                <span className="text-slate-300 text-[9px] w-4">#{i+1}</span>
                                <div className="flex flex-col">
                                  <span className="bg-slate-100 w-fit text-slate-700 px-3 py-1 mb-1 rounded-lg text-[10px] font-black tracking-wide border border-slate-200 group-hover:bg-white group-hover:border-blue-200 group-hover:text-blue-600 transition-all shadow-sm">
                                  {cat.name}
                                  </span>
                                  <span className="text-[9px] text-slate-400 lowercase font-medium italic">Slug: {cat.slug}</span>
                                </div>
                            </div>
                            </td>
                            <td className="px-8 py-5 text-right pr-10">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-300">
                                <button onClick={() => handleEdit(cat.id, cat.name)} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-xl transition-all" title="Edit Nama"><Edit3 size={14}/></button>
                                <button onClick={() => handleDelete(cat.id, cat.name)} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-xl transition-all" title="Hapus Permanen"><Trash2 size={14}/></button>
                            </div>
                            </td>
                        </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={2} className="py-20 text-center">
                                <p className="text-slate-300 text-xs">DATABASE KOSONG / TIDAK DITEMUKAN</p>
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