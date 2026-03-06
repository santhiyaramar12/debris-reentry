import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import Globe from "react-globe.gl";

import {
  Satellite,
  RefreshCw,
  Activity,
  AlertTriangle,
  X,
  Info,
  Crosshair,
  Navigation,
  Gauge,
  Clock,
  MapPin,
  Search,
  ChevronRight,
} from "lucide-react";
import { satelliteService } from "../services/api";

const RENDER_LIMIT = 300;
const REFRESH_INTERVAL = 60000;
const SIM_SPEED = 0.01; // 0.01x real time — very slow realistic orbital motion
const UPDATE_INTERVAL = 1000; // update positions every 1 second

/* ── Orbital element extraction from TLE ── */
const parseTLE = (tle1, tle2) => {
  try {
    const parts = tle2.split(/\s+/).filter(Boolean);
    if (parts.length < 8) return null;
    const inc = parseFloat(parts[2]);
    const raan = parseFloat(parts[3]);
    const eccStr = parts[4];
    const ecc = parseFloat("0." + eccStr);
    const argp = parseFloat(parts[5]);
    const ma = parseFloat(parts[6]);
    const mm = parseFloat(parts[7].substring(0, 11));
    const epoch = tle1.substring(18, 32).trim();

    const mu = 3.986004418e14;
    const nRad = (mm * 2 * Math.PI) / 86400;
    const aM = Math.pow(mu / (nRad * nRad), 1 / 3);
    const aKm = aM / 1000;
    const velocity = (2 * Math.PI * aM) / (86400 / mm) / 1000;

    return { inc, raan, ecc, argp, ma, mm, epoch, aKm, velocity };
  } catch {
    return null;
  }
};

/* ── Generate full orbit path (one full period) ── */
const generateOrbitPath = (orb) => {
  if (!orb) return [];
  const points = [];
  const period = 1440 / orb.mm; // minutes
  const steps = 180; // smooth orbit ring

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * period;
    const angle = ((orb.ma + (360 / period) * t) % 360) * (Math.PI / 180);
    const earthRot = (t / 1440) * 360;
    const lat =
      Math.asin(Math.sin(orb.inc * (Math.PI / 180)) * Math.sin(angle)) *
      (180 / Math.PI);
    const lng =
      ((orb.raan +
        Math.atan2(
          Math.cos(orb.inc * (Math.PI / 180)) * Math.sin(angle),
          Math.cos(angle),
        ) *
          (180 / Math.PI) -
        earthRot +
        540) %
        360) -
      180;
    points.push({ lat, lng });
  }
  return points;
};

/* ── Get position at a specific time offset along the cached orbit path ── */
const getPositionOnPath = (path, orb, simMinutes) => {
  if (!path.length || !orb) return path[0] || { lat: 0, lng: 0 };
  const period = 1440 / orb.mm;
  const fraction = (((simMinutes % period) + period) % period) / period;
  const idx = fraction * (path.length - 1);
  const i0 = Math.floor(idx);
  const i1 = Math.min(i0 + 1, path.length - 1);
  const t = idx - i0;

  return {
    lat: path[i0].lat + (path[i1].lat - path[i0].lat) * t,
    lng: path[i0].lng + (path[i1].lng - path[i0].lng) * t,
  };
};

const lerp = (a, b, t) => a + (b - a) * Math.min(t, 1);

/* ═════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═════════════════════════════════════════════════════════ */
const OrbitalGlobe = () => {
  const globeEl = useRef(null);
  const [displayData, setDisplayData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSat, setSelectedSat] = useState(null);
  const [selectedOrb, setSelectedOrb] = useState(null);
  const [selectedPath, setSelectedPath] = useState([]);
  const [showInfoPanel, setShowInfoPanel] = useState(false);

  const [liveCoords, setLiveCoords] = useState({
    lat: 0,
    lng: 0,
    alt: 0,
    vel: 0,
  });
  const [displayCoords, setDisplayCoords] = useState({
    lat: 0,
    lng: 0,
    alt: 0,
    vel: 0,
  });

  const centerPanelRef = useRef(null);
  const [globeSize, setGlobeSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!centerPanelRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setGlobeSize({
          width: entries[0].contentRect.width,
          height: entries[0].contentRect.height,
        });
      }
    });
    observer.observe(centerPanelRef.current);
    return () => observer.disconnect();
  }, []);

  const [simMinutes, setSimMinutes] = useState(0);
  const startTimeRef = useRef(Date.now());
  const pathCacheRef = useRef(new Map());

  const criticalCount = useMemo(
    () => displayData.filter((s) => s.is_critical).length,
    [displayData],
  );

  const fetchSatellites = useCallback(async () => {
    try {
      setLoading(true);
      const data = await satelliteService.getCelestrakLive();
      if (data.status === "success" && data.satellites) {
        let sats = data.satellites;
        const critical = sats.filter((s) => s.is_critical);
        const normal = sats.filter((s) => !s.is_critical);
        const remaining = RENDER_LIMIT - critical.length;
        const sampled = normal
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.max(0, remaining));
        const limited = [...critical, ...sampled].slice(0, RENDER_LIMIT);

        const cache = new Map();
        const enriched = limited.map((sat) => {
          const orb = parseTLE(sat.tle_line1 || "", sat.tle_line2 || "");
          const path = orb ? generateOrbitPath(orb) : [];
          cache.set(sat.norad_id, path);
          return { ...sat, orb, path };
        });

        pathCacheRef.current = cache;
        setDisplayData(enriched);
        setLastUpdated(new Date());
        startTimeRef.current = Date.now();
      }
    } catch (err) {
      console.error("CelesTrak fetch error:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSatellites();
    const interval = setInterval(fetchSatellites, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchSatellites]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (globeEl.current) {
        globeEl.current.controls().autoRotate = true;
        globeEl.current.controls().autoRotateSpeed = 0.5; // Realistic light rotation
        globeEl.current.pointOfView({ altitude: 2.2 }); // Constant real distance
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (displayData.length === 0) return;
    const timer = setInterval(() => {
      const elapsedSec = (Date.now() - startTimeRef.current) / 1000;
      const sim = (elapsedSec * SIM_SPEED) / 60;
      setSimMinutes(sim);
    }, UPDATE_INTERVAL);
    return () => clearInterval(timer);
  }, [displayData]);

  const filteredSatellites = useMemo(() => {
    if (!searchQuery.trim()) return displayData;
    const q = searchQuery.toLowerCase();
    return displayData.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        String(s.norad_id).toLowerCase().includes(q),
    );
  }, [displayData, searchQuery]);

  const pointsData = useMemo(() => {
    return displayData.map((sat) => {
      const pos =
        sat.path.length > 0 && sat.orb
          ? getPositionOnPath(sat.path, sat.orb, simMinutes)
          : { lat: sat.lat, lng: sat.lng };

      const isSelected = selectedSat?.norad_id === sat.norad_id;

      return {
        lat: pos.lat,
        lng: pos.lng,
        alt: 0.01,
        isSelected: isSelected,
        is_critical: sat.is_critical,
        color: isSelected ? "#00ff88" : sat.is_critical ? "#ef4444" : "#66e3ff",
        name: sat.name,
        norad_id: sat.norad_id,
        altitude: sat.alt,
        tle_line1: sat.tle_line1,
        tle_line2: sat.tle_line2,
        orb: sat.orb,
        path: sat.path,
        _raw: sat,
      };
    });
  }, [displayData, simMinutes, selectedSat]);

  const orbitPathData = useMemo(() => {
    if (!selectedSat || !selectedPath.length) return [];
    return [
      {
        coords: selectedPath.map((p) => ({ lat: p.lat, lng: p.lng })),
        color: ["#66e3ff40", "#66e3ffff", "#66e3ffff", "#66e3ff40"],
      },
    ];
  }, [selectedSat, selectedPath]);

  useEffect(() => {
    if (!selectedSat || !selectedOrb) return;
    const pos =
      selectedSat.path?.length > 0
        ? getPositionOnPath(selectedSat.path, selectedOrb, simMinutes)
        : { lat: 0, lng: 0 };

    setLiveCoords({
      lat: pos.lat,
      lng: pos.lng,
      alt: selectedSat.alt || 0,
      vel: selectedOrb.velocity || 0,
    });
  }, [selectedSat, selectedOrb, simMinutes]);

  useEffect(() => {
    if (!selectedSat) return;
    let frameId;
    const tick = () => {
      setDisplayCoords((prev) => ({
        lat: prev.lat + (liveCoords.lat - prev.lat) * 0.08,
        lng: prev.lng + (liveCoords.lng - prev.lng) * 0.08,
        alt: prev.alt + (liveCoords.alt - prev.alt) * 0.08,
        vel: prev.vel + (liveCoords.vel - prev.vel) * 0.08,
      }));
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [selectedSat, liveCoords]);

  const handleSelectSatellite = useCallback((sat) => {
    if (!sat) return;
    const point = sat._raw || sat;
    const orb =
      point.orb || parseTLE(point.tle_line1 || "", point.tle_line2 || "");
    const path = point.path || pathCacheRef.current.get(point.norad_id) || [];

    setSelectedSat(point);
    setSelectedOrb(orb);
    setSelectedPath(path);
    setShowInfoPanel(true);

    // 🚫 NO ZOOM: pointOfView update strictly removed to keep globe size constant

    setLiveCoords({
      lat: point.lat || 0,
      lng: point.lng || 0,
      alt: point.alt || 0,
      vel: orb?.velocity || 0,
    });
  }, []);

  const handleDeselect = useCallback(() => {
    setSelectedSat(null);
    setSelectedOrb(null);
    setSelectedPath([]);
    setShowInfoPanel(false);
  }, []);

  const orbitalItems = useMemo(() => {
    if (!selectedOrb) return [];
    return [
      {
        label: "Semi-Major Axis",
        value: `${selectedOrb.aKm?.toFixed(1) || "—"} km`,
        icon: "🌐",
      },
      {
        label: "Eccentricity",
        value: selectedOrb.ecc?.toFixed(7) ?? "—",
        icon: "◎",
      },
      {
        label: "Inclination",
        value: `${selectedOrb.inc?.toFixed(4) || "—"}°`,
        icon: "📐",
      },
      {
        label: "RAAN",
        value: `${selectedOrb.raan?.toFixed(4) || "—"}°`,
        icon: "🧭",
      },
      {
        label: "Arg. of Perigee",
        value: `${selectedOrb.argp?.toFixed(4) || "—"}°`,
        icon: "🔄",
      },
      {
        label: "Mean Anomaly",
        value: `${selectedOrb.ma?.toFixed(4) || "—"}°`,
        icon: "📍",
      },
      {
        label: "Mean Motion",
        value: `${selectedOrb.mm?.toFixed(8) || "—"} rev/day`,
        icon: "⚡",
      },
      { label: "Epoch", value: selectedOrb.epoch || "—", icon: "📅" },
    ];
  }, [selectedOrb]);

  return (
    <div
      className="h-full flex gap-0 overflow-hidden og-container"
      style={{ background: "#000814" }}
    >
      <div className="og-starfield" />

      {/* LEFT PANEL */}
      <div
        className="w-[25%] min-w-[320px] flex flex-col z-20 shrink-0"
        style={{
          background: "rgba(0,8,20,0.85)",
          backdropFilter: "blur(16px)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          className="p-5 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
              <Satellite size={18} className="text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase italic tracking-tighter">
                Orbital Globe
              </h2>
              <p className="text-[8px] text-slate-500 font-mono uppercase tracking-widest">
                CelesTrak • ~{displayData.length} Live Objects
              </p>
            </div>
          </div>
          <div className="relative">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search satellite name or NORAD ID..."
              className="w-full pl-9 pr-8 py-2.5 rounded-xl text-[10px] text-white placeholder:text-slate-600 focus:outline-none transition-colors font-mono bg-black/40 border border-white/10"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5">
          {loading && displayData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Activity className="w-5 h-5 text-cyan-500 animate-pulse" />
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                Acquiring Telemetry...
              </p>
            </div>
          ) : (
            filteredSatellites.map((sat, idx) => {
              const isSelected = selectedSat?.norad_id === sat.norad_id;
              return (
                <button
                  key={sat.norad_id || idx}
                  onClick={() => handleSelectSatellite(sat)}
                  className="w-full text-left p-3.5 rounded-xl border transition-all duration-200 group flex items-center justify-between"
                  style={{
                    background: isSelected
                      ? "rgba(0,255,136,0.1)"
                      : "rgba(0,0,0,0.3)",
                    borderColor: isSelected
                      ? "rgba(0,255,136,0.5)"
                      : "rgba(255,255,255,0.04)",
                  }}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: isSelected
                            ? "#00ff88"
                            : sat.is_critical
                              ? "#ef4444"
                              : "#66e3ff",
                        }}
                      />
                      <span className="text-[11px] font-black text-white uppercase italic tracking-tight truncate max-w-[180px]">
                        {sat.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[8px] font-mono text-slate-500 ml-4">
                      <span>NORAD: {sat.norad_id}</span>
                      <span>|</span>
                      <span>ALT: {sat.alt?.toFixed(1) || "—"} km</span>
                    </div>
                  </div>
                  <ChevronRight
                    size={12}
                    className={isSelected ? "text-[#00ff88]" : "text-slate-600"}
                  />
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* CENTER GLOBE */}
      <div
        ref={centerPanelRef}
        className="flex-1 relative overflow-hidden flex justify-center items-center"
      >
        <div className="absolute inset-0">
          {globeSize.width > 0 && (
            <Globe
              ref={globeEl}
              width={globeSize.width}
              height={globeSize.height}
              backgroundColor="rgba(0,0,0,0)"
              globeImageUrl="https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
              bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
              showAtmosphere
              atmosphereColor="#1a3a7a"
              atmosphereAltitude={0.2}
              /* 🔵 THE FIX: CLEAN DOTS WITHOUT CONES & NO ZOOM */
              pointsData={pointsData}
              pointLat="lat"
              pointLng="lng"
              pointColor="color"
              pointAltitude={0.01}
              pointRadius={0.25} // Keeps small dots as requested
              pointResolution={32}
              pointsMerge={false}
              pointTransitionDuration={0} // Smooth realistic motion
              onPointClick={handleSelectSatellite}
              pointLabel={(d) =>
                `<div style="background:rgba(0,8,20,0.92);padding:10px 14px;border-radius:10px;border:1px solid ${d.color};font-family:monospace;font-size:10px;backdrop-filter:blur(12px);box-shadow:0 4px 20px rgba(0,0,0,0.5);">
                <b style="color:${d.color};text-transform:uppercase">${d.name}</b><br/>
                <span style="color:#94a3b8">NORAD: ${d.norad_id}</span><br/>
                <span style="color:#94a3b8">ALT: ${d.altitude?.toFixed(1)} km</span>
              </div>`
              }
              pathsData={orbitPathData}
              pathPoints="coords"
              pathPointLat="lat"
              pathPointLng="lng"
              pathPointAlt={0.002}
              pathColor="color"
              pathStroke={1.2}
            />
          )}
        </div>

        {/* OVERLAYS */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
          {!loading && lastUpdated && (
            <div className="og-glass px-3 py-2 rounded-xl flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[8px] font-mono text-slate-300">
                LIVE • UPDATED: {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
          )}
          {criticalCount > 0 && (
            <div className="px-3 py-2 rounded-xl flex items-center gap-2 animate-pulse bg-red-500/10 border border-red-500/40">
              <AlertTriangle size={12} className="text-red-400" />
              <span className="text-xs font-mono font-black text-red-400">
                {criticalCount} Critical
              </span>
            </div>
          )}
        </div>

        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={fetchSatellites}
            className="og-glass p-2.5 rounded-xl transition-all hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="absolute bottom-4 left-4 z-20 og-glass px-4 py-3 rounded-xl">
          <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-2">
            Decay / Orbit Status
          </p>
          <div className="space-y-1.5">
            {[
              { color: "#66e3ff", label: "Nominal Orbit (>300 km)" },
              { color: "#ef4444", label: "Critical Decay (<300 km)" },
              { color: "#00ff88", label: "Actively Tracked" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: item.color }}
                />
                <span className="text-[8px] font-bold text-slate-400 uppercase">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* INFO PANEL: Opens ONLY when selectedSat is touch-active */}
        {showInfoPanel && selectedSat && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              height: "100%",
              width: "25%",
              minWidth: "320px",
              background: "rgba(0,8,20,0.92)",
              backdropFilter: "blur(20px)",
              borderLeft: "1px solid rgba(255,255,255,0.06)",
              overflowY: "auto",
              zIndex: 40,
            }}
            className="flex flex-col animate-in fade-in slide-in-from-right duration-300"
          >
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  Satellite Target
                </h3>
                <button
                  onClick={handleDeselect}
                  className="text-slate-500 hover:text-white transition-colors bg-white/5 p-1.5 rounded-lg border border-white/10"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full og-marker-glow"
                    style={{ background: "#00ff88" }}
                  />
                  <span className="text-white font-black text-sm uppercase italic tracking-tight">
                    {selectedSat.name}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-300">
                  NORAD ID:{" "}
                  <span className="text-[#00ff88]">{selectedSat.norad_id}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    label: "Latitude",
                    value: `${liveCoords.lat.toFixed(4)}°`,
                    icon: <MapPin size={10} />,
                  },
                  {
                    label: "Longitude",
                    value: `${liveCoords.lng.toFixed(4)}°`,
                    icon: <Navigation size={10} />,
                  },
                  {
                    label: "Altitude",
                    value: `${liveCoords.alt.toFixed(1)} km`,
                    icon: <Crosshair size={10} />,
                  },
                  {
                    label: "Velocity",
                    value: `${liveCoords.vel.toFixed(2)} km/s`,
                    icon: <Gauge size={10} />,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="p-2.5 rounded-xl bg-black/30 border border-white/5 text-center"
                  >
                    <p className="text-[12px] font-mono font-bold text-white mb-0.5">
                      {item.value}
                    </p>
                    <span className="text-[7px] font-bold uppercase text-slate-500 flex items-center justify-center gap-1">
                      {item.icon} {item.label}
                    </span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Orbital Elements
                </p>
                <div className="space-y-1.5">
                  {orbitalItems.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/20 border border-white/03"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px]">{item.icon}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">
                          {item.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[#00d4ff]">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Source Two-Line Elements
                </p>
                <div className="p-3 rounded-xl font-mono text-[8.5px] text-slate-300 break-all leading-relaxed bg-black/50 border border-white/08">
                  <p className="text-[#00ff88]/60 mb-0.5">LINE 1:</p>
                  <p className="text-white">{selectedSat.tle_line1 || "—"}</p>
                  <p className="text-[#00ff88]/60 mt-2 mb-0.5">LINE 2:</p>
                  <p className="text-white">{selectedSat.tle_line2 || "—"}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .og-starfield { position: absolute; inset: 0; z-index: 0; background-color: #000814; pointer-events: none; }
        .og-glass { background: rgba(0,8,20,0.82); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); }
        .og-marker-glow { animation: ogGlow 2s ease-in-out infinite; }
        @keyframes ogGlow { 0%, 100% { box-shadow: 0 0 10px rgba(0,255,136,0.6); } 50% { box-shadow: 0 0 20px rgba(0,255,136,1); } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default OrbitalGlobe;
