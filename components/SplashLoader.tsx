"use client";
import { useEffect, useState } from "react";
import { Sun, Cloud, CloudRain, CloudSnow, TriangleAlert } from "lucide-react";

type Phase = "weather" | "traffic" | "done";

export function SplashLoader() {
  const [phase, setPhase] = useState<Phase>("weather");
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("traffic"), 900);
    const t2 = setTimeout(() => setPhase("done"), 1800);
    const t3 = setTimeout(() => setHidden(true), 2200); // after fade-out ends
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  if (hidden) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-400 ${
        phase === "done" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)" }}
      aria-hidden
    >
      {/* Glass panel */}
      <div
        className="card flex flex-col items-center gap-6 px-12 py-10"
        style={{ minWidth: 200 }}
      >
        {/* Weather icon */}
        <div
          className={`transition-all duration-500 ${
            phase === "weather" ? "opacity-100 scale-100" : "opacity-60 scale-90"
          }`}
        >
          <WeatherIconAnimated />
        </div>

        {/* Traffic icon — appears in second phase */}
        <div
          className={`transition-all duration-500 ${
            phase === "weather" ? "opacity-0 scale-75 translate-y-2" : "opacity-100 scale-100 translate-y-0"
          }`}
        >
          <TrafficIconAnimated />
        </div>

        {/* Pulse bar */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1 w-6 rounded-full bg-accent opacity-60"
              style={{ animation: `pulseBar 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulseBar {
          0%, 100% { transform: scaleX(0.5); opacity: 0.3; }
          50% { transform: scaleX(1); opacity: 0.8; }
        }
        .duration-400 { transition-duration: 400ms; }
      `}</style>
    </div>
  );
}

function WeatherIconAnimated() {
  const [tick, setTick] = useState(0);
  const icons = [Sun, Cloud, CloudRain, CloudSnow];
  const Icon = icons[tick % icons.length];

  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 350);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative flex items-center justify-center">
      <div
        className="rounded-full p-4"
        style={{ background: "rgb(var(--glass-tint) / 0.4)", backdropFilter: "blur(8px)" }}
      >
        <Icon size={36} className="text-accent transition-all duration-300" />
      </div>
    </div>
  );
}

function TrafficIconAnimated() {
  return (
    <div
      className="rounded-full p-3"
      style={{ background: "rgb(var(--glass-tint) / 0.4)", backdropFilter: "blur(8px)" }}
    >
      <TriangleAlert size={28} className="text-warn animate-pulse" />
    </div>
  );
}
