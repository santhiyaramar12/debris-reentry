import React, { useState, useEffect } from "react";
import logo from "../assets/spacetug-logo.png";

const Preloader = ({ onFinished }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("INITIALIZING SYSTEMS...");

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((old) => {
        if (old >= 100) {
          clearInterval(timer);
          setTimeout(onFinished, 1000);
          return 100;
        }
        const diff = Math.random() * 8;
        return Math.min(old + diff, 100);
      });
    }, 400);
    return () => clearInterval(timer);
  }, [onFinished]);

  return (
    <div className="fixed inset-0 z-[100] bg-[#020617] flex flex-col items-center justify-center font-mono p-4">
      {/* 1. MEGA LOGO SCANNER SECTION */}
      <div className="relative mb-24 flex flex-col items-center justify-center">
        {/* Enormous Outer Rings - Size increased to w-80/h-80 */}
        <div className="absolute w-[450px] h-[450px] border border-cyan-500/10 rounded-full animate-ping"></div>
        <div className="absolute w-[380px] h-[380px] border-t-4 border-cyan-400/40 rounded-full animate-spin"></div>
        <div className="absolute w-[320px] h-[320px] border-l-2 border-blue-500/30 rounded-full animate-[spin_6s_linear_infinite_reverse]"></div>

        {/* Your SpaceTug Logo - Size increased to w-96 (approx 384px) */}
        <div className="relative z-10 p-8 bg-white/5 backdrop-blur-xl rounded-[3rem] border border-white/10 shadow-[0_0_60px_rgba(34,211,238,0.15)]">
          <img
            src={logo}
            alt="SpaceTug Logo"
            className="w-[400px] md:w-[550px] h-auto object-contain brightness-0 invert drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]"
          />
        </div>

        {/* Floating Tech Labels around the logo */}
        <div className="absolute -top-10 -right-20 text-[10px] text-cyan-500/40 animate-pulse hidden md:block">
          IDENTITY_VERIFIED: TRUE <br />
          ST_PROTOCOL_A1
        </div>
      </div>

      {/* 2. ENLARGED PROGRESS SECTION */}
      <div className="w-full max-w-lg space-y-6">
        {" "}
        {/* max-w-lg makes the bar wider */}
        <div className="flex justify-between text-xs text-cyan-400 font-bold mb-1 tracking-[0.4em]">
          <span className="uppercase">{status}</span>
          <span className="text-xl">{Math.round(progress)}%</span>
        </div>
        {/* Thicker Progress Bar */}
        <div className="h-3 w-full bg-slate-900/80 rounded-full overflow-hidden border border-cyan-900/50 p-[2px]">
          <div
            className="h-full bg-gradient-to-r from-blue-700 via-cyan-400 to-blue-500 shadow-[0_0_25px_rgba(6,182,212,0.8)] transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center opacity-60">
          <p className="text-[10px] text-slate-400 uppercase tracking-[0.5em]">
            SpaceTug Debris Re-entry Prediction
          </p>
          <span className="text-cyan-500 text-xs animate-pulse">
            ● LIVE_LINK
          </span>
        </div>
      </div>
    </div>
  );
};

export default Preloader;
