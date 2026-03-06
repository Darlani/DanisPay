"use client";

import React from 'react';
import { 
  Wrench, 
  Settings, 
  Gamepad2, 
  AlertTriangle, 
  Clock, 
  MessageCircle,
  ShieldCheck
} from 'lucide-react';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 overflow-hidden relative">
      
      {/* BACKGROUND ORNAMENT (Efek Cahaya) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />

      <div className="max-w-2xl w-full text-center relative z-10">
        
        {/* ICON ANIMATION AREA */}
        <div className="relative inline-block mb-10">
          <div className="bg-blue-600/20 p-8 rounded-[40px] border border-blue-500/30 animate-pulse">
            <Settings className="text-blue-500 w-16 h-16 animate-spin-slow" />
          </div>
          <div className="absolute -top-4 -right-4 bg-rose-600 p-3 rounded-2xl shadow-xl shadow-rose-500/40 border-2 border-[#0f172a]">
            <Wrench className="text-white w-6 h-6" />
          </div>
          <div className="absolute -bottom-2 -left-6 bg-slate-800 p-3 rounded-xl border border-slate-700 shadow-2xl">
            <Gamepad2 className="text-blue-400 w-5 h-5" />
          </div>
        </div>

        {/* TEXT CONTENT */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-black uppercase text-white tracking-tighter italic">
            SISTEM <span className="text-blue-500 text-outline">OFFLINE</span>
          </h1>
          
          <div className="flex items-center justify-center gap-2 text-blue-400 font-black uppercase italic tracking-widest text-xs md:text-sm">
            <ShieldCheck size={16} />
            <span>DanisPay Security Protocol Active</span>
          </div>

          <p className="text-slate-400 font-medium text-sm md:text-base max-w-md mx-auto leading-relaxed">
            Kami sedang melakukan optimasi server dan pembaruan sistem untuk pengalaman top-up yang lebih kencang. Kami akan segera kembali!
          </p>
        </div>

        {/* STATUS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-[30px] flex items-center gap-4 text-left">
            <div className="bg-amber-500/10 p-3 rounded-2xl text-amber-500">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estimasi Selesai</p>
              <p className="text-white font-bold italic">Cek Berkala di Grup</p>
            </div>
          </div>

          <a 
            href="https://wa.me/6281391171712" // Ganti nomor wa lu
            target="_blank"
            className="bg-slate-900/50 border border-slate-800 p-6 rounded-[30px] flex items-center gap-4 text-left hover:bg-slate-800 transition-all group"
          >
            <div className="bg-emerald-500/10 p-3 rounded-2xl text-emerald-500 group-hover:scale-110 transition-transform">
              <MessageCircle size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Butuh Bantuan?</p>
              <p className="text-white font-bold italic group-hover:text-emerald-400 transition-colors">Hubungi Admin</p>
            </div>
          </a>
        </div>

        {/* FOOTER */}
        <div className="mt-16 pt-8 border-t border-slate-800/50">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">
            &copy; 2026 DANISPAY - ALL RIGHTS RESERVED
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        .text-outline {
          -webkit-text-stroke: 1px #3b82f6;
          color: transparent;
        }
      `}</style>
    </div>
  );
}