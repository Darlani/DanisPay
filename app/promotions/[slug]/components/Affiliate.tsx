"use client";
import { useState } from "react";
import { 
  HelpCircle, 
  ChevronDown, 
  UserPlus, 
  TrendingUp, 
  MessageCircle, 
  ExternalLink,
  Target, 
  Zap 
} from "lucide-react"; // FIX: Sudah dibetulkan dari 'lucide-center'
import Link from "next/link";

export default function AffiliateSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqData = [
    {
      q: "Berapa komisi yang saya dapatkan?",
      a: "Dapatkan komisi sebesar 5% untuk setiap teman yang mendaftar dan melakukan transaksi pertama menggunakan kode/link Anda. Komisi ini akan meningkat hingga 7% jika teman yang Anda ajak melakukan transaksi secara terus-menerus menggunakan akunnya. Semakin banyak afiliasi, semakin besar passive income Anda di DanisPay yang dapat dicairkan setiap bulan."
    },
    {
      q: "Kapan saya dapat menarik komisi saya?",
      a: "Komisi akan dihitung selama 1 bulan penuh dan akan dicairkan tanggal 15 di bulan berikutnya jika Anda melakukan request pencairan di akun Anda. Pastikan Anda menyertakan nomor rekening di dashboard. Lakukan request sebelum H-15. Sebagai catatan, biaya admin untuk transfer antar bank yang berbeda ditanggung oleh penerima."
    },
    {
      q: "Bagaimana cara untuk mendapatkan afiliasi baru?",
      a: "Sangat mudah! Sebarkan link unik Anda ke teman terdekat, atau bagikan melalui media sosial seperti WhatsApp, Telegram, TikTok, dan Instagram. Pastikan mereka melakukan transaksi melalui website DanisPay dan pastikan mereka sudah LOGIN saat bertransaksi agar sistem kami dapat mencatat komisi tersebut ke akun Anda."
    },
    {
      q: "Bagaimana saya mendapatkan link dan kode referal?",
      a: "Anda hanya perlu melakukan pendaftaran akun di DanisPay. Setelah berhasil login, Anda dapat melihat link dan kode referal unik Anda pada halaman Dashboard Akun."
    },
    {
      q: "Bagaimana cara kerja link referal saya?",
      a: "Cukup lakukan copy-paste link yang tersedia di dashboard Anda dan sebarkan. Setiap orang yang mengklik link tersebut dan mendaftar akan otomatis menjadi bawahan (afiliasi) Anda selamanya."
    },
    {
      q: "Bagaimana kalau saya ingin menjadi member khusus agar transaksi sendiri juga dapat komisi?",
      a: "Lakukan pendaftaran khusus melalui dashboard Anda untuk upgrade member biasa menjadi member khusus. Dengan ini, setiap transaksi yang Anda lakukan di semua akun pribadi Anda juga akan menghasilkan komisi."
    },
    {
      q: "Berapa komisi saya jika menggunakan member khusus?",
      a: "Komisi jika Anda berlangganan member khusus adalah 10% dari profit perusahaan. Syaratnya adalah minimal melakukan 20 transaksi dalam 1 bulan. Persentase ini akan terus bertambah seiring dengan meningkatnya jumlah transaksi Anda."
    },
    {
      q: "Ke mana saya bisa bertanya jika masih ada yang belum jelas?",
      a: "Kami menyediakan dukungan penuh melalui komunitas. Anda bisa bertanya langsung melalui WhatsApp Group DanisPay melalui link yang tersedia di dashboard. Di sana Anda bisa berdiskusi langsung dengan tim kami."
    }
  ];

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      
      {/* 1. HERO SECTION */}
      <div className="relative overflow-hidden bg-[#0B0E14] rounded-[60px] border border-white/10 shadow-2xl">
        
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-blue-600/20 blur-[130px] rounded-full animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-indigo-600/20 blur-[130px] rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
          {/* FIX: Syntax radial-gradient & opacity sesuai saran Tailwind v4 */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-white/3 to-transparent" />
        </div>

        <div className="relative z-10 p-12 md:p-32 flex flex-col items-center text-center">
          
          <div className="mb-10 animate-in fade-in zoom-in duration-1000">
            <div className="inline-flex items-center gap-3 bg-blue-500/10 backdrop-blur-2xl px-6 py-2.5 rounded-full border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
              <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-blue-400">
                Official Partner Program
              </span>
            </div>
          </div>
          
          <div className="space-y-4 mb-10">
            <h2 className="text-5xl md:text-[110px] font-black italic uppercase leading-[0.8] tracking-[-0.05em] text-white">
              CUAN <span className="text-blue-500 drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]">MAKSIMAL</span>
            </h2>
            <div className="flex items-center justify-center gap-6">
              <div className="h-px w-16 md:w-32 bg-linear-to-r from-transparent via-blue-500/50 to-transparent hidden md:block" />
              {/* FIX: underline-offset-12 */}
            <h3 className="text-2xl md:text-5xl font-black italic uppercase tracking-tighter text-slate-400">
              BARENG <span className="text-white underline decoration-blue-500 underline-offset-12 decoration-4">DANISPAY</span>
            </h3>
              <div className="h-px w-16 md:w-32 bg-linear-to-l from-transparent via-blue-500/50 to-transparent hidden md:block" />
            </div>
          </div>
          
          <p className="max-w-3xl text-slate-400 text-base md:text-2xl font-medium leading-relaxed italic mb-14 px-4 opacity-90">
            Bangun kerajaan bisnis Anda tanpa modal sepeserpun. 
            Dapatkan komisi yang <span className="text-white font-bold">terus mengalir</span> setiap bulan langsung ke rekening Anda dengan sistem afiliasi tercanggih.
          </p>

          <div className="relative group">
            {/* FIX: rounded-3xl */}
            <div className="absolute -inset-1 bg-blue-600 rounded-3xl blur-xl opacity-20 group-hover:opacity-60 transition duration-1000 group-hover:duration-200" />
            <Link 
              href="/register" 
              className="relative inline-flex items-center gap-4 bg-white text-[#0B0E14] px-14 py-7 rounded-[22px] font-black uppercase italic tracking-widest transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-white/10 overflow-hidden"
            >
              <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-linear-to-r from-transparent via-white/40 to-transparent opacity-40 group-hover:animate-[shine_1.5s_infinite]" />
              <UserPlus size={26} strokeWidth={3} />
              Mulai Daftar Sekarang
            </Link>
          </div>
        </div>
      </div>

      {/* 2. FAQ SECTION */}
      <div className="space-y-10">
        <div className="flex flex-col items-center text-center space-y-4 px-4">
          <div className="p-4 bg-blue-500/10 rounded-3xl border border-blue-500/20 text-blue-500">
            <HelpCircle size={36} />
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl md:text-5xl font-black italic uppercase text-white tracking-tight">FAQ Afiliasi</h3>
            <p className="text-slate-500 font-bold uppercase text-xs md:text-sm tracking-[0.6em]">Pusat Informasi Partner</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 max-w-5xl mx-auto">
          {faqData.map((item, index) => (
            <div 
              key={index} 
              /* FIX: bg-white/3 & hover:-translate-y-0.5 */
              className={`group border transition-all duration-500 rounded-[35px] overflow-hidden ${openFaq === index ? 'bg-white/3 border-blue-500/40 shadow-2xl shadow-blue-500/5' : 'bg-[#0B0E14] border-white/5 hover:border-white/10 hover:-translate-y-0.5'}`}
            >
              <button 
                onClick={() => toggleFaq(index)}
                className="w-full flex items-center justify-between p-8 md:p-10 text-left"
              >
                <span className={`font-bold text-base md:text-xl pr-6 transition-colors duration-300 ${openFaq === index ? 'text-blue-400' : 'text-slate-300 group-hover:text-white'}`}>
                  {index + 1}. {item.q}
                </span>
                <div className={`p-2 rounded-xl transition-all duration-500 ${openFaq === index ? 'bg-blue-500 text-white rotate-180' : 'bg-white/5 text-slate-600'}`}>
                  <ChevronDown size={24} />
                </div>
              </button>
              
              {/* FIX: max-h-150 & bg-blue-500/2 */}
              <div className={`transition-all duration-500 ease-in-out ${openFaq === index ? 'max-h-150 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-8 md:p-10 pt-0 text-slate-400 text-sm md:text-lg leading-relaxed border-t border-white/5 bg-blue-500/2">
                  {item.a}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. WHATSAPP SUPPORT */}
      <div className="max-w-7xl mx-auto bg-emerald-600/5 border border-emerald-500/20 p-10 md:p-14 rounded-[55px] flex flex-col lg:flex-row justify-between items-center gap-10">
        <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
          <div className="p-7 bg-emerald-500 rounded-[35px] text-white shadow-[0_20px_40px_-10px_rgba(16,185,129,0.4)]">
            <MessageCircle size={40} />
          </div>
          <div className="space-y-2">
            <h4 className="text-2xl md:text-3xl font-black italic uppercase text-white tracking-tight">Butuh Bantuan?</h4>
            <p className="text-slate-400 text-lg font-medium">Gabung WhatsApp Group DanisPay untuk diskusi dan strategi eksklusif.</p>
          </div>
        </div>
        <Link 
          href="https://wa.me/..." 
          target="_blank"
          className="w-full lg:w-auto flex items-center justify-center gap-4 bg-emerald-600 hover:bg-emerald-500 text-white px-12 py-6 rounded-2xl font-black uppercase text-sm tracking-[0.25em] transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-emerald-600/20 group"
        >
          Gabung Komunitas <ExternalLink size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </Link>
      </div>

      <style jsx global>{`
        @keyframes shine {
          0% { left: -100%; }
          100% { left: 200%; }
        }
      `}</style>

    </div>
  );
}