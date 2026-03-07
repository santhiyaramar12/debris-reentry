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
import OrbitalGlobe from "./OrbitalGlobe";
import ReportsPage from "./ReportsPage";
import UserProfile from "./UserProfile";
import CrisisAlerts from "./CrisisAlerts";
import DecayForecast from "./DecayForecast";
import EnvironmentPage from "./EnvironmentPage";

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

  const renderUTCClock = () => {
    return (
      <div className="relative flex flex-col items-center justify-center w-40 h-40 bg-slate-900/90 rounded-full border border-white/10 backdrop-blur-2xl shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden group">
        <div className="absolute inset-0 border-[1.5px] border-transparent border-t-cyan-500 rounded-full animate-[spin_4s_linear_infinite] opacity-70" />
        <div className="absolute inset-1.5 border-[1px] border-transparent border-b-red-500 rounded-full animate-[spin_8s_linear_reverse_infinite] opacity-50" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-center gap-1 mb-0.5">
            <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse shadow-[0_0_5px_red]" />
            <span className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em]">
              UTC
            </span>
          </div>

          <div className="text-3xl font-mono font-black italic text-white tracking-tighter mb-0.5 flex items-baseline">
            {h}
            <span className="animate-pulse text-red-500 mx-0.5">:</span>
            {min}
          </div>

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

      // satelliteService.fetchData already returns a flat array — no need to unwrap again
      const list = Array.isArray(data) ? data : [];

      // Filter only re-entry satellites and sort by urgency
      const sortedData = list
        .filter((item) => Number(item.altitude) < 150)
        .sort((a, b) => Number(a.days_left || 0) - Number(b.days_left || 0));

      setAlerts(sortedData);
    } catch (err) {
      console.error("Uplink Error:", err);
      setAlerts([]);
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

        const isActuallyCritical =
          riskFromBackend === "CRITICAL" || altitudeVal < 150;

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

  // FIX: Moved above conditional returns — Rules of Hooks violation fixed
  useEffect(() => {
    if (activeTab === "Admin" && !isAdmin) {
      setActiveTab("Home");
    }
  }, [activeTab, isAdmin, setActiveTab]);

  if (activeTab === "Home") {
    return (
      <HomePage
        setActiveTab={setActiveTab}
        isLoggedIn={true}
        onNavigateLogin={() => {}}
      />
    );
  }

  if (activeTab === "Profile") {
    return <UserProfile setActiveTab={setActiveTab} />;
  }

  if (activeTab === "Admin") {
    if (!isAdmin) return null;
    return <AdminPanel />;
  }

  if (activeTab === "Satellites") {
    return <OrbitalGlobe />;
  }

  if (activeTab === "Reports") {
    return <ReportsPage />;
  }

  if (activeTab === "Alerts") {
    return <CrisisAlerts />;
  }

  if (activeTab === "Missions") {
    return <DecayForecast />;
  }

  if (activeTab === "Environment") {
    return <EnvironmentPage />;
  }

  return (
    <div className="h-full flex p-6 gap-6 animate-in">
      <div className="flex-1 flex gap-6">
        <div
          className={`flex flex-col bg-slate-900/40 rounded-[2.5rem] border border-white/10 p-8 overflow-hidden transition-all duration-700 backdrop-blur-md shadow-2xl ${selectedAsset ? "w-1/3" : "w-full"}`}
        >
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">
              Re-entry Watchlist
            </h2>
            <span className="text-[10px] font-mono text-red-500 bg-red-500/10 px-4 py-2 rounded-full border border-red-500/20 uppercase tracking-widest">
              {alerts.length} Objects
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
            {!alerts || alerts.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-[10px] uppercase font-bold tracking-widest bg-white/5 rounded-3xl border border-white/5">
                No data available
              </div>
            ) : (
              alerts.map((item, idx) => {
                const alt = Number(
                  item.altitude || item.metadata?.altitude || 0,
                );
                const days = Number(
                  item.days_left || item.analysis?.days_left || 0,
                );

                // ✅ Sync Color Logic with Backend Severity
                let statusColor = "#a855f7";
                let statusLabel = "DECAY TRACKING";

                if (item.severity === "RED" || alt <= 100) {
                  statusColor = "#ef4444";
                  statusLabel = "IMMINENT RE-ENTRY";
                } else if (item.severity === "YELLOW" || alt <= 125) {
                  statusColor = "#eab308";
                  statusLabel = "ATMOSPHERIC CAPTURE";
                } else if (item.severity === "PURPLE" || alt <= 150) {
                  statusColor = "#a855f7";
                  statusLabel = "CRITICAL BOUNDARY";
                }

                return (
                  <div
                    key={idx}
                    className="group bg-white/5 border border-white/5 p-6 rounded-3xl flex justify-between items-center hover:bg-white/10 hover:border-cyan-500/30 transition-all cursor-pointer"
                    onClick={() => handleAnalyze(item)}
                  >
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <div
                          className={`w-3 h-3 rounded-full ${alt <= 125 ? "animate-pulse" : ""}`}
                          style={{
                            backgroundColor: statusColor,
                            boxShadow: `0 0 15px ${statusColor}`,
                          }}
                        />
                      </div>
                      <div>
                        <p className="text-white font-black text-base uppercase tracking-tight group-hover:text-cyan-400">
                          {item.name || "Object " + item.norad_id}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <p
                            className="text-[10px] font-mono font-bold tracking-widest"
                            style={{ color: statusColor }}
                          >
                            ALT: {alt.toFixed(1)} KM
                          </p>
                          <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest border-l border-white/10 pl-3">
                            {statusLabel} | T-{days.toFixed(1)}D
                          </span>
                        </div>
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
              })
            )}
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
