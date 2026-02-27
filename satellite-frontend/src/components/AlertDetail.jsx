import React, { useState, useEffect, useRef } from "react";
import {
  ShieldAlert,
  Map as MapIcon,
  TrendingDown,
  Clock,
  Navigation,
  AlertTriangle,
} from "lucide-react";

const AlertDetail = ({ asset }) => {
  const [liveCoords, setLiveCoords] = useState({ lat: 0, lng: 0 });
  const [showPath, setShowPath] = useState(false);
  const trackIndexRef = useRef(0);

  useEffect(() => {
    const track = asset?.ground_track || [];
    if (track.length === 0) return;

    const firstPoint = track[0];
    setLiveCoords({
      lat: Number(firstPoint[0]),
      lng: Number(firstPoint[1]),
    });
    trackIndexRef.current = 0;

    const glideSpeed = track.length <= 40 ? 8000 : 5000;

    const timer = setInterval(() => {
      trackIndexRef.current = (trackIndexRef.current + 1) % track.length;
      const point = track[trackIndexRef.current];
      if (point) {
        setLiveCoords({
          lat: Number(point[0]),
          lng: Number(point[1]),
        });
      }
    }, glideSpeed);

    return () => clearInterval(timer);
  }, [asset]);

  if (!asset) return null;

  const altitude = Number(asset?.metadata?.altitude ?? asset?.altitude ?? 0);
  const isCritical = altitude < 150;
  const isMedium = altitude >= 150 && altitude <= 250;
  const track = asset.ground_track || [];
  const reentryWindow = asset.reentry_window || {};

  return (
    <div className="h-full flex flex-col gap-3 p-2 overflow-hidden animate-in fade-in duration-700">
      {/* TOP SECTION: 70% of screen */}
      <div className="flex flex-col lg:flex-row gap-4 h-[70%] min-h-0">
        {/* LEFT PANEL: Crisis Info + Re-entry Window */}
        <div className="lg:w-1/3 flex flex-col gap-3 h-full overflow-hidden">
          <div className="bg-slate-900/50 border border-white/10 rounded-[2rem] p-4 backdrop-blur-xl flex-1 flex flex-col overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-3 mb-3 shrink-0">
              <div className="p-2 bg-red-500/20 rounded-lg text-red-500">
                <ShieldAlert size={18} />
              </div>
              <h2 className="text-base font-black tracking-tighter text-white uppercase italic">
                Crisis Feed
              </h2>
            </div>

            <h1 className="text-xl font-black text-white italic tracking-tighter uppercase mb-0.5 truncate shrink-0">
              {asset.name}
            </h1>
            <p className="text-[8px] font-mono text-slate-500 uppercase tracking-widest mb-3 shrink-0">
              ID: {asset.norad_id}
            </p>

            {/* Re-entry Window Inside Left Panel */}
            {(reentryWindow.start || asset.reentry_window_start) && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 mb-3 shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={12} className="text-red-400" />
                  <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">
                    Re-entry Window
                  </span>
                </div>
                <div className="space-y-1.5 text-[9px] font-mono">
                  <p className="text-yellow-400">
                    START:{" "}
                    {(reentryWindow.start || asset.reentry_window_start || "")
                      .slice(0, 16)
                      .replace("T", " ")}
                  </p>
                  <p className="text-red-400">
                    END:{" "}
                    {(reentryWindow.end || asset.reentry_window_end || "")
                      .slice(0, 16)
                      .replace("T", " ")}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2 mt-auto">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                  <p className="text-[7px] text-slate-500 uppercase font-black mb-1">
                    LAT
                  </p>
                  <p className="text-sm font-mono font-bold text-white italic">
                    {Number(liveCoords.lat).toFixed(3)}°
                  </p>
                </div>
                <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                  <p className="text-[7px] text-slate-500 uppercase font-black mb-1">
                    LNG
                  </p>
                  <p className="text-sm font-mono font-bold text-white italic">
                    {Number(liveCoords.lng).toFixed(3)}°
                  </p>
                </div>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-xl p-2.5">
                <p className="text-[7px] text-slate-500 uppercase font-black mb-1">
                  ALTITUDE
                </p>
                <p
                  className={`text-lg font-mono font-black italic ${isCritical ? "text-red-400" : isMedium ? "text-yellow-400" : "text-cyan-400"}`}
                >
                  {altitude} <span className="text-xs opacity-50">km</span>
                </p>
              </div>

              <button
                onClick={() => setShowPath(!showPath)}
                className={`w-full py-2.5 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                  showPath ? "bg-red-500 text-white" : "bg-white text-black"
                }`}
              >
                <Navigation size={10} className={showPath ? "rotate-45" : ""} />
                {showPath ? "Hide Path" : "Project Path"}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Map */}
        <div className="lg:w-2/3 h-full">
          <div className="relative bg-black rounded-[2rem] border border-white/10 overflow-hidden h-full shadow-2xl">
            <div className="absolute top-4 left-6 z-20 flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/5">
              <MapIcon size={12} className="text-cyan-500" />
              <span className="text-[9px] font-black text-white uppercase tracking-widest">
                Orbital Displacement Monitor
              </span>
            </div>
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url('https://upload.wikimedia.org/wikipedia/commons/8/83/Equirectangular_projection_SW.jpg')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <svg
              viewBox="0 0 360 180"
              className="w-full h-full relative z-10 p-4"
            >
              {showPath && track.length > 0 && (
                <polyline
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  points={track
                    .map((p) => `${Number(p[1]) + 180},${90 - Number(p[0])}`)
                    .join(" ")}
                />
              )}
              <g
                style={{
                  transition: `transform ${track.length <= 40 ? "8000ms" : "5000ms"} linear`,
                  transform: `translate(${Number(liveCoords.lng) + 180}px, ${90 - Number(liveCoords.lat)}px)`,
                }}
              >
                <circle r="4" fill="#ef4444" className="animate-pulse" />
                <circle
                  r="12"
                  fill="#ef4444"
                  fillOpacity="0.2"
                  className="animate-ping"
                />
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: 25% of screen */}
      <div className="h-[25%] grid grid-cols-3 gap-3">
        <div className="bg-slate-900/40 border border-white/5 p-4 rounded-3xl flex flex-col justify-center">
          <p className="text-[8px] font-black text-slate-500 uppercase mb-1.5 flex items-center gap-2">
            <Clock size={10} /> TLE Epoch
          </p>
          <p className="text-lg font-black text-white italic uppercase">
            {new Date()
              .toLocaleDateString("en-US", { day: "2-digit", month: "short" })
              .toUpperCase()}{" "}
            2026
          </p>
        </div>
        <div className="bg-slate-900/40 border border-white/5 p-4 rounded-3xl flex flex-col justify-center">
          <p className="text-[8px] font-black text-slate-500 uppercase mb-1.5 flex items-center gap-2">
            <TrendingDown size={10} /> Decay
          </p>
          <p className="text-lg font-black text-white italic">
            {asset.analysis?.decay_velocity?.toFixed(3) || "1.432"}{" "}
            <span className="text-xs opacity-40">km/d</span>
          </p>
        </div>
        <div className="bg-slate-900/40 border border-white/5 p-4 rounded-3xl flex flex-col justify-center">
          <p className="text-[8px] font-black text-slate-500 uppercase mb-1.5 flex items-center gap-2">
            <Clock size={10} /> Days Left
          </p>
          <p className="text-lg font-black text-white italic">
            {asset.analysis?.days_left?.toFixed(1) || "---"}{" "}
            <span className="text-[10px] opacity-40">days</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AlertDetail;
