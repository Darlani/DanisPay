"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import { Users, Search, Shield, Wallet, Trash2, Crown, Star, User, Loader2, Edit3, Briefcase, Award } from "lucide-react";

export default function TeamManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // 1. FETCH DATA & SORTING HIERARKI
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;

      // Logika Sorting Berdasarkan Bobot Jabatan
      const sortedData = (data || []).sort((a, b) => {
        const getPriority = (user: any) => {
          if (user.role === 'owner') return 1; // Direktur
          if (user.role === 'manager') return 2; // Manager
          if (user.role === 'admin') return 3; // Admin
          if (user.member_type?.toLowerCase() === 'special') return 4; // Member Special
          return 5; // Member Regular
        };
        return getPriority(a) - getPriority(b);
      });

      setUsers(sortedData);
    } catch (err: any) { console.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  // Helper untuk Label Jabatan & Role
  const getIdentity = (user: any) => {
    if (user.role === 'owner') return { jabatan: "DIREKTUR", role: "OWNER", icon: <Crown size={14} className="text-amber-400"/> };
    if (user.role === 'manager') return { jabatan: "MANAGER", role: "MANAGER", icon: <Briefcase size={14} className="text-blue-500"/> };
    if (user.role === 'admin') return { jabatan: "ADMIN", role: "ADMIN", icon: <Shield size={14} className="text-blue-400"/> };
    if (user.member_type?.toLowerCase() === 'special') return { jabatan: "MEMBER", role: "MEMBER SPECIAL", icon: <Award size={14} className="text-amber-500"/> };
    return { jabatan: "MEMBER", role: "MEMBER REGULAR", icon: <User size={14} className="text-slate-400"/> };
  };

  // --- FUNGSI EFEK VISUAL GAHAR ---
  const getRowStyles = (identity: any) => {
    if (identity.role === 'OWNER') {
      // Efek Direktur: Gelap, Aksen Emas, Melayang dikit, Shadow Gede
      return "bg-slate-900 text-white border-amber-500/50 shadow-2xl shadow-amber-900/30 scale-[1.01] z-10 relative hover:border-amber-400 transition-all duration-500";
    }
    if (['MANAGER', 'ADMIN'].includes(identity.role)) {
      // Efek Staff: Biru Profesional, Sedikit terangkat pas di-hover
      return "bg-blue-50/80 border-blue-200 text-slate-800 hover:-translate-y-0.5 hover:shadow-md hover:shadow-blue-100 transition-all duration-300";
    }
    if (identity.role === 'MEMBER SPECIAL') {
      // Efek Special: Amber Premium, Sedikit terangkat pas di-hover
      return "bg-amber-50/80 border-amber-300 text-slate-800 hover:-translate-y-0.5 hover:shadow-md hover:shadow-amber-100 transition-all duration-300";
    }
    // Efek Regular: Bersih, Hover abu-abu tipis
    return "bg-white border-transparent text-slate-600 hover:bg-slate-50 transition-all duration-300";
  };

  const handleEditBalance = async (id: string, currentBalance: number, name: string) => {
    const input = prompt(`MASUKKAN SALDO BARU UNTUK ${name}:`, (currentBalance || 0).toString());
    if (input === null) return;
    const newBalance = parseInt(input);
    if (isNaN(newBalance)) return alert("INPUT HARUS ANGKA!");
    try {
      await supabase.from('profiles').update({ balance: newBalance }).eq('id', id);
      fetchUsers();
    } catch (err: any) { alert(err.message); }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in fade-in duration-700 font-black italic uppercase text-slate-800 pb-20 px-4 max-w-350 mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 mt-4">
        <div>
          <h2 className="text-3xl tracking-tighter flex items-center gap-3">
            <span className="bg-slate-900 text-white p-2 rounded-lg"><Users size={24} /></span>
            TEAM DATABASE
          </h2>
          <p className="text-[10px] text-slate-400 font-bold italic mt-1 ml-12 tracking-widest uppercase">
            MANAJEMEN HIERARKI PUSAT DANISPAY.
          </p>
        </div>
        <div className="relative w-full md:w-80">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
           <input type="text" placeholder="CARI USER..." className="w-full bg-white border border-slate-100 pl-10 pr-4 py-3.5 rounded-2xl outline-none focus:border-blue-500 text-[10px] font-black shadow-2xl shadow-slate-200/40"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* STATS - DENGAN WARNA YG LEBIH MENGGELEGARA */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-[35px] border border-slate-50 shadow-sm">
            <p className="text-[8px] text-slate-400 tracking-widest mb-1">TOTAL USER</p>
            <h4 className="text-2xl font-black">{users.length}</h4>
        </div>
        <div className="bg-linear-to-br from-blue-50 to-blue-100/50 p-6 rounded-[35px] border border-blue-200 shadow-sm text-blue-700">
            <p className="text-[8px] tracking-widest mb-1">TEAM STAFF</p>
            <h4 className="text-2xl font-black">{users.filter(u => ['owner', 'manager', 'admin'].includes(u.role)).length}</h4>
        </div>
        <div className="bg-linear-to-br from-amber-50 to-amber-100/50 p-6 rounded-[35px] border-2 border-amber-300 shadow-xl shadow-amber-100/50 text-amber-700">
            <p className="text-[8px] tracking-widest mb-1">MEMBER SPESIAL</p>
            <h4 className="text-2xl font-black">{users.filter(u => u.member_type?.toLowerCase() === 'special').length}</h4>
        </div>
        <div className="bg-white p-6 rounded-[35px] border border-slate-50 shadow-sm text-slate-500">
            <p className="text-[8px] tracking-widest mb-1">MEMBER REGULAR</p>
            <h4 className="text-2xl font-black">{users.filter(u => u.role !== 'admin' && u.role !== 'owner' && u.role !== 'manager' && u.member_type?.toLowerCase() !== 'special').length}</h4>
        </div>
      </div>

      {/* TABLE EXCEL STYLE - DENGAN EFEK BARIS */}
      <div className="bg-white rounded-[40px] shadow-2xl shadow-slate-200/30 border border-slate-100 overflow-hidden min-h-125 p-2">
        <div className="overflow-x-auto rounded-[35px]">
            <table className="w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-900 text-white text-[8px] tracking-[0.2em] uppercase italic border-b border-slate-800">
                    <th className="px-6 py-5 border-r border-slate-700">USERNAME</th>
                    <th className="px-6 py-5 border-r border-slate-700">EMAIL</th>
                    <th className="px-6 py-5 border-r border-slate-700 text-center">JABATAN</th>
                    <th className="px-6 py-5 border-r border-slate-700 text-center">ROLE</th>
                    <th className="px-6 py-5 border-r border-slate-700 text-center">SALDO</th>
                    <th className="px-6 py-5 text-center">ACTION</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
                {loading ? (
                    <tr><td colSpan={6} className="p-20 text-center text-[10px] animate-pulse">SYNCHRONIZING HIERARCHY...</td></tr>
                ) : filteredUsers.map((user) => {
                    const identity = getIdentity(user);
                    // Terapkan style baris berdasarkan identitas
                    const rowStyle = getRowStyles(identity);
                    // Warna border pemisah kolom menyesuaikan background
                    const borderColor = identity.role === 'OWNER' ? 'border-slate-700' : 'border-slate-100';

                    return (
                        <tr key={user.id} className={`text-[10px] border-l-4 ${rowStyle}`}>
                            <td className={`px-6 py-4 border-r ${borderColor} font-black`}>
                                <div className="flex items-center gap-3">
                                    {identity.icon}
                                    {user.full_name || "GUEST"}
                                </div>
                            </td>
                            <td className={`px-6 py-4 border-r ${borderColor} lowercase italic ${identity.role === 'OWNER' ? 'text-slate-300' : 'text-slate-400'}`}>{user.email}</td>
                            <td className={`px-6 py-4 border-r ${borderColor} text-center font-black`}>
                                <span className={`px-3 py-1 rounded-lg text-[8px] tracking-widest ${identity.role === 'OWNER' ? 'bg-amber-500 text-slate-900' : identity.role === 'MEMBER SPECIAL' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {identity.jabatan}
                                </span>
                            </td>
                            <td className={`px-6 py-4 border-r ${borderColor} text-center`}>
                                <span className={`font-black ${identity.role === 'MEMBER SPECIAL' ? 'text-amber-600' : identity.role === 'OWNER' ? 'text-amber-300' : identity.role === 'MEMBER REGULAR' ? 'text-slate-400' : 'text-blue-600'}`}>
                                    {identity.role}
                                </span>
                            </td>
                            <td className={`px-6 py-4 border-r ${borderColor} text-center`}>
                                <button onClick={() => handleEditBalance(user.id, user.balance, user.full_name)} className="flex items-center justify-center gap-1 w-full hover:scale-105 transition-transform">
                                    <span className="text-emerald-500 font-black">Rp {(user.balance || 0).toLocaleString()}</span>
                                </button>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <div className="flex justify-center gap-2">
                                    <button className={`p-2 transition-colors ${identity.role === 'OWNER' ? 'text-slate-400 hover:text-white' : 'text-slate-300 hover:text-blue-600'}`}><Edit3 size={14}/></button>
                                    <button className={`p-2 transition-colors ${identity.role === 'OWNER' ? 'text-slate-400 hover:text-rose-400' : 'text-slate-300 hover:text-rose-500'}`}><Trash2 size={14}/></button>
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