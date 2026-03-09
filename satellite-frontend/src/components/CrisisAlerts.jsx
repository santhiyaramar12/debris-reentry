import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { satelliteService } from "../services/api";
import { MissionConsole } from "./MissionConsole";
import { OrbitalGlobe3D } from "./OrbitalGlobe3D";
import { TacticalMap2D } from "./TacticalMap2D";
import { Globe as GlobeIcon, AlertTriangle, X, Timer } from "lucide-react";
import { TrajectoryEngine } from "../services/TrajectoryEngine";

// ─── Fallback SGP4-style propagator (no TLE available) ───────────────────────
const fallbackPropagate = (sat) => {
  try {
    const oe = sat.orbital_elements || {};
    const norad = Number(sat.norad_id || 0);
    const GM = 398600.4418,
      RE = 6378.137,
      D2R = Math.PI / 180;
    const inc = Number(oe.inclination_deg ?? 20 + (norad % 70)) * D2R;
    const mm = Number(oe.mean_motion_rev_day ?? 14 + (norad % 4) * 0.5);
    const ma0 = Number(oe.mean_anomaly_deg ?? (norad * 137.508) % 360) * D2R;
    const raan = Number(oe.raan_deg ?? (norad * 97.3) % 360) * D2R;
    const ecc = Number(oe.eccentricity ?? 0.001);
    const n = (mm * 2 * Math.PI) / 86400;
    const a = Math.cbrt(GM / (n * n));
    const t = Date.now() / 1000;
    const Ma = (ma0 + n * (t % (86400 * 15))) % (2 * Math.PI);
    let E = Ma;
    for (let i = 0; i < 5; i++)
      E -= (E - ecc * Math.sin(E) - Ma) / (1 - ecc * Math.cos(E));
    const nu = Math.atan2(
      Math.sqrt(1 - ecc ** 2) * Math.sin(E),
      Math.cos(E) - ecc,
    );
    const u = raan + nu;
    const r = a * (1 - ecc * Math.cos(E));
    const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
    const gmst =
      (2 *
        Math.PI *
        (0.779057273264 +
          (1.00273781191135448 * (Date.now() - J2000)) / 86400000)) %
      (2 * Math.PI);
    const ix =
      Math.cos(raan) * Math.cos(u) -
      Math.sin(raan) * Math.sin(u) * Math.cos(inc);
    const iy =
      Math.sin(raan) * Math.cos(u) +
      Math.cos(raan) * Math.sin(u) * Math.cos(inc);
    const iz = Math.sin(inc) * Math.sin(u);
    const xECF = ix * Math.cos(gmst) + iy * Math.sin(gmst);
    const yECF = -ix * Math.sin(gmst) + iy * Math.cos(gmst);
    const lat = Math.asin(Math.max(-1, Math.min(1, iz))) * (180 / Math.PI);
    const lng = Math.atan2(yECF, xECF) * (180 / Math.PI);
    const alt = Math.max(0, r - RE);
    const velocity = Math.sqrt(GM * (2 / r - 1 / a));
    return { lat, lng, alt, velocity };
  } catch (_) {
    return null;
  }
};

// ─── Synthetic ground track (TLE fallback) ────────────────────────────────────
const generateSyntheticTrack = (sat, hoursAhead = 120, stepMinutes = 6) => {
  const norad = Number(sat.norad_id || 1);
  const oe = sat.orbital_elements || {};
  const GM = 398600.4418,
    RE = 6378.137;
  const alt = Number(sat.altitude || oe.altitude_km || 300);
  const inc = Number(oe.inclination_deg ?? 30 + (norad % 60)) * (Math.PI / 180);
  const r = RE + alt;
  const period = 2 * Math.PI * Math.sqrt(r ** 3 / GM);
  const mm = 86400 / period;
  const omegaE = (2 * Math.PI) / 86400;
  const raan0 = ((norad * 97.3) % 360) * (Math.PI / 180);
  const ma0 = ((norad * 137.508) % 360) * (Math.PI / 180);
  const n = (mm * 2 * Math.PI) / 86400;
  const total = Math.floor((hoursAhead * 60) / stepMinutes) + 1;
  const pts = [];
  for (let i = 0; i < total; i++) {
    const dt = i * stepMinutes * 60;
    const Ma = (ma0 + n * dt) % (2 * Math.PI);
    const ix =
      Math.cos(raan0) * Math.cos(Ma) -
      Math.sin(raan0) * Math.sin(Ma) * Math.cos(inc);
    const iy =
      Math.sin(raan0) * Math.cos(Ma) +
      Math.cos(raan0) * Math.sin(Ma) * Math.cos(inc);
    const iz = Math.sin(inc) * Math.sin(Ma);
    const gmst = (omegaE * dt) % (2 * Math.PI);
    const xECF = ix * Math.cos(gmst) + iy * Math.sin(gmst);
    const yECF = -ix * Math.sin(gmst) + iy * Math.cos(gmst);
    pts.push([
      Math.atan2(yECF, xECF) * (180 / Math.PI),
      Math.asin(Math.max(-1, Math.min(1, iz))) * (180 / Math.PI),
    ]);
  }
  return pts;
};

// ─── Synthetic 2 background pass tracks (2D map only) ────────────────────────
const generateSyntheticPasses = (sat, hoursAhead = 120) => {
  const norad = Number(sat.norad_id || 1);
  const oe = sat.orbital_elements || {};
  const GM = 398600.4418,
    RE = 6378.137;
  const alt = Number(sat.altitude || oe.altitude_km || 300);
  const inc = Number(oe.inclination_deg ?? 30 + (norad % 60)) * (Math.PI / 180);
  const r = RE + alt;
  const period = 2 * Math.PI * Math.sqrt(r ** 3 / GM);
  const mm = 86400 / period;
  const omegaE = (2 * Math.PI) / 86400;
  const n = (mm * 2 * Math.PI) / 86400;
  const spo = Math.ceil(period / 60);
  const passes = [];
  for (let pass = 1; pass <= 2; pass++) {
    const raan0 = (((norad * 97.3) % 360) + pass * 25) * (Math.PI / 180);
    const ma0 = (((norad * 137.508) % 360) + pass * 55) * (Math.PI / 180);
    const tOff = pass * (period / 4);
    const seg = [];
    let prevLng = null;
    for (let i = 0; i < spo * 2; i++) {
      const dt = tOff + i * 60;
      const Ma = (ma0 + n * dt) % (2 * Math.PI);
      const ix =
        Math.cos(raan0) * Math.cos(Ma) -
        Math.sin(raan0) * Math.sin(Ma) * Math.cos(inc);
      const iy =
        Math.sin(raan0) * Math.cos(Ma) +
        Math.cos(raan0) * Math.sin(Ma) * Math.cos(inc);
      const iz = Math.sin(inc) * Math.sin(Ma);
      const gmst = (omegaE * dt) % (2 * Math.PI);
      const xECF = ix * Math.cos(gmst) + iy * Math.sin(gmst);
      const yECF = -ix * Math.sin(gmst) + iy * Math.cos(gmst);
      const lat = Math.asin(Math.max(-1, Math.min(1, iz))) * (180 / Math.PI);
      const lng = Math.atan2(yECF, xECF) * (180 / Math.PI);
      if (prevLng !== null && Math.abs(lng - prevLng) > 180) {
        if (seg.length > 1) passes.push([...seg]);
        seg.length = 0;
      }
      seg.push([lng, lat]);
      prevLng = lng;
    }
    if (seg.length > 1) passes.push(seg);
  }
  return passes;
};

// ─── Countdown widget — above globe, counts DOWN remaining simulation time ────
// remainingDays = maxSlider - sliderDays (shrinks as slider advances)
const CountdownWidget = ({ remainingDays, modeLabel }) => {
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const rem = Math.max(0, Number(remainingDays) || 0);
    // Convert remaining days to ms
    const totalMs = rem * 86_400_000;
    const deadline = Date.now() + totalMs;

    const tick = () => {
      const left = Math.max(0, deadline - Date.now());
      setT({
        d: Math.floor(left / 86_400_000),
        h: Math.floor((left % 86_400_000) / 3_600_000),
        m: Math.floor((left % 3_600_000) / 60_000),
        s: Math.floor((left % 60_000) / 1_000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [remainingDays]); // re-runs every time slider moves → always in sync

  const risk =
    Number(remainingDays) <= 2
      ? "#ef4444"
      : Number(remainingDays) <= 4
        ? "#eab308"
        : "#00ff88";

  return (
    <div
      style={{
        position: "absolute",
        top: 88,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 46000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
        background: "rgba(2,6,23,0.90)",
        backdropFilter: "blur(20px)",
        border: `1px solid ${risk}30`,
        borderRadius: 14,
        padding: "9px 18px 11px",
        boxShadow: `0 0 28px ${risk}15`,
        minWidth: 250,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <Timer size={9} style={{ color: risk }} />
        <span
          style={{
            fontFamily: "'Orbitron',sans-serif",
            fontSize: 7,
            fontWeight: 900,
            color: risk,
            textTransform: "uppercase",
            letterSpacing: ".18em",
          }}
        >
          Re-Entry Window
        </span>
        <span
          style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 6.5,
            color: "rgba(148,163,184,.4)",
            textTransform: "uppercase",
            letterSpacing: ".1em",
          }}
        >
          [{modeLabel}]
        </span>
      </div>
      <div style={{ display: "flex", gap: 5 }}>
        {[
          ["D", t.d],
          ["H", t.h],
          ["M", t.m],
          ["S", t.s],
        ].map(([l, v]) => (
          <div
            key={l}
            style={{
              background: risk + "10",
              border: `1px solid ${risk}28`,
              borderRadius: 8,
              padding: "6px 8px",
              textAlign: "center",
              minWidth: 40,
            }}
          >
            <div
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 16,
                fontWeight: 900,
                color: risk,
                lineHeight: 1,
              }}
            >
              {String(v).padStart(2, "0")}
            </div>
            <div
              style={{
                fontFamily: "'Orbitron',sans-serif",
                fontSize: 6,
                color: "rgba(148,163,184,.45)",
                textTransform: "uppercase",
                letterSpacing: ".12em",
                marginTop: 2,
              }}
            >
              {l}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Impact alert card (slide-in from right) ─────────────────────────────────
const ImpactAlertCard = ({ site, onDismiss }) => {
  const c = site.color;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        background: "rgba(2,6,23,0.94)",
        backdropFilter: "blur(18px)",
        border: `1px solid ${c}40`,
        borderLeft: `3px solid ${c}`,
        borderRadius: 12,
        padding: "10px 12px",
        boxShadow: `0 0 22px ${c}20`,
        minWidth: 225,
        maxWidth: 265,
        animation: "slideInRight 0.35s cubic-bezier(.22,1,.36,1)",
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: c + "18",
          border: `1px solid ${c}40`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <AlertTriangle size={11} style={{ color: c }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "'Orbitron',sans-serif",
            fontSize: 7.5,
            fontWeight: 900,
            color: c,
            textTransform: "uppercase",
            letterSpacing: ".1em",
            marginBottom: 4,
          }}
        >
          ⚠ {site.label} ZONE APPROACH
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 9.5,
            color: "#e2e8f0",
            marginBottom: 5,
          }}
        >
          {site.region || `${site.lat?.toFixed(1)}°, ${site.lng?.toFixed(1)}°`}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 7,
                color: "#475569",
                textTransform: "uppercase",
              }}
            >
              Radius
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 8.5,
                fontWeight: 700,
                color: "#94a3b8",
              }}
            >
              {Math.round((site.radius || 0) / 1000)} km
            </div>
          </div>
          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 7,
                color: "#475569",
                textTransform: "uppercase",
              }}
            >
              Lat / Lng
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 8.5,
                fontWeight: 700,
                color: "#94a3b8",
              }}
            >
              {site.lat?.toFixed(1)}° / {site.lng?.toFixed(1)}°
            </div>
          </div>
        </div>
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: "none",
          border: "none",
          color: "rgba(255,255,255,.3)",
          cursor: "pointer",
          padding: 0,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        <X size={11} />
      </button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
//  FINAL IMPACT CONFIRMED — full-screen dramatic popup
// ═══════════════════════════════════════════════════════════════════════════════
const FinalImpactPopup = ({ sat, site, onDismiss, onBack }) => {
  const [phase, setPhase] = useState(0); // 0=enter 1=hold 2=exit
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);
    return () => clearTimeout(t1);
  }, []);

  const handleBack = () => {
    setPhase(2);
    setTimeout(onBack, 500);
  };
  const handleDismiss = () => {
    setPhase(2);
    setTimeout(onDismiss, 500);
  };

  const c = site?.color || "#ef4444";

  // Format lat/lng as N/S E/W
  const fmtLat = (v) =>
    v == null ? "—" : `${Math.abs(v).toFixed(1)}° ${v >= 0 ? "N" : "S"}`;
  const fmtLng = (v) =>
    v == null ? "—" : `${Math.abs(v).toFixed(1)}° ${v >= 0 ? "E" : "W"}`;
  const region = site?.region || `${fmtLat(site?.lat)}, ${fmtLng(site?.lng)}`;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 99000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: phase === 2 ? "none" : "auto",
        background: phase === 1 ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0)",
        transition: "background 0.5s ease",
      }}
    >
      <div
        style={{
          textAlign: "center",
          transform:
            phase === 0
              ? "scale(0.6)"
              : phase === 2
                ? "scale(0.9)"
                : "scale(1)",
          opacity: phase === 1 ? 1 : 0,
          transition:
            "transform 0.5s cubic-bezier(.22,1,.36,1), opacity 0.4s ease",
          maxWidth: 420,
          width: "90%",
        }}
      >
        {/* Outer ring */}
        <div
          style={{
            position: "relative",
            width: 160,
            height: 160,
            margin: "0 auto 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: `2px solid ${c}`,
              animation: "impactRingPulse 1.1s ease-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 14,
              borderRadius: "50%",
              border: `1px solid ${c}50`,
            }}
          />
          <div
            style={{
              width: 90,
              height: 90,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${c}30 0%, ${c}08 70%)`,
              border: `2px solid ${c}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 40px ${c}50, 0 0 80px ${c}20`,
            }}
          >
            <span style={{ fontSize: 34 }}>☄</span>
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: "'Orbitron',sans-serif",
            fontSize: 10,
            fontWeight: 900,
            color: c,
            textTransform: "uppercase",
            letterSpacing: ".3em",
            marginBottom: 10,
            textShadow: `0 0 20px ${c}`,
            animation: "impactTextFlash 0.9s ease infinite alternate",
          }}
        >
          ⚠ IMPACT CONFIRMED ⚠
        </div>

        {/* Satellite name */}
        <div
          style={{
            fontFamily: "'Orbitron',sans-serif",
            fontSize: 20,
            fontWeight: 900,
            color: "#fff",
            letterSpacing: ".06em",
            marginBottom: 4,
            textShadow: "0 0 15px rgba(255,255,255,0.4)",
            wordBreak: "break-word",
          }}
        >
          {sat?.name || "UNKNOWN"}
        </div>

        {/* Region — formatted coords */}
        <div
          style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 13,
            color: "#94a3b8",
            marginBottom: 20,
            letterSpacing: ".04em",
          }}
        >
          {region}
        </div>

        {/* Data row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            background: "rgba(2,6,23,0.90)",
            backdropFilter: "blur(20px)",
            border: `1px solid ${c}30`,
            borderRadius: 12,
            overflow: "hidden",
            marginBottom: 16,
          }}
        >
          {[
            ["NORAD", sat?.norad_id || "—"],
            ["ALT", `${Math.round(sat?.altitude ?? 0)} km`],
            ["LAT", fmtLat(site?.lat)],
            ["LNG", fmtLng(site?.lng)],
          ].map(([k, v], i) => (
            <div
              key={k}
              style={{
                padding: "10px 10px",
                textAlign: "center",
                borderRight: i < 3 ? `1px solid ${c}18` : "none",
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 6,
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: ".15em",
                  marginBottom: 4,
                }}
              >
                {k}
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 9.5,
                  fontWeight: 800,
                  color: "#e2e8f0",
                }}
              >
                {v}
              </div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={handleBack}
            style={{
              fontFamily: "'Orbitron',sans-serif",
              fontSize: 8,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: ".15em",
              padding: "10px 22px",
              borderRadius: 999,
              cursor: "pointer",
              background: "rgba(6,182,212,0.15)",
              border: "1px solid rgba(6,182,212,0.5)",
              color: "#67e8f9",
              transition: "all .18s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(6,182,212,0.28)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(6,182,212,0.15)")
            }
          >
            ← New Prediction
          </button>
          <button
            onClick={handleDismiss}
            style={{
              fontFamily: "'Orbitron',sans-serif",
              fontSize: 8,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: ".15em",
              padding: "10px 22px",
              borderRadius: 999,
              cursor: "pointer",
              background: "rgba(100,116,139,0.15)",
              border: "1px solid rgba(100,116,139,0.35)",
              color: "#94a3b8",
              transition: "all .18s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(100,116,139,0.28)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "rgba(100,116,139,0.15)")
            }
          >
            Dismiss
          </button>
        </div>
      </div>
      <style>{`
        @keyframes impactRingPulse {
          0%  { transform: scale(1);    opacity: .8; }
          70% { transform: scale(1.35); opacity: 0; }
          100%{ transform: scale(1.35); opacity: 0; }
        }
        @keyframes impactTextFlash {
          from { opacity: 1; }
          to   { opacity: .55; }
        }
      `}</style>
    </div>
  );
};

const CrisisAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [selectedSat, setSelectedSat] = useState(null);
  const [viewMode, setViewMode] = useState("3d");
  const [sliderDays, setSliderDays] = useState(0);
  const [impactSites, setImpactSites] = useState([]);
  const [groundTrack, setGroundTrack] = useState([]);
  const [multiPassTracks, setMultiPassTracks] = useState([]);
  const [livePosition, setLivePosition] = useState(null);
  const [predictionMode, setPredictionMode] = useState("5d"); // "6h" | "5d" only
  const [corridorAlert, setCorridorAlert] = useState(null);
  const [finalImpactFired, setFinalImpactFired] = useState(false);
  const [finalImpactPopup, setFinalImpactPopup] = useState(null); // { sat, site }
  const [impactAlerts, setImpactAlerts] = useState({});
  const [simSpeed, setSimSpeed] = useState(1); // 1x | 2x | 3x
  const [isPaused, setIsPaused] = useState(false);

  const liveIntervalRef = useRef(null);
  const sliderRafRef = useRef(null);
  const impactSitesRef = useRef([]);
  const selectedSatRef = useRef(null);
  const firedImpactAlerts = useRef(new Set());
  const globeCommandRef = useRef(null);

  useEffect(() => {
    impactSitesRef.current = impactSites;
  }, [impactSites]);
  useEffect(() => {
    selectedSatRef.current = selectedSat;
  }, [selectedSat]);

  // ── Enrich OE from TLE ──────────────────────────────────────────────────────
  const enrichOE = useCallback((sat) => {
    const existing = sat.orbital_elements || {};
    const tle2 = sat.tle_line2 || "";
    let parsed = {};
    if (tle2.length >= 69) {
      try {
        const p = tle2.trim().split(/\s+/);
        if (p.length >= 8) {
          const mm = parseFloat(p[7]);
          const ecc = parseFloat("0." + p[4]);
          const n = (mm * 2 * Math.PI) / 86400;
          const sma = Math.pow(398600.4418 / (n * n), 1 / 3);
          parsed = {
            inclination_deg: parseFloat(p[2]),
            raan_deg: parseFloat(p[3]),
            eccentricity: ecc,
            arg_perigee_deg: parseFloat(p[5]),
            mean_anomaly_deg: parseFloat(p[6]),
            mean_motion_rev_day: mm,
            semi_major_axis_km: Math.round(sma * 100) / 100,
            orbital_period_min: Math.round((1440 / mm) * 100) / 100,
            apogee: Math.round((sma * (1 + ecc) - 6378.137) * 100) / 100,
            perigee: Math.round((sma * (1 - ecc) - 6378.137) * 100) / 100,
          };
        }
      } catch (_) {
        /**/
      }
    }
    let epoch = existing.epoch;
    if (!epoch && sat.tle_line1?.length >= 32)
      epoch = sat.tle_line1.substring(18, 32).trim();
    return {
      ...sat,
      orbital_elements: {
        ...parsed,
        ...existing,
        epoch: existing.epoch || epoch,
      },
    };
  }, []);

  // ── Fetch alert satellites ──────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const data = await satelliteService.fetchData("Alerts");
        const list = Array.isArray(data) ? data : [];
        setAlerts(
          list
            .filter(
              (s) =>
                Number(s.altitude || 9999) <= 300 ||
                Number(s.days_left || 9999) <= 60,
            )
            .map(enrichOE)
            .sort(
              (a, b) => Number(a.days_left || 0) - Number(b.days_left || 0),
            ),
        );
      } catch (e) {
        console.error("fetchAlerts:", e);
      }
    };
    load();
  }, [enrichOE]);

  // ── Generate prediction (TLE→SGP4, synthetic fallback) ─────────────────────
  const generatePrediction = useCallback((sat, mode) => {
    const hrs = mode === "6h" ? 6 : 120; // 5d = 120h
    const step = mode === "6h" ? 1 : 6;

    // Ground track
    let track = TrajectoryEngine.generateGroundTrack(
      sat.tle_line1 || "",
      sat.tle_line2 || "",
      hrs,
      step,
    );
    if (!track || track.length < 10)
      track = generateSyntheticTrack(sat, hrs, step);
    if (!track || track.length < 10)
      track = generateSyntheticTrack(sat, hrs, 10);

    // Background pass lines (2D map only — max 2)
    let passes = TrajectoryEngine.generateMultiPassTrack(
      sat.tle_line1 || "",
      sat.tle_line2 || "",
      hrs,
      2,
    );
    if (!passes?.length || passes.every((p) => !p?.length))
      passes = generateSyntheticPasses(sat, hrs);
    passes = passes.slice(0, 2);

    // Impact sites — always 3, placed along the track
    let sites = TrajectoryEngine.getImpactSites(track);
    if (!sites || sites.length < 3) {
      const tLen = track.length;
      const at = (f) => {
        const pt = track[Math.min(Math.floor(tLen * f), tLen - 1)];
        return {
          lat: pt[1],
          lng: pt[0],
          label: `${Math.abs(pt[1]).toFixed(1)}°${pt[1] >= 0 ? "N" : "S"} ${Math.abs(pt[0]).toFixed(1)}°${pt[0] >= 0 ? "E" : "W"}`,
        };
      };
      const p1 = at(0.55),
        p2 = at(0.72),
        p3 = at(0.9);
      sites = [
        {
          lat: p1.lat,
          lng: p1.lng,
          color: "#3b82f6",
          label: "POSSIBLE",
          radius: 400000,
          region: p1.label,
        },
        {
          lat: p2.lat,
          lng: p2.lng,
          color: "#eab308",
          label: "SECONDARY",
          radius: 260000,
          region: p2.label,
        },
        {
          lat: p3.lat,
          lng: p3.lng,
          color: "#ef4444",
          label: "PRIMARY",
          radius: 150000,
          region: p3.label,
        },
      ];
    }

    console.log(
      `[CrisisAlerts] ${sat.name}: track=${track.length}pts passes=${passes.length} sites=${sites.length}`,
    );
    return { track, sites, passes };
  }, []);

  // ── Core animation: fromVal → toVal at chosen speed ─────────────────────────
  // 1x = 90s for full range, 2x = 45s, 3x = 20s
  const runAnimation = useCallback((fromVal, toVal, speed) => {
    if (sliderRafRef.current) cancelAnimationFrame(sliderRafRef.current);
    if (fromVal >= toVal) return;
    const fraction = toVal > 0 ? (toVal - fromVal) / toVal : 1;
    // speed=0.5 → dur=180s (slowest), speed=1 → 90s, speed=2 → 45s, speed=3 → 30s
    const dur = Math.max(400, (90000 * fraction) / Math.max(speed, 0.1));
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // ease-in-out
      setSliderDays(parseFloat((fromVal + e * (toVal - fromVal)).toFixed(4)));
      if (p < 1) sliderRafRef.current = requestAnimationFrame(tick);
    };
    sliderRafRef.current = requestAnimationFrame(tick);
  }, []);

  // ── Pause / Resume simulation ────────────────────────────────────────────────
  const handlePauseResume = useCallback(() => {
    setIsPaused((prev) => {
      const nowPaused = !prev;
      if (nowPaused) {
        // Pause: cancel animation frame
        if (sliderRafRef.current) cancelAnimationFrame(sliderRafRef.current);
        sliderRafRef.current = null;
      } else {
        // Resume: continue from current position
        const maxDays =
          predictionMode === "6h"
            ? 0.25
            : Math.min(5, Number(selectedSat?.days_left) || 5);
        if (sliderDays < maxDays * 0.99) {
          runAnimation(sliderDays, maxDays, simSpeed);
        }
      }
      return nowPaused;
    });
  }, [sliderDays, predictionMode, selectedSat, runAnimation, simSpeed]);
  const handleSelectSat = useCallback(
    (sat) => {
      if (!sat?.name) return;
      const enriched = enrichOE(sat);
      setSelectedSat(enriched);
      selectedSatRef.current = enriched;
      setFinalImpactFired(false);
      setFinalImpactPopup(null);
      setSliderDays(0);
      setLivePosition(null);
      setIsPaused(false);
      firedImpactAlerts.current = new Set();
      setImpactAlerts({});

      const { track, sites, passes } = generatePrediction(
        enriched,
        predictionMode,
      );
      setGroundTrack(track);
      setImpactSites(sites);
      impactSitesRef.current = sites;
      setMultiPassTracks(passes);

      const maxDays =
        predictionMode === "6h"
          ? 0.25
          : Math.min(5, Number(enriched.days_left) || 5);
      setTimeout(() => runAnimation(0, maxDays, simSpeed), 700);

      // Live SGP4 realtime tracking (independent of slider)
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
      const doLive = () => {
        const cur = selectedSatRef.current;
        if (!cur) return;
        let pos = null;
        if (cur.tle_line1 && cur.tle_line2)
          pos = TrajectoryEngine.propagateRealtime(
            cur.tle_line1,
            cur.tle_line2,
          );
        if (!pos) pos = fallbackPropagate(cur);
        if (!pos) return;
        setLivePosition({
          lat: pos.lat,
          lng: pos.lng,
          alt: pos.alt,
          velocity: pos.velocity,
          _t: Date.now(),
        });
        const hit = TrajectoryEngine.isInImpactCorridor(
          pos,
          impactSitesRef.current,
        );
        if (hit) {
          setCorridorAlert(hit);
          setTimeout(() => setCorridorAlert(null), 5000);
        }
      };
      doLive();
      liveIntervalRef.current = setInterval(doLive, 1000);
    },
    [predictionMode, generatePrediction, enrichOE, runAnimation, simSpeed],
  );

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  useEffect(
    () => () => {
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
      if (sliderRafRef.current) cancelAnimationFrame(sliderRafRef.current);
    },
    [],
  );

  // ── Regenerate on mode change ────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedSat) return;
    const { track, sites, passes } = generatePrediction(
      selectedSat,
      predictionMode,
    );
    setGroundTrack(track);
    setImpactSites(sites);
    impactSitesRef.current = sites;
    setMultiPassTracks(passes);
    const maxDays =
      predictionMode === "6h"
        ? 0.25
        : Math.min(5, Number(selectedSat.days_left) || 5);
    setSliderDays(0);
    firedImpactAlerts.current = new Set();
    setImpactAlerts({});
    setFinalImpactFired(false);
    setIsPaused(false);
    setTimeout(() => runAnimation(0, maxDays, simSpeed), 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predictionMode, selectedSat?.norad_id]);

  // ── Re-animate from current position when speed changes ─────────────────────
  useEffect(() => {
    if (!selectedSat) return;
    const maxDays =
      predictionMode === "6h"
        ? 0.25
        : Math.min(5, Number(selectedSat.days_left) || 5);
    if (sliderDays < maxDays * 0.99) {
      runAnimation(sliderDays, maxDays, simSpeed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simSpeed]);

  // ── Stop at max — pin satellite at PRIMARY impact site ───────────────────────
  useEffect(() => {
    const maxDays =
      predictionMode === "6h"
        ? 0.25
        : Math.min(5, Number(selectedSat?.days_left) || 5);
    if (selectedSat && sliderDays >= maxDays * 0.99 && !finalImpactFired) {
      setFinalImpactFired(true);
      // Hard-stop slider and animation
      if (sliderRafRef.current) cancelAnimationFrame(sliderRafRef.current);
      setSliderDays(maxDays);
      // Stop live position updates so the satellite icon stays put
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = null;
      }
      // Pin satellite at PRIMARY impact site
      const primary =
        impactSitesRef.current?.find((s) => s.label === "PRIMARY") ||
        impactSitesRef.current?.[0];
      if (primary) {
        // Lock livePosition to PRIMARY so the sat icon lands there
        setLivePosition({
          lat: primary.lat,
          lng: primary.lng,
          alt: selectedSat.altitude ?? 0,
          velocity: 0,
          _t: Date.now(),
          _pinned: true,
        });
        // Tell globe: zoom in → hold → zoom out to show PRIMARY
        globeCommandRef.current = {
          type: "finalImpact",
          site: primary,
          ts: Date.now(),
        };
        // Show full-screen dramatic popup after 1.2s (let zoom-in start first)
        setTimeout(() => {
          setFinalImpactPopup({ sat: selectedSat, site: primary });
        }, 1200);
      }
      satelliteService.sendFinalImpactAlert?.({
        ...selectedSat,
        lat: primary?.lat ?? livePosition?.lat ?? selectedSat.lat,
        lng: primary?.lng ?? livePosition?.lng ?? selectedSat.lng,
      });
    }
  }, [sliderDays, selectedSat, finalImpactFired, predictionMode, livePosition]);

  // ── Per-site impact alerts — fire once at threshold ──────────────────────────
  useEffect(() => {
    if (!selectedSat || !impactSites?.length) return;
    const maxDays =
      predictionMode === "6h"
        ? 0.25
        : Math.min(5, Number(selectedSat.days_left) || 5);
    const ratio = maxDays > 0 ? sliderDays / maxDays : 0;
    const THRESH = { POSSIBLE: 0.55, SECONDARY: 0.75, PRIMARY: 0.92 };
    impactSites.forEach((site) => {
      const thresh = THRESH[site.label] ?? 0.88;
      const key = `${selectedSat.norad_id}-${site.label}`;
      if (ratio >= thresh && !firedImpactAlerts.current.has(key)) {
        firedImpactAlerts.current.add(key);
        setImpactAlerts((prev) => ({
          ...prev,
          [site.label]: { site, visible: true },
        }));
        globeCommandRef.current = { type: "zoomSite", site, ts: Date.now() };
      }
    });
  }, [sliderDays, selectedSat, impactSites, predictionMode]);

  // ─── Derived values ──────────────────────────────────────────────────────────
  const maxSlider =
    predictionMode === "6h"
      ? 0.25
      : Math.min(5, Number(selectedSat?.days_left) || 5);
  const sliderStep = predictionMode === "6h" ? 0.002 : 0.05;

  // Path colour: 0-2d red | 3-4d yellow | 5d green (6h always red)
  // Path colour for 5D slider (range 0-5): 0-2=red, 2-4=yellow, 4-5=green
  // For 6H always red. Colors consistent with watchlist risk tiers.
  const trajectoryColor = useMemo(() => {
    if (predictionMode === "6h") return "#ef4444";
    if (sliderDays <= 2) return "#ef4444";
    if (sliderDays <= 4) return "#eab308";
    return "#00ff88";
  }, [sliderDays, predictionMode]);

  const sliderLabel = useMemo(() => {
    if (predictionMode === "6h")
      return `T+${(sliderDays * 24).toFixed(1)} Hours`;
    return `T+${sliderDays.toFixed(2)} Days`;
  }, [sliderDays, predictionMode]);

  // Slider gradient — matches colour zones within 0-5 range
  const sliderBg = useMemo(() => {
    if (predictionMode === "6h")
      return "linear-gradient(90deg,#ef4444 0%,#ef4444 100%)";
    const r2 = (2 / 5) * 100; // 40%
    const r4 = (4 / 5) * 100; // 80%
    return `linear-gradient(90deg,#ef4444 0%,#ef4444 ${r2}%,#eab308 ${r2}%,#eab308 ${r4}%,#00ff88 ${r4}%,#00ff88 100%)`;
  }, [predictionMode]);

  // Countdown = remaining days in the simulation window (syncs with slider)
  const countdownDays = useMemo(() => {
    if (!selectedSat) return 0;
    const remaining = Math.max(0, maxSlider - sliderDays);
    return remaining;
  }, [selectedSat, maxSlider, sliderDays]);

  const riskBadge = useMemo(() => {
    if (predictionMode === "6h" || sliderDays <= 2) return "⚠ CRITICAL";
    if (sliderDays <= 4) return "▲ WARNING";
    return "● MONITORING";
  }, [sliderDays, predictionMode]);

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#020617",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        @keyframes slideInRight { from{opacity:0;transform:translateX(48px)} to{opacity:1;transform:translateX(0)} }
        @keyframes critPulse { 0%,100%{opacity:1} 50%{opacity:.55} }
        .traj-slider { -webkit-appearance:none; appearance:none; height:5px; border-radius:3px; outline:none; cursor:pointer; width:100%; }
        .traj-slider::-webkit-slider-thumb { -webkit-appearance:none; width:16px; height:16px; border-radius:50%; background:#fff; border:2px solid #06b6d4; cursor:pointer; box-shadow:0 0 8px rgba(6,182,212,.7); }
        .pred-btn  { padding:5px 18px; font-size:8px; font-family:'Orbitron',sans-serif; font-weight:700; text-transform:uppercase; letter-spacing:.1em; cursor:pointer; border:none; transition:all .18s; }
        .speed-btn { padding:4px 11px; font-size:8px; font-family:'JetBrains Mono',monospace; font-weight:700; cursor:pointer; border:none; transition:all .18s; }
      `}</style>

      {/* ══ Globe / Map area — takes all space above the bottom panel ══ */}
      <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
        {/* 3D Globe */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transition: "opacity .6s",
            opacity: viewMode === "3d" ? 1 : 0,
            zIndex: viewMode === "3d" ? 1 : 0,
            pointerEvents: viewMode === "3d" ? "auto" : "none",
          }}
        >
          <OrbitalGlobe3D
            alerts={alerts}
            selectedSat={selectedSat}
            onSelectSat={handleSelectSat}
            impactSites={impactSites}
            groundTrack={groundTrack}
            multiPassTracks={multiPassTracks}
            sliderDays={sliderDays}
            livePosition={livePosition}
            predictionMode={predictionMode}
            trajectoryColor={trajectoryColor}
            globeCommandRef={globeCommandRef}
          />
        </div>

        {/* 2D Map */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            transition: "opacity .6s",
            opacity: viewMode === "2d" ? 1 : 0,
            zIndex: viewMode === "2d" ? 1 : 0,
            pointerEvents: viewMode === "2d" ? "auto" : "none",
          }}
        >
          <TacticalMap2D
            selectedSat={selectedSat}
            impactSites={impactSites}
            groundTrack={groundTrack}
            multiPassTracks={multiPassTracks}
            sliderDays={sliderDays}
            livePosition={livePosition}
            predictionMode={predictionMode}
            trajectoryColor={trajectoryColor}
          />
        </div>

        {/* Mission Console (taskbar — unchanged) */}
        <MissionConsole
          alerts={alerts}
          selectedSat={selectedSat}
          onSelectSat={handleSelectSat}
          impactSites={impactSites}
          livePosition={livePosition}
        />

        {/* View toggle — top right */}
        <div
          style={{ position: "absolute", top: 88, right: 20, zIndex: 47000 }}
        >
          <button
            onClick={() => setViewMode((v) => (v === "3d" ? "2d" : "3d"))}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "rgba(15,23,42,.82)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(6,182,212,.22)",
              borderRadius: 10,
              padding: "7px 16px",
              color: "#67e8f9",
              fontSize: 9,
              fontFamily: "'Orbitron',sans-serif",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".1em",
              cursor: "pointer",
            }}
          >
            {viewMode === "3d" ? "→ 2D MAP" : "→ 3D GLOBE"}
          </button>
        </div>

        {/* ── COUNTDOWN — top center, above globe, replaces taskbar countdown ── */}
        {selectedSat && (
          <CountdownWidget
            remainingDays={countdownDays}
            modeLabel={predictionMode === "6h" ? "6H" : "5D"}
          />
        )}

        {/* Standby badge when no satellite selected */}
        {!selectedSat && (
          <div
            style={{
              position: "absolute",
              top: 88,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 46000,
            }}
          >
            <div
              style={{
                background: "rgba(2,6,23,.82)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(6,182,212,.12)",
                borderRadius: 999,
                padding: "5px 18px",
                color: "#334155",
                fontSize: 9,
                fontFamily: "'Orbitron',sans-serif",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".2em",
              }}
            >
              ○ Standby — Select Satellite
            </div>
          </div>
        )}

        {/* Risk level badge */}
        {selectedSat && (
          <div
            style={{ position: "absolute", top: 88, right: 140, zIndex: 47000 }}
          >
            <div
              style={{
                border: `1px solid ${trajectoryColor}40`,
                padding: "5px 14px",
                borderRadius: 999,
                color: trajectoryColor,
                fontSize: 8.5,
                fontFamily: "'Orbitron',sans-serif",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".12em",
                background: trajectoryColor + "12",
                backdropFilter: "blur(10px)",
              }}
            >
              {riskBadge}
            </div>
          </div>
        )}

        {/* ── FINAL IMPACT CONFIRMED — full-screen dramatic popup ── */}
        {finalImpactPopup && (
          <FinalImpactPopup
            sat={finalImpactPopup.sat}
            site={finalImpactPopup.site}
            onDismiss={() => setFinalImpactPopup(null)}
            onBack={() => {
              // Reset everything — user can pick a new satellite
              setFinalImpactPopup(null);
              setSelectedSat(null);
              setGroundTrack([]);
              setImpactSites([]);
              setMultiPassTracks([]);
              setLivePosition(null);
              setSliderDays(0);
              setFinalImpactFired(false);
              setImpactAlerts({});
              firedImpactAlerts.current = new Set();
              if (sliderRafRef.current)
                cancelAnimationFrame(sliderRafRef.current);
              if (liveIntervalRef.current)
                clearInterval(liveIntervalRef.current);
            }}
          />
        )}

        {/* Per-site impact alert cards — slide in from right */}
        <div
          style={{
            position: "absolute",
            top: 165,
            right: 20,
            zIndex: 49000,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            pointerEvents: "auto",
          }}
        >
          {Object.entries(impactAlerts).map(([label, { site, visible }]) =>
            visible ? (
              <ImpactAlertCard
                key={label}
                site={site}
                onDismiss={() =>
                  setImpactAlerts((p) => ({
                    ...p,
                    [label]: { ...p[label], visible: false },
                  }))
                }
              />
            ) : null,
          )}
        </div>

        {/* Live corridor alert */}
        {corridorAlert && (
          <div
            style={{
              position: "absolute",
              top: 145,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 48000,
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(10,10,20,.92)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(239,68,68,.45)",
              borderRadius: 999,
              padding: "7px 18px",
              boxShadow: "0 0 18px rgba(239,68,68,.28)",
            }}
          >
            <AlertTriangle
              size={12}
              style={{ color: "#ef4444", animation: "critPulse 1s infinite" }}
            />
            <span
              style={{
                color: "#f87171",
                fontSize: 10,
                fontFamily: "'Orbitron',sans-serif",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".14em",
              }}
            >
              ⚠ IMPACT CORRIDOR — {corridorAlert.region || corridorAlert.label}
            </span>
            <button
              onClick={() => setCorridorAlert(null)}
              style={{
                color: "rgba(255,255,255,.4)",
                background: "none",
                border: "none",
                cursor: "pointer",
                marginLeft: 4,
                fontSize: 13,
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Start-prediction overlay */}
        {!selectedSat && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              zIndex: 40000,
            }}
          >
            <div
              style={{
                background: "rgba(0,0,0,.55)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(6,182,212,.2)",
                padding: "38px 46px",
                borderRadius: 22,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 58,
                  height: 58,
                  margin: "0 auto 18px",
                  borderRadius: "50%",
                  border: "2px solid rgba(6,182,212,.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <GlobeIcon size={24} style={{ color: "#06b6d4" }} />
              </div>
              <div
                style={{
                  fontFamily: "'Orbitron',sans-serif",
                  fontSize: 18,
                  fontWeight: 900,
                  color: "#67e8f9",
                  letterSpacing: ".2em",
                  marginBottom: 10,
                  textTransform: "uppercase",
                }}
              >
                Start Prediction
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 10,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: ".12em",
                }}
              >
                Open Watchlist → Select a Satellite
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
           TRAJECTORY PREDICTION PANEL
           Placed below the globe/map — never overlaps the visualization.
           Layout: flex column → visualization flex:1 → this panel flex-shrink:0
         ══════════════════════════════════════════════════════════════════════ */}
      {selectedSat && (
        <div
          style={{
            flexShrink: 0,
            background: "rgba(2,6,23,0.92)",
            backdropFilter: "blur(22px)",
            borderTop: "1px solid rgba(6,182,212,0.10)",
            padding: "10px 26px 14px",
            zIndex: 50000,
            boxShadow: "0 -6px 28px rgba(0,0,0,.55)",
          }}
        >
          {/* ── Row 1: controls ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 8,
            }}
          >
            {/* Label */}
            <span
              style={{
                fontFamily: "'Orbitron',sans-serif",
                fontSize: 8,
                fontWeight: 800,
                color: "rgba(30,58,95,.9)",
                textTransform: "uppercase",
                letterSpacing: ".14em",
                flexShrink: 0,
              }}
            >
              Trajectory Prediction
            </span>

            {/* Mode: 6H | 5D */}
            <div
              style={{
                display: "flex",
                border: "1px solid rgba(6,182,212,.18)",
                borderRadius: 8,
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {[
                ["6h", "6 Hours"],
                ["5d", "5 Days"],
              ].map(([k, lbl]) => (
                <button
                  key={k}
                  className="pred-btn"
                  onClick={() => setPredictionMode(k)}
                  style={{
                    background:
                      predictionMode === k
                        ? "rgba(6,182,212,.20)"
                        : "transparent",
                    color:
                      predictionMode === k
                        ? "#67e8f9"
                        : "rgba(148,163,184,.38)",
                  }}
                >
                  {lbl}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div
              style={{
                width: 1,
                height: 18,
                background: "rgba(255,255,255,.07)",
                flexShrink: 0,
              }}
            />

            {/* Pause / Resume */}
            <button
              onClick={handlePauseResume}
              style={{
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: isPaused
                  ? "rgba(249,115,22,.18)"
                  : "rgba(6,182,212,.12)",
                border: isPaused
                  ? "1px solid rgba(249,115,22,.35)"
                  : "1px solid rgba(6,182,212,.25)",
                borderRadius: 7,
                padding: "4px 12px",
                color: isPaused ? "#fb923c" : "#67e8f9",
                fontSize: 8,
                fontFamily: "'Orbitron',sans-serif",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: ".1em",
                cursor: "pointer",
              }}
            >
              {isPaused ? "▶ Resume" : "⏸ Pause"}
            </button>

            {/* Divider */}
            <div
              style={{
                width: 1,
                height: 18,
                background: "rgba(255,255,255,.07)",
                flexShrink: 0,
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 7.5,
                  color: "rgba(100,116,139,.55)",
                  textTransform: "uppercase",
                  letterSpacing: ".07em",
                }}
              >
                Speed
              </span>
              <div
                style={{
                  display: "flex",
                  border: "1px solid rgba(255,255,255,.08)",
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                {[0.5, 1, 2, 3].map((s) => (
                  <button
                    key={s}
                    className="speed-btn"
                    onClick={() => setSimSpeed(s)}
                    style={{
                      background:
                        simSpeed === s ? "rgba(6,182,212,.18)" : "transparent",
                      color:
                        simSpeed === s ? "#67e8f9" : "rgba(148,163,184,.32)",
                      borderRight:
                        s < 3 ? "1px solid rgba(255,255,255,.06)" : "none",
                    }}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Current time readout */}
            <span
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 11,
                fontWeight: 800,
                color: trajectoryColor,
                flexShrink: 0,
              }}
            >
              {sliderLabel}
            </span>

            {/* Colour legend */}
            <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
              {(predictionMode === "6h"
                ? [["#ef4444", "6H"]]
                : [
                    ["#ef4444", "0-2d"],
                    ["#eab308", "3-4d"],
                    ["#00ff88", "5d"],
                  ]
              ).map(([c, lbl]) => (
                <span
                  key={lbl}
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: 7,
                    color: c,
                    textTransform: "uppercase",
                    letterSpacing: ".05em",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 12,
                      height: 2,
                      background: c,
                      borderRadius: 1,
                    }}
                  />
                  {lbl}
                </span>
              ))}
            </div>
          </div>

          {/* ── Row 2: slider ── */}
          <input
            type="range"
            className="traj-slider"
            min={0}
            max={maxSlider}
            step={sliderStep}
            value={sliderDays}
            onChange={(e) => {
              if (sliderRafRef.current)
                cancelAnimationFrame(sliderRafRef.current);
              sliderRafRef.current = null;
              setSliderDays(Number(e.target.value));
            }}
            onMouseUp={(e) => {
              const v = Number(e.target.value);
              if (v < maxSlider * 0.99) runAnimation(v, maxSlider, simSpeed);
            }}
            onTouchEnd={(e) => {
              const v = Number(e.currentTarget.value);
              if (v < maxSlider * 0.99) runAnimation(v, maxSlider, simSpeed);
            }}
            style={{ background: sliderBg, width: "100%", display: "block" }}
          />

          {/* ── Row 3: tick labels ── */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 5,
              paddingInline: 1,
            }}
          >
            {(predictionMode === "6h"
              ? ["0h", "1h", "2h", "3h", "4h", "5h", "6h"]
              : ["0d", "1d", "2d", "3d", "4d", "5d"]
            ).map((l) => (
              <span
                key={l}
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: 7,
                  color: "rgba(71,85,105,.55)",
                  textTransform: "uppercase",
                }}
              >
                {l}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CrisisAlerts;
