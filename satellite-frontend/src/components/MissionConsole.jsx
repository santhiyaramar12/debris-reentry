import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  Satellite,
  Activity,
  MapPin,
  Terminal,
  Settings,
  Target,
  Clock,
  Search,
} from "lucide-react";
import { DraggablePanel } from "./DraggablePanel";

// ─────────────────────────────────────────────────────────
//  Inline satellite SVG — replaces plain dot
// ─────────────────────────────────────────────────────────
const SatSVG = ({ color = "#06b6d4", size = 22 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    style={{ flexShrink: 0, filter: `drop-shadow(0 0 5px ${color}88)` }}
  >
    <rect
      x="9"
      y="9"
      width="6"
      height="6"
      rx="1.2"
      fill={color}
      opacity="0.95"
    />
    <rect
      x="1"
      y="10.5"
      width="7"
      height="3"
      rx="0.7"
      fill={color}
      opacity="0.55"
    />
    <line
      x1="3"
      y1="10.5"
      x2="3"
      y2="13.5"
      stroke={color}
      strokeWidth="0.5"
      opacity="0.7"
    />
    <line
      x1="5.5"
      y1="10.5"
      x2="5.5"
      y2="13.5"
      stroke={color}
      strokeWidth="0.5"
      opacity="0.7"
    />
    <rect
      x="16"
      y="10.5"
      width="7"
      height="3"
      rx="0.7"
      fill={color}
      opacity="0.55"
    />
    <line
      x1="18.5"
      y1="10.5"
      x2="18.5"
      y2="13.5"
      stroke={color}
      strokeWidth="0.5"
      opacity="0.7"
    />
    <line
      x1="21"
      y1="10.5"
      x2="21"
      y2="13.5"
      stroke={color}
      strokeWidth="0.5"
      opacity="0.7"
    />
    <line x1="12" y1="9" x2="12" y2="5.5" stroke={color} strokeWidth="1.3" />
    <circle cx="12" cy="4.5" r="1.5" fill={color} opacity="0.85" />
    <line x1="12" y1="15" x2="12" y2="18.5" stroke={color} strokeWidth="1.3" />
    <polygon points="10.2,18.5 13.8,18.5 12,21.5" fill={color} opacity="0.5" />
  </svg>
);

// ─────────────────────────────────────────────────────────
//  AnimatedNumber — unmounts & remounts via `key` whenever
//  the parent changes the key (= value changed), so animation
//  always runs from previous displayed value to new value.
// ─────────────────────────────────────────────────────────
const AnimatedNumber = ({
  value,
  decimals = 2,
  unit = "",
  color = "#06b6d4",
}) => {
  const [disp, setDisp] = useState(Number(value));
  const raf = useRef(null);
  const prev = useRef(Number(value));

  useEffect(() => {
    const to = Number(value);
    if (isNaN(to)) return;
    if (raf.current) cancelAnimationFrame(raf.current);
    const from = prev.current;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / 480, 1);
      const e = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setDisp(from + (to - from) * e);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value]);

  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono',monospace",
        fontWeight: 800,
        fontSize: 13,
        color,
        letterSpacing: ".03em",
      }}
    >
      {Number(disp).toFixed(decimals)}
      {unit && (
        <span style={{ fontSize: 9, color: "#475569", marginLeft: 3 }}>
          {unit}
        </span>
      )}
    </span>
  );
};

// ─────────────────────────────────────────────────────────
//  Live countdown — re-calculates every second
//  daysLeft = 0 means imminent — show seconds counting up
// ─────────────────────────────────────────────────────────
const Countdown = ({ daysLeft, altitude }) => {
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    let dl = Number(daysLeft);
    // If days_left is 0 or very small, estimate from altitude
    // Rough decay: below 100km reentry within hours
    if ((isNaN(dl) || dl <= 0) && altitude) {
      const alt = Number(altitude);
      if (alt < 80)
        dl = 0.01; // ~15 min
      else if (alt < 100)
        dl = 0.05; // ~1 hr
      else if (alt < 120)
        dl = 0.2; // ~5 hrs
      else if (alt < 150)
        dl = 1; // ~1 day
      else dl = 0;
    }
    if (!dl || isNaN(dl) || dl < 0) {
      setT({ d: 0, h: 0, m: 0, s: 0 });
      return;
    }
    const target = Date.now() + dl * 86_400_000;
    const tick = () => {
      const r = Math.max(0, target - Date.now());
      setT({
        d: Math.floor(r / 86_400_000),
        h: Math.floor((r % 86_400_000) / 3_600_000),
        m: Math.floor((r % 3_600_000) / 60_000),
        s: Math.floor((r % 60_000) / 1_000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [daysLeft]);

  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
      {[
        ["D", t.d],
        ["H", t.h],
        ["M", t.m],
        ["S", t.s],
      ].map(([l, v]) => (
        <div
          key={l}
          style={{
            background: "rgba(249,115,22,.1)",
            border: "1px solid rgba(249,115,22,.3)",
            borderRadius: 8,
            padding: "8px 10px",
            textAlign: "center",
            minWidth: 46,
          }}
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono',monospace",
              fontSize: 20,
              fontWeight: 900,
              color: "#f97316",
              lineHeight: 1,
            }}
          >
            {String(v).padStart(2, "0")}
          </div>
          <div
            style={{
              fontFamily: "'Orbitron',sans-serif",
              fontSize: 7,
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: ".15em",
              marginTop: 3,
            }}
          >
            {l}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────
const getOE = (sat, k) => {
  const v = sat?.orbital_elements?.[k];
  return v !== undefined && v !== null && v !== "" && !isNaN(Number(v))
    ? Number(v)
    : null;
};
// Colour by altitude risk
const altColor = (a) =>
  Number(a) < 100 ? "#ef4444" : Number(a) < 125 ? "#eab308" : "#00ff88";
// Colour by days-left risk:
// 0–5 days  → Critical  → Red
// 6–10 days → Warning   → Yellow  (within 10 days)
// 11–15 days → Monitor  → Green   (within 15 days)
// >15 days  → Stable    → slate
const daysColor = (d) => {
  const n = Number(d ?? 999);
  return n <= 5
    ? "#ef4444"
    : n <= 10
      ? "#eab308"
      : n <= 15
        ? "#00ff88"
        : "#475569";
};
const lbl = {
  fontFamily: "'JetBrains Mono',monospace",
  fontSize: 9,
  textTransform: "uppercase",
  letterSpacing: ".13em",
  color: "#475569",
};

// ─────────────────────────────────────────────────────────
//  MissionConsole
// ─────────────────────────────────────────────────────────
export const MissionConsole = ({
  alerts,
  selectedSat,
  onSelectSat,
  impactSites,
  livePosition,
}) => {
  const [panels, setPanels] = useState({
    debrisList: true,
    telemetry: false,
    latLong: false,
    tle: false,
    orbital: false,
    impact: true,
    timeWindow: false,
  });

  // Filter: null=ALL, else {min,max} range for days_left
  // Spec: 5d → 0-3 critical, 10d → 3-6 high risk, 15d → 7-15 monitoring
  const [daysFilter, setDaysFilter] = useState(null);
  const [search, setSearch] = useState("");

  const toggle = useCallback(
    (k) => setPanels((p) => ({ ...p, [k]: !p[k] })),
    [],
  );

  // Filtered list: cumulative range filter
  // null/missing/NaN days_left = excluded from ≤N filters (can't confirm re-entry time)
  const filteredAlerts = useMemo(() => {
    let list = [...(alerts || [])];
    if (daysFilter !== null) {
      list = list.filter((s) => {
        const raw = s.days_left;
        if (raw === null || raw === undefined || raw === "") return false;
        const d = Number(raw);
        if (isNaN(d)) return false;
        // days_left=0 or negative → imminent, show in ALL filters
        if (d <= 0) return true;
        return d <= daysFilter.max;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          (s.name || "").toLowerCase().includes(q) ||
          String(s.norad_id || "").includes(q),
      );
    }
    return list;
  }, [alerts, daysFilter, search]);

  // Pull live values from livePosition (_t changes every 1 s from TrajectoryEngine)
  const liveLat = livePosition?.lat ?? Number(selectedSat?.lat ?? 0);
  const liveLng = livePosition?.lng ?? Number(selectedSat?.lng ?? 0);
  const liveAlt = livePosition?.alt ?? Number(selectedSat?.altitude ?? 200);
  // Velocity from propagation; if absent compute from vis-viva at current altitude
  const liveVel =
    livePosition?.velocity ??
    (() => {
      const r = 6378.137 + (liveAlt || 200);
      return Math.sqrt(398600.4418 / r); // circular orbit approx, km/s
    })();

  // Keys for AnimatedNumber — change when value changes at 4th decimal.
  // React will unmount + remount the component → fresh animation each SGP4 tick.
  const latKey = Math.round(liveLat * 100000);
  const lngKey = Math.round(liveLng * 100000);
  const altKey = Math.round(liveAlt * 1000);
  const velKey = Math.round(liveVel * 100000);

  const iconBtn = (k) => ({
    width: 40,
    height: 40,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all .2s",
    background: panels[k] ? "rgba(6,182,212,.18)" : "rgba(15,23,42,.6)",
    border: `1px solid ${panels[k] ? "rgba(6,182,212,.5)" : "rgba(255,255,255,.07)"}`,
    boxShadow: panels[k] ? "0 0 14px rgba(6,182,212,.35)" : "none",
    color: panels[k] ? "#67e8f9" : "#64748b",
  });

  return (
    <>
      <style>{`
        @keyframes liveDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.45;transform:scale(1.5)} }
        .mc-sb::-webkit-scrollbar{width:3px}
        .mc-sb::-webkit-scrollbar-thumb{background:rgba(6,182,212,.25);border-radius:4px}
      `}</style>

      {/* ── Taskbar ─────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          left: 14,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 30000,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "12px 8px",
          borderRadius: 16,
          background: "rgba(1,4,9,.88)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,.07)",
        }}
      >
        {[
          { k: "debrisList", I: Satellite, tip: "Debris Watchlist" },
          { k: "telemetry", I: Activity, tip: "Live Telemetry" },
          { k: "latLong", I: MapPin, tip: "Live Position" },
          { k: "tle", I: Terminal, tip: "TLE Feed" },
          { k: "orbital", I: Settings, tip: "Orbital Elements" },
          { k: "impact", I: Target, tip: "Impact Corridor" },
          { k: "timeWindow", I: Clock, tip: "Re-Entry Window" },
        ].map(({ k, I, tip }) => (
          <div key={k} title={tip} style={iconBtn(k)} onClick={() => toggle(k)}>
            <I size={18} />
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          DEBRIS WATCHLIST
      ══════════════════════════════════════════════════════════════════ */}
      {panels.debrisList && (
        <DraggablePanel
          title="Debris Watchlist"
          icon={Satellite}
          onClose={() => toggle("debrisList")}
          defaultPos={{ x: 74, y: 80 }}
          accentColor="#06b6d4"
        >
          {/* Filter chips: ALL / ≤5d (red) / ≤10d (yellow) / ≤15d (green) */}
          <div
            style={{
              display: "flex",
              gap: 5,
              marginBottom: 10,
              flexWrap: "wrap",
            }}
          >
            {[
              { label: "ALL", val: null, c: "#94a3b8" },
              { label: "≤5 Days", val: { min: 0, max: 5 }, c: "#ef4444" },
              { label: "≤10 Days", val: { min: 0, max: 10 }, c: "#eab308" },
              { label: "≤15 Days", val: { min: 0, max: 15 }, c: "#00ff88" },
            ].map(({ label, val, c }) => {
              const on = JSON.stringify(daysFilter) === JSON.stringify(val);
              return (
                <button
                  key={label}
                  onClick={() => setDaysFilter(on ? null : val)}
                  style={{
                    padding: "4px 11px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 9,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: ".1em",
                    border: `1px solid ${on ? c : c + "40"}`,
                    background: on ? c + "22" : "transparent",
                    color: on ? c : c + "70",
                    transition: "all .15s",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 10 }}>
            <Search
              size={11}
              style={{
                position: "absolute",
                left: 9,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#475569",
              }}
            />
            <input
              type="text"
              placeholder="Search name / NORAD ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "rgba(0,0,0,.4)",
                border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 8,
                padding: "7px 10px 7px 28px",
                color: "#e2e8f0",
                fontSize: 10,
                fontFamily: "'JetBrains Mono',monospace",
                outline: "none",
              }}
            />
          </div>

          {/* Satellite rows */}
          <div
            className="mc-sb"
            style={{
              maxHeight: 320,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {filteredAlerts.map((sat, i) => {
              const a = Number(sat.altitude || 0);
              const d = Number(sat.days_left || 0);
              const ac = altColor(a); // altitude risk — used for alt km display
              const dc = daysColor(d); // days-left risk — drives row highlight + icon
              const sel = selectedSat?.norad_id === sat.norad_id;
              return (
                <div
                  key={sat.norad_id || i}
                  onClick={() => onSelectSat(sat)}
                  style={{
                    padding: "9px 11px",
                    borderRadius: 8,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    border: `1px solid ${sel ? dc + "55" : "rgba(255,255,255,.05)"}`,
                    background: sel ? dc + "12" : "rgba(0,0,0,.25)",
                    transition: "all .15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!sel)
                      e.currentTarget.style.background =
                        "rgba(255,255,255,.04)";
                  }}
                  onMouseLeave={(e) => {
                    if (!sel)
                      e.currentTarget.style.background = "rgba(0,0,0,.25)";
                  }}
                >
                  {/* SVG satellite icon coloured by days-left risk */}
                  <SatSVG color={dc} size={20} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "'Orbitron',sans-serif",
                        fontSize: 8,
                        fontWeight: 900,
                        color: sel ? dc : "#e2e8f0",
                        textTransform: "uppercase",
                        letterSpacing: ".05em",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {sat.name}
                    </div>
                    <div style={{ ...lbl, marginTop: 2 }}>#{sat.norad_id}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 10,
                        fontWeight: 800,
                        color: ac,
                      }}
                    >
                      {a.toFixed(0)} km
                    </div>
                    {/* T-Xd coloured by days_left risk per spec */}
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 9,
                        fontWeight: 700,
                        color: dc,
                        marginTop: 2,
                      }}
                    >
                      T-{d.toFixed(1)}d
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredAlerts.length === 0 && (
              <div style={{ ...lbl, textAlign: "center", padding: "24px 0" }}>
                No satellites match filter
              </div>
            )}
          </div>
        </DraggablePanel>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LIVE TELEMETRY — FIX: alt and velocity from livePosition
      ══════════════════════════════════════════════════════════════════ */}
      {selectedSat && panels.telemetry && (
        <DraggablePanel
          title="Live Telemetry"
          icon={Activity}
          onClose={() => toggle("telemetry")}
          defaultPos={{ x: 430, y: 80 }}
          accentColor="#00ff88"
        >
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            {[
              {
                label: "Altitude",
                v: liveAlt,
                dk: altKey,
                u: "km",
                d: 2,
                c: "#00ff88",
              },
              {
                label: "Velocity",
                v: liveVel,
                dk: velKey,
                u: "km/s",
                d: 3,
                c: "#06b6d4",
              },
              {
                label: "Inclination",
                v: getOE(selectedSat, "inclination_deg") ?? 51.6,
                dk: 0,
                u: "°",
                d: 2,
                c: "#a855f7",
              },
              {
                label: "Apogee",
                v: getOE(selectedSat, "apogee") ?? 400,
                dk: 0,
                u: "km",
                d: 1,
                c: "#06b6d4",
              },
              {
                label: "Perigee",
                v: getOE(selectedSat, "perigee") ?? 350,
                dk: 0,
                u: "km",
                d: 1,
                c: "#06b6d4",
              },
              {
                label: "Period",
                v:
                  getOE(selectedSat, "orbital_period_min") ??
                  (getOE(selectedSat, "mean_motion_rev_day")
                    ? +(
                        1440 / getOE(selectedSat, "mean_motion_rev_day")
                      ).toFixed(2)
                    : 92),
                dk: 0,
                u: "min",
                d: 2,
                c: "#f97316",
              },
            ].map(({ label, v, dk, u, d, c }) => (
              <div
                key={label}
                style={{
                  background: "rgba(0,0,0,.4)",
                  borderRadius: 10,
                  border: `1px solid ${c}22`,
                  padding: "10px 12px",
                }}
              >
                <div style={{ ...lbl, marginBottom: 6 }}>{label}</div>
                {/* FIX: key={label+dk} forces fresh AnimatedNumber when live value changes */}
                <AnimatedNumber
                  key={`${label}-${dk}`}
                  value={Number(v)}
                  decimals={d}
                  unit={u}
                  color={c}
                />
              </div>
            ))}
          </div>
        </DraggablePanel>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LIVE POSITION — FIX: lat/lng/alt all from livePosition, re-animate each tick
      ══════════════════════════════════════════════════════════════════ */}
      {selectedSat && panels.latLong && (
        <DraggablePanel
          title="Live Position"
          icon={MapPin}
          onClose={() => toggle("latLong")}
          defaultPos={{ x: 760, y: 80 }}
          accentColor="#3b82f6"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              {
                label: "Latitude",
                v: liveLat,
                dk: latKey,
                d: 5,
                u: "°",
                c: "#3b82f6",
              },
              {
                label: "Longitude",
                v: liveLng,
                dk: lngKey,
                d: 5,
                u: "°",
                c: "#3b82f6",
              },
              {
                label: "Altitude",
                v: liveAlt,
                dk: altKey,
                d: 2,
                u: "km",
                c: "#00ff88",
              },
              {
                label: "Velocity",
                v: liveVel,
                dk: velKey,
                d: 3,
                u: "km/s",
                c: "#06b6d4",
              },
            ].map(({ label, v, dk, d, u, c }) => (
              <div
                key={label}
                style={{
                  background: "rgba(0,0,0,.4)",
                  borderRadius: 10,
                  border: "1px solid rgba(59,130,246,.15)",
                  padding: "10px 14px",
                }}
              >
                <div style={{ ...lbl, marginBottom: 5 }}>{label}</div>
                {/* FIX: key changes every SGP4 tick → re-animates every second */}
                <AnimatedNumber
                  key={`${label}-${dk}`}
                  value={Number(v)}
                  decimals={d}
                  unit={u}
                  color={c}
                />
              </div>
            ))}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginTop: 2,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#22c55e",
                  boxShadow: "0 0 6px #22c55e",
                  animation: "liveDot 1.5s infinite",
                }}
              />
              <span style={{ ...lbl, color: "#22c55e", fontSize: 8 }}>
                SGP4 PROPAGATION · 1s UPDATE
              </span>
            </div>
          </div>
        </DraggablePanel>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TLE FEED
      ══════════════════════════════════════════════════════════════════ */}
      {selectedSat && panels.tle && (
        <DraggablePanel
          title="TLE Feed"
          icon={Terminal}
          onClose={() => toggle("tle")}
          defaultPos={{ x: 430, y: 420 }}
          accentColor="#eab308"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["Line 1", selectedSat.tle_line1],
              ["Line 2", selectedSat.tle_line2],
            ].map(([l, v]) => (
              <div key={l}>
                <div style={{ ...lbl, color: "#eab308", marginBottom: 5 }}>
                  {l}
                </div>
                <div
                  style={{
                    background: "rgba(0,0,0,.6)",
                    borderRadius: 8,
                    border: "1px solid rgba(234,179,8,.15)",
                    padding: "8px 10px",
                    fontFamily: "'Share Tech Mono',monospace",
                    fontSize: 9,
                    color: "#4ade80",
                    lineHeight: 1.7,
                    wordBreak: "break-all",
                  }}
                >
                  {v || "N/A"}
                </div>
              </div>
            ))}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              {[
                ["Epoch", selectedSat.orbital_elements?.epoch],
                [
                  "Mean Motion",
                  getOE(selectedSat, "mean_motion_rev_day") != null
                    ? getOE(selectedSat, "mean_motion_rev_day").toFixed(8) +
                      " rev/d"
                    : "N/A",
                ],
              ].map(([l, v]) => (
                <div
                  key={l}
                  style={{
                    background: "rgba(0,0,0,.4)",
                    border: "1px solid rgba(234,179,8,.12)",
                    borderRadius: 8,
                    padding: "8px 10px",
                  }}
                >
                  <div style={{ ...lbl, marginBottom: 4 }}>{l}</div>
                  <div
                    style={{
                      fontFamily: "'Share Tech Mono',monospace",
                      fontSize: 9,
                      color: "#eab308",
                    }}
                  >
                    {v || "N/A"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DraggablePanel>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ORBITAL ELEMENTS
      ══════════════════════════════════════════════════════════════════ */}
      {selectedSat && panels.orbital && (
        <DraggablePanel
          title="Orbital Elements"
          icon={Settings}
          onClose={() => toggle("orbital")}
          defaultPos={{ x: 760, y: 420 }}
          accentColor="#a855f7"
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            {[
              ["Inclination", "inclination_deg", "°"],
              ["Eccentricity", "eccentricity", ""],
              ["RAAN", "raan_deg", "°"],
              ["Arg. Perigee", "arg_perigee_deg", "°"],
              ["Mean Motion", "mean_motion_rev_day", "rev/d"],
              ["Mean Anomaly", "mean_anomaly_deg", "°"],
              ["Perigee", "perigee", "km"],
              ["Apogee", "apogee", "km"],
              ["Period", "orbital_period_min", "min"],
              ["Semi-Major", "semi_major_axis_km", "km"],
            ].map(([name, key, unit]) => {
              const val = getOE(selectedSat, key);
              return (
                <div
                  key={name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 0",
                    borderBottom: "1px solid rgba(168,85,247,.1)",
                  }}
                >
                  <span style={{ ...lbl }}>{name}</span>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#a855f7",
                    }}
                  >
                    {val != null
                      ? `${Number(val).toFixed(val < 1 ? 7 : 2)}${unit ? " " + unit : ""}`
                      : "N/A"}
                  </span>
                </div>
              );
            })}
          </div>
        </DraggablePanel>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          IMPACT CORRIDOR — FIX: renders all 3 impact zones
      ══════════════════════════════════════════════════════════════════ */}
      {selectedSat && panels.impact && (
        <DraggablePanel
          title="Impact Corridor"
          icon={Target}
          onClose={() => toggle("impact")}
          defaultPos={{ x: 74, y: 490 }}
          accentColor="#ef4444"
        >
          {impactSites?.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {impactSites.map((site, i) => (
                <div
                  key={i}
                  style={{
                    background: "rgba(0,0,0,.4)",
                    borderRadius: 10,
                    border: `1px solid ${site.color}30`,
                    borderLeft: `3px solid ${site.color}`,
                    padding: "10px 12px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Orbitron',sans-serif",
                      fontSize: 9,
                      fontWeight: 900,
                      color: site.color,
                      textTransform: "uppercase",
                      letterSpacing: ".1em",
                      marginBottom: 6,
                    }}
                  >
                    {site.label} ZONE
                  </div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: 10,
                      color: "#e2e8f0",
                      marginBottom: 8,
                    }}
                  >
                    {site.region ||
                      `${site.lat?.toFixed(2)}°, ${site.lng?.toFixed(2)}°`}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 6,
                    }}
                  >
                    {[
                      ["Lat", `${site.lat?.toFixed(2)}°`],
                      ["Lng", `${site.lng?.toFixed(2)}°`],
                      ["R", `${Math.round((site.radius || 0) / 1000)} km`],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <div style={{ ...lbl, marginBottom: 2 }}>{k}</div>
                        <div
                          style={{
                            fontFamily: "'JetBrains Mono',monospace",
                            fontSize: 9,
                            color: "#94a3b8",
                          }}
                        >
                          {v}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ ...lbl, textAlign: "center", padding: "28px 0" }}>
              Select a satellite to view corridors
            </div>
          )}
        </DraggablePanel>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          RE-ENTRY WINDOW — FIX: countdown uses days_left properly
      ══════════════════════════════════════════════════════════════════ */}
      {selectedSat && panels.timeWindow && (
        <DraggablePanel
          title="Re-Entry Window"
          icon={Clock}
          onClose={() => toggle("timeWindow")}
          defaultPos={{ x: 430, y: 530 }}
          accentColor="#f97316"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(() => {
              // Resolve effective days-to-reentry
              let dl = Number(selectedSat.days_left);
              let altBased = false;
              if (!dl || isNaN(dl) || dl <= 0) {
                altBased = true;
                const alt = Number(selectedSat.altitude || liveAlt || 200);
                if (alt < 80)
                  dl = 0.01; // ~15 min
                else if (alt < 100)
                  dl = 0.042; // ~1 hr
                else if (alt < 120)
                  dl = 0.208; // ~5 hrs
                else if (alt < 150)
                  dl = 0.5; // ~12 hrs
                else if (alt < 200)
                  dl = 1.0; // ~1 day
                else dl = 2.0;
              }
              const now = Date.now();
              // Window = ±50 % of dl, but earliest never in the past
              const halfWin = dl * 0.5;
              const earliest = new Date(
                now + Math.max(0, dl - halfWin) * 86_400_000,
              );
              const latest = new Date(now + (dl + halfWin) * 86_400_000);
              const nominal = new Date(now + dl * 86_400_000);
              return (
                <>
                  {/* ±50% window */}
                  <div
                    style={{
                      background: "rgba(0,0,0,.5)",
                      border: "1px solid rgba(249,115,22,.2)",
                      borderRadius: 10,
                      padding: "10px 12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ ...lbl, color: "#f97316" }}>
                        Re-Entry Window
                      </span>
                      {altBased && (
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono',monospace",
                            fontSize: 7,
                            color: "#ef4444",
                            background: "rgba(239,68,68,.12)",
                            border: "1px solid rgba(239,68,68,.3)",
                            borderRadius: 4,
                            padding: "1px 5px",
                            letterSpacing: ".05em",
                          }}
                        >
                          ALT-EST
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 9,
                        color: "#fb923c",
                        lineHeight: 1.9,
                      }}
                    >
                      <div>
                        Earliest:{" "}
                        {earliest.toISOString().slice(0, 16).replace("T", " ")}{" "}
                        UTC
                      </div>
                      <div>
                        Latest:{" "}
                        {latest.toISOString().slice(0, 16).replace("T", " ")}{" "}
                        UTC
                      </div>
                    </div>
                  </div>

                  {/* Nominal re-entry */}
                  <div
                    style={{
                      background: "rgba(0,0,0,.5)",
                      border: "1px solid rgba(249,115,22,.2)",
                      borderRadius: 10,
                      padding: "10px 12px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ ...lbl, color: "#f97316", marginBottom: 6 }}>
                      {altBased
                        ? "Est. Re-Entry (altitude-based)"
                        : "Estimated Re-Entry"}
                    </div>
                    <div
                      style={{
                        fontFamily: "'JetBrains Mono',monospace",
                        fontSize: 11,
                        color: altBased ? "#ef4444" : "#fff",
                        fontWeight: 800,
                      }}
                    >
                      {nominal.toISOString().slice(0, 16).replace("T", " ")} UTC
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Risk pill — 0-5d critical, 6-10d warning, 11-15d monitoring, >15d stable */}
            {(() => {
              const d = Number(selectedSat.days_left || 0);
              const c = daysColor(d);
              const rl =
                d <= 5
                  ? "CRITICAL"
                  : d <= 10
                    ? "WARNING"
                    : d <= 15
                      ? "MONITORING"
                      : "STABLE";
              return (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: `1px solid ${c}40`,
                    background: c + "14",
                  }}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: c,
                      boxShadow: `0 0 8px ${c}`,
                      animation: "liveDot 1.4s infinite",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "'Orbitron',sans-serif",
                      fontSize: 9,
                      fontWeight: 900,
                      color: c,
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
                    }}
                  >
                    {rl} · T-{d.toFixed(1)} DAYS
                  </span>
                </div>
              );
            })()}
          </div>
        </DraggablePanel>
      )}
    </>
  );
};
