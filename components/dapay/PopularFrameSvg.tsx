'use client';

import React, { ReactNode } from 'react';

interface PopularFrameSvgProps {
  children?: ReactNode;
  className?: string;
}

export default function PopularFrameSvg({ children, className = '' }: PopularFrameSvgProps) {
  return (
    <div className={`relative w-full ${className}`}>
      {/* Frame container: adaptive min-height on mobile/tablet, exact 2030/440 aspect-ratio on desktop */}
      <div className="relative w-full min-h-[220px] sm:min-h-[190px] md:min-h-0 md:aspect-[2030/440]">
        {/* Vector SVG Frame (preserveAspectRatio="none" allows seamless vertical expansion on small screens) */}
        <svg viewBox="0 0 2030 440" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
      <defs>
        {/* OUTLINE LUAR: tepi atas bertingkat + notch tengah */}
        <path id="np-outline"
          d="M72 3 H388 L421 38 H937 L969 71 H1061 L1093 38 H1609 L1642 3 H1958
             Q2029 3 2029 74 V114 L1993 150 V270 L2029 306 V321 Q2029 382 1968 382 H62 Q1 382 1 321 V306 L37 270 V150 L1 114 V74 Q1 3 72 3 Z"/>
        {/* pita antara garis tipis (atas) dan garis terang (bawah) */}
        <path id="np-band"
          d="M388 3 L421 22 H950 L983 54 H1047 L1080 22 H1609 L1642 3 V40 H1093 L1061 71 H969 L937 40 H421 Z"/>
        {/* GARIS DALAM (sejajar, lebih tipis) */}
        <path id="np-inner" d="M423.8 17.6 Q427.9 22 433.9 22 H934.8 Q943.8 22 950.0 28.5 L969.5 48.5 Q975.8 55 984.8 55 H1045.2 Q1054.2 55 1060.5 48.5 L1080.0 28.5 Q1086.2 22 1095.2 22 H1596.1 Q1602.1 22 1606.2 17.6"/>
        <path id="np-gap" d="M405.9 22 H943.8 L975.8 55 H1054.2 L1086.2 22 H1624.1 L1609 38 H1093 L1061 71 H969 L937 38 H421 Z"/>
        {/* ujung runcing: sisi atas lurus, sisi bawah menyempit ke titik */}
        <polygon id="np-tipL" points="409.5,7.3 426.2,15.3 421.4,19.9"/>
        <g id="np-tips"><use href="#np-tipL"/><use href="#np-tipL" transform="translate(2030 0) scale(-1 1)"/></g>
        {/* ===== GARIS V PALING ATAS (dibangun ulang) =====
             Satu jalur, satu gradien halus. Glow = 3 lapis blur (lebar → rapat) yang menyatu,
             tanpa clip kotak, sehingga memudar alami ke segala arah. */}
        <linearGradient id="np-vline" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="2030" y2="0">
          <stop offset="0.2030" stopColor="#ffd21f"/>
          <stop offset="0.2079" stopColor="#ffd21f"/>
          <stop offset="0.2128" stopColor="#ffd21f"/>
          <stop offset="0.2177" stopColor="#ffd21f"/>
          <stop offset="0.2227" stopColor="#ffd21f"/>
          <stop offset="0.2276" stopColor="#ffd21f"/>
          <stop offset="0.2325" stopColor="#ffd21f"/>
          <stop offset="0.2374" stopColor="#ffd32c"/>
          <stop offset="0.2424" stopColor="#ffd543"/>
          <stop offset="0.2473" stopColor="#ffd85b"/>
          <stop offset="0.2522" stopColor="#ffd969"/>
          <stop offset="0.2571" stopColor="#f7d876"/>
          <stop offset="0.2621" stopColor="#dad6a2"/>
          <stop offset="0.2670" stopColor="#b6d4d7"/>
          <stop offset="0.2719" stopColor="#9ed2fb"/>
          <stop offset="0.2768" stopColor="#98d1ff"/>
          <stop offset="0.2818" stopColor="#87caff"/>
          <stop offset="0.2867" stopColor="#6fc1ff"/>
          <stop offset="0.2916" stopColor="#59b8ff"/>
          <stop offset="0.2966" stopColor="#4db3ff"/>
          <stop offset="0.3015" stopColor="#4cb2ff"/>
          <stop offset="0.3064" stopColor="#49afff"/>
          <stop offset="0.3113" stopColor="#44a9ff"/>
          <stop offset="0.3163" stopColor="#3fa3ff"/>
          <stop offset="0.3212" stopColor="#389cff"/>
          <stop offset="0.3261" stopColor="#3396ff"/>
          <stop offset="0.3310" stopColor="#2e90ff"/>
          <stop offset="0.3360" stopColor="#2b8dff"/>
          <stop offset="0.3409" stopColor="#2a8cff"/>
          <stop offset="0.3458" stopColor="#2a8cff"/>
          <stop offset="0.3507" stopColor="#2a8cff"/>
          <stop offset="0.3557" stopColor="#2a8cff"/>
          <stop offset="0.3606" stopColor="#2a8cff"/>
          <stop offset="0.3655" stopColor="#2a8cff"/>
          <stop offset="0.3704" stopColor="#2a8cff"/>
          <stop offset="0.3754" stopColor="#2a8cff"/>
          <stop offset="0.3803" stopColor="#2a8cff"/>
          <stop offset="0.3852" stopColor="#2a8cff"/>
          <stop offset="0.3901" stopColor="#2f91ff"/>
          <stop offset="0.3951" stopColor="#379bff"/>
          <stop offset="0.4000" stopColor="#41a6ff"/>
          <stop offset="0.4049" stopColor="#4aafff"/>
          <stop offset="0.4099" stopColor="#4db3ff"/>
          <stop offset="0.4148" stopColor="#5cb9ff"/>
          <stop offset="0.4197" stopColor="#7ac5ff"/>
          <stop offset="0.4246" stopColor="#95d0ff"/>
          <stop offset="0.4296" stopColor="#a1d3f9"/>
          <stop offset="0.4345" stopColor="#cddacc"/>
          <stop offset="0.4394" stopColor="#f9e1a0"/>
          <stop offset="0.4443" stopColor="#ffe18f"/>
          <stop offset="0.4493" stopColor="#ffda5c"/>
          <stop offset="0.4542" stopColor="#ffd32a"/>
          <stop offset="0.4591" stopColor="#ffd21f"/>
          <stop offset="0.4640" stopColor="#ffd21f"/>
          <stop offset="0.4690" stopColor="#ffd21f"/>
          <stop offset="0.4739" stopColor="#ffd21f"/>
          <stop offset="0.4788" stopColor="#ffd21f"/>
          <stop offset="0.4837" stopColor="#ffd21f"/>
          <stop offset="0.4887" stopColor="#ffd21f"/>
          <stop offset="0.4936" stopColor="#ffd21f"/>
          <stop offset="0.4985" stopColor="#ffd21f"/>
          <stop offset="0.5000" stopColor="#ffd21f"/>
          <stop offset="0.5015" stopColor="#ffd21f"/>
          <stop offset="0.5064" stopColor="#ffd21f"/>
          <stop offset="0.5113" stopColor="#ffd21f"/>
          <stop offset="0.5163" stopColor="#ffd21f"/>
          <stop offset="0.5212" stopColor="#ffd21f"/>
          <stop offset="0.5261" stopColor="#ffd21f"/>
          <stop offset="0.5310" stopColor="#ffd21f"/>
          <stop offset="0.5360" stopColor="#ffd21f"/>
          <stop offset="0.5409" stopColor="#ffd21f"/>
          <stop offset="0.5458" stopColor="#ffd32a"/>
          <stop offset="0.5507" stopColor="#ffda5c"/>
          <stop offset="0.5557" stopColor="#ffe18f"/>
          <stop offset="0.5606" stopColor="#f9e1a0"/>
          <stop offset="0.5655" stopColor="#cddacc"/>
          <stop offset="0.5704" stopColor="#a1d3f9"/>
          <stop offset="0.5754" stopColor="#95d0ff"/>
          <stop offset="0.5803" stopColor="#7ac5ff"/>
          <stop offset="0.5852" stopColor="#5cb9ff"/>
          <stop offset="0.5901" stopColor="#4db3ff"/>
          <stop offset="0.5951" stopColor="#4aafff"/>
          <stop offset="0.6000" stopColor="#41a6ff"/>
          <stop offset="0.6049" stopColor="#379bff"/>
          <stop offset="0.6099" stopColor="#2f91ff"/>
          <stop offset="0.6148" stopColor="#2a8cff"/>
          <stop offset="0.6197" stopColor="#2a8cff"/>
          <stop offset="0.6246" stopColor="#2a8cff"/>
          <stop offset="0.6296" stopColor="#2a8cff"/>
          <stop offset="0.6345" stopColor="#2a8cff"/>
          <stop offset="0.6394" stopColor="#2a8cff"/>
          <stop offset="0.6443" stopColor="#2a8cff"/>
          <stop offset="0.6493" stopColor="#2a8cff"/>
          <stop offset="0.6542" stopColor="#2a8cff"/>
          <stop offset="0.6591" stopColor="#2a8cff"/>
          <stop offset="0.6640" stopColor="#2b8dff"/>
          <stop offset="0.6690" stopColor="#2e90ff"/>
          <stop offset="0.6739" stopColor="#3396ff"/>
          <stop offset="0.6788" stopColor="#389cff"/>
          <stop offset="0.6837" stopColor="#3fa3ff"/>
          <stop offset="0.6887" stopColor="#44a9ff"/>
          <stop offset="0.6936" stopColor="#49afff"/>
          <stop offset="0.6985" stopColor="#4cb2ff"/>
          <stop offset="0.7034" stopColor="#4db3ff"/>
          <stop offset="0.7084" stopColor="#59b8ff"/>
          <stop offset="0.7133" stopColor="#6fc1ff"/>
          <stop offset="0.7182" stopColor="#87caff"/>
          <stop offset="0.7232" stopColor="#98d1ff"/>
          <stop offset="0.7281" stopColor="#9ed2fb"/>
          <stop offset="0.7330" stopColor="#b6d4d7"/>
          <stop offset="0.7379" stopColor="#dad6a2"/>
          <stop offset="0.7429" stopColor="#f7d876"/>
          <stop offset="0.7478" stopColor="#ffd969"/>
          <stop offset="0.7527" stopColor="#ffd85b"/>
          <stop offset="0.7576" stopColor="#ffd543"/>
          <stop offset="0.7626" stopColor="#ffd32c"/>
          <stop offset="0.7675" stopColor="#ffd21f"/>
          <stop offset="0.7724" stopColor="#ffd21f"/>
          <stop offset="0.7773" stopColor="#ffd21f"/>
          <stop offset="0.7823" stopColor="#ffd21f"/>
          <stop offset="0.7872" stopColor="#ffd21f"/>
          <stop offset="0.7921" stopColor="#ffd21f"/>
          <stop offset="0.7970" stopColor="#ffd21f"/>
        </linearGradient>
        <linearGradient id="np-vthick" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="2030" y2="0">
          <stop offset="0.2030" stopColor="#ffd21f"/>
          <stop offset="0.2079" stopColor="#ffd21f"/>
          <stop offset="0.2128" stopColor="#ffd21f"/>
          <stop offset="0.2177" stopColor="#ffd21f"/>
          <stop offset="0.2227" stopColor="#ffd21f"/>
          <stop offset="0.2276" stopColor="#ffd21f"/>
          <stop offset="0.2325" stopColor="#ffd21f"/>
          <stop offset="0.2374" stopColor="#ffd21f" stopOpacity="0.95"/>
          <stop offset="0.2424" stopColor="#ffd21f" stopOpacity="0.83"/>
          <stop offset="0.2473" stopColor="#ffd21f" stopOpacity="0.66"/>
          <stop offset="0.2522" stopColor="#ffd21f" stopOpacity="0.46"/>
          <stop offset="0.2571" stopColor="#ffd21f" stopOpacity="0.27"/>
          <stop offset="0.2621" stopColor="#ffd21f" stopOpacity="0.11"/>
          <stop offset="0.2670" stopColor="#ffd21f" stopOpacity="0.02"/>
          <stop offset="0.2719" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.2768" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.2818" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.2867" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.2916" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.2966" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.3015" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.3064" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.3113" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.3163" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.3212" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.3261" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.3310" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.3360" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.3409" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.3458" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.3507" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.3557" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.3606" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.3655" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.3704" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.3754" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.3803" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.3852" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.3901" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.3951" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.4000" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.4049" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.4099" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.4148" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.4197" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.4246" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.4296" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.4345" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.4394" stopColor="#ffd21f" stopOpacity="0.06"/>
          <stop offset="0.4443" stopColor="#ffd21f" stopOpacity="0.35"/>
          <stop offset="0.4493" stopColor="#ffd21f" stopOpacity="0.72"/>
          <stop offset="0.4542" stopColor="#ffd21f" stopOpacity="0.97"/>
          <stop offset="0.4591" stopColor="#ffd21f"/>
          <stop offset="0.4640" stopColor="#ffd21f"/>
          <stop offset="0.4690" stopColor="#ffd21f"/>
          <stop offset="0.4739" stopColor="#ffd21f"/>
          <stop offset="0.4788" stopColor="#ffd21f"/>
          <stop offset="0.4837" stopColor="#ffd21f"/>
          <stop offset="0.4887" stopColor="#ffd21f"/>
          <stop offset="0.4936" stopColor="#ffd21f"/>
          <stop offset="0.4985" stopColor="#ffd21f"/>
          <stop offset="0.5000" stopColor="#ffd21f"/>
          <stop offset="0.5015" stopColor="#ffd21f"/>
          <stop offset="0.5064" stopColor="#ffd21f"/>
          <stop offset="0.5113" stopColor="#ffd21f"/>
          <stop offset="0.5163" stopColor="#ffd21f"/>
          <stop offset="0.5212" stopColor="#ffd21f"/>
          <stop offset="0.5261" stopColor="#ffd21f"/>
          <stop offset="0.5310" stopColor="#ffd21f"/>
          <stop offset="0.5360" stopColor="#ffd21f"/>
          <stop offset="0.5409" stopColor="#ffd21f"/>
          <stop offset="0.5458" stopColor="#ffd21f" stopOpacity="0.97"/>
          <stop offset="0.5507" stopColor="#ffd21f" stopOpacity="0.72"/>
          <stop offset="0.5557" stopColor="#ffd21f" stopOpacity="0.35"/>
          <stop offset="0.5606" stopColor="#ffd21f" stopOpacity="0.06"/>
          <stop offset="0.5655" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.5704" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.5754" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.5803" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.5852" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.5901" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.5951" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.6000" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.6049" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.6099" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.6148" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.6197" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.6246" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.6296" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.6345" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.6394" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.6443" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.6493" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.6542" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.6591" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.6640" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.6690" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.6739" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.6788" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.6837" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.6887" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.6936" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.6985" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.7034" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.7084" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.7133" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.7182" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.7232" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.7281" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.7330" stopColor="#ffd21f" stopOpacity="0.02"/>
          <stop offset="0.7379" stopColor="#ffd21f" stopOpacity="0.11"/>
          <stop offset="0.7429" stopColor="#ffd21f" stopOpacity="0.27"/>
          <stop offset="0.7478" stopColor="#ffd21f" stopOpacity="0.46"/>
          <stop offset="0.7527" stopColor="#ffd21f" stopOpacity="0.66"/>
          <stop offset="0.7576" stopColor="#ffd21f" stopOpacity="0.83"/>
          <stop offset="0.7626" stopColor="#ffd21f" stopOpacity="0.95"/>
          <stop offset="0.7675" stopColor="#ffd21f"/>
          <stop offset="0.7724" stopColor="#ffd21f"/>
          <stop offset="0.7773" stopColor="#ffd21f"/>
          <stop offset="0.7823" stopColor="#ffd21f"/>
          <stop offset="0.7872" stopColor="#ffd21f"/>
          <stop offset="0.7921" stopColor="#ffd21f"/>
          <stop offset="0.7970" stopColor="#ffd21f"/>
        </linearGradient>
        <linearGradient id="np-vcore" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="2030" y2="0">
          <stop offset="0.2030" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.2079" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.2128" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.2177" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.2227" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.2276" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.2325" stopColor="#ffd220" stopOpacity="0.00"/>
          <stop offset="0.2374" stopColor="#fdd530" stopOpacity="0.00"/>
          <stop offset="0.2424" stopColor="#fada53" stopOpacity="0.00"/>
          <stop offset="0.2473" stopColor="#f5e281" stopOpacity="0.00"/>
          <stop offset="0.2522" stopColor="#f0e9b0" stopOpacity="0.00"/>
          <stop offset="0.2571" stopColor="#ecf0da" stopOpacity="0.00"/>
          <stop offset="0.2621" stopColor="#e9f5f7" stopOpacity="0.00"/>
          <stop offset="0.2670" stopColor="#e8f6ff" stopOpacity="0.00"/>
          <stop offset="0.2719" stopColor="#e8f6ff" stopOpacity="0.04"/>
          <stop offset="0.2768" stopColor="#e8f6ff" stopOpacity="0.11"/>
          <stop offset="0.2818" stopColor="#e8f6ff" stopOpacity="0.20"/>
          <stop offset="0.2867" stopColor="#e8f6ff" stopOpacity="0.29"/>
          <stop offset="0.2916" stopColor="#e8f6ff" stopOpacity="0.36"/>
          <stop offset="0.2966" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.3015" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.3064" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.3113" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.3163" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.3212" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.3261" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.3310" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.3360" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.3409" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.3458" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.3507" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.3557" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.3606" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.3655" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.3704" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.3754" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.3803" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.3852" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.3901" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.3951" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.4000" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.4049" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.4099" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.4148" stopColor="#e8f6ff" stopOpacity="0.37"/>
          <stop offset="0.4197" stopColor="#e8f6ff" stopOpacity="0.28"/>
          <stop offset="0.4246" stopColor="#e8f6ff" stopOpacity="0.18"/>
          <stop offset="0.4296" stopColor="#e8f6ff" stopOpacity="0.08"/>
          <stop offset="0.4345" stopColor="#e8f6ff" stopOpacity="0.01"/>
          <stop offset="0.4394" stopColor="#e9f5f8" stopOpacity="0.00"/>
          <stop offset="0.4443" stopColor="#efebba" stopOpacity="0.00"/>
          <stop offset="0.4493" stopColor="#f8dd64" stopOpacity="0.00"/>
          <stop offset="0.4542" stopColor="#fed326" stopOpacity="0.00"/>
          <stop offset="0.4591" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.4640" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.4690" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.4739" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.4788" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.4837" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.4887" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.4936" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.4985" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.5000" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.5015" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.5064" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.5113" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.5163" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.5212" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.5261" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.5310" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.5360" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.5409" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.5458" stopColor="#fed326" stopOpacity="0.00"/>
          <stop offset="0.5507" stopColor="#f8dd64" stopOpacity="0.00"/>
          <stop offset="0.5557" stopColor="#efebba" stopOpacity="0.00"/>
          <stop offset="0.5606" stopColor="#e9f5f8" stopOpacity="0.00"/>
          <stop offset="0.5655" stopColor="#e8f6ff" stopOpacity="0.01"/>
          <stop offset="0.5704" stopColor="#e8f6ff" stopOpacity="0.08"/>
          <stop offset="0.5754" stopColor="#e8f6ff" stopOpacity="0.18"/>
          <stop offset="0.5803" stopColor="#e8f6ff" stopOpacity="0.28"/>
          <stop offset="0.5852" stopColor="#e8f6ff" stopOpacity="0.37"/>
          <stop offset="0.5901" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.5951" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.6000" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.6049" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.6099" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.6148" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.6197" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.6246" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.6296" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.6345" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.6394" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.6443" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.6493" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.6542" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.6591" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.6640" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.6690" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.6739" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.6788" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.6837" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.6887" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.6936" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.6985" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.7034" stopColor="#e8f6ff" stopOpacity="0.40"/>
          <stop offset="0.7084" stopColor="#e8f6ff" stopOpacity="0.36"/>
          <stop offset="0.7133" stopColor="#e8f6ff" stopOpacity="0.29"/>
          <stop offset="0.7182" stopColor="#e8f6ff" stopOpacity="0.20"/>
          <stop offset="0.7232" stopColor="#e8f6ff" stopOpacity="0.11"/>
          <stop offset="0.7281" stopColor="#e8f6ff" stopOpacity="0.04"/>
          <stop offset="0.7330" stopColor="#e8f6ff" stopOpacity="0.00"/>
          <stop offset="0.7379" stopColor="#e9f5f7" stopOpacity="0.00"/>
          <stop offset="0.7429" stopColor="#ecf0da" stopOpacity="0.00"/>
          <stop offset="0.7478" stopColor="#f0e9b0" stopOpacity="0.00"/>
          <stop offset="0.7527" stopColor="#f5e281" stopOpacity="0.00"/>
          <stop offset="0.7576" stopColor="#fada53" stopOpacity="0.00"/>
          <stop offset="0.7626" stopColor="#fdd530" stopOpacity="0.00"/>
          <stop offset="0.7675" stopColor="#ffd220" stopOpacity="0.00"/>
          <stop offset="0.7724" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.7773" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.7823" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.7872" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.7921" stopColor="#ffd21f" stopOpacity="0.00"/>
          <stop offset="0.7970" stopColor="#ffd21f" stopOpacity="0.00"/>
        </linearGradient>
        <filter id="np-vg-xwide" filterUnits="userSpaceOnUse" x="-100" y="-100" width="2230" height="680"><feGaussianBlur stdDeviation="22"/></filter>
        <filter id="np-vg-wide"  filterUnits="userSpaceOnUse" x="-100" y="-100" width="2230" height="680"><feGaussianBlur stdDeviation="11"/></filter>
        <filter id="np-vg-mid"   filterUnits="userSpaceOnUse" x="-100" y="-100" width="2230" height="680"><feGaussianBlur stdDeviation="4.5"/></filter>
        <filter id="np-vg-tight" filterUnits="userSpaceOnUse" x="-100" y="-100" width="2230" height="680"><feGaussianBlur stdDeviation="1.8"/></filter>

        <linearGradient id="np-gapfade-g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="2030" y2="0">
          <stop offset="0"     stopColor="#000"/>
          <stop offset=".1970" stopColor="#000"/>
          <stop offset=".2560" stopColor="#fff"/>
          <stop offset=".7440" stopColor="#fff"/>
          <stop offset=".8030" stopColor="#000"/>
          <stop offset="1"     stopColor="#000"/>
        </linearGradient>
        <mask id="np-gapfade" maskUnits="userSpaceOnUse" x="0" y="0" width="2030" height="90">
          <rect x="0" y="0" width="2030" height="90" fill="url(#np-gapfade-g)"/>
        </mask>
        <mask id="np-outside" maskUnits="userSpaceOnUse" x="-100" y="-100" width="2230" height="680">
          <rect x="-100" y="-100" width="2230" height="680" fill="#fff"/>
          <use href="#np-outline" fill="#000"/>
        </mask>
        <clipPath id="np-clip"><use href="#np-outline"/></clipPath>

        <linearGradient id="np-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0"   stopColor="#01142a"/>
          <stop offset=".45" stopColor="#000f21"/>
          <stop offset="1"   stopColor="#011c3e"/>
        </linearGradient>
        <radialGradient id="np-topglow" cx=".5" cy="0" r=".7">
          <stop offset="0" stopColor="#1aa6ff" stopOpacity=".04"/>
          <stop offset="1" stopColor="#1aa6ff" stopOpacity="0"/>
        </radialGradient>
        <linearGradient id="np-stroke" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="2030" y2="0">
          <stop offset="0"   stopColor="#1670e6"/>
          <stop offset=".07" stopColor="#1a72ec"/>
          <stop offset=".17" stopColor="#34bcff"/>
          <stop offset=".27" stopColor="#1a6fe0"/>
          <stop offset=".36" stopColor="#1b4fa8"/>
          <stop offset=".43" stopColor="#8f9aa0"/>
          <stop offset=".50" stopColor="#e2cf86"/>
          <stop offset=".57" stopColor="#8f9aa0"/>
          <stop offset=".64" stopColor="#1b4fa8"/>
          <stop offset=".73" stopColor="#1a6fe0"/>
          <stop offset=".83" stopColor="#34bcff"/>
          <stop offset=".93" stopColor="#1a72ec"/>
          <stop offset="1"   stopColor="#1670e6"/>
        </linearGradient>
        <linearGradient id="np-stroke-blue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0"  stopColor="#2fb4ff"/>
          <stop offset=".6" stopColor="#1b78ee"/>
          <stop offset="1"  stopColor="#2aa8ff"/>
        </linearGradient>
        <clipPath id="np-core"><rect x="150" y="0" width="360" height="50"/><rect x="1520" y="0" width="360" height="50"/></clipPath>
        <clipPath id="np-toponly"><rect x="0" y="0" width="2030" height="90"/></clipPath>
        <clipPath id="np-topfar"><rect x="0" y="0" width="860" height="90"/><rect x="1170" y="0" width="860" height="90"/></clipPath>
        <clipPath id="np-topmid"><rect x="860" y="0" width="310" height="90"/></clipPath>
        <linearGradient id="np-thickfade" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="2030" y2="0">
          <stop offset="0"   stopColor="#fff"/>
          <stop offset=".22" stopColor="#fff"/>
          <stop offset=".31" stopColor="#000"/>
          <stop offset=".69" stopColor="#000"/>
          <stop offset=".78" stopColor="#fff"/>
          <stop offset="1"   stopColor="#fff"/>
        </linearGradient>
        <mask id="np-thickmask" maskUnits="userSpaceOnUse" x="0" y="0" width="2030" height="90">
          <rect x="0" y="0" width="2030" height="90" fill="url(#np-thickfade)"/>
        </mask>
        <clipPath id="np-bottom"><rect x="0" y="90" width="2030" height="360"/></clipPath>
        {/* warna abu-hangat di tengah panel (area notch) */}
        <radialGradient id="np-warm" cx=".5" cy="0" r=".5">
          <stop offset="0" stopColor="#0d3f85" stopOpacity=".22"/>
          <stop offset=".5" stopColor="#0b3270" stopOpacity=".08"/>
          <stop offset="1" stopColor="#0a2c60" stopOpacity="0"/>
        </radialGradient>
        {/* strip sisi: cyan -> emas -> cyan */}
        <linearGradient id="np-side" gradientUnits="userSpaceOnUse" x1="0" y1="80" x2="0" y2="316">
          <stop offset="0"   stopColor="#09f3f7" stopOpacity="0"/>
          <stop offset=".08" stopColor="#09f3f7"/>
          <stop offset=".26" stopColor="#09f3f7"/>
          <stop offset=".38" stopColor="#fde509"/>
          <stop offset=".56" stopColor="#fde509"/>
          <stop offset=".68" stopColor="#09f3f7"/>
          <stop offset=".92" stopColor="#09f3f7"/>
          <stop offset="1"   stopColor="#09f3f7" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="np-thin" x1="0" x2="1">
          <stop offset="0"  stopColor="#1aa6ff" stopOpacity="0"/>
          <stop offset=".08" stopColor="#1aa6ff" stopOpacity=".5"/>
          <stop offset=".92" stopColor="#1aa6ff" stopOpacity=".5"/>
          <stop offset="1"  stopColor="#1aa6ff" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="np-hline" x1="0" x2="1">
          <stop offset="0"  stopColor="#1aa6ff" stopOpacity="0"/>
          <stop offset=".5" stopColor="#1aa6ff" stopOpacity=".75"/>
          <stop offset="1"  stopColor="#1aa6ff" stopOpacity="0"/>
        </linearGradient>
        <radialGradient id="np-refl" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#1aa6ff" stopOpacity=".4"/>
          <stop offset="1" stopColor="#1aa6ff" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="np-orange" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#ff9a1f" stopOpacity=".55"/>
          <stop offset="1" stopColor="#ff9a1f" stopOpacity="0"/>
        </radialGradient>
        <pattern id="np-dots" width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#3a8cff" opacity=".18"/>
        </pattern>

        <filter id="np-blur" filterUnits="userSpaceOnUse" x="-100" y="-100" width="2230" height="680">
          <feGaussianBlur stdDeviation="7"/>
        </filter>
        <filter id="np-blur-sm" filterUnits="userSpaceOnUse" x="-100" y="-100" width="2230" height="680">
          <feGaussianBlur stdDeviation="3.5"/>
        </filter>
        <filter id="np-blur-xl" filterUnits="userSpaceOnUse" x="-100" y="-100" width="2230" height="680">
          <feGaussianBlur stdDeviation="24"/>
        </filter>
        <filter id="np-blur-lg" filterUnits="userSpaceOnUse" x="-100" y="-100" width="2230" height="680">
          <feGaussianBlur stdDeviation="16"/>
        </filter>

        {/* ===== SISI: relung heksa + dinding emas ===== */}
        <radialGradient id="np-haze" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#ff9a1f" stopOpacity=".3"/>
          <stop offset="1" stopColor="#ff9a1f" stopOpacity="0"/>
        </radialGradient>

        {/* ===== SISI: braket cyan + relung kaca + bar emas + busur sudut (geometri dari mockup) ===== */}
        <linearGradient id="np-bk-g" gradientUnits="userSpaceOnUse" x1="0" y1="76" x2="0" y2="337">
          <stop offset="0"    stopColor="#3be0ff"/>
          <stop offset=".146" stopColor="#27d3ff"/>
          <stop offset=".199" stopColor="#1fc2ff"/>
          <stop offset=".284" stopColor="#1aa8ff"/>
          <stop offset=".379" stopColor="#1a8cff"/>
          <stop offset=".494" stopColor="#2b78e6" stopOpacity=".85"/>
          <stop offset=".628" stopColor="#2b72de" stopOpacity=".55"/>
          <stop offset=".697" stopColor="#3a8ae6" stopOpacity=".6"/>
          <stop offset=".751" stopColor="#3aa0f0" stopOpacity=".85"/>
          <stop offset=".808" stopColor="#22c0ff"/>
          <stop offset="1"    stopColor="#2ad2ff"/>
        </linearGradient>
        <linearGradient id="np-gold-g" gradientUnits="userSpaceOnUse" x1="0" y1="123" x2="0" y2="293">
          <stop offset="0"    stopColor="#3fd0ff" stopOpacity=".9"/>
          <stop offset=".044" stopColor="#3fd0ff"/>
          <stop offset=".21"  stopColor="#ffd21f"/>
          <stop offset=".49"  stopColor="#ffe14a"/>
          <stop offset=".78"  stopColor="#ffd21f"/>
          <stop offset=".943" stopColor="#3fd0ff"/>
          <stop offset="1"    stopColor="#3fd0ff" stopOpacity=".9"/>
        </linearGradient>
        <linearGradient id="np-gold-hl" gradientUnits="userSpaceOnUse" x1="0" y1="123" x2="0" y2="293">
          <stop offset="0"   stopColor="#fff6c0" stopOpacity="0"/>
          <stop offset=".25" stopColor="#fff6c0" stopOpacity=".8"/>
          <stop offset=".75" stopColor="#fff6c0" stopOpacity=".8"/>
          <stop offset="1"   stopColor="#fff6c0" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="np-glassfill" gradientUnits="userSpaceOnUse" x1="-4" y1="0" x2="26" y2="0">
          <stop offset="0"  stopColor="#33290f"/>
          <stop offset=".45" stopColor="#142030"/>
          <stop offset="1"  stopColor="#0b1626"/>
        </linearGradient>
        <radialGradient id="np-warm2" cx="0" cy=".5" r="1">
          <stop offset="0" stopColor="#ffb400" stopOpacity=".55"/>
          <stop offset="1" stopColor="#ffb400" stopOpacity="0"/>
        </radialGradient>
        <linearGradient id="np-dotline" gradientUnits="userSpaceOnUse" x1="38" y1="0" x2="110" y2="0">
          <stop offset="0" stopColor="#ff9a1f" stopOpacity=".6"/>
          <stop offset="1" stopColor="#3a8cff" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="np-oarc-g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="130" y2="0">
          <stop offset="0"   stopColor="#25c6ff"/>
          <stop offset=".38" stopColor="#25c6ff"/>
          <stop offset="1"   stopColor="#25c6ff" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="np-iarc-g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="345" y2="0">
          <stop offset="0"    stopColor="#22c8ff"/>
          <stop offset=".05"  stopColor="#22c8ff"/>
          <stop offset=".11"  stopColor="#5cd0e6"/>
          <stop offset=".15"  stopColor="#c9e29c"/>
          <stop offset=".172" stopColor="#ffd21f"/>
          <stop offset=".40"  stopColor="#ffb400" stopOpacity=".9"/>
          <stop offset="1"    stopColor="#ffb400" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="np-bk2" gradientUnits="userSpaceOnUse" x1="0" y1="56" x2="0" y2="350">
          <stop offset="0"    stopColor="#3be0ff" stopOpacity="0"/>
          <stop offset=".07"  stopColor="#3be0ff"/>
          <stop offset=".19"  stopColor="#27d3ff"/>
          <stop offset=".25"  stopColor="#1fc2ff"/>
          <stop offset=".33"  stopColor="#1aa8ff"/>
          <stop offset=".41"  stopColor="#1a8cff"/>
          <stop offset=".51"  stopColor="#2b78e6" stopOpacity=".9"/>
          <stop offset=".63"  stopColor="#2b72de" stopOpacity=".7"/>
          <stop offset=".70"  stopColor="#3a8ae6" stopOpacity=".75"/>
          <stop offset=".76"  stopColor="#3aa0f0" stopOpacity=".9"/>
          <stop offset=".82"  stopColor="#22c0ff"/>
          <stop offset=".95"  stopColor="#2ad2ff"/>
          <stop offset="1"    stopColor="#2ad2ff" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="np-pocketfill" gradientUnits="userSpaceOnUse" x1="-2" y1="0" x2="37" y2="0">
          <stop offset="0"   stopColor="#241f10"/>
          <stop offset=".35" stopColor="#0b1626"/>
          <stop offset="1"   stopColor="#020a15"/>
        </linearGradient>
        <clipPath id="np-capT"><rect x="-10" y="38" width="50" height="52"/></clipPath>
        <clipPath id="np-capB"><rect x="-10" y="312" width="50" height="59"/></clipPath>
        <linearGradient id="np-capTg" gradientUnits="userSpaceOnUse" x1="0" y1="38" x2="0" y2="90">
          <stop offset="0" stopColor="#2fbfff" stopOpacity="0"/>
          <stop offset=".54" stopColor="#3be0ff"/>
          <stop offset="1" stopColor="#3be0ff"/>
        </linearGradient>
        <linearGradient id="np-capBg" gradientUnits="userSpaceOnUse" x1="0" y1="312" x2="0" y2="371">
          <stop offset="0" stopColor="#3be0ff"/>
          <stop offset=".15" stopColor="#3be0ff"/>
          <stop offset="1" stopColor="#2fbfff" stopOpacity="0"/>
        </linearGradient>
        <clipPath id="np-pocket"><polygon points="1,114 37,150 37,270 1,306"/></clipPath>
        {/* mask: sembunyikan garis outline lama di area modul (modul punya garis sendiri) */}
        <linearGradient id="np-gg-fade" gradientUnits="userSpaceOnUse" x1="0" y1="50" x2="0" y2="347">
          <stop offset="0"    stopColor="#000" stopOpacity="0"/>
          <stop offset=".034" stopColor="#000" stopOpacity="0"/>
          <stop offset=".074" stopColor="#000" stopOpacity=".9"/>
          <stop offset=".926" stopColor="#000" stopOpacity=".9"/>
          <stop offset=".966" stopColor="#000" stopOpacity="0"/>
          <stop offset="1"    stopColor="#000" stopOpacity="0"/>
        </linearGradient>
        <mask id="np-glowgap" maskUnits="userSpaceOnUse" x="-200" y="-200" width="2430" height="900">
          <rect x="-200" y="-200" width="2430" height="900" fill="#fff"/>
          <rect x="-30" y="50" width="82" height="297" fill="url(#np-gg-fade)"/>
          <rect x="1978" y="50" width="82" height="297" fill="url(#np-gg-fade)"/>
        </mask>
        <mask id="np-nomodule" maskUnits="userSpaceOnUse" x="-200" y="-200" width="2430" height="900">
          <rect x="-200" y="-200" width="2430" height="900" fill="#fff"/>
          <rect x="-30" y="90" width="82" height="222" fill="#000"/>
          <rect x="1978" y="90" width="82" height="222" fill="#000"/>
        </mask>

        <linearGradient id="np-iline-g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="2030" y2="0">
          <stop offset="0.0000" stopColor="#22c8ff"/>
          <stop offset="0.0084" stopColor="#22c8ff"/>
          <stop offset="0.0187" stopColor="#5cd0e6"/>
          <stop offset="0.0255" stopColor="#c9e29c"/>
          <stop offset="0.0290" stopColor="#ffe02a"/>
          <stop offset="0.0600" stopColor="#ffd21f"/>
          <stop offset="0.0850" stopColor="#ffb400" stopOpacity="0.95"/>
          <stop offset="0.1080" stopColor="#b87d22" stopOpacity="0.6"/>
          <stop offset="0.1370" stopColor="#4a6788" stopOpacity="0.5"/>
          <stop offset="0.1700" stopColor="#1c5cb8" stopOpacity="0.45"/>
          <stop offset="0.2400" stopColor="#1858b0" stopOpacity="0.4"/>
          <stop offset="0.5000" stopColor="#1858b0" stopOpacity="0.38"/>
          <stop offset="0.7600" stopColor="#1858b0" stopOpacity="0.4"/>
          <stop offset="0.8300" stopColor="#1c5cb8" stopOpacity="0.45"/>
          <stop offset="0.8630" stopColor="#4a6788" stopOpacity="0.5"/>
          <stop offset="0.8920" stopColor="#b87d22" stopOpacity="0.6"/>
          <stop offset="0.9150" stopColor="#ffb400" stopOpacity="0.95"/>
          <stop offset="0.9400" stopColor="#ffd21f"/>
          <stop offset="0.9710" stopColor="#ffe02a"/>
          <stop offset="0.9745" stopColor="#c9e29c"/>
          <stop offset="0.9813" stopColor="#5cd0e6"/>
          <stop offset="0.9916" stopColor="#22c8ff"/>
          <stop offset="1.0000" stopColor="#22c8ff"/>
          </linearGradient>
        <linearGradient id="np-iline-core" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="2030" y2="0">
          <stop offset="0.0000" stopColor="#e8f6ff" stopOpacity="0"/>
          <stop offset="0.1200" stopColor="#e8f6ff" stopOpacity="0"/>
          <stop offset="0.2000" stopColor="#e8f6ff" stopOpacity="0.12"/>
          <stop offset="0.5000" stopColor="#e8f6ff" stopOpacity="0.12"/>
          <stop offset="0.8000" stopColor="#e8f6ff" stopOpacity="0.12"/>
          <stop offset="0.8800" stopColor="#e8f6ff" stopOpacity="0"/>
          <stop offset="1.0000" stopColor="#e8f6ff" stopOpacity="0"/>
          </linearGradient>
        <linearGradient id="np-ocore-g" gradientUnits="userSpaceOnUse" x1="72" y1="0" x2="1958" y2="0">
          <stop offset="0"   stopColor="#d6f2ff" stopOpacity="0"/>
          <stop offset=".05" stopColor="#d6f2ff" stopOpacity=".7"/>
          <stop offset=".95" stopColor="#d6f2ff" stopOpacity=".7"/>
          <stop offset="1"   stopColor="#d6f2ff" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="np-oline-g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="2030" y2="0">
          <stop offset="0.0000" stopColor="#2fc8ff" stopOpacity="0"/>
          <stop offset="0.0040" stopColor="#2fc8ff" stopOpacity="0"/>
          <stop offset="0.0340" stopColor="#2fc8ff"/>
          <stop offset="0.1400" stopColor="#27c6ff"/>
          <stop offset="0.2000" stopColor="#4fd0ff"/>
          <stop offset="0.2900" stopColor="#1b9cf0" stopOpacity="0.95"/>
          <stop offset="0.3600" stopColor="#1370cc" stopOpacity="0.8"/>
          <stop offset="0.4400" stopColor="#0b4f9e" stopOpacity="0.62"/>
          <stop offset="0.5000" stopColor="#0b4a96" stopOpacity="0.6"/>
          <stop offset="0.5600" stopColor="#0b4f9e" stopOpacity="0.62"/>
          <stop offset="0.6400" stopColor="#1370cc" stopOpacity="0.8"/>
          <stop offset="0.7100" stopColor="#1b9cf0" stopOpacity="0.95"/>
          <stop offset="0.8000" stopColor="#4fd0ff"/>
          <stop offset="0.8600" stopColor="#27c6ff"/>
          <stop offset="0.9660" stopColor="#2fc8ff"/>
          <stop offset="0.9960" stopColor="#2fc8ff" stopOpacity="0"/>
          <stop offset="1.0000" stopColor="#2fc8ff" stopOpacity="0"/>
          </linearGradient>
        <linearGradient id="np-oline-core" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="2030" y2="0">
          <stop offset="0.0000" stopColor="#d6f2ff" stopOpacity="0"/>
          <stop offset="0.0040" stopColor="#d6f2ff" stopOpacity="0"/>
          <stop offset="0.0500" stopColor="#d6f2ff" stopOpacity="0.45"/>
          <stop offset="0.1400" stopColor="#d6f2ff" stopOpacity="0.6"/>
          <stop offset="0.1900" stopColor="#d6f2ff" stopOpacity="0.7"/>
          <stop offset="0.2600" stopColor="#d6f2ff" stopOpacity="0.5"/>
          <stop offset="0.3400" stopColor="#d6f2ff" stopOpacity="0.12"/>
          <stop offset="0.4200" stopColor="#d6f2ff" stopOpacity="0"/>
          <stop offset="0.5000" stopColor="#d6f2ff" stopOpacity="0"/>
          <stop offset="0.5800" stopColor="#d6f2ff" stopOpacity="0"/>
          <stop offset="0.6600" stopColor="#d6f2ff" stopOpacity="0.12"/>
          <stop offset="0.7400" stopColor="#d6f2ff" stopOpacity="0.5"/>
          <stop offset="0.8100" stopColor="#d6f2ff" stopOpacity="0.7"/>
          <stop offset="0.8600" stopColor="#d6f2ff" stopOpacity="0.6"/>
          <stop offset="0.9500" stopColor="#d6f2ff" stopOpacity="0.45"/>
          <stop offset="0.9960" stopColor="#d6f2ff" stopOpacity="0"/>
          <stop offset="1.0000" stopColor="#d6f2ff" stopOpacity="0"/>
          </linearGradient>
        <linearGradient id="np-bf-g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="2030" y2="0">
          <stop offset="0"    stopColor="#000" stopOpacity="0"/>
          <stop offset=".07"  stopColor="#000" stopOpacity="0"/>
          <stop offset=".22"  stopColor="#000" stopOpacity=".88"/>
          <stop offset=".78"  stopColor="#000" stopOpacity=".88"/>
          <stop offset=".93"  stopColor="#000" stopOpacity="0"/>
          <stop offset="1"    stopColor="#000" stopOpacity="0"/>
        </linearGradient>
        <mask id="np-bottomfade" maskUnits="userSpaceOnUse" x="-200" y="-200" width="2430" height="900">
          <rect x="-200" y="-200" width="2430" height="900" fill="#fff"/>
          <rect x="0" y="368" width="2030" height="40" fill="url(#np-bf-g)"/>
        </mask>



        {/* ===== BRAKET SISI (ukuran dari mockup): tutup atas/bawah di dinding, diagonal 45° ke rel tegak pendek ===== */}
        <linearGradient id="np-brk-g" gradientUnits="userSpaceOnUse" x1="0" y1="74" x2="0" y2="335">
          <stop offset="0"   stopColor="#2eeaff"/>
          <stop offset=".12" stopColor="#18e2ff"/>
          <stop offset=".24" stopColor="#14dcff"/>
          <stop offset=".29" stopColor="#16c4ff"/>
          <stop offset=".34" stopColor="#1a98ff"/>
          <stop offset=".47" stopColor="#1a8cff"/>
          <stop offset=".62" stopColor="#2f7ce6"/>
          <stop offset=".76" stopColor="#3d70c8"/>
          <stop offset=".86" stopColor="#2b86e6"/>
          <stop offset=".92" stopColor="#10c4ff"/>
          <stop offset="1"   stopColor="#10e4ff"/>
        </linearGradient>
        <clipPath id="np-brk-sh"><rect x="-30" y="114" width="90" height="189"/></clipPath>
        <polygon id="np-brk" points="-6.0,81.5 -0.8,74.3 2.8,74.3 2.8,114.2 39.6,150.5 39.6,267.8 2.8,303.0 2.8,335.0 1.0,335.0 -6.0,330.5 -6.0,301.6 33.4,265.2 33.4,153.6 -6.0,114.2"/>


        {/* ===== v10: gradien khusus modul sisi ===== */}
        <linearGradient id="np-gold-v" gradientUnits="userSpaceOnUse" x1="0" y1="146" x2="0" y2="270">
          <stop offset="0" stopColor="#ffb400" stopOpacity="0"/>
          <stop offset=".22" stopColor="#ffc21a" stopOpacity=".75"/>
          <stop offset=".5" stopColor="#ffe14a"/>
          <stop offset=".78" stopColor="#ffc21a" stopOpacity=".75"/>
          <stop offset="1" stopColor="#ffb400" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="np-gold-core" gradientUnits="userSpaceOnUse" x1="0" y1="172" x2="0" y2="244">
          <stop offset="0" stopColor="#fff6c4" stopOpacity="0"/>
          <stop offset=".5" stopColor="#fff6c4"/>
          <stop offset="1" stopColor="#fff6c4" stopOpacity="0"/>
        </linearGradient>
        <radialGradient id="np-gold-halo" gradientUnits="userSpaceOnUse" cx="-2" cy="208" r="1" gradientTransform="translate(-2 208) scale(34 78) translate(2 -208)">
          <stop offset="0" stopColor="#ffb400" stopOpacity=".95"/>
          <stop offset=".35" stopColor="#e08a00" stopOpacity=".55"/>
          <stop offset="1" stopColor="#b86a00" stopOpacity="0"/>
        </radialGradient>
        <linearGradient id="np-glass" gradientUnits="userSpaceOnUse" x1="7" y1="130" x2="30" y2="290">
          <stop offset="0" stopColor="#2c5280" stopOpacity=".92"/>
          <stop offset=".45" stopColor="#143457" stopOpacity=".85"/>
          <stop offset="1" stopColor="#0a2038" stopOpacity=".85"/>
        </linearGradient>

        {/* ===== v14: kaca trapesium + strip emas (sesuai mockup, tidak menyentuh braket) ===== */}
        <clipPath id="np-tz"><polygon points="-5.0,120.0 30.0,155.0 30.0,263.7 -5.0,296.0"/></clipPath>
        <linearGradient id="np-tz-fill" gradientUnits="userSpaceOnUse" x1="-5" y1="0" x2="30.0" y2="0">
          <stop offset="0"   stopColor="#4a3510" stopOpacity=".95"/>
          <stop offset=".25" stopColor="#18243a" stopOpacity=".96"/>
          <stop offset=".6"  stopColor="#0f1a2c" stopOpacity=".97"/>
          <stop offset="1"   stopColor="#0b1422" stopOpacity=".98"/>
        </linearGradient>
        <linearGradient id="np-tz-sheen" gradientUnits="userSpaceOnUse" x1="0" y1="120.0" x2="30" y2="169.0">
          <stop offset="0" stopColor="#9cc4e6" stopOpacity=".20"/>
          <stop offset=".5" stopColor="#7fb0d8" stopOpacity=".07"/>
          <stop offset="1" stopColor="#7fb0d8" stopOpacity="0"/>
        </linearGradient>
        <radialGradient id="np-tz-warm" gradientUnits="userSpaceOnUse" cx="-3" cy="208.0" r="1" gradientTransform="translate(-3 208.0) scale(30 74) translate(3 -208.0)">
          <stop offset="0"   stopColor="#ffb21a" stopOpacity=".62"/>
          <stop offset=".35" stopColor="#d98200" stopOpacity=".30"/>
          <stop offset="1"   stopColor="#8a4a00" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="np-tz-halo" gradientUnits="userSpaceOnUse" cx="-5" cy="208.0" r="1" gradientTransform="translate(-5 208.0) scale(17 64) translate(5 -208.0)">
          <stop offset="0"   stopColor="#ffb400" stopOpacity=".55"/>
          <stop offset=".45" stopColor="#e08a00" stopOpacity=".22"/>
          <stop offset="1"   stopColor="#b86a00" stopOpacity="0"/>
        </radialGradient>
        <linearGradient id="np-tz-gold" gradientUnits="userSpaceOnUse" x1="0" y1="130.0" x2="0" y2="286.0">
          <stop offset="0"   stopColor="#b86a00" stopOpacity="0"/>
          <stop offset=".18" stopColor="#f0a000" stopOpacity=".8"/>
          <stop offset=".5"  stopColor="#ffe14a"/>
          <stop offset=".82" stopColor="#f0a000" stopOpacity=".8"/>
          <stop offset="1"   stopColor="#b86a00" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="np-tz-core" gradientUnits="userSpaceOnUse" x1="0" y1="164.0" x2="0" y2="252.0">
          <stop offset="0" stopColor="#fff2a8" stopOpacity="0"/>
          <stop offset=".5" stopColor="#fff6c4"/>
          <stop offset="1" stopColor="#fff2a8" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="np-tz-edge" gradientUnits="userSpaceOnUse" x1="0" y1="120.0" x2="0" y2="296.0">
          <stop offset="0" stopColor="#9fe6ff" stopOpacity=".15"/>
          <stop offset=".12" stopColor="#9fe6ff" stopOpacity=".85"/>
          <stop offset=".88" stopColor="#9fe6ff" stopOpacity=".85"/>
          <stop offset="1" stopColor="#9fe6ff" stopOpacity=".15"/>
        </linearGradient>

        <linearGradient id="np-tz-gh" gradientUnits="userSpaceOnUse" x1="-4.2" y1="0" x2="4.6" y2="0">
          <stop offset="0"   stopColor="#fff"/>
          <stop offset=".35" stopColor="#fff"/>
          <stop offset="1"   stopColor="#000"/>
        </linearGradient>
        <mask id="np-tz-gm" maskUnits="userSpaceOnUse" x="-12" y="100" width="40" height="220">
          <rect x="-12" y="100" width="40" height="220" fill="url(#np-tz-gh)"/>
        </mask>
        <linearGradient id="np-tz-bezel" gradientUnits="userSpaceOnUse" x1="-5" y1="120" x2="30" y2="296">
          <stop offset="0"   stopColor="#c3d9ec"/>
          <stop offset=".3"  stopColor="#8eacc6"/>
          <stop offset=".7"  stopColor="#668aa8"/>
          <stop offset="1"   stopColor="#4f6f8d"/>
        </linearGradient>
        <linearGradient id="np-tz-slab" gradientUnits="userSpaceOnUse" x1="0" y1="132" x2="0" y2="285">
          <stop offset="0"   stopColor="#2d4a65" stopOpacity=".9"/>
          <stop offset=".45" stopColor="#1a2e44" stopOpacity=".75"/>
          <stop offset="1"   stopColor="#14233a" stopOpacity=".55"/>
        </linearGradient>
        <linearGradient id="np-tz-fl" gradientUnits="userSpaceOnUse" x1="-5" y1="0" x2="12" y2="0">
          <stop offset="0"   stopColor="#000"/>
          <stop offset=".35" stopColor="#000"/>
          <stop offset="1"   stopColor="#fff"/>
        </linearGradient>
        <mask id="np-tz-fadeL" maskUnits="userSpaceOnUse" x="-20" y="100" width="70" height="210">
          <rect x="-20" y="100" width="70" height="210" fill="url(#np-tz-fl)"/>
        </mask>
        <g id="np-accent" fill="none" strokeLinejoin="miter">
          {/* haze oranye di dalam pojok bawah */}
          <g clipPath="url(#np-clip)"><ellipse cx="90" cy="381" rx="260" ry="30" fill="url(#np-haze)" stroke="none"/></g>
          {/* relung gelap (rel tegak di x=37) */}
          <polygon points="1,114 37,150 37,270 1,306" fill="url(#np-pocketfill)" stroke="none"/>


          {/* ujung garis luar: menguat ke cyan lalu berhenti tegas (butt) sebelum celah ke modul */}
          <g clipPath="url(#np-capT)"><use href="#np-outline" fill="none" stroke="url(#np-capTg)" strokeWidth="3.6" strokeLinejoin="round"/></g>
          <g clipPath="url(#np-capB)"><use href="#np-outline" fill="none" stroke="url(#np-capBg)" strokeWidth="3.6" strokeLinejoin="round"/></g>





          {/* BRAKET CYAN (bentuk dari mockup): bayangan sisi dalam + glow + badan */}
          <g clipPath="url(#np-brk-sh)"><use href="#np-brk" transform="translate(-2.2 0.4)" fill="#010a1a" stroke="#010a1a" strokeWidth="1.6" opacity=".9"/></g>
          <use href="#np-brk" fill="url(#np-brk-g)" stroke="url(#np-brk-g)" strokeWidth="5" opacity=".75" filter="url(#np-blur)"/>
          <use href="#np-brk" fill="url(#np-brk-g)"/>

          {/* celah gelap antara kaca & braket (menutup glow cyan yang bocor ke lubang braket) */}
          <polygon points="-5.5,115.4 32.9,153.8 32.9,265.0 -5.5,300.5" fill="#020a16" opacity=".93" stroke="none"/>
          {/* halo hangat di luar dinding (kiri modul) */}
          <ellipse cx="-5" cy="208.0" rx="17" ry="64" fill="url(#np-tz-halo)" stroke="none"/>

          {/* KACA TRAPESIUM (desain baru dari referensi): tidak menyentuh braket */}
          <polygon points="-5.0,120.0 30.0,155.0 30.0,263.7 -5.0,296.0" fill="url(#np-tz-fill)" stroke="none"/>
          <g clipPath="url(#np-tz)" stroke="none">
            <polygon points="-5.0,120.0 30.0,155.0 30.0,263.7 -5.0,296.0" fill="url(#np-tz-sheen)"/>
            {/* panel samping kiri yang lebih terang, potongan miring sejajar bezel */}
            <polygon points="1.0,132.7 6.7,138.4 6.7,279.4 1.0,284.3" fill="url(#np-tz-slab)"/>
            <ellipse cx="-3" cy="208.0" rx="30" ry="74" fill="url(#np-tz-warm)"/>
          </g>

          {/* garis sirkuit: tegak kiri (bercelah di sekitar belah ketupat, ada titik-titik) */}
          <g clipPath="url(#np-tz)" stroke="#7fa3c0" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M6.7 138.6 V187.8" strokeOpacity=".7" strokeWidth=".45"/>
            <path d="M6.7 210.5 V279.4" strokeOpacity=".7" strokeWidth=".45"/>
            <g fill="#7fa3c0" fillOpacity=".7" stroke="none">
              <circle cx="6.7" cy="206.2" r=".28"/><circle cx="6.7" cy="207.4" r=".24"/>
              <circle cx="6.7" cy="208.4" r=".2"/><circle cx="6.7" cy="209.4" r=".17"/>
            </g>
            {/* jalur diagonal ke atas lalu tegak kanan sampai penanda */}
            <path d="M6.7 242.1 L22.8 227.2 V184.8" stroke="#8fb0cc" strokeOpacity=".85" strokeWidth=".7"/>
            <path d="M20.2 152.5 V161.6" strokeOpacity=".55" strokeWidth=".4"/>
            {/* busur putus-putus di belakang belah ketupat */}
            <path d="M1.3 182.9 A21.4 16.8 0 0 1 22.7 199.7 A21.4 16.8 0 0 1 1.3 216.5" stroke="#e0a526" strokeOpacity=".5" strokeWidth=".32" strokeDasharray=".9 1.1"/>
          </g>
          {/* penanda jajar genjang */}
          <polygon points="20.2,176.6 23.2,176.6 23.2,184.8 20.2,181.8" fill="#3d5f7d" fillOpacity=".9" stroke="none"/>

          {/* belah ketupat bingkai baja + inti emas */}
          <path d="M6.8 192.4 L13.1 198.7 L6.8 205.0 L0.5 198.7 Z" fill="#0b1522" fillOpacity=".92" stroke="#e0a526" strokeWidth=".9"/>
          <circle cx="6.8" cy="198.7" r="3.2" fill="#ffb400" opacity=".28" stroke="none" filter="url(#np-blur-sm)"/>
          <path d="M6.8 197.5 L8.0 198.7 L6.8 199.9 L5.6 198.7 Z" fill="#ffc83a" stroke="none"/>

          {/* node cincin emas di jalur diagonal */}
          <circle cx="15.9" cy="233.9" r="2.4" fill="#ffb400" opacity=".35" stroke="none" filter="url(#np-blur-sm)"/>
          <circle cx="15.9" cy="233.9" r="1.15" fill="#fff3d0" stroke="#d9a43a" strokeWidth=".55"/>

          {/* garis tepi tipis biru (warna braket, dipudarkan): atas miring, kanan, bawah miring.
               sisi kiri tanpa bezel: hanya efek emas; ujung kiri garis memudar ke emas */}
          <g clipPath="url(#np-tz)" mask="url(#np-tz-fadeL)">
            <path d="M-5 120 L30 155 V263.7 L-5 296" stroke="url(#np-brk-g)" strokeWidth="3.4" opacity=".22" filter="url(#np-blur-sm)"/>
            <path d="M-5 120 L30 155 V263.7 L-5 296" stroke="url(#np-brk-g)" strokeWidth="1.8" opacity=".62" strokeLinejoin="miter"/>
          </g>
          {/* STRIP EMAS vertikal di tepi kiri kaca */}
          <g mask="url(#np-tz-gm)">
            <rect x="-4.2" y="130.0" width="9" height="156.0" fill="url(#np-tz-gold)" opacity=".9" stroke="none" filter="url(#np-blur-sm)"/>
            <rect x="-4.2" y="130.0" width="8" height="156.0" fill="url(#np-tz-gold)" stroke="none"/>
          </g>
          <path d="M-1.6 164.0 V252.0" stroke="url(#np-tz-core)" strokeWidth="1.6"/>

          {/* sudut bawah: busur luar cyan + busur dalam cyan -> emas */}



        </g>

      </defs>

      {/* pantulan di bawah panel */}
      {/* satu baris pantulan, sejajar di y=412: oranye di belakang, biru di depan */}
      <g id="np-reflect">
        <ellipse cx="190"  cy="412" rx="200" ry="11" fill="url(#np-orange)" filter="url(#np-blur-sm)"/>
        <ellipse cx="1840" cy="412" rx="200" ry="11" fill="url(#np-orange)" filter="url(#np-blur-sm)"/>
        <ellipse cx="1015" cy="412" rx="960" ry="14" fill="url(#np-refl)"/>
        <path d="M100 412 H1930" stroke="url(#np-hline)" strokeWidth="2.4" fill="none"/>
      </g>

      {/* badan panel */}
      <use href="#np-band" fill="#030b1a" stroke="none"/>
      <use href="#np-outline" fill="url(#np-fill)"/>
      <use href="#np-outline" fill="url(#np-topglow)"/>
      <use href="#np-outline" fill="url(#np-warm)"/>
      <rect x="0" y="0" width="2030" height="400" fill="url(#np-dots)" clipPath="url(#np-clip)" opacity=".5"/>

      {/* inner glow di dalam tepi */}
      <g clipPath="url(#np-clip)">
        <use href="#np-outline" fill="none" stroke="#1aa6ff" strokeWidth="56" opacity=".08" filter="url(#np-blur-xl)"/>
        <use href="#np-outline" fill="none" stroke="#1a8cff" strokeWidth="16" opacity=".26" filter="url(#np-blur)"/>
      </g>


      {/* outline utama + glow */}
      <g mask="url(#np-glowgap)"><use href="#np-outline" fill="none" stroke="#1aa6ff" strokeWidth="7" opacity=".38" filter="url(#np-blur-sm)"/></g>
      {/* celah di antara dua garis: bersih dari efek biru */}
      <use href="#np-gap" fill="#030b1a" stroke="none" mask="url(#np-gapfade)"/>
      {/* glow garis V paling atas: 3 lapis blur, hanya di luar panel */}
      <g mask="url(#np-outside)" fill="none" stroke="url(#np-vline)" strokeLinejoin="round" strokeLinecap="butt">
        <use href="#np-inner" strokeWidth="26" opacity=".22" filter="url(#np-vg-xwide)"/>
        <use href="#np-inner" strokeWidth="16" opacity=".42" filter="url(#np-vg-wide)"/>
        <use href="#np-inner" strokeWidth="8"  opacity=".62" filter="url(#np-vg-mid)"/>
        <use href="#np-inner" strokeWidth="4.5" opacity=".80" filter="url(#np-vg-tight)"/>
        <use href="#np-tips" fill="#ffd21f" stroke="#ffd21f" strokeWidth="22" opacity=".22" filter="url(#np-vg-xwide)"/>
        <use href="#np-tips" fill="#ffd21f" stroke="#ffd21f" strokeWidth="12" opacity=".42" filter="url(#np-vg-wide)"/>
        <use href="#np-tips" fill="#ffd21f" stroke="#ffd21f" strokeWidth="5"  opacity=".62" filter="url(#np-vg-mid)"/>
        <use href="#np-tips" fill="#ffd21f" stroke="none" opacity=".80" filter="url(#np-vg-tight)"/>
      </g>
      <g mask="url(#np-nomodule)">
      <g clipPath="url(#np-bottom)" mask="url(#np-bottomfade)">
        <use href="#np-outline" fill="none" stroke="url(#np-stroke-blue)" strokeWidth="3.2" strokeLinejoin="round"/>
        <use href="#np-outline" fill="none" stroke="#bfeaff" strokeWidth="0.9" opacity=".55" strokeLinejoin="round"/>
      </g>
      {/* inti cahaya tipis dekat anak tangga */}
      <g clipPath="url(#np-core)">
        <use href="#np-outline" fill="none" stroke="#b8ecff" strokeWidth="1.3" opacity=".75"/>
      </g>
      {/* tepi atas: biru di sisi, emas-metalik di tengah notch */}
      <g clipPath="url(#np-toponly)">
        <use href="#np-outline" fill="none" stroke="url(#np-stroke)" strokeWidth="2.2" strokeLinejoin="round"/>
      </g>
      <g clipPath="url(#np-toponly)" mask="url(#np-thickmask)">
        <use href="#np-outline" fill="none" stroke="url(#np-stroke)" strokeWidth="3.8" strokeLinejoin="round"/>
      </g>

      </g>
      {/* garis V paling atas: sheath warna + penebalan kuning + inti neon */}
      <g fill="none" strokeLinejoin="round" strokeLinecap="butt">
        <use href="#np-inner" stroke="url(#np-vline)"  strokeWidth="3"/>
        <use href="#np-inner" stroke="url(#np-vthick)" strokeWidth="6.6"/>
        <use href="#np-inner" stroke="url(#np-vcore)"  strokeWidth="1.2"/>
        <use href="#np-tips" fill="#ffd21f" stroke="none"/>
      </g>
      {/* GARIS BAWAH GANDA: luar (tepi container) + dalam (emas di ujung, biru di tengah) */}
      <path d="M1.5 300 V321 Q1.5 382 62 382 H1968 Q2028.5 382 2028.5 321 V300" stroke="url(#np-iline-g)" strokeWidth="7" fill="none" opacity=".4" filter="url(#np-blur-sm)" mask="url(#np-glowgap)"/>
      <path d="M1.5 300 V321 Q1.5 382 62 382 H1968 Q2028.5 382 2028.5 321 V300" stroke="url(#np-iline-g)" strokeWidth="3.4" fill="none" mask="url(#np-nomodule)"/>
      <path d="M1.5 300 V321 Q1.5 382 62 382 H1968 Q2028.5 382 2028.5 321 V300" stroke="url(#np-iline-core)" strokeWidth="1" fill="none" mask="url(#np-nomodule)"/>
      {/* garis LUAR (terpisah dari sisi, ada gap) */}
      <path d="M2.36 366.44 Q19.4 392 62 392 H1968 Q2010.6 392 2027.64 366.44" stroke="url(#np-oline-g)" strokeWidth="8" fill="none" opacity=".5" filter="url(#np-blur-sm)"/>
      <path d="M2.36 366.44 Q19.4 392 62 392 H1968 Q2010.6 392 2027.64 366.44" stroke="url(#np-oline-g)" strokeWidth="2.8" fill="none"/>
      <path d="M2.36 366.44 Q19.4 392 62 392 H1968 Q2010.6 392 2027.64 366.44" stroke="url(#np-oline-core)" strokeWidth="1" fill="none"/>
      {/* aksen kiri + cermin kanan */}
      <use href="#np-accent"/>
      <use href="#np-accent" transform="translate(2030 0) scale(-1 1)"/>
    </svg>

        {/* Content Area - strictly aligned to inset with mobile breathing room */}
        <div className="absolute inset-[6%_4%_11%_4%] sm:inset-[7%_4%_13%_4%] md:inset-[7%_4%_15%_4%] z-10 flex flex-col justify-between">
          {children}
        </div>
      </div>
    </div>
  );
}
