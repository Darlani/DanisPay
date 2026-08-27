"use client";

import { useId } from "react";

type DaPayCoinProps = {
  size?: number;
  className?: string;
  showShadow?: boolean;
  showText?: boolean;

  rotate?: number;
  x?: number;
  y?: number;
  scale?: number;
};

export default function DaPayCoin({
  size = 52,
  className = "",
  showShadow = true,
  showText = true,
  rotate = 0,
  x = 0,
  y = 0,
  scale = 1,
}: DaPayCoinProps) {
  const uid = useId().replace(/:/g, "");

  const faceId = `dapay-face-${uid}`;
  const edgeId = `dapay-edge-${uid}`;
  const shadowId = `dapay-shadow-${uid}`;
  const textShadowId = `dapay-text-shadow-${uid}`;
  const textGoldId = `dapay-text-gold-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Koin DaPay"
      className={className}
      style={{
        overflow: "visible",
        transform: `
          translate(${x}px, ${y}px)
          rotate(${rotate}deg)
          scale(${scale})
        `,
        transformOrigin: "center center",
      }}
    >
      <defs>
        {/* ====================================================== */}
        {/* GOLD FACE                                               */}
        {/* ====================================================== */}

        <linearGradient
          id={faceId}
          x1="60"
          y1="8"
          x2="60"
          y2="102"
          gradientUnits="userSpaceOnUse"
        >
          <stop
            offset="0%"
            stopColor="#FFE98A"
          />

          <stop
            offset="28%"
            stopColor="#FFD85A"
          />

          <stop
            offset="58%"
            stopColor="#F6C12D"
          />

          <stop
            offset="82%"
            stopColor="#ECAF12"
          />

          <stop
            offset="100%"
            stopColor="#D99A00"
          />
        </linearGradient>

        {/* ====================================================== */}
        {/* EDGE                                                     */}
        {/* ====================================================== */}

        <linearGradient
          id={edgeId}
          x1="30"
          y1="30"
          x2="92"
          y2="98"
          gradientUnits="userSpaceOnUse"
        >
          <stop
            offset="0%"
            stopColor="#F8D24C"
          />

          <stop
            offset="35%"
            stopColor="#DFA20A"
          />

          <stop
            offset="68%"
            stopColor="#B97600"
          />

          <stop
            offset="100%"
            stopColor="#8A5600"
          />
        </linearGradient>

        {/* ====================================================== */}
        {/* TEXT GOLD                                               */}
        {/* ====================================================== */}

        <linearGradient
          id={textGoldId}
          x1="60"
          y1="48"
          x2="60"
          y2="70"
          gradientUnits="userSpaceOnUse"
        >
          <stop
            offset="0%"
            stopColor="#D99A17"
          />

          <stop
            offset="48%"
            stopColor="#C18000"
          />

          <stop
            offset="100%"
            stopColor="#A96A00"
          />
        </linearGradient>

        {/* ====================================================== */}
        {/* COIN SHADOW                                             */}
        {/* ====================================================== */}

        <filter
          id={shadowId}
          x="-40%"
          y="-40%"
          width="180%"
          height="190%"
        >
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="4"
            floodColor="#704700"
            floodOpacity={
              showShadow ? 0.18 : 0
            }
          />
        </filter>

        {/* ====================================================== */}
        {/* VERY SOFT EMBOSS DEPTH                                  */}
        {/* ====================================================== */}

        <filter
          id={textShadowId}
          x="-20%"
          y="-20%"
          width="140%"
          height="150%"
        >
          <feDropShadow
            dx="0.45"
            dy="0.7"
            stdDeviation="0.25"
            floodColor="#8A5600"
            floodOpacity="0.42"
          />
        </filter>
      </defs>

      <g filter={`url(#${shadowId})`}>
{/* ====================================================== */}
{/* LOWER EDGE / THICKNESS                                 */}
{/* ====================================================== */}

<circle
  cx="60"
  cy="59"
  r="46"
  fill={`url(#${edgeId})`}
/>

<path
  d="
    M14 59
    C16 73 35 84 60 84
    C85 84 104 73 106 59
    L106 62
    C104 76 85 88 60 88
    C35 88 16 76 14 62
    Z
  "
  fill="#986000"
  opacity="0.24"
/>

        {/* ====================================================== */}
        {/* FRONT FACE                                               */}
        {/* ====================================================== */}

        <circle
          cx="60"
          cy="55"
          r="46"
          fill={`url(#${faceId})`}
        />

        {/* ====================================================== */}
        {/* OUTER METAL RING                                         */}
        {/* ====================================================== */}

        <circle
          cx="60"
          cy="55"
          r="42"
          stroke="#B87700"
          strokeWidth="2"
          opacity="0.76"
        />

        {/* ====================================================== */}
        {/* INNER METAL RING                                        */}
        {/* ====================================================== */}

        <circle
          cx="60"
          cy="55"
          r="37"
          stroke="#FFE17B"
          strokeWidth="1.4"
          opacity="0.72"
        />

        {/* ====================================================== */}
        {/* SOFT METALLIC SHEEN                                     */}
        {/* ====================================================== */}

        <path
          d="
            M27 39
            C34 27 47 20 61 19
            C73 18 85 22 93 30
          "
          stroke="#FFF6C7"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.08"
        />

{/* ====================================================== */}
{/* DaPay WORDMARK - POPPINS EXTRA BOLD                    */}
{/* ====================================================== */}

{showText && (
  <g>
    {/* DEPTH */}
    <text
      x="60"
      y="63.1"
      textAnchor="middle"
      fill="#986000"
      fontSize="24"
      fontWeight="700"
      fontFamily="var(--font-comfortaa)"
      letterSpacing="-0.8"
      textLength="68"
      lengthAdjust="spacingAndGlyphs"
      opacity="0.68"
      filter={`url(#${textShadowId})`}
    >
      DaPay
    </text>

    {/* MAIN */}
    <text
      x="60"
      y="61.7"
      textAnchor="middle"
      fill={`url(#${textGoldId})`}
      fontSize="24"
      fontWeight="700"
      fontFamily="var(--font-comfortaa)"
      letterSpacing="-0.8"
      textLength="68"
      lengthAdjust="spacingAndGlyphs"
    >
      DaPay
    </text>

    {/* SUBTLE BEVEL */}
    <text
      x="60"
      y="61.1"
      textAnchor="middle"
      fill="#FFE99F"
      fontSize="24"
      fontWeight="700"
      fontFamily="var(--font-comfortaa)"
      letterSpacing="-0.8"
      textLength="68"
      lengthAdjust="spacingAndGlyphs"
      opacity="0.18"
    >
      DaPay
    </text>
  </g>
)}
      </g>
    </svg>
  );
}