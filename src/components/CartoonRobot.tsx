"use client";

type CartoonRobotProps = {
  className?: string;
  flip?: boolean;
};

export default function CartoonRobot({ className = "", flip = false }: CartoonRobotProps) {
  return (
    <div className={`relative select-none ${className}`} aria-hidden>
      <div className="animate-mascot-bob will-change-transform">
        <svg
          viewBox="0 0 160 170"
          className={`h-full w-full drop-shadow-[0_10px_25px_rgba(0,0,0,0.35)] ${flip ? "-scale-x-100" : ""}`}
        >
          <defs>
            <linearGradient id="bot-body" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgb(var(--accent-rgb))" />
              <stop offset="100%" stopColor="rgb(var(--accent3-rgb))" />
            </linearGradient>
            <linearGradient id="bot-visor" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
          </defs>

          {/* antenna */}
          <line x1="80" y1="20" x2="80" y2="4" stroke="rgb(var(--accent2-rgb))" strokeWidth="3" strokeLinecap="round" />
          <circle cx="80" cy="4" r="5" fill="rgb(var(--accent2-rgb))" />

          {/* head */}
          <rect x="35" y="20" width="90" height="66" rx="26" fill="url(#bot-body)" />
          {/* visor */}
          <rect x="50" y="40" width="60" height="30" rx="14" fill="url(#bot-visor)" />

          {/* eyes */}
          <g className="animate-mascot-blink">
            <circle cx="68" cy="55" r="6.5" fill="#e2e8f0" />
            <circle cx="92" cy="55" r="6.5" fill="#e2e8f0" />
            <circle cx="68" cy="55" r="3" fill="#0f172a" />
            <circle cx="92" cy="55" r="3" fill="#0f172a" />
          </g>

          {/* cheerful mouth */}
          <path d="M70 76q10 8 20 0" stroke="#e2e8f0" strokeWidth="2.5" strokeLinecap="round" fill="none" />

          {/* body */}
          <rect x="45" y="92" width="70" height="54" rx="20" fill="url(#bot-body)" opacity="0.92" />
          <rect x="65" y="106" width="30" height="22" rx="8" fill="#0f172a" opacity="0.35" />

          {/* left arm (static) */}
          <rect x="28" y="98" width="16" height="34" rx="8" fill="rgb(var(--accent2-rgb))" />

          {/* right arm (waving) */}
          <g className="animate-mascot-wave">
            <rect x="112" y="90" width="16" height="34" rx="8" fill="rgb(var(--accent2-rgb))" />
          </g>

          {/* legs */}
          <rect x="55" y="146" width="16" height="18" rx="6" fill="rgb(var(--accent-rgb))" />
          <rect x="89" y="146" width="16" height="18" rx="6" fill="rgb(var(--accent-rgb))" />
        </svg>
      </div>

      <svg viewBox="0 0 160 30" className="animate-mascot-shadow mx-auto -mt-2 block h-4 w-2/3">
        <ellipse cx="80" cy="15" rx="55" ry="9" fill="black" />
      </svg>
    </div>
  );
}
