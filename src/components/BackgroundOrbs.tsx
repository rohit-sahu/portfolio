export default function BackgroundOrbs() {
  const particles = Array.from({ length: 14 });

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden motion-reduce:[&_*]:!animate-none">
      <div className="absolute inset-0 bg-[#030014]" />

      <svg className="animate-blob absolute -left-52 -top-52 h-[38rem] w-[38rem] transform-gpu opacity-45 blur-2xl will-change-transform" viewBox="0 0 200 200">
        <defs>
          <radialGradient id="orb1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgb(var(--accent-rgb))" />
            <stop offset="100%" stopColor="#030014" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="100" fill="url(#orb1)" />
      </svg>

      <svg className="animate-blob-slow absolute -right-40 top-24 h-[32rem] w-[32rem] transform-gpu opacity-35 blur-2xl will-change-transform" viewBox="0 0 200 200">
        <defs>
          <radialGradient id="orb2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgb(var(--accent2-rgb))" />
            <stop offset="100%" stopColor="#030014" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="100" fill="url(#orb2)" />
      </svg>

      <svg className="animate-blob-slower absolute bottom-[-6rem] left-1/4 h-[30rem] w-[30rem] transform-gpu opacity-35 blur-2xl will-change-transform" viewBox="0 0 200 200">
        <defs>
          <radialGradient id="orb3" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgb(var(--accent3-rgb))" />
            <stop offset="100%" stopColor="#030014" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="100" fill="url(#orb3)" />
      </svg>

      <svg className="absolute inset-0 h-full w-full opacity-[0.06]" width="100%" height="100%">
        <defs>
          <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
            <path d="M44 0H0V44" fill="none" stroke="white" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      <div className="absolute inset-0">
        {particles.map((_, i) => {
          const left = (i * 53) % 100;
          const top = (i * 71) % 100;
          const size = 2 + (i % 3);
          const delay = (i % 6) * 0.5;
          const colors = [
            "rgb(var(--accent-rgb))",
            "rgb(var(--accent3-rgb))",
            "rgb(var(--accent2-rgb))",
            "rgb(var(--accent4-rgb))",
          ];
          return (
            <span
              key={i}
              className="animate-twinkle absolute transform-gpu rounded-full will-change-transform"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: size,
                height: size,
                backgroundColor: colors[i % colors.length],
                animationDelay: `${delay}s`,
                boxShadow: `0 0 6px ${colors[i % colors.length]}`,
              }}
            />
          );
        })}
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#030014]" />
    </div>
  );
}
