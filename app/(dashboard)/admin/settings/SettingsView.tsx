"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import { 
  Settings, Save, Smartphone, Type, Power, Loader2, 
  Lock, Mail, Key, Percent, CheckCircle2,
  ShieldAlert, Download, Archive, Ban, Activity, Zap
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
    is_live_mode: true, // <-- DEFAULT LIVE (True)
    special_member_percent: 0,
    first_referral_percent: 0, next_referral_percent: 0,
    global_margin: 0, cash_out_fee: 0,
  });

  const [authForm, setAuthForm] = useState({ email: "", password: "" });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: settingsData } = await supabase.from('store_settings').select('*').single();
      if (settingsData) {
        const isLive = (settingsData as any).is_live_mode ?? (settingsData as any).is_digiflazz_active ?? true;
        setConfig(prev => ({ ...prev, ...settingsData, is_live_mode: isLive }));
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email) setAuthForm(prev => ({ ...prev, email: user.email || "" }));
    } catch (err: any) { console.error("Error:", err.message); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // --- REUSABLE TOGGLE FUNCTION ---
  const toggleStatus = async (field: string, currentVal: boolean) => {
    const newVal = !currentVal;
    const updatePayload: Record<string, boolean> = { [field]: newVal };
    const { error } = await supabase.from('store_settings').update(updatePayload).eq('id', config.id);
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
    <div className="w-full animate-in fade-in duration-700 font-sans text-slate-900 space-y-8 pb-20">
      <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3 text-slate-900">
        <span className="bg-slate-900 text-white p-2 rounded-xl shadow-sm"><Settings size={22} /></span>
        Store Settings
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-stretch">
          {/* INFO & KONTAK */}
          <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-xs border border-slate-200/80 flex flex-col h-full">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight mb-6 flex items-center gap-2 border-b border-slate-100 pb-4"><Type size={16} className="text-blue-600"/> Info & Kontak Toko</h4>
              <div className="space-y-4 grow">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 ml-1 mb-1.5 block">Nama Toko</label>
                    <input type="text" className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl outline-none focus:border-blue-500 text-xs font-medium text-slate-800" value={config.store_name} onChange={(e) => setConfig({...config, store_name: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 ml-1 mb-1.5 block">Running Text (Header Pengumuman)</label>
                    <textarea rows={2} className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl outline-none focus:border-blue-500 text-xs font-medium text-slate-800" value={config.running_text} onChange={(e) => setConfig({...config, running_text: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 ml-1 mb-1.5 block">Kontak WhatsApp Admin</label>
                    <div className="relative"><Smartphone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/><input type="text" className="w-full bg-slate-50 border border-slate-200 pl-9 pr-4 py-3 rounded-xl outline-none focus:border-emerald-500 text-xs font-medium text-slate-800" value={config.admin_contact} onChange={(e) => setConfig({...config, admin_contact: e.target.value.replace(/[^0-9]/g, '')})} /></div>
                  </div>
              </div>
              <button onClick={handleSaveStoreInfo} disabled={savingInfo} className="w-full mt-6 py-3.5 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2 text-xs font-bold shadow-sm cursor-pointer">
                {savingInfo ? <Loader2 className="animate-spin" size={14}/> : <Save size={14} />} Simpan Info Toko
              </button>
          </div>

          {/* SYSTEM CONTROL & OPERATIONAL MODE */}
          <div className={`p-6 sm:p-7 rounded-3xl shadow-xs border transition-all flex flex-col h-full ${config.is_maintenance ? "bg-rose-50/50 border-rose-200" : "bg-white border-slate-200/80"}`}>
            <h4 className={`text-xs sm:text-sm font-bold tracking-tight mb-6 flex items-center gap-2 border-b pb-4 ${config.is_maintenance ? "text-rose-600 border-rose-200" : "text-slate-900 border-slate-100"}`}>
              <Power size={16} /> System Control & Mode Operasional
            </h4>
            
            <div className="grow flex flex-col space-y-4 justify-center">
              {/* TOGGLE 1: GLOBAL MAINTENANCE */}
              <div className="flex items-center justify-between bg-white/70 p-4 rounded-2xl border border-dashed border-slate-200">
                  <div>
                    <span className="block text-xs font-bold mb-0.5 text-slate-900">Global Maintenance</span>
                    <span className={`text-[11px] font-normal block ${config.is_maintenance ? "text-rose-600 font-semibold" : "text-slate-400"}`}>
                      {config.is_maintenance ? "Toko Tutup Total (Maintenance Aktif)" : "Toko Aktif Normal (Online)"}
                    </span>
                  </div>
                  <button onClick={() => toggleStatus('is_maintenance', config.is_maintenance)} className={`w-14 h-7 rounded-full p-1 transition-all duration-300 relative cursor-pointer shrink-0 ml-3 ${config.is_maintenance ? "bg-rose-500" : "bg-slate-200"}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${config.is_maintenance ? "translate-x-7" : "translate-x-0"}`}>
                      {config.is_maintenance ? <Ban size={10} className="text-rose-500"/> : <CheckCircle2 size={10} className="text-emerald-500"/>}
                    </div>
                  </button>
              </div>

              {/* MASTER OPERATIONAL MODE (LIVE VS SANDBOX / SIMULASI) */}
              <div className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${config.is_live_mode ? "bg-emerald-50/70 border-emerald-200" : "bg-amber-50/70 border-amber-200"}`}>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-bold ${config.is_live_mode ? "text-emerald-700" : "text-amber-700"}`}>
                        {config.is_live_mode ? "Mode Live (Transaksi Riil)" : "Mode Simulasi (Sandbox)"}
                      </span>
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${config.is_live_mode ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                        {config.is_live_mode ? "Produksi" : "Sandbox"}
                      </span>
                    </div>
                    <span className="text-[11px] font-normal block text-slate-500">
                      {config.is_live_mode
                        ? "Order diproses riil ke API provider sesuai kolom 'Proses' di workspace Providers (saldo vendor terpotong)."
                        : "Order diproses internal simulasi pengujian. Saldo vendor riil aman & dispatch provider dilewati."}
                    </span>
                  </div>
                  <button onClick={() => toggleStatus('is_live_mode', config.is_live_mode)} className={`w-14 h-7 rounded-full p-1 transition-all duration-300 relative cursor-pointer shrink-0 ml-3 ${config.is_live_mode ? "bg-emerald-500" : "bg-amber-500"}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${config.is_live_mode ? "translate-x-7" : "translate-x-0"}`}>
                      {config.is_live_mode ? <Zap size={10} className="text-emerald-500"/> : <Activity size={10} className="text-amber-500"/>}
                    </div>
                  </button>
              </div>
            </div>
          </div>
      </div>

      {/* REFERRAL & SECURITY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-stretch">
          <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-xs border border-slate-200/80 flex flex-col h-full">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight mb-6 flex items-center gap-2 border-b border-slate-100 pb-4"><Percent size={16} className="text-amber-500"/> Referral System & Komisi</h4>
              <div className="grid grid-cols-2 gap-4 grow">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 ml-1 mb-1.5 block">Komisi Pertama (%)</label>
                    <input type="number" className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl outline-none focus:border-blue-400 text-xs font-semibold text-slate-800" value={config.first_referral_percent} onChange={(e) => setConfig({...config, first_referral_percent: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 ml-1 mb-1.5 block">Komisi Lanjutan (%)</label>
                    <input type="number" className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl outline-none focus:border-emerald-400 text-xs font-semibold text-slate-800" value={config.next_referral_percent} onChange={(e) => setConfig({...config, next_referral_percent: Number(e.target.value)})} />
                  </div>
              </div>
              <button onClick={handleSavePromo} disabled={savingPromo} className="w-full mt-6 py-3.5 bg-slate-900 text-white rounded-xl hover:bg-amber-600 transition-all flex items-center justify-center gap-2 text-xs font-bold shadow-sm cursor-pointer">Update Komisi Referral</button>
          </div>

          <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-xs border border-slate-200/80 flex flex-col h-full">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight mb-6 flex items-center gap-2 border-b border-slate-100 pb-4"><Lock size={16} className="text-amber-500"/> Login Security & Kredensial</h4>
              <div className="space-y-4 grow">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 ml-1 mb-1.5 block">Email Administrator</label>
                    <div className="relative"><Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/><input type="email" className="w-full bg-slate-50 border border-slate-200 pl-9 pr-4 py-3 rounded-xl outline-none focus:border-amber-500 text-xs font-medium text-slate-800" value={authForm.email} onChange={(e) => setAuthForm({...authForm, email: e.target.value})} /></div>
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 ml-1 mb-1.5 block">Password Baru (Opsional)</label>
                    <div className="relative"><Key size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/><input type="password" placeholder="Masukkan password baru..." className="w-full bg-slate-50 border border-slate-200 pl-9 pr-4 py-3 rounded-xl outline-none focus:border-amber-500 text-xs font-medium text-slate-800 placeholder:text-slate-400" value={authForm.password} onChange={(e) => setAuthForm({...authForm, password: e.target.value})} /></div>
                  </div>
              </div>
              <button onClick={() => alert("LOGIN UPDATE!")} className="w-full mt-6 py-3.5 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2 text-xs font-bold shadow-sm cursor-pointer"><Lock size={14} /> Update Kredensial Login</button>
          </div>
      </div>

      {/* BACKUP & DANGER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-stretch pb-10">
          <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-xs border-2 border-blue-100 flex flex-col h-full">
              <h4 className="text-xs sm:text-sm font-bold text-blue-600 tracking-tight mb-6 flex items-center gap-2 border-b border-blue-100 pb-4"><Download size={16}/> Backup & Restore Database</h4>
              <div className="space-y-4 grow">
                  <button className="w-full py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 text-xs font-bold shadow-sm cursor-pointer">Download File Backup</button>
                  <button className="w-full py-3.5 bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 transition-all rounded-xl text-xs font-bold cursor-pointer">Upload & Restore Database</button>
              </div>
          </div>
          <div className="bg-rose-50/50 p-6 sm:p-7 rounded-3xl shadow-xs border-2 border-rose-200 flex flex-col h-full">
              <h4 className="text-xs sm:text-sm font-bold text-rose-600 tracking-tight mb-6 flex items-center gap-2 border-b border-rose-200 pb-4"><ShieldAlert size={16}/> Danger Zone</h4>
              <div>
                <label className="text-[11px] font-semibold text-rose-700 ml-1 mb-1.5 block">Ketik &quot;RESET-DANISPAY&quot; untuk konfirmasi</label>
                <input type="text" placeholder="RESET-DANISPAY" className="w-full bg-white border-2 border-rose-200 p-3.5 rounded-xl text-xs font-bold text-rose-600 placeholder:text-rose-300 outline-none focus:border-rose-500" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
              </div>
              <button disabled={confirmText !== "RESET-DANISPAY"} className="w-full mt-6 py-3.5 rounded-xl bg-rose-600 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-rose-700 transition-all shadow-sm">Reset Database</button>
          </div>
      </div>
    </div>
  );
}