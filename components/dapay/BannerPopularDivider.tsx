import React from "react";

/**
 * DaPay Banner -> Populer HUD Divider (Full-Bleed Proportional Edge-to-Edge)
 *
 * Implements Full-Page Extension Specifications:
 * 1. FULL-BLEED 100% HORIZONTAL EXTENSION:
 *    - Central U-cradle section stays locked under Active Banner.
 *    - Left and right multi-layered HUD rails (cyan top rail, steel core, gold bottom rail)
 *      extend continuously all the way to 100% edge of the page (ujung halaman).
 * 2. PROPORTIONAL INTER-SECTION GAP-FILLING HEIGHT:
 *    - Fills the physical ~90-100px space between Active Banner and Populer smoothly.
 *    - Desktop (1920+): 76px visual height.
 *    - Desktop (1440): 72px visual height.
 *    - Tablet: 60px visual height.
 *    - Mobile: 48px visual height.
 * 3. EXTENDED U-CRADLE GEOMETRY:
 *    - Widened stepped-down U-cradle cradles the full Active Banner width.
 *    - Mechanical center clasp & notch preserved at 1:1 original ratio.
 * 4. CONTINUOUS MOTION ENGINE:
 *    - 4.8s dual symmetrical light sweeps across the full span, soft glow contour, and central core radiant flash.
 */

export type BannerPopularDividerProps = {
  className?: string;
  isPaused?: boolean;
};

export default function BannerPopularDivider({ className = "", isPaused = false }: BannerPopularDividerProps) {
  return (
    <div
      role="presentation"
      aria-hidden="true"
      data-testid="banner-popular-divider"
      className={`relative w-full max-w-full overflow-hidden select-none pointer-events-none -mt-1 sm:-mt-1.5 md:-mt-2 lg:-mt-2.5 mb-0.5 sm:mb-1 z-20 ${isPaused ? "divider-paused" : ""} ${className}`}
    >
      <style jsx>{`
        /* DaPay Full-Bleed HUD Stage */
        .dapay-hud-stage {
          --divider-h: 76px;
          --d: 4.0s;

          position: relative;
          width: 100%;
          height: var(--divider-h);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: transparent;
        }

        /* 1440px Desktop Breakpoint */
        @media (max-width: 1535px) and (min-width: 1024px) {
          .dapay-hud-stage {
            --divider-h: 72px;
          }
          .base {
            background-size: 120% 100% !important;
          }
          .glow {
            -webkit-mask-size: 120% 100% !important;
            mask-size: 120% 100% !important;
          }
        }

        /* Tablet Breakpoint (640px - 1023px) */
        @media (max-width: 1023px) and (min-width: 640px) {
          .dapay-hud-stage {
            --divider-h: 60px;
          }
          .base {
            background-size: 120% 100% !important;
          }
          .glow {
            -webkit-mask-size: 120% 100% !important;
            mask-size: 120% 100% !important;
          }
        }

        /* Mobile Breakpoint (< 640px) */
        @media (max-width: 639px) {
          .dapay-hud-stage {
            --divider-h: 48px;
          }
          .base {
            background-size: 216% 100% !important;
          }
          .glow {
            -webkit-mask-size: 216% 100% !important;
            mask-size: 216% 100% !important;
          }
        }

        /* Full-Bleed Full-Width Container: 100% Edge-to-Edge */
        .divider-fullbleed-box {
          position: relative;
          height: var(--divider-h);
          width: 100%;
          min-width: 100%;
          flex-shrink: 0;
          isolation: isolate;
          z-index: 3;
          -webkit-mask-image: linear-gradient(180deg, transparent, #000 6%, #000 94%, transparent);
          mask-image: linear-gradient(180deg, transparent, #000 6%, #000 94%, transparent);
        }

        /* Layer 1: Base Artwork (Full-Bleed Rails + Extended U-Cradle) */
        .base {
          position: absolute;
          inset: 0;
          background: url(/images/dapay-hud-base-adaptive.png) center/100% 100% no-repeat;
        }

        /* Layer 2: Glow Enhancement Masks */
        .glow {
          position: absolute;
          inset: 0;
          mix-blend-mode: screen;
          pointer-events: none;
          -webkit-mask-position: center;
          -webkit-mask-size: 100% 100%;
          -webkit-mask-repeat: no-repeat;
          mask-position: center;
          mask-size: 100% 100%;
          mask-repeat: no-repeat;
        }
        .glow.a {
          -webkit-mask-image: url(/images/dapay-hud-glow-a.png);
          mask-image: url(/images/dapay-hud-glow-a.png);
          --c1: rgba(255, 215, 120, .85);
          --dl: 0s;
        }
        .glow.b {
          -webkit-mask-image: url(/images/dapay-hud-glow-b.png);
          mask-image: url(/images/dapay-hud-glow-b.png);
          --c1: rgba(140, 220, 255, .85);
          --dl: .15s;
        }

        /* Symmetrical Continuous Light Sweeps with Center Collision & Siku Rebound */
        .g {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 50%;
          overflow: hidden;
        }
        .g.l { left: 0; }
        .g.r { right: 0; transform: scaleX(-1); }

        .g::before {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          width: 25%;
          opacity: 0;
          transform: translateX(-100%) skewX(-35deg);
          background: linear-gradient(90deg, transparent 0, var(--c1) 50%, #fff 92%, transparent 100%);
          animation: hudRun var(--d) cubic-bezier(.25, .1, .25, 1) calc(1.0s + var(--dl)) infinite;
        }

        @keyframes hudRun {
          0% {
            opacity: 0;
            transform: translateX(-100%) skewX(-35deg);
          }
          4% {
            opacity: 1;
          }
          /* 1. Meluncur mulus dari samping menuju tengah */
          44% {
            opacity: 1;
            transform: translateX(300%) skewX(-35deg);
          }
          /* 2. Bertabrakan di tengah cekungan (benturan cahaya) */
          48% {
            opacity: 1;
            transform: translateX(305%) skewX(-20deg);
          }
          /* 3. Memantul kembali ke arah samping (rebound) */
          52% {
            opacity: 1;
            transform: translateX(270%) skewX(30deg);
          }
          /* 4. Pantulan sampai di batas pojok siku bahu */
          68% {
            opacity: 0.85;
            transform: translateX(130%) skewX(35deg);
          }
          /* 5. Meredup dan lenyap tepat di pojok siku */
          75% {
            opacity: 0;
            transform: translateX(110%) skewX(35deg);
          }
          100% {
            opacity: 0;
            transform: translateX(110%) skewX(35deg);
          }
        }

        /* Central Core Collision Flash (sinkron dengan saat tabrakan) */
        .core {
          position: absolute;
          inset: 0;
          opacity: 0;
          background: radial-gradient(ellipse 8% 50% at 50% 50%, #ffffff, #9ce6ff 30%, rgba(90, 180, 255, .5) 55%, transparent 80%);
          animation: hudFlash var(--d) ease-out calc(1.0s + var(--dl)) infinite;
        }

        @keyframes hudFlash {
          0%, 42% {
            opacity: 0;
            transform: scale(0.6);
          }
          /* Flash pecah saat kedua berkas cahaya bertabrakan di 46-50% */
          47% {
            opacity: 1;
            transform: scale(1.15);
          }
          54% {
            opacity: 0.7;
            transform: scale(1.0);
          }
          64%, 100% {
            opacity: 0;
            transform: scale(0.8);
          }
        }

        /* Pause light animation when banner is stopped or when cursor is hovering over the banner stage */
        :global(.divider-paused) .glow,
        :global(.divider-paused) .core,
        :global(.divider-paused) .g::before,
        :global(.hero-stage-container:hover) .glow,
        :global(.hero-stage-container:hover) .core,
        :global(.hero-stage-container:hover) .g::before,
        .dapay-hud-stage:hover .glow,
        .dapay-hud-stage:hover .core,
        .dapay-hud-stage:hover .g::before {
          animation-play-state: paused !important;
        }

        /* Accessibility: prefers-reduced-motion */
        @media (prefers-reduced-motion: reduce) {
          .glow, .core, .g::before {
            display: none !important;
            animation: none !important;
          }
        }
      `}</style>

      {/* Main HUD Divider Stage */}
      <div className="dapay-hud-stage">
        {/* Full-Bleed 100% Width Container */}
        <div className="divider-fullbleed-box">
          <div className="base" />
          <div className="glow a">
            <div className="g l" />
            <div className="g r" />
          </div>
          <div className="glow b">
            <div className="g l" />
            <div className="g r" />
            <div className="core" />
          </div>
        </div>
      </div>
    </div>
  );
}
