import { Instagram, Facebook, Twitter, ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#0f172a] border-t border-slate-800 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          {/* Brand Section */}
          <div className="md:col-span-1">
            <h2 className="text-2xl font-black text-white italic tracking-tighter mb-4">
              DANISH<span className="text-blue-500">TOPUP</span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Platform top up game tercepat, termurah, dan terpercaya di Indonesia. 
              Otomatis masuk dalam hitungan detik 24/7.
            </p>
            <div className="flex gap-4">
              <a href="#" className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"><Instagram size={20}/></a>
              <a href="#" className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"><Facebook size={20}/></a>
              <a href="#" className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"><Twitter size={20}/></a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-6">Peta Situs</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><a href="/" className="hover:text-blue-500 transition-colors">Beranda</a></li>
              <li><a href="#" className="hover:text-blue-500 transition-colors">Cek Transaksi</a></li>
              <li><a href="#" className="hover:text-blue-500 transition-colors">Daftar Harga</a></li>
              <li><a href="#" className="hover:text-blue-500 transition-colors">Syarat & Ketentuan</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-bold mb-6">Bantuan</h4>
            <ul className="space-y-4 text-sm text-slate-400">
              <li><a href="#" className="hover:text-blue-500 transition-colors">WhatsApp Kami</a></li>
              <li><a href="mailto:support@danispay.my.id" className="hover:text-blue-500 transition-colors">Hubungi Email</a></li>
              <li><a href="#" className="hover:text-blue-500 transition-colors">Metode Pembayaran</a></li>
            </ul>
          </div>

          {/* Payment Trust */}
          <div>
            <h4 className="text-white font-bold mb-6 flex items-center gap-2">
              <ShieldCheck size={18} className="text-green-500" />
              Keamanan Transaksi
            </h4>
            <p className="text-slate-400 text-sm mb-4">
              Kami bekerja sama dengan payment gateway berlisensi untuk menjamin keamanan dana Anda.
            </p>
            <div className="grid grid-cols-4 gap-2 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              {['DANA', 'GOPAY', 'OVO', 'QRIS', 'BCA', 'BNI', 'BRI', 'MDR'].map((bank) => (
                <div key={bank} className="bg-white text-[8px] font-black text-slate-900 p-1 rounded text-center">
                  {bank}
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-500 text-xs text-center md:text-left">
            © 2026 Danishtopup. All rights reserved. Made with ❤️ by Arlan.
          </p>
          <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold">
            Powered by Next.js & Midtrans
          </p>
        </div>
      </div>
    </footer>
  );
}