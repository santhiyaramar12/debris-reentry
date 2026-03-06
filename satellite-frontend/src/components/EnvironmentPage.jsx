import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Sun,
  Zap,
  Activity,
  RefreshCw,
  Compass,
  Gauge,
  Wind,
  Radio,
  Globe,
  TrendingUp,
  Download,
  AlertTriangle,
  Thermometer,
  CloudRain,
  Eye,
  Crosshair,
  Shield,
} from "lucide-react";
import api from "../services/api";

// ═══════════════════════════════════════════════════════
// ENVIRONMENT PAGE — NASA MISSION ENVIRONMENT CONSOLE
// ═══════════════════════════════════════════════════════

const EnvironmentPage = () => {
  // ─── State ─────────────────────────────────────────
  const [solarData, setSolarData] = useState(null);
  const [kpData, setKpData] = useState(null);
  const [eopData, setEopData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [countdown, setCountdown] = useState(60);

  // Simulation state
  const [dragMultiplier, setDragMultiplier] = useState(1);
  const [stormSimActive, setStormSimActive] = useState(false);

  // Canvas refs
  const densityCanvasRef = useRef(null);
  const dragCanvasRef = useRef(null);

  // ─── Data Fetching ─────────────────────────────────
  const fetchAllData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [solarRes, kpRes, eopRes, weatherRes] = await Promise.allSettled([
        api.get("/space-weather"),
        api.get("/kp-index"),
        api.get("/eop"),
        api.get("/environment-weather"),
      ]);

      if (solarRes.status === "fulfilled") setSolarData(solarRes.value.data);
      if (kpRes.status === "fulfilled") setKpData(kpRes.value.data);
      if (eopRes.status === "fulfilled") setEopData(eopRes.value.data);
      if (weatherRes.status === "fulfilled") setWeatherData(weatherRes.value.data);

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Environment data fetch error:", err);
    }
    setLoading(false);
    setRefreshing(false);
    setCountdown(60);
  }, []);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 60000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 60 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ─── Canvas: Altitude vs Density ───────────────────
  useEffect(() => {
    const canvas = densityCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background grid
    ctx.strokeStyle = "rgba(6, 182, 212, 0.08)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 8; i++) {
      const y = (H / 8) * i + 30;
      ctx.beginPath();
      ctx.moveTo(50, y);
      ctx.lineTo(W - 10, y);
      ctx.stroke();
    }
    for (let i = 0; i < 8; i++) {
      const x = 50 + ((W - 60) / 8) * i;
      ctx.beginPath();
      ctx.moveTo(x, 30);
      ctx.lineTo(x, H - 30);
      ctx.stroke();
    }

    // Density curve (exponential decay with altitude)
    const altitudes = [];
    const densities = [];
    for (let alt = 100; alt <= 800; alt += 5) {
      altitudes.push(alt);
      // Simplified NRLMSISE-00 approximation
      const rho = 1.225 * Math.exp(-alt / 60);
      densities.push(rho);
    }
    const maxDensity = densities[0];

    // Draw curve
    ctx.beginPath();
    ctx.strokeStyle = "#06b6d4";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#06b6d4";
    ctx.shadowBlur = 8;
    for (let i = 0; i < altitudes.length; i++) {
      const x = 50 + ((altitudes[i] - 100) / 700) * (W - 60);
      const y = 30 + (1 - densities[i] / maxDensity) * (H - 60);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Fill under curve
    ctx.lineTo(50 + (700 / 700) * (W - 60), H - 30);
    ctx.lineTo(50, H - 30);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 30, 0, H - 30);
    grad.addColorStop(0, "rgba(6, 182, 212, 0.15)");
    grad.addColorStop(1, "rgba(6, 182, 212, 0.01)");
    ctx.fillStyle = grad;
    ctx.fill();

    // Atmospheric layer labels
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(6, 182, 212, 0.5)";
    ctx.textAlign = "center";

    // Thermosphere band
    const thermoStart = 50 + ((80 - 100) / 700) * (W - 60);
    const thermoEnd = 50 + ((600 - 100) / 700) * (W - 60);
    ctx.fillStyle = "rgba(239, 68, 68, 0.05)";
    ctx.fillRect(Math.max(50, thermoStart), 30, thermoEnd - Math.max(50, thermoStart), H - 60);
    ctx.fillStyle = "rgba(239, 68, 68, 0.4)";
    ctx.fillText("THERMOSPHERE", (Math.max(50, thermoStart) + thermoEnd) / 2, 22);

    // Exosphere band
    ctx.fillStyle = "rgba(139, 92, 246, 0.03)";
    ctx.fillRect(thermoEnd, 30, W - 10 - thermoEnd, H - 60);
    ctx.fillStyle = "rgba(139, 92, 246, 0.4)";
    ctx.fillText("EXOSPHERE", (thermoEnd + W - 10) / 2, 22);

    // Satellite marker at 180 km
    const satAlt = 180;
    const satX = 50 + ((satAlt - 100) / 700) * (W - 60);
    const satRho = 1.225 * Math.exp(-satAlt / 60);
    const satY = 30 + (1 - satRho / maxDensity) * (H - 60);
    ctx.beginPath();
    ctx.arc(satX, satY, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#ef4444";
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font = "8px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#ef4444";
    ctx.textAlign = "left";
    ctx.fillText(`SAT: ${satAlt} km`, satX + 8, satY - 5);

    // Axis labels
    ctx.font = "8px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
    ctx.textAlign = "center";
    for (let a = 100; a <= 800; a += 100) {
      const x = 50 + ((a - 100) / 700) * (W - 60);
      ctx.fillText(`${a}`, x, H - 15);
    }
    ctx.fillText("ALTITUDE (km)", W / 2, H - 3);

    ctx.save();
    ctx.translate(12, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("DENSITY", 0, 0);
    ctx.restore();
  }, [solarData]);

  // ─── Canvas: Drag Impact Chart ─────────────────────
  useEffect(() => {
    const canvas = dragCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "rgba(6, 182, 212, 0.08)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 6; i++) {
      const y = 30 + ((H - 60) / 6) * i;
      ctx.beginPath(); ctx.moveTo(50, y); ctx.lineTo(W - 10, y); ctx.stroke();
    }

    // Bar chart data: altitude ranges with drag force
    const bars = [
      { label: "100-150", drag: 95, color: "#ef4444" },
      { label: "150-200", drag: 72, color: "#ef4444" },
      { label: "200-300", drag: 45, color: "#f59e0b" },
      { label: "300-400", drag: 22, color: "#f59e0b" },
      { label: "400-500", drag: 8, color: "#3b82f6" },
      { label: "500-600", drag: 3, color: "#3b82f6" },
      { label: "600-800", drag: 1, color: "#3b82f6" },
    ];

    const barW = (W - 80) / bars.length - 8;
    bars.forEach((bar, i) => {
      const x = 55 + i * (barW + 8);
      const barH = (bar.drag / 100) * (H - 70);
      const y = H - 35 - barH;

      // Bar
      const grad = ctx.createLinearGradient(x, y, x, H - 35);
      grad.addColorStop(0, bar.color);
      grad.addColorStop(1, bar.color + "40");
      ctx.fillStyle = grad;
      ctx.shadowColor = bar.color;
      ctx.shadowBlur = 6;
      ctx.fillRect(x, y, barW, barH);
      ctx.shadowBlur = 0;

      // Border
      ctx.strokeStyle = bar.color + "80";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, barW, barH);

      // Labels
      ctx.font = "7px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
      ctx.textAlign = "center";
      ctx.fillText(bar.label, x + barW / 2, H - 20);

      ctx.fillStyle = bar.color;
      ctx.font = "8px 'JetBrains Mono', monospace";
      ctx.fillText(`${bar.drag}%`, x + barW / 2, y - 5);
    });

    // Axis labels
    ctx.font = "8px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
    ctx.textAlign = "center";
    ctx.fillText("ALTITUDE RANGE (km)", W / 2, H - 3);

    ctx.save();
    ctx.translate(12, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("DRAG FORCE %", 0, 0);
    ctx.restore();
  }, [solarData]);

  // ─── Helpers ───────────────────────────────────────
  const getSolarStatusColor = (flux) => {
    if (!flux) return "#06b6d4";
    if (flux >= 200) return "#ef4444";
    if (flux >= 120) return "#eab308";
    return "#22c55e";
  };

  const getKpColor = (kp) => {
    if (!kp && kp !== 0) return "#06b6d4";
    if (kp >= 7) return "#ef4444";
    if (kp >= 5) return "#f59e0b";
    if (kp >= 4) return "#eab308";
    return "#22c55e";
  };

  const getKpBarWidth = (kp) => `${Math.min(((kp || 0) / 9) * 100, 100)}%`;

  // Decay prediction with simulation
  const getDecayPrediction = () => {
    const baseDays = 5;
    const multiplier = stormSimActive ? 3 : dragMultiplier;
    const adjustedDays = Math.max(0.5, baseDays / multiplier);
    return adjustedDays.toFixed(1);
  };

  // ─── Report Generator ──────────────────────────────
  const generateReport = () => {
    const timestamp = new Date().toISOString();
    const solar = solarData || {};
    const kp = kpData || {};
    const eop = eopData || {};
    const weather = weatherData || {};

    const report = `
╔══════════════════════════════════════════════════════════════╗
║       SpaceTug Mission Environment Analysis Report          ║
╚══════════════════════════════════════════════════════════════╝

Generated: ${timestamp}
System: SpaceTug Mission Environment Console

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. SOLAR ACTIVITY
   Solar Flux (F10.7): ${solar.solar_flux || "N/A"} SFU
   Sunspot Count: ${solar.sunspots || "N/A"}
   Status: ${solar.status || "N/A"}
   Data Source: ${solar.source || "N/A"}

2. GEOMAGNETIC STATUS
   Kp Index: ${kp.kp_index ?? "N/A"}
   Storm Level: ${kp.storm_level || "N/A"}
   Data Source: ${kp.source || "N/A"}

3. ATMOSPHERIC DRAG ANALYSIS
   Drag Multiplier: ${stormSimActive ? "3x (Storm Simulation)" : dragMultiplier + "x"}
   Predicted Decay: ${getDecayPrediction()} days remaining
   Current Satellite Altitude: 180 km
   Atmospheric Region: Lower Thermosphere
   Estimated Drag Level: High

4. EARTH ORIENTATION PARAMETERS
   Polar Motion X (xp): ${eop.xp ?? "N/A"} arcsec
   Polar Motion Y (yp): ${eop.yp ?? "N/A"} arcsec
   UT1-UTC Offset: ${eop.ut1_utc ?? "N/A"} s
   Length of Day (LOD): ${eop.lod ?? "N/A"} ms
   Earth Rotation Status: Nominal
   Data Source: ${eop.source || "N/A"}

5. IMPACT ZONE WEATHER CONDITIONS
   Wind Speed: ${weather.wind_speed ?? "N/A"} m/s
   Temperature: ${weather.temperature ?? "N/A"} °C
   Cloud Cover: ${weather.cloud_cover ?? "N/A"}%
   Humidity: ${weather.humidity ?? "N/A"}%
   Description: ${weather.description || "N/A"}
   Data Source: ${weather.source || "N/A"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
END OF REPORT — SpaceTug Mission Control
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SpaceTug_Environment_Report_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Loading State ─────────────────────────────────
  if (loading && !solarData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-2 border-cyan-500/20 rounded-full" />
            <div className="absolute inset-0 w-16 h-16 border-2 border-transparent border-t-cyan-500 rounded-full animate-spin" />
          </div>
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono">
            Acquiring Environment Telemetry...
          </span>
        </div>
      </div>
    );
  }

  const solar = solarData || {};
  const kp = kpData || {};
  const eop = eopData || {};
  const weather = weatherData || {};

  // ═══════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════
  return (
    <div className="h-full flex flex-col overflow-hidden animate-in env-console">
      {/* ═══ HEADER ═══ */}
      <div className="flex justify-between items-center px-6 pt-4 pb-3 shrink-0 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20 env-glow-box">
            <Globe size={22} className="text-cyan-400" />
          </div>
          <div>
            <h2
              className="text-xl font-black text-white uppercase tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Mission Environment Console
            </h2>
            <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">
              Space Weather // Atmospheric Analysis // Environment Intelligence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* LIVE Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            <span className="text-[8px] font-black text-green-400 uppercase tracking-[0.2em] font-mono">
              Live Environment Data
            </span>
          </div>

          {/* Countdown */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
            <span className="text-[8px] font-mono text-slate-500 uppercase">
              Refresh: {countdown}s
            </span>
          </div>

          {lastUpdated && (
            <span className="text-[8px] font-mono text-slate-600 uppercase hidden lg:inline">
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}

          <button
            onClick={fetchAllData}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-bold text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all uppercase tracking-widest"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* ═══ STORM SIM ALERT BANNER ═══ */}
      {stormSimActive && (
        <div className="mx-6 mt-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 env-alert-banner">
          <AlertTriangle size={16} className="text-red-400 animate-pulse" />
          <div>
            <span className="text-[10px] font-black text-red-400 uppercase tracking-wider">
              ⚠ Solar Storm Simulation Active
            </span>
            <span className="text-[9px] text-red-400/70 ml-3 font-mono">
              Orbital decay acceleration detected — Atmospheric density increased 3×
            </span>
          </div>
        </div>
      )}

      {/* ═══ CONTENT ═══ */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-4 space-y-5">

        {/* ═══════════════════════════════════════════════
            SECTION 1: SPACE WEATHER MONITORING
            ═══════════════════════════════════════════════ */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sun size={14} className="text-yellow-400" />
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono">
              Space Weather Monitoring
            </h3>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Solar Flux Monitor */}
            <div className="env-telemetry-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-yellow-500/10 rounded-lg">
                    <Radio size={16} className="text-yellow-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-tight">
                      Solar Flux Monitor
                    </h4>
                    <p className="text-[7px] text-slate-500 uppercase tracking-widest font-mono">
                      F10.7 Index
                    </p>
                  </div>
                </div>
                <div
                  className="px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider"
                  style={{
                    color: getSolarStatusColor(solar.solar_flux),
                    backgroundColor: `${getSolarStatusColor(solar.solar_flux)}15`,
                    border: `1px solid ${getSolarStatusColor(solar.solar_flux)}30`,
                  }}
                >
                  {solar.status || "---"}
                </div>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-xl p-4 mb-3">
                <p className="text-[8px] text-slate-500 uppercase font-black mb-1 font-mono">
                  Solar Flux
                </p>
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-3xl font-mono font-black"
                    style={{ color: getSolarStatusColor(solar.solar_flux) }}
                  >
                    {solar.solar_flux || "---"}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">SFU</span>
                </div>
              </div>

              <p className="text-[8px] text-slate-500 leading-relaxed font-mono">
                <span className="text-yellow-400/70">INFO:</span> Higher solar flux increases
                thermosphere density which increases satellite drag.
              </p>
            </div>

            {/* Sunspot Activity */}
            <div className="env-telemetry-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <Sun size={16} className="text-orange-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-tight">
                      Sunspot Activity
                    </h4>
                    <p className="text-[7px] text-slate-500 uppercase tracking-widest font-mono">
                      Solar Region Status
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-xl p-4 mb-3">
                <p className="text-[8px] text-slate-500 uppercase font-black mb-1 font-mono">
                  Sunspot Count
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-black text-orange-400">
                    {solar.sunspots ?? "---"}
                  </span>
                </div>
              </div>

              <div className="bg-black/30 border border-white/5 rounded-lg p-2.5 flex items-center gap-2">
                <Activity size={11} className="text-orange-400" />
                <span className="text-[8px] font-mono text-slate-400">
                  Solar Region Status:{" "}
                  <span className="text-white font-bold">
                    {(solar.sunspots || 0) > 100 ? "Active" : "Nominal"}
                  </span>
                </span>
              </div>

              {(solar.sunspots || 0) > 100 && (
                <div className="mt-2 px-2.5 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <span className="text-[8px] font-mono text-yellow-400">
                    ⚠ Elevated solar activity may accelerate orbital decay.
                  </span>
                </div>
              )}
            </div>

            {/* Geomagnetic Storm Monitor (Kp Index) */}
            <div className="env-telemetry-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Zap size={16} className="text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-tight">
                      Geomagnetic Storm
                    </h4>
                    <p className="text-[7px] text-slate-500 uppercase tracking-widest font-mono">
                      Kp Index Monitor
                    </p>
                  </div>
                </div>
                <div
                  className="px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider"
                  style={{
                    color: getKpColor(kp.kp_index),
                    backgroundColor: `${getKpColor(kp.kp_index)}15`,
                    border: `1px solid ${getKpColor(kp.kp_index)}30`,
                  }}
                >
                  {kp.storm_level || "---"}
                </div>
              </div>

              {/* Kp Gauge */}
              <div className="mb-4">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[8px] text-slate-500 uppercase font-black font-mono">
                    Kp Index
                  </span>
                  <span
                    className="text-3xl font-mono font-black"
                    style={{ color: getKpColor(kp.kp_index) }}
                  >
                    {kp.kp_index ?? "---"}
                  </span>
                </div>
                <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: getKpBarWidth(kp.kp_index),
                      background: `linear-gradient(90deg, #22c55e, ${getKpColor(kp.kp_index)})`,
                      boxShadow: `0 0 12px ${getKpColor(kp.kp_index)}50`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[7px] text-green-400 font-bold font-mono">QUIET</span>
                  <span className="text-[7px] text-yellow-400 font-bold font-mono">UNSETTLED</span>
                  <span className="text-[7px] text-orange-400 font-bold font-mono">STORM</span>
                  <span className="text-[7px] text-red-400 font-bold font-mono">SEVERE</span>
                </div>
              </div>

              {(kp.kp_index || 0) >= 5 && (
                <div className="px-2.5 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <span className="text-[8px] font-mono text-red-400">
                    ⚠ Geomagnetic storm detected — Possible increase in atmospheric drag.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            SECTION 2: ATMOSPHERIC DRAG ANALYSIS
            ═══════════════════════════════════════════════ */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-cyan-400" />
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono">
              Atmospheric Drag Analysis
            </h3>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Altitude vs Density Chart */}
            <div className="env-telemetry-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Gauge size={14} className="text-cyan-400" />
                  <h4 className="text-[10px] font-black text-white uppercase tracking-tight font-mono">
                    Altitude vs Atmospheric Density
                  </h4>
                </div>
              </div>
              <canvas
                ref={densityCanvasRef}
                width={520}
                height={260}
                className="w-full rounded-lg"
                style={{ maxHeight: "260px" }}
              />
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="bg-black/30 border border-white/5 rounded-lg p-2.5 text-center">
                  <p className="text-[7px] text-slate-500 uppercase font-black font-mono">Altitude</p>
                  <p className="text-sm font-mono font-black text-cyan-400">180 km</p>
                </div>
                <div className="bg-black/30 border border-white/5 rounded-lg p-2.5 text-center">
                  <p className="text-[7px] text-slate-500 uppercase font-black font-mono">Region</p>
                  <p className="text-[9px] font-mono font-bold text-white">Lower Thermo</p>
                </div>
                <div className="bg-black/30 border border-red-500/20 rounded-lg p-2.5 text-center">
                  <p className="text-[7px] text-slate-500 uppercase font-black font-mono">Drag</p>
                  <p className="text-sm font-mono font-black text-red-400">HIGH</p>
                </div>
              </div>
            </div>

            {/* Drag Impact Chart */}
            <div className="env-telemetry-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wind size={14} className="text-orange-400" />
                  <h4 className="text-[10px] font-black text-white uppercase tracking-tight font-mono">
                    Drag Impact by Altitude
                  </h4>
                </div>
              </div>
              <canvas
                ref={dragCanvasRef}
                width={520}
                height={260}
                className="w-full rounded-lg"
                style={{ maxHeight: "260px" }}
              />
              <div className="mt-3 flex items-center justify-center gap-6">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-2 rounded-sm bg-blue-500" />
                  <span className="text-[7px] font-mono text-slate-500 uppercase">Low Drag</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-2 rounded-sm bg-orange-500" />
                  <span className="text-[7px] font-mono text-slate-500 uppercase">Moderate</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-2 rounded-sm bg-red-500" />
                  <span className="text-[7px] font-mono text-slate-500 uppercase">High Drag</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            SECTION 3: IMPACT ENVIRONMENT HEATMAP
            ═══════════════════════════════════════════════ */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Crosshair size={14} className="text-red-400" />
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono">
              Impact Environment Conditions
            </h3>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          <div className="env-telemetry-card p-5">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-center">
                <Wind size={20} className="text-cyan-400 mx-auto mb-2" />
                <p className="text-[8px] text-slate-500 uppercase font-black font-mono mb-1">Wind Speed</p>
                <p className="text-2xl font-mono font-black text-white">
                  {weather.wind_speed ?? "---"}
                  <span className="text-[10px] text-slate-500 ml-1">m/s</span>
                </p>
                <div
                  className="mt-2 text-[7px] font-bold uppercase px-2 py-0.5 rounded-full inline-block"
                  style={{
                    color: (weather.wind_speed || 0) > 15 ? "#ef4444" : (weather.wind_speed || 0) > 8 ? "#eab308" : "#22c55e",
                    backgroundColor: (weather.wind_speed || 0) > 15 ? "#ef444415" : (weather.wind_speed || 0) > 8 ? "#eab30815" : "#22c55e15",
                  }}
                >
                  {(weather.wind_speed || 0) > 15 ? "High" : (weather.wind_speed || 0) > 8 ? "Moderate" : "Low"}
                </div>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-center">
                <Thermometer size={20} className="text-orange-400 mx-auto mb-2" />
                <p className="text-[8px] text-slate-500 uppercase font-black font-mono mb-1">Temperature</p>
                <p className="text-2xl font-mono font-black text-white">
                  {weather.temperature ?? "---"}
                  <span className="text-[10px] text-slate-500 ml-1">°C</span>
                </p>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-center">
                <CloudRain size={20} className="text-blue-400 mx-auto mb-2" />
                <p className="text-[8px] text-slate-500 uppercase font-black font-mono mb-1">Cloud Cover</p>
                <p className="text-2xl font-mono font-black text-white">
                  {weather.cloud_cover ?? "---"}
                  <span className="text-[10px] text-slate-500 ml-1">%</span>
                </p>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-center">
                <Eye size={20} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-[8px] text-slate-500 uppercase font-black font-mono mb-1">Conditions</p>
                <p className="text-sm font-mono font-bold text-white capitalize mt-2">
                  {weather.description || "---"}
                </p>
                <p className="text-[7px] text-slate-500 font-mono mt-1">
                  Humidity: {weather.humidity ?? "---"}%
                </p>
              </div>
            </div>

            <div className="mt-4 bg-black/20 border border-white/5 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crosshair size={12} className="text-red-400" />
                <span className="text-[9px] font-mono text-slate-400 uppercase">
                  Possible Landing Region: <span className="text-white font-bold">Mid-latitude Ocean Zone</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Shield size={12} className="text-green-400" />
                <span className="text-[9px] font-mono text-slate-400 uppercase">
                  Recovery Conditions: <span className="text-green-400 font-bold">Favorable</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            SECTION 4: EARTH ORIENTATION PARAMETERS
            ═══════════════════════════════════════════════ */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Compass size={14} className="text-blue-400" />
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono">
              Earth Orientation Parameters
            </h3>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          <div className="env-telemetry-card p-5">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-black/40 border border-cyan-500/10 rounded-xl p-4">
                <p className="text-[8px] text-slate-500 uppercase font-black mb-1.5 font-mono flex items-center gap-1">
                  <Compass size={9} /> Polar Motion X
                </p>
                <p className="text-xl font-mono font-black text-cyan-400">
                  {eop.xp !== undefined ? Number(eop.xp).toFixed(4) : "---"}
                  <span className="text-[9px] text-slate-500 ml-1">arcsec</span>
                </p>
              </div>
              <div className="bg-black/40 border border-cyan-500/10 rounded-xl p-4">
                <p className="text-[8px] text-slate-500 uppercase font-black mb-1.5 font-mono flex items-center gap-1">
                  <Compass size={9} /> Polar Motion Y
                </p>
                <p className="text-xl font-mono font-black text-cyan-400">
                  {eop.yp !== undefined ? Number(eop.yp).toFixed(4) : "---"}
                  <span className="text-[9px] text-slate-500 ml-1">arcsec</span>
                </p>
              </div>
              <div className="bg-black/40 border border-blue-500/10 rounded-xl p-4">
                <p className="text-[8px] text-slate-500 uppercase font-black mb-1.5 font-mono flex items-center gap-1">
                  <Activity size={9} /> UT1-UTC Offset
                </p>
                <p className="text-xl font-mono font-black text-blue-400">
                  {eop.ut1_utc !== undefined ? Number(eop.ut1_utc).toFixed(4) : "---"}
                  <span className="text-[9px] text-slate-500 ml-1">s</span>
                </p>
              </div>
              <div className="bg-black/40 border border-blue-500/10 rounded-xl p-4">
                <p className="text-[8px] text-slate-500 uppercase font-black mb-1.5 font-mono flex items-center gap-1">
                  <Activity size={9} /> Length of Day
                </p>
                <p className="text-xl font-mono font-black text-white">
                  {eop.lod !== undefined ? `+${Number(eop.lod).toFixed(4)}` : "---"}
                  <span className="text-[9px] text-slate-500 ml-1">ms</span>
                </p>
              </div>
              <div className="bg-black/40 border border-green-500/10 rounded-xl p-4 flex flex-col items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)] mb-2" />
                <p className="text-[8px] text-green-400 uppercase font-black font-mono">Nominal</p>
                <p className="text-[7px] text-slate-500 font-mono">Earth Rotation</p>
              </div>
            </div>

            <div className="mt-3 bg-black/20 border border-white/5 rounded-xl p-3">
              <p className="text-[8px] text-slate-500 leading-relaxed font-mono">
                <span className="text-blue-400 font-bold">INFO:</span> Earth orientation parameters are
                used for high precision satellite orbit prediction and tracking accuracy.
                Source: {eop.source || "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            SECTION 5: SIMULATION CONTROLS
            ═══════════════════════════════════════════════ */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Gauge size={14} className="text-purple-400" />
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono">
              Environment Simulation Controls
            </h3>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Drag Multiplier */}
            <div className="env-telemetry-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Gauge size={14} className="text-purple-400" />
                <h4 className="text-[10px] font-black text-white uppercase tracking-tight font-mono">
                  Drag Level Multiplier
                </h4>
              </div>

              <div className="mb-4">
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.5"
                  value={dragMultiplier}
                  onChange={(e) => setDragMultiplier(parseFloat(e.target.value))}
                  className="env-slider w-full"
                  disabled={stormSimActive}
                />
                <div className="flex justify-between mt-2">
                  <span className="text-[8px] font-mono text-green-400 font-bold">1× Normal</span>
                  <span className="text-[8px] font-mono text-yellow-400 font-bold">2× Elevated</span>
                  <span className="text-[8px] font-mono text-red-400 font-bold">3× Storm</span>
                </div>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[8px] text-slate-500 uppercase font-black font-mono">
                      Current Multiplier
                    </p>
                    <p className="text-2xl font-mono font-black text-purple-400">
                      {stormSimActive ? "3" : dragMultiplier}×
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-slate-500 uppercase font-black font-mono">
                      Predicted Decay
                    </p>
                    <p className="text-2xl font-mono font-black text-white">
                      {getDecayPrediction()}
                      <span className="text-[10px] text-slate-500 ml-1">days</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Solar Storm Simulation */}
            <div className="env-telemetry-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap size={14} className="text-red-400" />
                  <h4 className="text-[10px] font-black text-white uppercase tracking-tight font-mono">
                    Solar Storm Simulation
                  </h4>
                </div>
                {/* Toggle Switch */}
                <button
                  onClick={() => setStormSimActive(!stormSimActive)}
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                    stormSimActive
                      ? "bg-red-500/30 border-red-500/50"
                      : "bg-white/5 border-white/10"
                  } border`}
                >
                  <div
                    className={`absolute top-0.5 w-6 h-6 rounded-full transition-all duration-300 ${
                      stormSimActive
                        ? "left-7 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                        : "left-0.5 bg-slate-500"
                    }`}
                  />
                </button>
              </div>

              <div className="space-y-3">
                <div className={`bg-black/40 border rounded-xl p-4 transition-all ${
                  stormSimActive ? "border-red-500/30" : "border-white/5"
                }`}>
                  <p className="text-[8px] text-slate-500 uppercase font-black font-mono mb-2">
                    Simulation Status
                  </p>
                  <p className={`text-lg font-mono font-black ${stormSimActive ? "text-red-400" : "text-slate-600"}`}>
                    {stormSimActive ? "ACTIVE" : "INACTIVE"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/30 border border-white/5 rounded-lg p-3">
                    <p className="text-[7px] text-slate-500 uppercase font-black font-mono mb-1">
                      Normal Decay
                    </p>
                    <p className="text-sm font-mono font-bold text-green-400">5.0 days</p>
                  </div>
                  <div className={`bg-black/30 border rounded-lg p-3 ${stormSimActive ? "border-red-500/20" : "border-white/5"}`}>
                    <p className="text-[7px] text-slate-500 uppercase font-black font-mono mb-1">
                      Storm Decay
                    </p>
                    <p className={`text-sm font-mono font-bold ${stormSimActive ? "text-red-400" : "text-slate-600"}`}>
                      1.7 days
                    </p>
                  </div>
                </div>

                <p className="text-[8px] text-slate-500 leading-relaxed font-mono">
                  <span className="text-red-400/70">NOTE:</span> When activated, atmospheric density
                  increases 3× and orbital decay rate accelerates.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            SECTION 6: REPORT GENERATOR
            ═══════════════════════════════════════════════ */}
        <div className="env-telemetry-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Download size={16} className="text-cyan-400" />
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                  Environment Report Generator
                </h4>
                <p className="text-[8px] text-slate-500 font-mono uppercase tracking-widest">
                  Export comprehensive mission environment analysis
                </p>
              </div>
            </div>
            <button
              onClick={generateReport}
              className="flex items-center gap-2 px-5 py-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-[10px] font-black text-cyan-400 uppercase tracking-widest hover:bg-cyan-500/20 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all"
            >
              <Download size={14} />
              Download Environment Report
            </button>
          </div>
        </div>

        {/* ═══ BOTTOM STATUS BAR ═══ */}
        <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Data Sources: NOAA/SWPC • CelesTrak • OpenWeatherMap • IERS
            </span>
          </div>
          <span className="text-[8px] font-mono text-slate-600 uppercase">
            Auto-refresh: 60s | {solarData?.source === "FALLBACK" ? "FALLBACK MODE" : "LIVE DATA"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default EnvironmentPage;
