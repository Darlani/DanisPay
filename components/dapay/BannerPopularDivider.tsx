import React from "react";

/**
 * DaPay Banner -> Populer Premium Motion Divider (Phase 9.7.6)
 *
 * Source / Base Implementation: dapay-divider-premium-v2.html
 * Geometry Rebalance:
 * - WIDE + LOW PROFILE horizontal geometric housing plate
 *   - Desktop: width 360px, height 54px (total container ~54px)
 *   - Tablet: width 270px, height 46px (total container ~46px)
 *   - Mobile: width 190px, height 36px (total container ~36px)
 * - Proportions:
 *   - Long top & bottom horizontal edges
 *   - Sleek short side angles connecting seamlessly to continuous side baseline
 *   - Zero gap between horizontal lines and geometric housing vertices
 * - Center Diamond:
 *   - Desktop: 22px (20-24px range)
 *   - Tablet: 18px (18-20px range)
 *   - Mobile: 15px (14-17px range)
 *   - Subtle breathing pulse (scale 1.0 -> 1.04 -> 1.0)
 * - Motion Architecture (Preserved from v2):
 *   - Primary & secondary dual-direction light sweeps
 *   - Directional chevron inflow
 *   - Hex perimeter tracer with continuous stroke dash
 *   - Ambient backdrop breathe, orbit sparks, and expanding inner ring
 *   - Micro sparkle particles (hidden on mobile)
 * - Accessibility:
 *   - Full `prefers-reduced-motion: reduce` support
 */

export type BannerPopularDividerProps = {
  className?: string;
};

export default function BannerPopularDivider({ className = "" }: BannerPopularDividerProps) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      data-testid="banner-popular-divider"
      className={`relative w-full max-w-full overflow-hidden select-none pointer-events-none mt-1 mb-1 sm:mt-1.5 sm:mb-2 md:mt-2 md:mb-2.5 z-10 ${className}`}
    >
      <style jsx>{`
        /* DaPay Official Palette Tokens */
        .dapay-divider {
          --bg-dark: #080D1A;
          --gold-highlight: #FFE9B0;
          --gold-accent: #F2C14E;
          --gold-primary: #D49A2A;
          --gold-line: #87791F;
          --gold-dark: #3d3410;
          --glow-soft: rgba(245, 158, 11, 0.25);
          --glow-strong: rgba(255, 210, 120, 0.45);
          --glow-ambient: rgba(245, 158, 11, 0.08);

          position: relative;
          width: 100%;
          height: 54px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        /* 1. Ambient Horizontal Glow Backdrop */
        .backdrop {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 75%;
          height: 2px;
          transform: translate(-50%, -50%);
          background: radial-gradient(ellipse 100% 500% at 50% 50%, var(--glow-ambient), transparent 75%);
          filter: blur(6px);
          animation: backdropBreathe 3s ease-in-out infinite;
        }
        @keyframes backdropBreathe {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        /* 2. Seamless Baseline (Continuous fade at edges, full gold at housing tips) */
        .base-line {
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          height: 1px;
          transform: translateY(-50%);
          background: linear-gradient(90deg,
            transparent 0%,
            var(--gold-line) 8%,
            var(--gold-primary) 32%,
            var(--gold-accent) calc(50% - 172px),
            transparent calc(50% - 171px),
            transparent calc(50% + 171px),
            var(--gold-accent) calc(50% + 172px),
            var(--gold-primary) 68%,
            var(--gold-line) 92%,
            transparent 100%
          );
          opacity: 0.7;
        }
        .base-line.glow {
          height: 3px;
          filter: blur(3px);
          opacity: 0.35;
        }

        /* 3. Flanking Textured Dashed Tracks */
        .texture {
          position: absolute;
          left: 8%;
          right: 8%;
          top: 50%;
          height: 1px;
          transform: translateY(-50%);
          background-image: repeating-linear-gradient(90deg, var(--gold-dark) 0 3px, transparent 3px 9px);
          opacity: 0.35;
        }
        .texture.up { margin-top: -10px; }
        .texture.down { margin-top: 10px; }

        /* 4. Primary Inward Light Sweeps */
        .sweep {
          position: absolute;
          top: 50%;
          width: 240px;
          height: 2.5px;
          transform: translateY(-50%);
          border-radius: 3px;
          background: linear-gradient(90deg, transparent, var(--gold-highlight) 55%, var(--gold-accent) 100%);
          box-shadow: 0 0 16px 2px var(--glow-strong);
          opacity: 0;
        }
        .sweep.left {
          left: -240px;
          animation: sweepLeft 3s cubic-bezier(0.37, 0, 0.24, 1) infinite;
        }
        .sweep.right {
          right: -240px;
          transform: translateY(-50%) scaleX(-1);
          animation: sweepRight 3s cubic-bezier(0.37, 0, 0.24, 1) infinite;
        }
        @keyframes sweepLeft {
          0% { left: -240px; opacity: 0; }
          8% { opacity: 1; }
          44% { left: calc(50% - 180px); opacity: 1; }
          52% { opacity: 0; }
          100% { left: calc(50% - 180px); opacity: 0; }
        }
        @keyframes sweepRight {
          0% { right: -240px; opacity: 0; }
          8% { opacity: 1; }
          44% { right: calc(50% - 180px); opacity: 1; }
          52% { opacity: 0; }
          100% { right: calc(50% - 180px); opacity: 0; }
        }

        /* 5. Secondary Lagging Light Sweeps */
        .sweep2 {
          position: absolute;
          top: 50%;
          width: 150px;
          height: 1.5px;
          transform: translateY(-50%);
          border-radius: 2px;
          background: linear-gradient(90deg, transparent, var(--gold-accent) 60%, var(--gold-primary) 100%);
          box-shadow: 0 0 10px 1px var(--glow-soft);
          opacity: 0;
        }
        .sweep2.left {
          left: -150px;
          animation: sweep2Left 3s cubic-bezier(0.37, 0, 0.24, 1) infinite 0.18s;
        }
        .sweep2.right {
          right: -150px;
          transform: translateY(-50%) scaleX(-1);
          animation: sweep2Right 3s cubic-bezier(0.37, 0, 0.24, 1) infinite 0.18s;
        }
        @keyframes sweep2Left {
          0% { left: -150px; opacity: 0; }
          10% { opacity: 0.8; }
          44% { left: calc(50% - 180px); opacity: 0.8; }
          53% { opacity: 0; }
          100% { left: calc(50% - 180px); opacity: 0; }
        }
        @keyframes sweep2Right {
          0% { right: -150px; opacity: 0; }
          10% { opacity: 0.8; }
          44% { right: calc(50% - 180px); opacity: 0.8; }
          53% { opacity: 0; }
          100% { right: calc(50% - 180px); opacity: 0; }
        }

        /* 6. Directional Chevrons */
        .chevrons {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          gap: 4px;
        }
        .chevrons span {
          display: inline-block;
          width: 0;
          height: 0;
          border-top: 3.5px solid transparent;
          border-bottom: 3.5px solid transparent;
        }
        .chevrons.left {
          left: 0;
          animation: chevLeft 3s cubic-bezier(0.37, 0, 0.24, 1) infinite;
        }
        .chevrons.left span {
          border-left: 5px solid var(--gold-accent);
        }
        .chevrons.right {
          right: 0;
          animation: chevRight 3s cubic-bezier(0.37, 0, 0.24, 1) infinite;
        }
        .chevrons.right span {
          border-right: 5px solid var(--gold-accent);
        }
        .chevrons span:nth-child(1) { opacity: 0.9; }
        .chevrons span:nth-child(2) { opacity: 0.55; }
        .chevrons span:nth-child(3) { opacity: 0.3; }
        @keyframes chevLeft {
          0% { left: 2%; opacity: 0; }
          10% { opacity: 1; }
          43% { left: calc(50% - 210px); opacity: 1; }
          53% { opacity: 0; }
          100% { left: calc(50% - 210px); opacity: 0; }
        }
        @keyframes chevRight {
          0% { right: 2%; opacity: 0; }
          10% { opacity: 1; }
          43% { right: calc(50% - 210px); opacity: 1; }
          53% { opacity: 0; }
          100% { right: calc(50% - 210px); opacity: 0; }
        }

        /* 7. Pulsing Horizontal Satellites */
        .satellite {
          position: absolute;
          top: 50%;
          width: 7px;
          height: 7px;
          background: linear-gradient(135deg, var(--gold-highlight), var(--gold-primary));
          transform: translateY(-50%) rotate(45deg) scale(0);
          border-radius: 1.5px;
          z-index: 2;
          box-shadow: 0 0 8px 1px var(--glow-soft);
        }
        .satellite.q1 {
          left: 22%;
          animation: satPulse 3s cubic-bezier(0.37, 0, 0.24, 1) infinite 0.05s;
        }
        .satellite.q3 {
          right: 22%;
          animation: satPulse 3s cubic-bezier(0.37, 0, 0.24, 1) infinite 0.05s;
        }
        @keyframes satPulse {
          0%, 20% { transform: translateY(-50%) rotate(45deg) scale(0); opacity: 0; }
          36% { transform: translateY(-50%) rotate(45deg) scale(1); opacity: 1; }
          48% { transform: translateY(-50%) rotate(45deg) scale(0.7); opacity: 0.8; }
          60%, 100% { transform: translateY(-50%) rotate(45deg) scale(0); opacity: 0; }
        }

        /* 8. Micro Sparkle Particles */
        .particle {
          position: absolute;
          top: 50%;
          border-radius: 50%;
          background: var(--gold-highlight);
          box-shadow: 0 0 5px 1px var(--glow-soft);
          opacity: 0;
        }
        .p1 { width: 2.5px; height: 2.5px; animation: partA 3s linear infinite; }
        .p2 { width: 2px; height: 2px; animation: partB 3s linear infinite 0.3s; }
        .p3 { width: 2px; height: 2px; animation: partC 3s linear infinite 0.55s; }
        .p4 { width: 2.5px; height: 2.5px; animation: partD 3s linear infinite 0.2s; }
        @keyframes partA {
          0% { left: 5%; top: calc(50% - 12px); opacity: 0; }
          20% { opacity: 1; }
          50% { left: calc(50% - 190px); top: calc(50% - 3px); opacity: 1; }
          60%, 100% { left: calc(50% - 190px); opacity: 0; }
        }
        @keyframes partB {
          0% { left: 15%; top: calc(50% + 10px); opacity: 0; }
          22% { opacity: 0.8; }
          50% { left: calc(50% - 200px); top: calc(50% + 3px); opacity: 0.8; }
          60%, 100% { left: calc(50% - 200px); opacity: 0; }
        }
        @keyframes partC {
          0% { right: 15%; top: calc(50% - 8px); opacity: 0; }
          22% { opacity: 0.8; }
          50% { right: calc(50% - 200px); top: calc(50% - 3px); opacity: 0.8; }
          60%, 100% { right: calc(50% - 200px); opacity: 0; }
        }
        @keyframes partD {
          0% { right: 5%; top: calc(50% + 12px); opacity: 0; }
          20% { opacity: 1; }
          50% { right: calc(50% - 190px); top: calc(50% + 3px); opacity: 1; }
          60%, 100% { right: calc(50% - 190px); opacity: 0; }
        }

        /* 9. REBALANCED CENTERPIECE: Wide & Low Profile (360px x 54px Desktop) */
        .core-wrap {
          position: relative;
          z-index: 4;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 360px;
          height: 54px;
        }

        .hex-ambient {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: radial-gradient(ellipse 75% 75% at 50% 50%, var(--glow-soft) 0%, transparent 70%);
          animation: ringPulse 3s ease-in-out infinite;
        }
        @keyframes ringPulse {
          0%, 100% { opacity: 0.35; transform: scale(0.92); }
          50% { opacity: 0.95; transform: scale(1.05); }
        }

        .hex-svg {
          position: absolute;
          width: 100%;
          height: 100%;
          overflow: visible;
        }
        .hex-outline {
          fill: rgba(212, 154, 42, 0.06);
          stroke: url(#dapayHexGrad);
          stroke-width: 1.6;
          filter: drop-shadow(0 0 5px var(--glow-soft));
        }
        .hex-outline-faint {
          fill: none;
          stroke: var(--gold-primary);
          stroke-width: 0.9;
          opacity: 0.22;
        }
        /* Traveling light tracer along elongated perimeter */
        .hex-trace {
          fill: none;
          stroke: var(--gold-highlight);
          stroke-width: 2.2;
          stroke-linecap: round;
          filter: drop-shadow(0 0 7px var(--glow-strong));
          stroke-dasharray: 75 635;
          stroke-dashoffset: 0;
          animation: traceRun 3s linear infinite;
        }
        @keyframes traceRun {
          0% { stroke-dashoffset: 710; }
          100% { stroke-dashoffset: 0; }
        }

        .hex-vertex {
          fill: var(--gold-highlight);
          filter: drop-shadow(0 0 4px var(--glow-strong));
          opacity: 0.9;
        }

        /* Expanding Ring */
        .ring-inner {
          position: absolute;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 1px solid var(--gold-accent);
          opacity: 0;
          animation: ringExpand 3s cubic-bezier(0.2, 0.6, 0.3, 1) infinite;
        }
        @keyframes ringExpand {
          0% { width: 12px; height: 12px; opacity: 0; }
          35% { opacity: 0.8; }
          50%, 100% { width: 44px; height: 44px; opacity: 0; }
        }

        /* Orbiting Sparks */
        .orbit {
          position: absolute;
          width: 48px;
          height: 48px;
          z-index: 2;
          animation: spin 6s linear infinite;
        }
        .orbit .spark {
          position: absolute;
          width: 2.5px;
          height: 2.5px;
          border-radius: 50%;
          background: var(--gold-highlight);
          box-shadow: 0 0 6px 1px var(--glow-strong);
        }
        .orbit .spark:nth-child(1) { top: 0; left: 50%; }
        .orbit .spark:nth-child(2) { top: 50%; right: 0; width: 1.8px; height: 1.8px; opacity: 0.7; }
        .orbit .spark:nth-child(3) { bottom: 0; left: 50%; width: 1.8px; height: 1.8px; opacity: 0.6; }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Center Diamond Core: 22px on desktop, subtle pulse scale 1 -> 1.04 -> 1 */
        .core {
          position: relative;
          width: 22px;
          height: 22px;
          transform: rotate(45deg);
          background: linear-gradient(135deg, var(--gold-highlight), var(--gold-primary));
          border-radius: 3px;
          z-index: 3;
          animation: subtlePulse 3s cubic-bezier(0.37, 0, 0.24, 1) infinite;
          box-shadow: 0 0 10px 1px var(--glow-strong), 0 0 24px 6px var(--glow-ambient);
        }
        .core::before {
          content: "";
          position: absolute;
          inset: 2.5px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.6), transparent 60%);
          border-radius: 2px;
          mix-blend-mode: overlay;
        }
        .core::after {
          content: "";
          position: absolute;
          inset: 0;
          margin: auto;
          width: 52%;
          height: 52%;
          background: var(--bg-dark);
          border-radius: 1.5px;
        }
        @keyframes subtlePulse {
          0%, 100% {
            box-shadow: 0 0 10px 1px var(--glow-strong), 0 0 24px 6px var(--glow-ambient);
            transform: rotate(45deg) scale(1);
          }
          50% {
            box-shadow: 0 0 18px 3px var(--glow-strong), 0 0 36px 10px var(--glow-ambient);
            transform: rotate(45deg) scale(1.04);
          }
        }

        /* ============================================================== */
        /* RESPONSIVE BREAKPOINTS                                         */
        /* ============================================================== */
        @media (max-width: 1023px) {
          .dapay-divider { height: 46px; }
          .core-wrap { width: 270px; height: 46px; }
          .core { width: 18px; height: 18px; }
          .orbit { width: 38px; height: 38px; }
          .satellite { width: 5px; height: 5px; }
          .base-line {
            background: linear-gradient(90deg,
              transparent 0%,
              var(--gold-line) 8%,
              var(--gold-primary) 32%,
              var(--gold-accent) calc(50% - 128px),
              transparent calc(50% - 127px),
              transparent calc(50% + 127px),
              var(--gold-accent) calc(50% + 128px),
              var(--gold-primary) 68%,
              var(--gold-line) 92%,
              transparent 100%
            );
          }
          .sweep { width: 150px; }
          .sweep2 { width: 100px; }
          @keyframes sweepLeft {
            0% { left: -150px; opacity: 0; }
            8% { opacity: 1; }
            44% { left: calc(50% - 135px); opacity: 1; }
            52% { opacity: 0; }
            100% { left: calc(50% - 135px); opacity: 0; }
          }
          @keyframes sweepRight {
            0% { right: -150px; opacity: 0; }
            8% { opacity: 1; }
            44% { right: calc(50% - 135px); opacity: 1; }
            52% { opacity: 0; }
            100% { right: calc(50% - 135px); opacity: 0; }
          }
          @keyframes chevLeft {
            0% { left: 2%; opacity: 0; }
            10% { opacity: 1; }
            43% { left: calc(50% - 160px); opacity: 1; }
            53% { opacity: 0; }
            100% { left: calc(50% - 160px); opacity: 0; }
          }
          @keyframes chevRight {
            0% { right: 2%; opacity: 0; }
            10% { opacity: 1; }
            43% { right: calc(50% - 160px); opacity: 1; }
            53% { opacity: 0; }
            100% { right: calc(50% - 160px); opacity: 0; }
          }
        }

        @media (max-width: 639px) {
          .dapay-divider { height: 36px; }
          .core-wrap { width: 190px; height: 36px; }
          .core { width: 15px; height: 15px; }
          .orbit { width: 28px; height: 28px; }
          .base-line {
            background: linear-gradient(90deg,
              transparent 0%,
              var(--gold-line) 8%,
              var(--gold-primary) 32%,
              var(--gold-accent) calc(50% - 88px),
              transparent calc(50% - 87px),
              transparent calc(50% + 87px),
              var(--gold-accent) calc(50% + 88px),
              var(--gold-primary) 68%,
              var(--gold-line) 92%,
              transparent 100%
            );
          }
          .sweep { width: 90px; }
          .sweep2 { width: 60px; }
          @keyframes sweepLeft {
            0% { left: -90px; opacity: 0; }
            8% { opacity: 1; }
            44% { left: calc(50% - 95px); opacity: 1; }
            52% { opacity: 0; }
            100% { left: calc(50% - 95px); opacity: 0; }
          }
          @keyframes sweepRight {
            0% { right: -90px; opacity: 0; }
            8% { opacity: 1; }
            44% { right: calc(50% - 95px); opacity: 1; }
            52% { opacity: 0; }
            100% { right: calc(50% - 95px); opacity: 0; }
          }
          @keyframes chevLeft {
            0% { left: 2%; opacity: 0; }
            10% { opacity: 1; }
            43% { left: calc(50% - 110px); opacity: 1; }
            53% { opacity: 0; }
            100% { left: calc(50% - 110px); opacity: 0; }
          }
          @keyframes chevRight {
            0% { right: 2%; opacity: 0; }
            10% { opacity: 1; }
            43% { right: calc(50% - 110px); opacity: 1; }
            53% { opacity: 0; }
            100% { right: calc(50% - 110px); opacity: 0; }
          }
          .texture { display: none; }
          .satellite { display: none; }
          .particle { display: none; }
        }

        /* ============================================================== */
        /* ACCESSIBILITY: Disable motion if user prefers reduced motion   */
        /* ============================================================== */
        @media (prefers-reduced-motion: reduce) {
          .backdrop,
          .sweep,
          .sweep2,
          .chevrons,
          .satellite,
          .particle,
          .hex-ambient,
          .hex-trace,
          .ring-inner,
          .orbit,
          .core {
            animation: none !important;
          }
          .core {
            transform: rotate(45deg) !important;
          }
          .sweep,
          .sweep2,
          .chevrons,
          .satellite,
          .particle,
          .hex-trace,
          .ring-inner,
          .orbit {
            display: none !important;
          }
        }
      `}</style>

      {/* Main Divider Stage */}
      <div className="dapay-divider">
        <div className="backdrop" />
        <div className="base-line glow" />
        <div className="base-line" />
        <div className="texture up" />
        <div className="texture down" />

        <div className="satellite q1" />
        <div className="satellite q3" />

        <div className="sweep2 left" />
        <div className="sweep2 right" />
        <div className="sweep left" />
        <div className="sweep right" />

        <div className="chevrons left">
          <span />
          <span />
          <span />
        </div>
        <div className="chevrons right">
          <span />
          <span />
          <span />
        </div>

        <div className="particle p1" />
        <div className="particle p2" />
        <div className="particle p3" />
        <div className="particle p4" />

        {/* Center Geometric Housing & Core Diamond */}
        <div className="core-wrap">
          <div className="hex-ambient" />

          <svg className="hex-svg" viewBox="0 0 360 54" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="dapayHexGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#87791F" />
                <stop offset="50%" stopColor="#FFE9B0" />
                <stop offset="100%" stopColor="#87791F" />
              </linearGradient>
            </defs>
            <polygon
              className="hex-outline-faint"
              points="8,27 48,8 312,8 352,27 312,46 48,46"
              transform="scale(1.03 1.14)"
              style={{ transformOrigin: "180px 27px" }}
            />
            <polygon
              className="hex-outline"
              points="8,27 48,8 312,8 352,27 312,46 48,46"
            />
            <polygon
              className="hex-trace"
              points="8,27 48,8 312,8 352,27 312,46 48,46"
            />
            <circle className="hex-vertex" cx="8" cy="27" r="2.2" />
            <circle className="hex-vertex" cx="48" cy="8" r="1.8" />
            <circle className="hex-vertex" cx="312" cy="8" r="1.8" />
            <circle className="hex-vertex" cx="352" cy="27" r="2.2" />
            <circle className="hex-vertex" cx="312" cy="46" r="1.8" />
            <circle className="hex-vertex" cx="48" cy="46" r="1.8" />
          </svg>

          <div className="ring-inner" />
          <div className="orbit">
            <div className="spark" />
            <div className="spark" />
            <div className="spark" />
          </div>
          <div className="core" />
        </div>
      </div>
    </div>
  );
}
