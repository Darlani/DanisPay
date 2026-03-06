"use client";
import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ChevronLeft, ChevronRight, Tag } from "lucide-react"; 
import Image from "next/image";
import Link from "next/link"; 
import { supabase } from "@/utils/supabaseClient";

export default function BannerCarousel() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [banners, setBanners] = useState<any[]>([]);
  const [initialIndex, setInitialIndex] = useState(0);

  // 1. FETCH DATA & AMBIL POSISI TERAKHIR
  useEffect(() => {
    const saved = localStorage.getItem("lastBannerIndex");
    if (saved) setInitialIndex(parseInt(saved));

const fetchBanners = async () => {
      const { data } = await supabase.from('banners').select('*').order('id', { ascending: true });
      
      if (data) {
        // Logika Sorting: Yang is_active (true) naik ke atas, yang false turun ke bawah
        const sortedBanners = [...data].sort((a, b) => {
          if (a.is_active === b.is_active) return 0; // Kalau sama-sama aktif, urut ID
          return a.is_active ? -1 : 1; // Jika a aktif, dia duluan (-1)
        });
        
        setBanners(sortedBanners);
      }
    };
    fetchBanners();
  }, []);

  // 2. SETUP EMBLA
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true, 
      align: 'center', 
      duration: 45,
      startIndex: initialIndex 
    }, 
    [
      Autoplay({ 
        delay: 4000, 
        stopOnInteraction: true, 
        stopOnMouseEnter: true 
      })
    ]
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    setSelectedIndex(index);
    localStorage.setItem("lastBannerIndex", index.toString());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setTimeout(() => { setShouldAnimate(true); }, 50);
    const update = () => onSelect();
    onSelect(); 
    emblaApi.on("select", update);
    emblaApi.on("scroll", update);
    emblaApi.on("reInit", update);
  }, [emblaApi, onSelect]);

// --- LOADING STATE: LOGO BRANDING (DIPERBESAR) ---
  if (banners.length === 0) {
    return (
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="aspect-3/2 md:aspect-21/9 w-full flex flex-col items-center justify-center rounded-[40px] border border-white/5 bg-[#0B0E14]/50">
           
           {/* Container Logo: Ukuran ditingkatkan ke w-64 md:w-96 */}
           <div className="relative w-64 h-32 md:w-96 md:h-48 animate-pulse">
             <Image
               src="/images/logo-danish.png"
               alt="Loading DanisPay"
               fill
               className="object-contain drop-shadow-[0_0_25px_rgba(59,130,246,0.5)]"
               priority
               sizes="(max-width: 768px) 256px, 384px" 
             />
           </div>

           <p className="mt-8 text-slate-500 text-[10px] md:text-xs font-black uppercase tracking-[0.4em] animate-pulse">
             Secure Transaction by DanisPay
           </p>
        </div>
      </section>
    );
  }

  // --- RENDER UTAMA ---
  return (
    <section className="max-w-7xl mx-auto px-6 py-10 overflow-hidden">
      <style jsx global>{`
        .embla__container { display: flex; }
        .slide-inner-container { 
          transition: ${shouldAnimate ? 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1)' : 'none !important'}; 
        }
        /* Zoom Halus hanya pada banner yang sedang aktif */
        .banner-wrapper:hover .zoom-layer {
          transform: scale(1.02);
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>

      <div className="relative group/main flex flex-col items-center">
        <div className="overflow-visible w-full" ref={emblaRef}>
          <div className="embla__container">
            {banners.map((banner, index) => { 
              const total = banners.length;   
              let diff = index - selectedIndex;
              if (Math.abs(diff) > total / 2) {
                diff = diff > 0 ? diff - total : diff + total;
              }
              const isActive = index === selectedIndex;
              
              // LOGIKA SMART LINK YANG RAMAH TYPESCRIPT
              // Banner cuma bisa diklik kalau ada link-nya DAN status is_active-nya TRUE
const isLinkActive = banner.href && banner.href !== "#" && banner.href !== "" && banner.is_active === true;
              
              // Bungkus style dan class biar nggak ditulis dua kali
              const wrapperClasses = `slide-inner-container block h-full w-full ${isActive ? (isLinkActive ? 'cursor-pointer' : 'cursor-default opacity-80') : 'cursor-default pointer-events-none'}`;
              const wrapperStyle = {
                transform: isActive 
                  ? 'scale(1.05)' 
                  : diff < 0 ? 'scale(0.85) translateX(80%)' : 'scale(0.85) translateX(-80%)',
                opacity: isActive ? 1 : 0.6,
              };

              // Isi Visual Banner (Biar gak ketik ulang)
              const InnerBannerContent = (
                <div className={`
                  zoom-layer relative aspect-3/2 md:aspect-21/9 w-full rounded-[30px] md:rounded-[50px] overflow-hidden transition-transform duration-500
                  ${isActive ? 'shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8)] ring-2 ring-white/10' : 'shadow-none blur-[1px]'}
                `}>
              <Image
                src={banner.src}
                alt={banner.alt || "Banner"}
                fill
                // unoptimized dihapus biar Next.js yang kompres gambarnya
                className="object-cover" 
                priority={isActive || index === initialIndex}
                // loading jangan pake "eager" kalau sudah pake priority, biar nggak bentrok
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px" 
              />
                    
      {/* Badge cuma muncul kalau kolom promo ADA isinya dan BUKAN bertuliskan "EMPTY" */}
      {banner.promo && banner.promo !== "EMPTY" && (
        <div className={`absolute top-4 left-4 md:top-6 md:left-6 z-40 transition-all duration-700 delay-300 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <div className="bg-blue-600/90 backdrop-blur-md text-white px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[10px] md:text-sm font-bold flex items-center gap-2 shadow-lg border border-white/20">
                <Tag size={14} className="md:w-4 md:h-4" />
                {banner.promo}
            </div>
        </div>
      )}

                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent" />
                    {!isActive && <div className="absolute inset-0 bg-black/60 transition-all duration-700" />}
                </div>
              );

              return (
                <div 
                  className={`flex-[0_0_90%] md:flex-[0_0_80%] min-w-0 relative ${isActive ? 'banner-wrapper' : ''}`}
                  key={banner.id}
                  style={{ zIndex: isActive ? 30 : 10 }}
                >
                  {/* Eksekusi Kondisi Link (TS Senang, UI Aman) */}
                  {isLinkActive ? (
                    <Link href={banner.href} className={wrapperClasses} style={wrapperStyle}>
                      {InnerBannerContent}
                    </Link>
                  ) : (
                    <div className={wrapperClasses} style={wrapperStyle}>
                      {InnerBannerContent}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tombol Navigasi */}
        <button onClick={() => emblaApi?.scrollPrev()} className="absolute left-0 md:left-4 top-1/2 -translate-y-1/2 z-50 bg-white/10 backdrop-blur-xl hover:bg-blue-600 p-3 md:p-4 rounded-full border border-white/10 opacity-0 group-hover/main:opacity-100 transition-all">
          <ChevronLeft size={28} className="text-white" />
        </button>
        <button onClick={() => emblaApi?.scrollNext()} className="absolute right-0 md:right-4 top-1/2 -translate-y-1/2 z-50 bg-white/10 backdrop-blur-xl hover:bg-blue-600 p-3 md:p-4 rounded-full border border-white/10 opacity-0 group-hover/main:opacity-100 transition-all">
          <ChevronRight size={28} className="text-white" />
        </button>
      </div>

      {/* Dots */}
      <div className="flex justify-center items-center gap-3 mt-10 w-full">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => emblaApi?.scrollTo(index)}
            className={`h-1.5 rounded-full cursor-pointer focus:outline-none transition-all duration-500 ${
              index === selectedIndex ? "w-10 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]" : "w-2 bg-slate-800"
            }`}
          />
        ))}
      </div>
    </section>
  );
}