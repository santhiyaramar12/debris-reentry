import React, { useState, useEffect, useRef } from "react";
import Globe from "react-globe.gl";
import {
  Zap,
  Rocket,
  Globe as GlobeIcon,
  Shield,
  Clock,
  Map as MapIcon,
  Activity,
  User,
  TrendingDown,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";

import { satelliteService } from "../services/api";
import SatelliteAnalysis from "./SatelliteAnalysis";
import AlertDetail from "./AlertDetail";
import HomePage from "./HomePage";
import AdminPanel from "./AdminPanel";
import LiveGlobe from "./LiveGlobe";
import ReportsPage from "./ReportsPage";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const Dashboard = ({ activeTab, setActiveTab, setToken, logout }) => {
  const globeEl = useRef();
  const [alerts, setAlerts] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [time, setTime] = useState(new Date());
  const role = localStorage.getItem("role") || "user";
  const isAdmin = role === "admin" || role === "supervisor";

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getUTCData = () => {
    const h = String(time.getUTCHours()).padStart(2, "0");
    const m = String(time.getUTCMinutes()).padStart(2, "0");
    const s = String(time.getUTCSeconds()).padStart(2, "0");
    const date = time.getUTCDate();
    const month = time
      .toLocaleString("en-US", { month: "short", timeZone: "UTC" })
      .toUpperCase();
    const year = time.getUTCFullYear();
    const day = time
      .toLocaleString("en-US", { weekday: "short", timeZone: "UTC" })
      .toUpperCase();
    return { h, m, s, date, month, year, day };
  };

  const { h, m: min, s, date, month, year, day } = getUTCData();

  // Dashboard.jsx - Line 40 range-la irukkura renderUTCClock-ai update pannu
  const renderUTCClock = () => {
    return (
      <div className="relative flex flex-col items-center justify-center w-40 h-40 bg-slate-900/90 rounded-full border border-white/10 backdrop-blur-2xl shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden group">
        {/* ROTATING RINGS - Thinner for compact look */}
        <div className="absolute inset-0 border-[1.5px] border-transparent border-t-cyan-500 rounded-full animate-[spin_4s_linear_infinite] opacity-70" />
        <div className="absolute inset-1.5 border-[1px] border-transparent border-b-red-500 rounded-full animate-[spin_8s_linear_reverse_infinite] opacity-50" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-center gap-1 mb-0.5">
            <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse shadow-[0_0_5px_red]" />
            <span className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em]">
              UTC
            </span>
          </div>

          {/* Time Display - Reduced to 3xl */}
          <div className="text-3xl font-mono font-black italic text-white tracking-tighter mb-0.5 flex items-baseline">
            {h}
            <span className="animate-pulse text-red-500 mx-0.5">:</span>
            {min}
          </div>

          {/* Date & Day - Compact font */}
          <div className="flex flex-col items-center border-t border-white/10 pt-1">
            <p className="text-[7px] font-black text-cyan-400 uppercase tracking-widest">
              {day} {month} {date}
            </p>
            <p className="text-[11px] font-mono font-black text-white/20 tracking-widest">
              {year}
            </p>
          </div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 to-transparent pointer-events-none" />
      </div>
    );
  };

  const fetchData = async () => {
    try {
      const data = await satelliteService.fetchData(activeTab);
      if (data && Array.isArray(data)) {
        setAlerts(data);
      } else {
        setAlerts([]);
      }
    } catch (err) {
      console.error(`Uplink Error:`, err);
    }
  };

  const handleAnalyze = async (item) => {
    setSelectedAsset(null);
    try {
      const resData = await satelliteService.analyzeSatellite(item.norad_id);
      if (resData.status === "success") {
        const meta = resData.metadata || {};
        const analysis = resData.analysis || {};
        const altitudeVal = Number(meta.altitude || 0);

        const currentLat = resData.state_vectors?.position_km?.x
          ? (resData.state_vectors.position_km.x / 6371) * (180 / Math.PI)
          : meta.latitude || item.lat || 0;
        const currentLng = resData.state_vectors?.position_km?.y
          ? (resData.state_vectors.position_km.y / 6371) * (180 / Math.PI)
          : meta.longitude || item.lng || 0;

        const riskFromBackend = (
          analysis.risk_level ||
          meta.threshold_status ||
          "LOW"
        ).toUpperCase();

        // STRICT 120KM THRESHOLD
        const isActuallyCritical =
          riskFromBackend === "CRITICAL" || altitudeVal < 120;

        const processedAsset = {
          ...item,
          lat: Number(currentLat),
          lng: Number(currentLng),
          statusColor: isActuallyCritical ? "#ef4444" : "#00f2ff",
          risk_level: isActuallyCritical ? "CRITICAL" : riskFromBackend,
          analysis_text:
            analysis.message ||
            "Orbital trajectory synchronized via SGP4/Monte Carlo.",
          analysis: analysis,
          impact_data: resData.impact_data || {},
          ground_track: resData.map_data?.ground_track || [],
          metadata: { ...meta, altitude: altitudeVal },
          state_vectors: resData.state_vectors || {},
          is_critical: isActuallyCritical,
          reentry_window: resData.reentry_window || {},
        };

        setTimeout(() => setSelectedAsset(processedAsset), 50);
      }
    } catch (err) {
      console.error("Analysis Failed", err);
    }
  };

  useEffect(() => {
    if (activeTab === "Missions" || activeTab === "Alerts") {
      setSelectedAsset(null);
      fetchData();
    }
  }, [activeTab]);

  
  // --- RENDER HOME TAB ---
  if (activeTab === "Home") {
    return (
      <div className="h-screen w-screen bg-[#020617] flex flex-col overflow-hidden relative">
        {/* 1. Navbar (Unga existing code) */}
        <nav className="shrink-0 z-[1000]">{/* ... Navbar content ... */}</nav>

        {/* 2. CLOCK FIX: Inga add pannunga. 
          Ippo ithu HomePage-kku veliya irukkathala scroll panna nagaraathu */}
        {activeTab === "Home" && (
          <div className="fixed top-28 right-10 z-[9999] pointer-events-none">
            {renderUTCClock()}
          </div>
        )}

        {/* 3. Main Content Area */}
        <main className="flex-1 relative overflow-hidden">
          {activeTab === "Home" ? (
            <div className="h-full w-full overflow-y-auto custom-scrollbar">
              <HomePage isLoggedIn={true} onNavigateLogin={() => {}} />
            </div>
          ) : (
            /* Matha tabs (Missions, Alerts, Admin, etc.) */
            <div className="h-full">
              {/* activeTab-kku etha maari matha components inga render aagum */}
            </div>
          )}
        </main>
      </div>
    );
  }

  // --- RENDER ADMIN PANEL ---
  if (activeTab === "Admin") {
    if (!isAdmin) {
      return (
        <div className="h-full flex items-center justify-center text-red-500 text-sm font-mono uppercase tracking-widest">
          Access Denied: Admin Privileges Required
        </div>
      );
    }
    return <AdminPanel />;
  }

  // --- RENDER SATELLITES (Live Globe) ---
  if (activeTab === "Satellites") {
    return <LiveGlobe />;
  }

  // --- RENDER REPORTS ---
  if (activeTab === "Reports") {
    return <ReportsPage />;
  }

  // --- RENDER ALERTS TAB ---
  if (activeTab === "Alerts") {
    return (
      <div className="h-full flex p-6 gap-6 animate-in">
        <div className="flex-1 flex gap-6">
          {!selectedAsset ? (
            <>
              <div className="w-1/3 flex flex-col bg-slate-900/40 rounded-[2.5rem] border border-red-500/20 p-8 overflow-y-auto custom-scrollbar backdrop-blur-md shadow-2xl">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-red-500 rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                    <Shield size={24} className="text-black" />
                  </div>
                  <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                    Crisis Feed
                  </h2>
                </div>

                <div className="space-y-6">
                  {alerts.length === 0 && (
                    <div className="text-center py-12 text-slate-500 text-xs font-mono uppercase tracking-widest">
                      No active alerts — All systems nominal
                    </div>
                  )}
                  {alerts.map((item, idx) => {
                    const alt = Number(item.altitude || 0);
                    const isCrit =
                      alt < 120 || item.alert_level === "RE-ENTRY IMMINENT";
                    return (
                      <div
                        key={idx}
                        className={`p-6 rounded-[2rem] relative overflow-hidden group border ${
                          isCrit
                            ? "bg-red-500/5 border-red-500/20"
                            : "bg-yellow-500/5 border-yellow-500/20"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <p className="text-white font-black text-lg uppercase italic tracking-tight">
                              {item.name || "Unknown Object"}
                            </p>
                            <p className="text-[10px] font-mono text-red-500/60 font-bold uppercase tracking-widest mt-1">
                              CATALOG ID: {item.norad_id}
                            </p>
                          </div>
                          <div
                            className={`text-[10px] font-black px-3 py-1 rounded-full ${
                              isCrit
                                ? "bg-red-500 text-black animate-pulse"
                                : "bg-yellow-500 text-black"
                            }`}
                          >
                            {item.alert_level || "WARNING"}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                            <p className="text-[8px] text-slate-500 uppercase font-black mb-1">
                              ALTITUDE
                            </p>
                            <p
                              className={`text-sm font-mono font-bold ${isCrit ? "text-red-400" : "text-white"}`}
                            >
                              {item.altitude || "---"} km
                            </p>
                          </div>
                          <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
                            <p className="text-[8px] text-slate-500 uppercase font-black mb-1">
                              HOURS LEFT
                            </p>
                            <p className="text-sm text-white font-mono font-bold">
                              {item.hours_left || "---"} h
                            </p>
                          </div>
                        </div>

                        {/* Re-entry Time Window */}
                        {item.reentry_window_start && (
                          <div className="bg-black/30 border border-white/5 rounded-xl p-3 mb-4">
                            <p className="text-[7px] text-slate-500 uppercase font-black mb-1.5 tracking-widest">
                              Re-entry Window
                            </p>
                            <div className="flex justify-between text-[9px] font-mono">
                              <span className="text-yellow-400">
                                Start: {item.reentry_window_start?.slice(0, 16)}
                              </span>
                              <span className="text-red-400">
                                End: {item.reentry_window_end?.slice(0, 16)}
                              </span>
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => handleAnalyze(item)}
                          className="w-full py-4 bg-red-600 hover:bg-white text-white hover:text-black rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 group/btn"
                        >
                          <Activity
                            size={16}
                            className="group-hover/btn:rotate-90 transition-transform"
                          />
                          Project Impact Path
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-6">
                <div className="flex-1 bg-slate-900/40 rounded-[2.5rem] border border-white/10 relative overflow-hidden shadow-2xl backdrop-blur-md">
                  <div className="absolute inset-0">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/8/83/Equirectangular_projection_SW.jpg"
                      alt="Earth Map"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 z-10">
                    <ComposableMap
                      projectionConfig={{ scale: 200 }}
                      style={{ width: "100%", height: "100%" }}
                    >
                      <Geographies geography={geoUrl}>
                        {({ geographies }) =>
                          geographies.map((geo) => (
                            <Geography
                              key={geo.rsmKey}
                              geography={geo}
                              style={{
                                default: {
                                  fill: "rgba(255,255,255,0.05)",
                                  stroke: "rgba(255,255,255,0.2)",
                                  strokeWidth: 0.5,
                                  outline: "none",
                                },
                                hover: {
                                  fill: "rgba(255,255,255,0.1)",
                                  outline: "none",
                                },
                              }}
                            />
                          ))
                        }
                      </Geographies>
                      {alerts.map((item, idx) => (
                        <Marker
                          key={idx}
                          coordinates={[
                            parseFloat(item.longitude || item.lng || 0),
                            parseFloat(item.latitude || item.lat || 0),
                          ]}
                        >
                          <circle
                            r={8}
                            fill="rgba(239,68,68,0.4)"
                            className="animate-ping"
                          />
                          <circle
                            r={3}
                            fill="#ef4444"
                            stroke="#fff"
                            strokeWidth={1}
                          />
                        </Marker>
                      ))}
                    </ComposableMap>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 h-36">
                  <div className="bg-slate-900/40 border border-white/10 rounded-[2rem] p-6 flex flex-col justify-center backdrop-blur-md">
                    <div className="flex items-center gap-3 mb-2">
                      <Calendar size={16} className="text-cyan-500" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        TLE Epoch
                      </span>
                    </div>
                    <p className="text-2xl text-white font-mono font-black italic uppercase">
                      {date} {month} {year}
                    </p>
                  </div>
                  <div className="bg-slate-900/40 border border-white/10 rounded-[2rem] p-6 flex flex-col justify-center backdrop-blur-md">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingDown size={16} className="text-red-500" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Orbital Decay
                      </span>
                    </div>
                    <p className="text-2xl text-white font-mono font-black italic">
                      {(
                        1.428 +
                        Math.sin(time.getSeconds() / 10) * 0.005
                      ).toFixed(3)}{" "}
                      <span className="text-xs text-red-500/60 ml-1">
                        KM/DAY
                      </span>
                    </p>
                  </div>
                  <div className="bg-slate-900/40 border border-white/10 rounded-[2rem] p-6 flex flex-col justify-center backdrop-blur-md">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock size={16} className="text-yellow-500" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Next Pass
                      </span>
                    </div>
                    <p className="text-2xl text-white font-mono font-black italic uppercase">
                      {(() => {
                        const pass = new Date(
                          time.getTime() + 4 * 60 * 60 * 1000,
                        );
                        return `${String(pass.getUTCHours()).padStart(2, "0")}:${String(pass.getUTCMinutes()).padStart(2, "0")}`;
                      })()}{" "}
                      <span className="text-xs text-yellow-500/60 ml-1">
                        UTC
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 bg-slate-900/60 rounded-[2.5rem] border border-white/10 p-4 backdrop-blur-xl shadow-2xl slide-in-from-right relative">
              <button
                onClick={() => setSelectedAsset(null)}
                className="absolute top-8 right-8 z-50 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest"
              >
                [ Close Analysis ]
              </button>
              <AlertDetail asset={selectedAsset} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- RENDER MISSIONS TAB ---
  return (
    <div className="h-full flex p-6 gap-6 animate-in">
      <div className="flex-1 flex gap-6">
        <div
          className={`flex flex-col bg-slate-900/40 rounded-[2.5rem] border border-white/10 p-8 overflow-hidden transition-all duration-700 backdrop-blur-md shadow-2xl ${selectedAsset ? "w-1/3" : "w-full"}`}
        >
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">
              {activeTab}
            </h2>
            <span className="text-[10px] font-mono text-cyan-500 bg-cyan-500/10 px-4 py-2 rounded-full border border-cyan-500/20 uppercase tracking-widest">
              {alerts.length} Objects Live
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
            {alerts.map((item, idx) => {
              const alt = Number(item.altitude || 0);

              // Initial default values for Above 250km
              let statusColor = "#00f2ff"; // CYAN
              let statusLabel = "LOW";

              if (alt < 150) {
                // Below 150km - CRITICAL
                statusColor = "#ef4444"; // RED
                statusLabel = "CRITICAL";
              } else if (alt >= 150 && alt <= 250) {
                // 150km to 250km - MEDIUM
                statusColor = "#f59e0b"; // YELLOW
                statusLabel = "MEDIUM";
              }

              const isCrit = alt < 150;

              return (
                <div
                  key={idx}
                  className="group bg-white/5 border border-white/5 p-6 rounded-3xl flex justify-between items-center hover:bg-white/10 hover:border-cyan-500/30 transition-all cursor-pointer"
                  onClick={() => handleAnalyze(item)}
                >
                  <div className="flex items-center gap-6">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        isCrit ? "animate-pulse shadow-[0_0_15px_red]" : ""
                      }`}
                      style={{ backgroundColor: statusColor }}
                    />
                    <div>
                      <p className="text-white font-black text-base uppercase tracking-tight group-hover:text-cyan-400">
                        {item.name || "Object " + item.norad_id}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono mt-1 font-bold">
                        ID: {item.norad_id}
                      </p>
                    </div>
                  </div>
                  <button
                    className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all"
                    style={{
                      backgroundColor: `${statusColor}20`,
                      color: statusColor,
                      border: `1px solid ${statusColor}40`,
                    }}
                  >
                    Details
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {selectedAsset && (
          <div className="flex-1 flex flex-col bg-slate-900/60 rounded-[2.5rem] border border-white/10 p-8 overflow-y-auto custom-scrollbar backdrop-blur-xl shadow-2xl slide-in-from-right">
            <SatelliteAnalysis
              asset={selectedAsset}
              onBack={() => setSelectedAsset(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
