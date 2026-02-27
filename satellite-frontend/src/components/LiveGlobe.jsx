import React, { useState, useEffect, useRef, useCallback } from "react";
import Globe from "react-globe.gl";
import { Satellite, RefreshCw, Activity, AlertTriangle } from "lucide-react";
import { satelliteService } from "../services/api";

const RENDER_LIMIT = 100;
const REFRESH_INTERVAL = 30000; // 30 seconds

const LiveGlobe = () => {
  const globeEl = useRef();
  const [satellites, setSatellites] = useState([]);
  const [displayData, setDisplayData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);

  const fetchSatellites = useCallback(async () => {
    try {
      const data = await satelliteService.getCelestrakLive();
      if (data.status === "success" && data.satellites) {
        setSatellites(data.satellites);
        setTotalCount(data.count || data.satellites.length);

        const critical = data.satellites.filter((s) => s.is_critical);
        setCriticalCount(critical.length);

        // Performance: Limit to RENDER_LIMIT objects
        // Prioritize critical objects, then random sample
        const criticalSats = data.satellites.filter((s) => s.is_critical);
        const normalSats = data.satellites.filter((s) => !s.is_critical);
        const remaining = RENDER_LIMIT - criticalSats.length;
        const selectedNormal = normalSats
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.max(0, remaining));

        const limited = [...criticalSats, ...selectedNormal].slice(0, RENDER_LIMIT);

        setDisplayData(
          limited.map((sat) => ({
            lat: sat.lat,
            lng: sat.lng,
            alt: Math.min(sat.alt / 40000, 0.15), // Scale for globe
            size: sat.is_critical ? 1.5 : 0.6,
            color: sat.is_critical ? "#ef4444" : "#00f2ff",
            name: sat.name,
            norad_id: sat.norad_id,
            altitude: sat.alt,
            is_critical: sat.is_critical,
          })),
        );
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("CelesTrak fetch error:", err);
    }
    setLoading(false);
  }, []);

  // Initial fetch + 30s auto-refresh
  useEffect(() => {
    fetchSatellites();
    const interval = setInterval(fetchSatellites, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchSatellites]);

  // Globe camera
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (globeEl.current) {
        globeEl.current.controls().autoRotate = true;
        globeEl.current.controls().autoRotateSpeed = 0.5;
        globeEl.current.pointOfView({ altitude: 2.2 });
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden animate-in">
      {/* Header */}
      <div className="flex justify-between items-center px-6 pt-4 pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
            <Satellite size={20} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">
              Live Satellite Tracker
            </h2>
            <p className="text-[9px] text-slate-500 font-mono uppercase tracking-widest">
              CelesTrak // TLE-based Propagation // Auto-refresh: 30s
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stats */}
          <div className="hidden md:flex items-center gap-4 mr-2">
            <div className="text-right">
              <p className="text-[8px] text-slate-500 uppercase font-black">Total</p>
              <p className="text-lg font-mono font-black text-cyan-400">{totalCount}</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] text-slate-500 uppercase font-black">Rendered</p>
              <p className="text-lg font-mono font-black text-white">{displayData.length}</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] text-slate-500 uppercase font-black">Critical</p>
              <p className="text-lg font-mono font-black text-red-400">{criticalCount}</p>
            </div>
          </div>

          <button
            onClick={fetchSatellites}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Globe Container */}
      <div className="flex-1 relative overflow-hidden">
        {loading && displayData.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="flex flex-col items-center gap-4">
              <Activity className="w-8 h-8 text-cyan-500 animate-pulse" />
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">
                Acquiring Telemetry...
              </span>
            </div>
          </div>
        ) : null}

        <Globe
          ref={globeEl}
          width={window.innerWidth}
          height={window.innerHeight - 160}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          showAtmosphere
          atmosphereColor="#1e3a8a"
          atmosphereAltitude={0.2}
          pointsData={displayData}
          pointLat="lat"
          pointLng="lng"
          pointAltitude="alt"
          pointRadius="size"
          pointColor="color"
          pointLabel={(d) =>
            `<div style="background:rgba(0,0,0,0.8);padding:8px 12px;border-radius:8px;border:1px solid ${d.color};font-family:monospace;font-size:10px;">
              <b style="color:${d.color}">${d.name}</b><br/>
              <span style="color:#94a3b8">NORAD: ${d.norad_id}</span><br/>
              <span style="color:#94a3b8">ALT: ${d.altitude?.toFixed(1)} km</span>
              ${d.is_critical ? '<br/><span style="color:#ef4444;font-weight:bold">⚠ CRITICAL</span>' : ''}
            </div>`
          }
        />

        {/* Overlay Info */}
        <div className="absolute bottom-4 left-4 z-20 bg-black/70 backdrop-blur-md border border-white/10 px-4 py-3 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[9px] font-mono font-bold text-slate-300 uppercase tracking-wider">
              Uplink Active
            </span>
            {lastUpdated && (
              <span className="text-[8px] font-mono text-slate-500">
                Last: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 right-4 z-20 bg-black/70 backdrop-blur-md border border-white/10 px-4 py-3 rounded-xl">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#00f2ff]" />
              <span className="text-[8px] font-bold text-slate-400 uppercase">Nominal ≥150km</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[8px] font-bold text-slate-400 uppercase">Critical &lt;150km</span>
            </div>
          </div>
        </div>

        {criticalCount > 0 && (
          <div className="absolute top-4 right-4 z-20 bg-red-500/10 border border-red-500/30 px-4 py-2.5 rounded-xl flex items-center gap-2 animate-pulse">
            <AlertTriangle size={14} className="text-red-400" />
            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">
              {criticalCount} Critical Objects
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveGlobe;
