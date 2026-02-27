import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Activity,
  ShieldAlert,
  Globe as GlobeIcon,
  Zap,
  Target,
  BarChart3,
  Cpu,
} from "lucide-react";

const SatelliteAnalysis = ({ asset, onBack }) => {
  const [liveCoords, setLiveCoords] = useState({ lat: 0, lng: 0 });
  const [tick, setTick] = useState(0);
  const timerRef = useRef(null);

  // Track points-ai veliya eduthu length check panna vasadhiya vachukuvom
  const groundTrackPoints =
    asset?.map_data?.ground_track || asset?.ground_track || [];

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (groundTrackPoints.length > 0) {
      let index = 0;

      // SPEED LOGIC: Points kammiya irundha interval-ai adhigamaaki (5s),
      // points adhigama irundha normal interval (2s) vachukura maari dynamic-aa mathiruken.
      const dynamicInterval = groundTrackPoints.length <= 40 ? 8000 : 3000;

      timerRef.current = setInterval(() => {
        const currentPoint = groundTrackPoints[index];
        if (currentPoint) {
          setLiveCoords({
            lat: Number(currentPoint[0]),
            lng: Number(currentPoint[1]),
          });
          setTick((t) => t + 1);
          index = (index + 1) % groundTrackPoints.length;
        }
      }, dynamicInterval);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [asset, groundTrackPoints.length]); // Track length maarumbodhu timer refresh aagum

  if (!asset)
    return (
      <div className="h-full flex items-center justify-center font-mono text-cyan-500 animate-pulse bg-[#020617]">
        <div className="flex flex-col items-center gap-4">
          <Zap className="animate-bounce" />
          <span className="tracking-[0.5em] uppercase text-xs">
            Establishing Secure Uplink...
          </span>
        </div>
      </div>
    );

  const currentAltitude =
    asset.analysis_results?.current_altitude ||
    asset.metadata?.altitude ||
    asset.altitude;
  
  const altitude = Number(
    asset?.analysis_results?.current_altitude ??
      asset?.metadata?.altitude ??
      asset?.altitude ??
      0,
  );

  // Corrected Thresholds:
  const isCritical = altitude < 150;
  const isMedium = altitude >= 150 && altitude <= 250;

  const riskColor = isCritical ? "#ef4444" : isMedium ? "#f59e0b" : "#06b6d4";
  const riskStatus = isCritical ? "CRITICAL" : isMedium ? "MEDIUM" : "LOW";
  const confidenceScore = isCritical ? "99.8" : isMedium ? "84.2" : "92.5";

  const getPredictorMessage = () => {
    if (asset.analysis && typeof asset.analysis === "string")
      return asset.analysis;

    if (isCritical)
      return "CRITICAL: DECAY ACCELERATING. IMPACT TRAJECTORY CALCULATED.";

    if (isMedium)
      return "CAUTION: ORBITAL DECAY OBSERVED. CLOSE MONITORING ADVISED.";

    return "STABLE: TELEMETRY NOMINAL. SGP4 PROPAGATION IN SYNC.";
  };

  return (
    <div className="h-full flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden max-h-[calc(100vh-100px)]">
      {/* Header */}
      <div className="flex justify-between items-center mb-3 px-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-cyan-500 text-[9px] font-black uppercase tracking-[0.2em] hover:text-white transition-all group"
        >
          <div className="p-1 rounded-lg bg-cyan-500/10 group-hover:bg-cyan-500 group-hover:text-black transition-all">
            <ArrowLeft size={12} />
          </div>
          Back to Fleet List
        </button>
        <div className="flex gap-6">
          <div className="text-right border-r border-white/10 pr-4">
            <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-0.5">
              Altitude
            </p>
            <p className="text-xl text-white font-mono font-black">
              {currentAltitude || "---"}{" "}
              <span className="text-xs text-cyan-500 opacity-60">KM</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest mb-0.5">
              Status
            </p>
            <p
              className="text-xl font-mono font-black animate-pulse"
              style={{ color: riskColor }}
            >
              {riskStatus}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 overflow-hidden px-2 pb-1">
        <div className="lg:col-span-2 flex flex-col gap-3 min-h-0">
          <div className="flex-1 relative bg-black rounded-[1.5rem] border border-white/10 overflow-hidden shadow-2xl group">
            <div
              className="absolute inset-0 opacity-40 grayscale group-hover:grayscale-0 transition-all duration-1000"
              style={{
                backgroundImage: `url('https://upload.wikimedia.org/wikipedia/commons/8/83/Equirectangular_projection_SW.jpg')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />

            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent h-20 w-full animate-[scan_4s_linear_infinite] pointer-events-none" />

            <svg
              key={tick}
              viewBox="0 0 360 180"
              className="w-full h-full relative z-10 p-2"
            >
              {/* Static Grid */}
              {[...Array(12)].map((_, i) => (
                <line
                  key={`v-${i}`}
                  x1={i * 30}
                  y1="0"
                  x2={i * 30}
                  y2="180"
                  stroke="white"
                  strokeWidth="0.1"
                  opacity="0.2"
                />
              ))}
              {[...Array(6)].map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1="0"
                  y1={i * 30}
                  x2="360"
                  y2={i * 30}
                  stroke="white"
                  strokeWidth="0.1"
                  opacity="0.2"
                />
              ))}

              {/* Impact Path */}
              {groundTrackPoints.length > 0 && (
                <polyline
                  fill="none"
                  stroke={riskColor}
                  strokeWidth="1.2"
                  strokeDasharray="4 2"
                  points={groundTrackPoints
                    .map((p) => `${Number(p[1]) + 180},${90 - Number(p[0])}`)
                    .join(" ")}
                />
              )}

              {/* Live Moving Marker */}
              <g
                style={{
                  // TRANSITION FIX: Dynamic Interval-ku etha maari speed-ai glide panna vachurken
                  transition: `transform ${groundTrackPoints.length <= 40 ? "8000ms" : "2000ms"} linear`,
                  transform: `translate(${Number(liveCoords.lng) + 180}px, ${90 - Number(liveCoords.lat)}px)`,
                }}
              >
                <circle
                  r="3.5"
                  fill={riskColor}
                  className="animate-pulse shadow-lg"
                />
                <circle
                  r="10"
                  fill={riskColor}
                  fillOpacity="0.15"
                  className="animate-ping"
                />
                <circle r="1" fill="white" />
              </g>
            </svg>

            <div className="absolute bottom-4 left-4 z-20 bg-black/80 backdrop-blur-md border border-white/10 px-3 py-1 rounded-lg flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[8px] font-mono font-bold text-slate-300 uppercase">
                Uplink Active // ID_{asset.norad_id}
              </span>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-4 rounded-[1.5rem] shrink-0">
            <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter truncate flex items-center gap-3">
              <Target className="text-cyan-500" size={24} />
              {asset.name}
            </h3>
          </div>
        </div>

        {/* Right Side Panels */}
        <div className="flex flex-col gap-3 min-h-0 overflow-hidden">
          <div
            className="p-5 rounded-[1.5rem] shadow-2xl border border-white/10 flex flex-col justify-center relative overflow-hidden group shrink-0"
            style={{ backgroundColor: `${riskColor}15` }}
          >
            <div
              className="absolute top-0 left-0 w-1 h-full"
              style={{ backgroundColor: riskColor }}
            />
            <h4
              className="uppercase text-[8px] font-black mb-2 flex items-center gap-2 opacity-60"
              style={{ color: riskColor }}
            >
              <ShieldAlert size={14} /> Predictor Analysis
            </h4>
            <p className="text-[11px] font-black text-white leading-tight uppercase italic line-clamp-2">
              "{getPredictorMessage()}"
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 p-5 rounded-[1.5rem] flex-1 flex flex-col justify-center relative group min-h-0">
            <div className="absolute top-3 right-4 opacity-10 group-hover:opacity-100 transition-opacity">
              <Activity size={20} className="text-cyan-500" />
            </div>
            <p className="text-[8px] text-slate-500 uppercase font-black mb-1 tracking-[0.2em]">
              Latitude
            </p>
            <p className="text-3xl text-white font-mono font-black italic">
              {Number(liveCoords.lat).toFixed(4)}°
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 p-5 rounded-[1.5rem] flex-1 flex flex-col justify-center relative group min-h-0">
            <div className="absolute top-3 right-4 opacity-10 group-hover:opacity-100 transition-opacity">
              <GlobeIcon size={20} className="text-cyan-500" />
            </div>
            <p className="text-[8px] text-slate-500 uppercase font-black mb-1 tracking-[0.2em]">
              Longitude
            </p>
            <p className="text-3xl text-white font-mono font-black italic">
              {Number(liveCoords.lng).toFixed(4)}°
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 p-4 rounded-[1.2rem] flex flex-col gap-2 shrink-0">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <Cpu size={12} className="text-cyan-500" />
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  Confidence
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-white">
                {confidenceScore}%
              </span>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-1000 ease-out"
                style={{
                  width: `${confidenceScore}%`,
                  backgroundColor: riskColor,
                }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[7px] text-slate-500 font-bold uppercase">
                Model: SGP4_PRO
              </span>
              <span className="text-[7px] text-cyan-500 font-black animate-pulse uppercase">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(200%); }
        }
      `}</style>
    </div>
  );
};

export default SatelliteAnalysis;
