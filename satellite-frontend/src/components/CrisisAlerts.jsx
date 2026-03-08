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
import {
  Map,
  Globe as GlobeIcon,
  AlertTriangle,
  X,
  Play,
  Pause,
} from "lucide-react";
import { TrajectoryEngine } from "../services/TrajectoryEngine";

// ─── Fallback propagator ──────────────────────────────────────────────────────
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

// ─── Synthetic ground track ───────────────────────────────────────────────────
const generateSyntheticTrack = (sat, hoursAhead = 360, stepMinutes = 10) => {
  const norad = Number(sat.norad_id || 1);
  const oe = sat.orbital_elements || {};
  const GM = 398600.4418,
    RE = 6378.137;
  const alt = Number(sat.altitude || oe.altitude_km || 300);
  const inc = Number(oe.inclination_deg ?? 30 + (norad % 60)) * (Math.PI / 180);
  const r = RE + alt;
  const period = 2 * Math.PI * Math.sqrt(r ** 3 / GM);
  const mm = 86400 / period;
  const omega_E = (2 * Math.PI) / 86400;
  const raan0 = ((norad * 97.3) % 360) * (Math.PI / 180);
  const ma0 = ((norad * 137.508) % 360) * (Math.PI / 180);
  const n = (mm * 2 * Math.PI) / 86400;
  const totalPoints = Math.floor((hoursAhead * 60) / stepMinutes) + 1;
  const points = [];
  for (let i = 0; i < totalPoints; i++) {
    const dt = i * stepMinutes * 60;
    const Ma = (ma0 + n * dt) % (2 * Math.PI);
    const u = Ma;
    const ix =
      Math.cos(raan0) * Math.cos(u) -
      Math.sin(raan0) * Math.sin(u) * Math.cos(inc);
    const iy =
      Math.sin(raan0) * Math.cos(u) +
      Math.cos(raan0) * Math.sin(u) * Math.cos(inc);
    const iz = Math.sin(inc) * Math.sin(u);
    const gmst = (omega_E * dt) % (2 * Math.PI);
    const xECF = ix * Math.cos(gmst) + iy * Math.sin(gmst);
    const yECF = -ix * Math.sin(gmst) + iy * Math.cos(gmst);
    const lat = Math.asin(Math.max(-1, Math.min(1, iz))) * (180 / Math.PI);
    const lng = Math.atan2(yECF, xECF) * (180 / Math.PI);
    points.push([lng, lat]);
  }
  return points;
};

// ─── Synthetic passes — only 2 adjacent orbits ───────────────────────────────
const generateSyntheticPasses = (sat, hoursAhead = 360) => {
  const norad = Number(sat.norad_id || 1);
  const oe = sat.orbital_elements || {};
  const GM = 398600.4418,
    RE = 6378.137;
  const alt = Number(sat.altitude || oe.altitude_km || 300);
  const inc = Number(oe.inclination_deg ?? 30 + (norad % 60)) * (Math.PI / 180);
  const r = RE + alt;
  const period = 2 * Math.PI * Math.sqrt(r ** 3 / GM);
  const mm = 86400 / period;
  const omega_E = (2 * Math.PI) / 86400;
  const n = (mm * 2 * Math.PI) / 86400;
  const stepsPerOrbit = Math.ceil(period / 60);
  const passes = [];
  // Only 2 adjacent passes for a clean 2D map display
  for (let pass = 1; pass <= 2; pass++) {
    const raan0 = (((norad * 97.3) % 360) + pass * 25) * (Math.PI / 180);
    const ma0 = (((norad * 137.508) % 360) + pass * 55) * (Math.PI / 180);
    const timeOffset = pass * (period / 4);
    const passTrack = [];
    let prevLng = null;
    for (let i = 0; i < stepsPerOrbit * 2; i++) {
      const dt = timeOffset + i * 60;
      const Ma = (ma0 + n * dt) % (2 * Math.PI);
      const u = Ma;
      const ix =
        Math.cos(raan0) * Math.cos(u) -
        Math.sin(raan0) * Math.sin(u) * Math.cos(inc);
      const iy =
        Math.sin(raan0) * Math.cos(u) +
        Math.cos(raan0) * Math.sin(u) * Math.cos(inc);
      const iz = Math.sin(inc) * Math.sin(u);
      const gmst = (omega_E * dt) % (2 * Math.PI);
      const xECF = ix * Math.cos(gmst) + iy * Math.sin(gmst);
      const yECF = -ix * Math.sin(gmst) + iy * Math.cos(gmst);
      const lat = Math.asin(Math.max(-1, Math.min(1, iz))) * (180 / Math.PI);
      const lng = Math.atan2(yECF, xECF) * (180 / Math.PI);
      if (prevLng !== null && Math.abs(lng - prevLng) > 180) {
        if (passTrack.length > 1) passes.push([...passTrack]);
        passTrack.length = 0;
      }
      passTrack.push([lng, lat]);
      prevLng = lng;
    }
    if (passTrack.length > 1) passes.push(passTrack);
  }
  return passes;
};

// ─── Per-site impact alert card ───────────────────────────────────────────────
const ImpactAlertCard = ({ site, onDismiss }) => {
  const borderCol = site.color;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        background: "rgba(2,6,23,0.94)",
        backdropFilter: "blur(18px)",
        border: `1px solid ${borderCol}44`,
        borderLeft: `3px solid ${borderCol}`,
        borderRadius: 12,
        padding: "12px 14px",
        boxShadow: `0 0 28px ${borderCol}25`,
        minWidth: 240,
        maxWidth: 280,
        animation: "slideInRight 0.35s cubic-bezier(.22,1,.36,1)",
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: borderCol + "18",
          border: `1px solid ${borderCol}44`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        <AlertTriangle size={13} style={{ color: borderCol }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "'Orbitron',sans-serif",
            fontSize: 8,
            fontWeight: 900,
            color: borderCol,
            textTransform: "uppercase",
            letterSpacing: ".12em",
            marginBottom: 5,
          }}
        >
          ⚠ {site.label} ZONE APPROACH
        </div>
        <div
          style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 10,
            color: "#e2e8f0",
            marginBottom: 6,
          }}
        >
          {site.region || `${site.lat?.toFixed(1)}°, ${site.lng?.toFixed(1)}°`}
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <div>
            <div
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 7.5,
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: ".08em",
              }}
            >
              Radius
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 9,
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
                fontSize: 7.5,
                color: "#475569",
                textTransform: "uppercase",
                letterSpacing: ".08em",
              }}
            >
              Lat / Lng
            </div>
            <div
              style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: 9,
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
          fontSize: 13,
          padding: "0 0 0 2px",
          lineHeight: 1,
          flexShrink: 0,
          alignSelf: "flex-start",
        }}
      >
        <X size={12} />
      </button>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const CrisisAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [selectedSat, setSelectedSat] = useState(null);
  const [viewMode, setViewMode] = useState("3d");
  const [sliderDays, setSliderDays] = useState(0);
  const [impactSites, setImpactSites] = useState([]);
  const [groundTrack, setGroundTrack] = useState([]);
  const [multiPassTracks, setMultiPassTracks] = useState([]);
  const [livePosition, setLivePosition] = useState(null);
  const [predictionMode, setPredictionMode] = useState("15d");
  const [corridorAlert, setCorridorAlert] = useState(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [finalImpactFired, setFinalImpactFired] = useState(false);
  // Per-site impact alert cards — { POSSIBLE: {site, visible}, ... }
  const [impactAlerts, setImpactAlerts] = useState({});

  const liveIntervalRef = useRef(null);
  const sliderRafRef = useRef(null);
  const impactSitesRef = useRef([]);
  const selectedSatRef = useRef(null);
  const firedImpactAlerts = useRef(new Set());
  const globeCommandRef = useRef(null); // for sending zoom commands to globe

  useEffect(() => {
    impactSitesRef.current = impactSites;
  }, [impactSites]);
  useEffect(() => {
    selectedSatRef.current = selectedSat;
  }, [selectedSat]);

  // ─── Enrich orbital elements from TLE ────────────────────────────
  const enrichOE = (sat) => {
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
      } catch (e) {
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
  };

  // ─── Fetch alerts ─────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const data = await satelliteService.fetchData("Alerts");
        const list = Array.isArray(data) ? data : [];
        const filtered = list.filter(
          (s) =>
            Number(s.altitude || 9999) <= 300 ||
            Number(s.days_left || 9999) <= 60,
        );
        const enriched = filtered.map(enrichOE);
        setAlerts(
          enriched.sort(
            (a, b) => Number(a.days_left || 0) - Number(b.days_left || 0),
          ),
        );
      } catch (e) {
        console.error("fetchAlerts:", e);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Generate prediction ──────────────────────────────────────────
  const generatePrediction = useCallback((sat, mode) => {
    const hrs = mode === "6h" ? 6 : 360;
    const step = mode === "6h" ? 1 : 10;

    let track = TrajectoryEngine.generateGroundTrack(
      sat.tle_line1 || "",
      sat.tle_line2 || "",
      hrs,
      step,
    );
    if (track.length < 10) track = generateSyntheticTrack(sat, hrs, step);

    let passes = TrajectoryEngine.generateMultiPassTrack(
      sat.tle_line1 || "",
      sat.tle_line2 || "",
      hrs,
      2,
    );
    if (!passes?.length || passes.every((p) => !p?.length))
      passes = generateSyntheticPasses(sat, hrs);
    // Hard cap: max 2 pass tracks
    passes = passes.slice(0, 2);

    if (track.length < 10) track = generateSyntheticTrack(sat, 360, 10);

    let sites = TrajectoryEngine.getImpactSites(track);
    if (!sites || sites.length === 0) {
      const norad = Number(sat.norad_id || 1);
      const baseLat = Number(sat.lat || 0),
        baseLng = Number(sat.lng || 0);
      sites = [
        {
          lat: baseLat + 8 + (norad % 5),
          lng: baseLng + 20 + (norad % 30),
          color: "#3b82f6",
          label: "POSSIBLE",
          radius: 400000,
          region: "Atlantic Ocean",
        },
        {
          lat: baseLat + 4 + (norad % 3),
          lng: baseLng + 10 + (norad % 20),
          color: "#eab308",
          label: "SECONDARY",
          radius: 260000,
          region: "Pacific Region",
        },
        {
          lat: baseLat + (norad % 6) - 3,
          lng: baseLng + (norad % 15) - 7,
          color: "#ef4444",
          label: "PRIMARY",
          radius: 150000,
          region: "High Risk Zone",
        },
      ];
    }

    console.log(
      `[CrisisAlerts] ${sat.name}: track=${track.length}pts, passes=${passes.length}, sites=${sites.length}`,
    );
    return { track, sites, passes };
  }, []);

  const sliderDaysRef = useRef(0); // sync ref — always current sliderDays
  // Keep ref in sync
  useEffect(() => {
    sliderDaysRef.current = sliderDays;
  }, [sliderDays]);

  const [isPlaying, setIsPlaying] = useState(false);

  // ─── Animate slider slowly — satellite drifts along trajectory ────
  // 60 seconds total. Throttled to 12fps so globe doesn't thrash.
  // RAF loop measures real elapsed time → speed is wall-clock correct.
  const animateSlider = useCallback((maxVal) => {
    if (sliderRafRef.current) cancelAnimationFrame(sliderRafRef.current);
    const DURATION = 60000; // 60 s — slow drift across full trajectory
    const FPS_THROTTLE = 1000 / 12; // update React state max 12×/s
    const startVal = sliderDaysRef.current;
    let startWall = null;
    let lastFrameTime = 0;

    const tick = (now) => {
      if (!startWall) startWall = now;
      const elapsed = now - startWall;
      const p = Math.min(elapsed / DURATION, 1);
      // Ease-in — start slow, maintain steady pace
      const e =
        p < 0.05
          ? p * 20 * p // gentle ramp in
          : 0.05 + (p - 0.05) * (1 / 0.95); // linear after ramp
      const clamped = Math.min(e, 1);
      // Throttle state updates to 12fps to avoid React thrashing
      if (now - lastFrameTime >= FPS_THROTTLE) {
        const newVal = parseFloat(
          (startVal + (maxVal - startVal) * clamped).toFixed(4),
        );
        setSliderDays(newVal);
        sliderDaysRef.current = newVal;
        lastFrameTime = now;
      }
      if (p < 1) {
        sliderRafRef.current = requestAnimationFrame(tick);
      } else {
        setSliderDays(maxVal);
        sliderDaysRef.current = maxVal;
        setIsPlaying(false);
      }
    };
    setIsPlaying(true);
    sliderRafRef.current = requestAnimationFrame(tick);
  }, []);

  // ─── Select satellite ─────────────────────────────────────────────
  const handleSelectSat = useCallback(
    (sat) => {
      if (!sat?.name) return;
      const enriched = enrichOE(sat);
      setSelectedSat(enriched);
      selectedSatRef.current = enriched;
      setFinalImpactFired(false);
      setShowOverlay(false);
      setSliderDays(0); // Always start from 0
      setLivePosition(null);
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

      // Cap max days to satellite's actual days_left (or 15 if not set)
      const daysLeft = Number(enriched.days_left) || 15;
      const maxDays = predictionMode === "6h" ? 0.25 : Math.min(15, daysLeft);
      // Auto-start slow animation from 0 → maxDays
      setSliderDays(0);
      setTimeout(() => animateSlider(maxDays), 300);

      // Live SGP4 position tracking every 1s
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
    [predictionMode, generatePrediction, animateSlider],
  );

  // Cleanup
  useEffect(
    () => () => {
      if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
      if (sliderRafRef.current) cancelAnimationFrame(sliderRafRef.current);
    },
    [],
  );

  // Regenerate on mode change
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
    const daysLeft = Number(selectedSat.days_left) || 15;
    const maxDays = predictionMode === "6h" ? 0.25 : Math.min(15, daysLeft);
    setSliderDays(0);
    firedImpactAlerts.current = new Set();
    setImpactAlerts({});
    setFinalImpactFired(false);
    setTimeout(() => animateSlider(maxDays), 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predictionMode, selectedSat?.norad_id]);

  // Final impact — stop slider
  useEffect(() => {
    const daysLeft = Number(selectedSat?.days_left) || 15;
    const max = predictionMode === "6h" ? 0.25 : Math.min(15, daysLeft);
    if (selectedSat && sliderDays >= max * 0.99 && !finalImpactFired) {
      setFinalImpactFired(true);
      // Stop the animation at max
      if (sliderRafRef.current) cancelAnimationFrame(sliderRafRef.current);
      setSliderDays(max);
      satelliteService.sendFinalImpactAlert?.({
        ...selectedSat,
        lat: livePosition?.lat || selectedSat.lat,
        lng: livePosition?.lng || selectedSat.lng,
      });
    }
  }, [sliderDays, selectedSat, finalImpactFired, predictionMode]);

  // ── Per-site impact approach alerts ──────────────────────────────
  // Fires ONLY when satellite reaches near each impact zone (ratio ≥ 0.96+)
  // POSSIBLE fires first, then SECONDARY, then PRIMARY — staggered
  useEffect(() => {
    if (!selectedSat || !impactSites?.length) return;
    const daysLeft = Number(selectedSat.days_left) || 15;
    const max = predictionMode === "6h" ? 0.25 : Math.min(15, daysLeft);
    const ratio = max > 0 ? sliderDays / max : 0;
    // Only fire when satellite is NEAR the end of trajectory (close to impact)
    // Each site fires at a slightly different threshold so cards stack sequentially
    const thresholds = { POSSIBLE: 0.78, SECONDARY: 0.88, PRIMARY: 0.96 };
    impactSites.forEach((site) => {
      const thresh = thresholds[site.label] ?? 0.94;
      const key = `${selectedSat.norad_id}-${site.label}`;
      if (ratio >= thresh && !firedImpactAlerts.current.has(key)) {
        firedImpactAlerts.current.add(key);
        setImpactAlerts((prev) => ({
          ...prev,
          [site.label]: { site, visible: true },
        }));
        // Send zoom command to globe
        globeCommandRef.current = { type: "zoomSite", site, ts: Date.now() };
      }
    });
  }, [sliderDays, selectedSat, impactSites, predictionMode]);

  const daysLeft = Number(selectedSat?.days_left) || 15;
  const maxSlider = predictionMode === "6h" ? 0.25 : Math.min(15, daysLeft);
  const sliderStep = predictionMode === "6h" ? 0.005 : 0.1;

  // Trajectory colour: 0-3d red, 4-6d yellow, 7-15d green
  const trajectoryColor = useMemo(() => {
    if (sliderDays <= 3) return "#ef4444";
    if (sliderDays <= 6) return "#eab308";
    return "#00ff88";
  }, [sliderDays]);

  const sliderLabel = useMemo(() => {
    if (predictionMode === "6h")
      return `T+${(sliderDays * 24).toFixed(1)} Hours`;
    return `T+${sliderDays.toFixed(1)} Days`;
  }, [sliderDays, predictionMode]);

  const sliderBg = useMemo(() => {
    if (predictionMode === "6h")
      return "linear-gradient(90deg,#ef4444 0%,#ef4444 100%)";
    const r3 = (3 / 15) * 100,
      r6 = (6 / 15) * 100;
    return `linear-gradient(90deg, #ef4444 0%, #ef4444 ${r3}%, #eab308 ${r3}%, #eab308 ${r6}%, #00ff88 ${r6}%, #00ff88 100%)`;
  }, [predictionMode]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#020617",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes critBlink { 0%,100%{box-shadow:0 0 25px rgba(239,68,68,.7)} 50%{box-shadow:0 0 50px rgba(239,68,68,.3)} }
        @keyframes slideInRight { from{opacity:0;transform:translateX(48px)} to{opacity:1;transform:translateX(0)} }
        .traj-slider { -webkit-appearance:none; appearance:none; height:6px; border-radius:3px; outline:none; cursor:pointer; width:100%; }
        .traj-slider::-webkit-slider-thumb { -webkit-appearance:none; width:18px; height:18px; border-radius:50%; background:#fff; border:2px solid #06b6d4; cursor:pointer; box-shadow:0 0 10px rgba(6,182,212,.6); }
        .pred-btn { padding:6px 24px; font-size:9px; font-family:"Orbitron",sans-serif; font-weight:700; text-transform:uppercase; letter-spacing:.1em; cursor:pointer; border:none; transition:all .2s; }
      `}</style>

      {/* View toggle */}
      <div style={{ position: "absolute", top: 88, right: 20, zIndex: 45000 }}>
        <button
          onClick={() => setViewMode((v) => (v === "3d" ? "2d" : "3d"))}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(15,23,42,.75)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(6,182,212,.25)",
            borderRadius: 12,
            padding: "8px 20px",
            color: "#67e8f9",
            fontSize: 10,
            fontFamily: "'Orbitron',sans-serif",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".1em",
            cursor: "pointer",
          }}
        >
          {viewMode === "3d" ? "→ 2D Map" : "→ 3D Globe"}
        </button>
      </div>

      {/* Status badges */}
      <div
        style={{
          position: "absolute",
          top: 88,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 45000,
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        <div
          style={{
            background: "rgba(2,6,23,.75)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(6,182,212,.2)",
            borderRadius: 999,
            padding: "5px 16px",
            color: selectedSat ? "#06b6d4" : "#334155",
            fontSize: 9,
            fontFamily: "'Orbitron',sans-serif",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".2em",
          }}
        >
          {selectedSat ? "● Simulation Active" : "○ Standby"}
        </div>
        {selectedSat && (
          <div
            style={{
              border: `1px solid ${trajectoryColor}50`,
              padding: "5px 16px",
              borderRadius: 999,
              color: trajectoryColor,
              fontSize: 9,
              fontFamily: "'Orbitron',sans-serif",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".15em",
              background: trajectoryColor + "18",
            }}
          >
            {sliderDays <= 3
              ? "⚠ CRITICAL"
              : sliderDays <= 6
                ? "▲ HIGH RISK"
                : "● MONITORING"}{" "}
            — {sliderLabel}
          </div>
        )}
      </div>

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

      {/* Mission Console HUD */}
      <MissionConsole
        alerts={alerts}
        selectedSat={selectedSat}
        onSelectSat={handleSelectSat}
        impactSites={impactSites}
        livePosition={livePosition}
        sliderDays={sliderDays}
        setSliderDays={(v) => {
          if (sliderRafRef.current) cancelAnimationFrame(sliderRafRef.current);
          setIsPlaying(false);
          setSliderDays(v);
        }}
        maxSlider={maxSlider}
        sliderStep={sliderStep}
        sliderBg={sliderBg}
        sliderLabel={sliderLabel}
        predictionMode={predictionMode}
        setPredictionMode={setPredictionMode}
        isPlaying={isPlaying}
        onPlayPause={() => {
          if (isPlaying) {
            if (sliderRafRef.current)
              cancelAnimationFrame(sliderRafRef.current);
            setIsPlaying(false);
          } else {
            animateSlider(maxSlider);
          }
        }}
        trajectoryColor={trajectoryColor}
      />

      {/* ── Per-site impact approach alert cards (top-right, slide in) ── */}
      <div
        style={{
          position: "absolute",
          top: 110,
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

      {/* Legacy live GPS corridor alert */}
      {corridorAlert && (
        <div
          style={{
            position: "absolute",
            top: 130,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 48000,
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(10,10,20,.88)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(239,68,68,.5)",
            borderRadius: 999,
            padding: "8px 20px",
            boxShadow: "0 0 20px rgba(239,68,68,.3)",
          }}
        >
          <AlertTriangle
            size={13}
            style={{ color: "#ef4444" }}
            className="animate-pulse"
          />
          <span
            style={{
              color: "#f87171",
              fontSize: 11,
              fontFamily: "'Orbitron',sans-serif",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".15em",
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
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Instruction overlay */}
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
              padding: "40px 48px",
              borderRadius: 24,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                margin: "0 auto 20px",
                borderRadius: "50%",
                border: "2px solid rgba(6,182,212,.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <GlobeIcon size={26} style={{ color: "#06b6d4" }} />
            </div>
            <div
              style={{
                fontFamily: "'Orbitron',sans-serif",
                fontSize: 20,
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
                fontSize: 11,
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
  );
};

export default CrisisAlerts;
