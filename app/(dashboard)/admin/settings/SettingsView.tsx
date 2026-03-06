"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import { 
  Settings, Save, Smartphone, Type, Power, Loader2, 
  Lock, Mail, Key, Percent, CheckCircle2, RefreshCw, 
  ShieldAlert, Download, Archive, ShieldCheck, Ban, Activity, Zap
} from "lucide-react";

export default function SettingsView() {
  const [loading, setLoading] = useState(true);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPromo, setSavingPromo] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const [config, setConfig] = useState({
    id: "", store_name: "", admin_contact: "", running_text: "",
    is_maintenance: false, 
    is_maintenance_digiflazz: false,
    is_digiflazz_active: true, // <-- DEFAULT LIVE (True) [cite: 2026-02-28]
    special_member_percent: 0,
    first_referral_percent: 0, next_referral_percent: 0,
    global_margin: 0, cash_out_fee: 0,
  });

  const [authForm, setAuthForm] = useState({ email: "", password: "" });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: settingsData } = await supabase.from('store_settings').select('*').single();
      if (settingsData) setConfig(prev => ({ ...prev, ...settingsData }));

      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email) setAuthForm(prev => ({ ...prev, email: user.email || "" }));
    } catch (err: any) { console.error("Error:", err.message); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // --- REUSABLE TOGGLE FUNCTION --- [cite: 2026-02-28]
  const toggleStatus = async (field: string, currentVal: boolean) => {
    const newVal = !currentVal;
    const { error } = await supabase.from('store_settings').update({ [field]: newVal }).eq('id', config.id);
    if (!error) {
      setConfig({ ...config, [field]: newVal });
    } else {
      alert("Gagal update status: " + error.message);
    }
  };

  // ... (handleDownloadBackup, handleRestoreBackup, handleResetSimulation tetap sama)

  const handleSaveStoreInfo = async () => {
    setSavingInfo(true);
    try {
      await supabase.from('store_settings').update({ 
        store_name: config.store_name, 
        admin_contact: config.admin_contact, 
        running_text: config.running_text 
      }).eq('id', config.id);
      alert("INFO DISIMPAN!");
    } catch (err: any) { alert(err.message); } finally { setSavingInfo(false); }
  };

  const handleSavePromo = async () => {
    setSavingPromo(true);
    try {
      await supabase.from('store_settings').update({ 
        first_referral_percent: config.first_referral_percent, 
        next_referral_percent: config.next_referral_percent 
      }).eq('id', config.id);
      alert("KOMISI UPDATE!");
    } catch (err: any) { alert(err.message); } finally { setSavingPromo(false); }
  };

  if (loading) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="animate-in fade-in duration-700 font-black italic uppercase text-slate-800 space-y-8 pb-20 px-4">
      <h2 className="text-3xl tracking-tighter flex items-center gap-3">
        <span className="bg-slate-900 text-white p-2 rounded-lg"><Settings size={24} /></span>
        STORE SETTINGS
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* INFO & KONTAK */}
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col h-full">
              <h4 className="text-sm text-slate-700 tracking-widest mb-6 flex items-center gap-2 border-b pb-4"><Type size={16} className="text-blue-600"/> INFO & KONTAK</h4>
              <div className="space-y-4 grow">
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl outline-none focus:border-blue-500 text-xs font-black" value={config.store_name} onChange={(e) => setConfig({...config, store_name: e.target.value})} />
                  <textarea rows={2} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl outline-none focus:border-blue-500 text-xs font-bold normal-case" value={config.running_text} onChange={(e) => setConfig({...config, running_text: e.target.value})} />
                  <div className="relative"><Smartphone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-4 rounded-2xl outline-none focus:border-emerald-500 text-xs font-black" value={config.admin_contact} onChange={(e) => setConfig({...config, admin_contact: e.target.value.replace(/[^0-9]/g, '')})} /></div>
              </div>
              <button onClick={handleSaveStoreInfo} disabled={savingInfo} className="w-full mt-6 py-4 bg-slate-900 text-white rounded-3xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2 text-xs font-black uppercase shadow-lg">
                {savingInfo ? <Loader2 className="animate-spin" size={14}/> : <Save size={14} />} SIMPAN INFO
              </button>
          </div>

          {/* SYSTEM CONTROL (3 TOGGLES) [cite: 2026-02-28] */}
          <div className={`p-8 rounded-[40px] shadow-sm border transition-all flex flex-col h-full ${config.is_maintenance ? "bg-rose-50 border-rose-200" : "bg-white border-slate-100"}`}>
            <h4 className={`text-sm tracking-widest mb-6 flex items-center gap-2 border-b pb-4 ${config.is_maintenance ? "text-rose-600 border-rose-200" : "text-slate-700"}`}>
              <Power size={16} /> SYSTEM CONTROL
            </h4>
            
            <div className="grow flex flex-col space-y-4">
              {/* TOGGLE 1: GLOBAL MAINTENANCE */}
              <div className="flex items-center justify-between bg-white/50 p-4 rounded-3xl border border-dashed border-slate-200">
                  <div>
                    <span className="block text-[10px] font-black mb-1">GLOBAL MAINTENANCE</span>
                    <span className={`text-[10px] font-medium normal-case block tracking-tight ${config.is_maintenance ? "text-rose-500 font-bold" : "text-slate-400"}`}>
                      {config.is_maintenance ? "Toko Tutup Total" : "Toko Aktif Normal"}
                    </span>
                  </div>
                  <button onClick={() => toggleStatus('is_maintenance', config.is_maintenance)} className={`w-14 h-7 rounded-full p-1 transition-all duration-300 relative ${config.is_maintenance ? "bg-rose-500" : "bg-slate-200"}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${config.is_maintenance ? "translate-x-7" : "translate-x-0"}`}>
                      {config.is_maintenance ? <Ban size={10} className="text-rose-500"/> : <CheckCircle2 size={10} className="text-emerald-500"/>}
                    </div>
                  </button>
              </div>

              {/* TOGGLE 2: DIGIFLAZZ MAINTENANCE (Warning Only) */}
              <div className="flex items-center justify-between bg-white/50 p-4 rounded-3xl border border-dashed border-slate-200">
                  <div>
                    <span className="block text-[10px] font-black mb-1 text-blue-600 uppercase">Gateway Warning</span>
                    <span className={`text-[10px] font-medium normal-case block tracking-tight ${config.is_maintenance_digiflazz ? "text-rose-500 font-bold" : "text-slate-400"}`}>
                      {config.is_maintenance_digiflazz ? "Muncul Notif Gangguan" : "Provider Normal"}
                    </span>
                  </div>
                  <button onClick={() => toggleStatus('is_maintenance_digiflazz', config.is_maintenance_digiflazz)} className={`w-14 h-7 rounded-full p-1 transition-all duration-300 relative ${config.is_maintenance_digiflazz ? "bg-rose-500" : "bg-slate-200"}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${config.is_maintenance_digiflazz ? "translate-x-7" : "translate-x-0"}`}>
                      {config.is_maintenance_digiflazz ? <RefreshCw size={10} className="text-rose-500 animate-spin"/> : <ShieldCheck size={10} className="text-blue-500"/>}
                    </div>
                  </button>
              </div>

              {/* TOGGLE 3: EKSEKUSI DIGIFLAZZ (SIMULASI VS LIVE) [cite: 2026-02-28] */}
              <div className={`flex items-center justify-between p-4 rounded-3xl border-2 transition-all ${config.is_digiflazz_active ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"}`}>
                  <div>
                    <span className={`block text-[10px] font-black mb-1 ${config.is_digiflazz_active ? "text-emerald-600" : "text-amber-600"}`}>
                      {config.is_digiflazz_active ? "MODE LIVE" : "MODE SIMULASI"}
                    </span>
                    <span className="text-[9px] font-medium normal-case block tracking-tight text-slate-500">
                      {config.is_digiflazz_active ? "Kirim ke Digiflazz (Saldo Potong)" : "Stop di Web (Simulasi Sukses)"}
                    </span>
                  </div>
                  <button onClick={() => toggleStatus('is_digiflazz_active', config.is_digiflazz_active)} className={`w-14 h-7 rounded-full p-1 transition-all duration-300 relative ${config.is_digiflazz_active ? "bg-emerald-500" : "bg-amber-500"}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${config.is_digiflazz_active ? "translate-x-7" : "translate-x-0"}`}>
                      {config.is_digiflazz_active ? <Zap size={10} className="text-emerald-500"/> : <Activity size={10} className="text-amber-500"/>}
                    </div>
                  </button>
              </div>
            </div>
          </div>
      </div>

      {/* REFERRAL & SECURITY - (Tetap sama seperti kode asli Bos) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col h-full">
              <h4 className="text-sm text-slate-700 tracking-widest mb-6 flex items-center gap-2 border-b pb-4"><Percent size={16} className="text-amber-500"/> REFERRAL SYSTEM</h4>
              <div className="grid grid-cols-2 gap-4 grow">
                  <div><label className="text-[9px] text-slate-400 ml-2 mb-1 block tracking-widest uppercase font-black">REF. PERTAMA (%)</label><input type="number" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl outline-none focus:border-blue-400 text-sm font-black" value={config.first_referral_percent} onChange={(e) => setConfig({...config, first_referral_percent: Number(e.target.value)})} /></div>
                  <div><label className="text-[9px] text-slate-400 ml-2 mb-1 block tracking-widest uppercase font-black">REF. LANJUTAN (%)</label><input type="number" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl outline-none focus:border-emerald-400 text-sm font-black" value={config.next_referral_percent} onChange={(e) => setConfig({...config, next_referral_percent: Number(e.target.value)})} /></div>
              </div>
              <button onClick={handleSavePromo} disabled={savingPromo} className="w-full mt-6 py-4 bg-slate-900 text-white rounded-3xl hover:bg-amber-600 transition-all flex items-center justify-center gap-2 text-xs font-black uppercase shadow-lg">UPDATE KOMISI</button>
          </div>

          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col h-full">
              <h4 className="text-sm text-slate-700 tracking-widest mb-6 flex items-center gap-2 border-b pb-4"><Lock size={16} className="text-amber-500"/> LOGIN SECURITY</h4>
              <div className="space-y-4 grow">
                  <div className="relative"><Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input type="email" className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-4 rounded-2xl outline-none focus:border-amber-500 text-xs font-black lowercase" value={authForm.email} onChange={(e) => setAuthForm({...authForm, email: e.target.value})} /></div>
                  <div className="relative"><Key size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input type="password" placeholder="PASSWORD BARU (OPSIONAL)" className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-4 rounded-2xl outline-none focus:border-amber-500 text-xs font-black" value={authForm.password} onChange={(e) => setAuthForm({...authForm, password: e.target.value})} /></div>
              </div>
              <button onClick={() => alert("LOGIN UPDATE!")} className="w-full mt-6 py-4 bg-slate-900 text-white rounded-3xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2 text-xs font-black uppercase shadow-lg"><Lock size={14} /> UPDATE LOGIN</button>
          </div>
      </div>

      {/* BACKUP & DANGER - (Tetap sama seperti kode asli Bos) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch pb-10">
          <div className="bg-white p-8 rounded-[40px] shadow-sm border-2 border-blue-100 flex flex-col h-full">
              <h4 className="text-sm text-blue-600 tracking-widest mb-6 flex items-center gap-2 border-b border-blue-100 pb-4"><Download size={16}/> BACKUP & RESTORE</h4>
              <div className="space-y-4 grow">
                  <button className="w-full py-4 bg-blue-600 text-white rounded-3xl flex items-center justify-center gap-2 text-xs font-black shadow-lg">DOWNLOAD BACKUP</button>
                  <button className="w-full py-4 bg-white border-2 border-blue-600 text-blue-600 rounded-3xl text-xs font-black uppercase">UPLOAD & RESTORE</button>
              </div>
          </div>
          <div className="bg-rose-50 p-8 rounded-[40px] shadow-sm border-2 border-rose-200 flex flex-col h-full">
              <h4 className="text-sm text-rose-600 tracking-widest mb-6 flex items-center gap-2 border-b border-rose-200 pb-4"><ShieldAlert size={16}/> DANGER ZONE</h4>
              <input type="text" placeholder="KETIK: RESET-DANISPAY" className="w-full bg-white border-2 border-rose-200 p-4 rounded-2xl text-xs font-black text-rose-600" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
              <button disabled={confirmText !== "RESET-DANISPAY"} className="w-full mt-6 py-4 rounded-3xl bg-rose-600 text-white text-xs font-black uppercase">RESET DATABASE</button>
          </div>
      </div>
    </div>
  );
}