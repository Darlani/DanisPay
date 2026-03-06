"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { 
  LayoutDashboard, TrendingUp, Grid, Package, 
  Users, Calendar, Globe, History as HistoryIcon, 
  Settings, ChevronLeft, Menu, LogOut, FileText, Wallet, CreditCard, Landmark
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  activeMenu: string;
  setActiveMenu: (val: string) => void; 
}

export default function SidebarAdmin({ isOpen, setIsOpen, activeMenu, setActiveMenu }: SidebarProps) {
  const [todayMemo, setTodayMemo] = useState("Tidak ada event khusus hari ini.");
  const [hasUrgentEvent, setHasUrgentEvent] = useState(false);
  const pathname = usePathname();

  const fetchTodayEvent = async () => {
    const today = new Date().toLocaleDateString('en-CA'); 
    const { data } = await supabase
      .from('admin_events')
      .select('title, impact_level')
      .eq('event_date', today)
      .maybeSingle();

    if (data) {
      setTodayMemo(data.title);
      setHasUrgentEvent(data.impact_level === 'High');
    } else {
      setTodayMemo("Tidak ada event khusus hari ini!");
      setHasUrgentEvent(false);
    }
  };

  useEffect(() => {
    fetchTodayEvent();
    const channel = supabase
      .channel('realtime-sidebar')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'admin_events' 
      }, () => {
        fetchTodayEvent();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [pathname]);

// Pengelompokan Menu Sidebar
  const menuGroups = [
    { label: "Main", items: [{ id: 'Dashboard', icon: LayoutDashboard }, { id: 'Analytics', icon: TrendingUp }] },
    { label: "Inventory", items: [{ id: 'Category', icon: Grid }, { id: 'Products', icon: Package }] },
    { label: "Management", items: [
        { id: 'Team', icon: Users }, 
        { id: 'Event', icon: Calendar }, 
        { id: 'Withdraw', icon: Wallet },
        { id: 'Deposit', icon: CreditCard },
        { id: 'Payment', icon: Landmark } // <--- MENU BARU DITAMBAHKAN DI SINI
      ] 
    },
    { label: "Operational", items: [{ id: 'Explore', icon: Globe }, { id: 'History', icon: HistoryIcon }] },
    { label: "Others", items: [{ id: 'Settings', icon: Settings }] }
  ];

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <aside className={`${isOpen ? "w-64" : "w-20"} bg-[#0B0E14] border-r border-white/5 flex flex-col fixed h-screen z-40 transition-all duration-300 shadow-2xl`}>
      
      {/* HEADER */}
      <div className="p-6 mb-4 flex items-center justify-between border-b border-white/5">
        {isOpen && (
          <h1 className="text-white font-black italic tracking-tighter text-xl uppercase">
            DANISH<span className="text-blue-500">ADMIN</span>
          </h1>
        )}
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 hover:bg-white/5 rounded-xl text-slate-400">
          {isOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* NAVIGASI */}
      <nav className="flex-1 px-4 space-y-6 overflow-y-auto py-4 custom-scrollbar">
        {menuGroups.map((group) => (
          <div key={group.label} className="space-y-2">
            {isOpen && <p className="px-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-600 mb-3">{group.label}</p>}
            {group.items.map((item) => (
              <div 
                key={item.id} 
                onClick={() => setActiveMenu(item.id)} 
                className={`flex items-center gap-4 p-3.5 rounded-xl cursor-pointer transition-all ${
                  activeMenu === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40' 
                  : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                }`}
              >
                <item.icon size={20} /> 
                {isOpen && <span className="text-xs font-bold tracking-wide uppercase italic">{item.id}</span>}
              </div>
            ))}
          </div>
        ))}
      </nav>

      {/* WIDGET BAWAH */}
      {isOpen && (
        <div className="px-6 py-4 space-y-4">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <Calendar size={14} />
              <span className="text-[9px] font-black uppercase tracking-widest">Today</span>
            </div>
            <p className="text-white text-xs font-bold italic uppercase">
              {new Intl.DateTimeFormat('id-ID', { dateStyle: 'full' }).format(new Date())}
            </p>
          </div>

          <div className={`rounded-2xl p-3 border transition-all duration-500 ${
            hasUrgentEvent ? "bg-rose-500/10 border-rose-500/20 animate-pulse" : "bg-amber-500/10 border-amber-500/20"
          }`}>
            <div className="flex items-center justify-between mb-2">
               <div className={`flex items-center gap-2 ${hasUrgentEvent ? "text-rose-500" : "text-amber-500"}`}>
                <FileText size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest">Memo</span>
              </div>
              <div className={`w-1.5 h-1.5 rounded-full ${hasUrgentEvent ? "bg-rose-500" : "bg-amber-500 animate-pulse"}`}></div>
            </div>
            <p className={`text-[10px] leading-tight italic font-bold uppercase ${
              hasUrgentEvent ? "text-rose-200" : "text-slate-400"
            }`}>
              "{todayMemo}"
            </p>
          </div>
        </div>
      )}

      {/* LOGOUT */}
      <div className="p-4 border-t border-white/5">
        <button onClick={handleLogout} className={`w-full flex items-center gap-4 p-4 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all font-black italic uppercase tracking-widest ${!isOpen && 'justify-center'}`}>
          <LogOut size={20} />
          {isOpen && <span className="text-[10px]">Logout</span>}
        </button>
      </div>
    </aside>
  );
}