"use client";
import React from "react";
import { Wrench, Clock, MessageCircle } from "lucide-react";
import { STORE_CONFIG } from "@/utils/storeConfig";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#F0F3F7] flex items-center justify-center p-6 font-sans text-slate-700">
      <div className="max-w-2xl w-full bg-white rounded-4xl shadow-2xl shadow-slate-200 border border-slate-100 p-10 md:p-16 text-center relative overflow-hidden">
        
        {/* Dekorasi Background */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-50 rounded-full blur-3xl opacity-50" />
        
        <div className="relative z-10">
          <div className="inline-flex p-5 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-200 mb-8 animate-bounce">
            <Wrench size={40} />
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tighter italic uppercase mb-4">
            Under <span className="text-blue-600">Maintenance</span>
          </h1>
          
          <p className="text-lg text-slate-400 font-medium mb-10 leading-relaxed">
            Halo Boss! <span className="font-bold text-slate-600">{STORE_CONFIG.name}</span> sedang melakukan pemeliharaan rutin untuk meningkatkan kecepatan proses transaksimu. Kami akan segera kembali!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 text-left">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <div className="flex items-center gap-3 text-blue-600 mb-2">
                <Clock size={20} />
                <span className="font-black italic uppercase text-xs">Estimasi Selesai</span>
              </div>
              <p className="text-sm font-bold text-slate-600 uppercase italic">Kurang dari 60 Menit</p>
            </div>
            
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <div className="flex items-center gap-3 text-emerald-600 mb-2">
                <MessageCircle size={20} />
                <span className="font-black italic uppercase text-xs">Butuh Bantuan?</span>
              </div>
              <p className="text-sm font-bold text-slate-600 uppercase italic">Hubungi Admin di WhatsApp</p>
            </div>
          </div>

          <a 
            href={`https://wa.me/${STORE_CONFIG.adminNumber}`}
            className="inline-block w-full py-5 bg-slate-900 text-white rounded-3xl font-black italic uppercase tracking-widest hover:bg-blue-600 hover:-translate-y-1 shadow-lg shadow-slate-200 transition-all"
          >
            Hubungi Admin Sekarang
          </a>
        </div>
      </div>
    </div>
  );
}