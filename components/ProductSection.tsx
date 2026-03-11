'use client';

import { useState, useEffect } from 'react';
import { Flame, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from "@/utils/supabaseClient";

type CategoryType = 
  | 'popular' | 'game' | 'voucher' | 'marketplace' 
  | 'e-wallet & saldo' | 'social & konten' | 'tagihan prabayar'
  | 'tagihan pascabayar' | 'travel' | 'entertainment & subscription' 
  | 'pulsa & data seluler' | 'digital services' | 'productivity & software' 
  | 'voucher & gift card' | 'data' | 'other';

interface ProductSectionProps {
  title: string;
  category: CategoryType;
  id?: string;
}

export default function ProductSection({ title, category, id }: ProductSectionProps) {
  const initialLimit = category === 'popular' ? 6 : 12;
  const [limit, setLimit] = useState(initialLimit);
  const [products, setProducts] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [mounted, setMounted] = useState(false);

  const POPULAR_SLUGS = [
    'mobile-legends', 'free-fire', 'google-play', 'netflix', 
    'telkomsel', 'indosat', 'xl', 'axis', 'tri', 'valorant'
  ];

  useEffect(() => {
    setMounted(true);
    const loadInitialData = () => {
      const saved = localStorage.getItem(`cache_section_${category}`);
      if (saved) return JSON.parse(saved);
      return []; 
    };
    setProducts(loadInitialData());

    async function fetchProducts() {
      setIsSyncing(true);
      try {
        // OPTIMASI: Langsung tembak kolom yang dibutuhkan saja agar ringan
        let query = supabase
          .from('brands')
          .select('id, name, slug, image_url, categories!inner(slug)') 
          .eq('active', true)
          .order('name', { ascending: true }); // TAMBAHAN: Biar rapi A-Z bos!
        
        if (category === 'popular') {
          query = query.in('slug', POPULAR_SLUGS);
        } else {
          query = query.eq('categories.slug', category);
        }

        const { data, error } = await query;
        if (!error && data) {
          localStorage.setItem(`cache_section_${category}`, JSON.stringify(data));
          setProducts(data);
        }
      } catch (err) {
        console.error("Sync error:", err);
      } finally {
        setIsSyncing(false);
      }
    }
    fetchProducts();
  }, [category]);

  // Langsung ambil data tanpa filter search lagi (karena sudah di Navbar)
  const visibleProducts = products.slice(0, limit);

  // TAMBAHAN: Kalau data sudah selesai loading dan ternyata produknya 0, sembunyikan section ini total!
  if (mounted && !isSyncing && products.length === 0) {
    return null; 
  }

  return (
    // Ubah py-8 menjadi pt-8 pb-4 agar jarak ke kategori bawahnya tidak dobel/terlalu jauh
    <section id={id} className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-4" style={{ scrollMarginTop: '120px' }}>
      <div className="flex items-center justify-between mb-6 text-white">
        <div className="flex items-center gap-2">
          <div className={`${category === 'popular' ? 'bg-orange-500' : 'bg-blue-600'} p-1.5 rounded-lg`}>
            {category === 'popular' ? <Flame size={20} fill="currentColor" /> : <LayoutGrid size={20} />}
          </div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            {title}
            {isSyncing && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />}
          </h3>
        </div>
      </div>

{/* UPDATE: Pakai grid-cols-3 di HP dengan jarak (gap) yang lebih rapat */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
        {!mounted ? (
          [...Array(6)].map((_, i) => (
            <div key={`skel-${i}`} className="aspect-3/4 bg-slate-800 rounded-xl animate-pulse border border-slate-700" />
          ))
        ) : (
          visibleProducts.map((product: any, index: number) => (
            <Link 
              key={product.id || product.slug} 
              href={`/ProductSection/${product.slug}`} 
              className="group flex flex-col rounded-xl overflow-hidden border border-slate-700 hover:border-blue-500 transition-all duration-300 shadow-lg hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] bg-slate-900"
            >
              {/* Bagian Gambar (Atas) */}
              <div className="relative aspect-square w-full overflow-hidden bg-slate-900">
                {product.image_url ? (
                  <Image 
                    src={product.image_url} 
                    alt={product.name} 
                    fill 
                    className="object-cover group-hover:scale-110 transition-transform duration-500" 
                    sizes="(max-width: 768px) 33vw, 15vw"
                    priority={category === 'popular' || index < 6} 
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-slate-500 font-bold text-3xl">
                    {product.name?.charAt(0)}
                  </div>
                )}
              </div>
              
              {/* Bagian Teks (Bawah) - Center & Background Berbeda */}
              <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-center items-center text-center bg-slate-800 border-t border-slate-700">
                <p className="text-[10px] sm:text-xs font-bold text-slate-100 line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors">
                  {product.name}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>

      {mounted && products.length > initialLimit && (
        // Turunkan margin top dari mt-10 ke mt-6 agar serasi
        <div className="mt-6 flex justify-center">
          <button 
            onClick={() => setLimit(limit === initialLimit ? products.length : initialLimit)}
            className="px-8 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white hover:bg-slate-800 hover:border-blue-500 transition-all text-[12px] font-medium shadow-lg"
          >
            {limit === initialLimit ? "Lihat Semua" : "Sembunyikan"}
          </button>
        </div>
      )}
    </section>
  );
}