import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  Search,
  X,
  ArrowLeft,
  Info,
  Activity,
  Clock,
  MapPin,
  Satellite,
  ChevronDown,
  Filter,
  TrendingDown,
  Crosshair,
  Navigation,
  Gauge,
  AlertTriangle,
  Radio,
  Target,
  Wifi,
} from "lucide-react";
import {
  MapContainer,
  Polyline,
  Polygon,
  Marker,
  CircleMarker,
  useMap,
  Tooltip,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import mapImg from "../assets/2dmap.jpg";
import { satelliteService } from "../services/api";

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const SEVERITY = {
  CRITICAL: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
    glow: "0 0 14px rgba(239,68,68,0.35)",
  },
  STABLE: {
    color: "#64748b",
    bg: "rgba(100,116,139,0.08)",
    border: "rgba(100,116,139,0.2)",
    glow: "none",
  },
};

const ALT_FILTERS = [
  { key: "ALL", label: "All", min: 0, max: 99999 },
  { key: "GT150", label: "> 150 km", min: 150, max: 99999 },
  { key: "150-200", label: "150-200", min: 150, max: 200 },
  { key: "200-300", label: "200-300", min: 200, max: 300 },
  { key: "300-400", label: "300-400", min: 300, max: 400 },
];

// Three impact zone colors
const IMPACT_ZONES_CONFIG = [
  { color: "#3b82f6", label: "ZONE-A", desc: "Early Intercept" },
  { color: "#eab308", label: "ZONE-B", desc: "Mid Corridor" },
  { color: "#ef4444", label: "ZONE-C", desc: "Terminal Impact" },
];

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const getLocationName = (lng, lat) => {
  const locations = [
    { name: "North Atlantic", minLat: 20, maxLat: 60, minLng: -60, maxLng: 0 },
    { name: "South Atlantic", minLat: -60, maxLat: 0, minLng: -40, maxLng: 10 },
    { name: "North Pacific", minLat: 20, maxLat: 60, minLng: 140, maxLng: 220 },
    { name: "South Pacific", minLat: -60, maxLat: 0, minLng: 140, maxLng: 220 },
    { name: "Indian Ocean", minLat: -40, maxLat: 20, minLng: 40, maxLng: 100 },
    {
      name: "Mediterranean Sea",
      minLat: 30,
      maxLat: 46,
      minLng: -5,
      maxLng: 40,
    },
    { name: "Arabian Sea", minLat: 5, maxLat: 25, minLng: 50, maxLng: 78 },
    { name: "Bay of Bengal", minLat: 5, maxLat: 22, minLng: 78, maxLng: 95 },
    {
      name: "South China Sea",
      minLat: 0,
      maxLat: 25,
      minLng: 100,
      maxLng: 120,
    },
    { name: "Arctic Ocean", minLat: 65, maxLat: 90, minLng: -180, maxLng: 180 },
    {
      name: "Southern Ocean",
      minLat: -90,
      maxLat: -60,
      minLng: -180,
      maxLng: 180,
    },
    { name: "Central Africa", minLat: -15, maxLat: 15, minLng: 10, maxLng: 40 },
    { name: "East Asia", minLat: 20, maxLat: 50, minLng: 100, maxLng: 140 },
    {
      name: "South America",
      minLat: -55,
      maxLat: 10,
      minLng: -80,
      maxLng: -35,
    },
    {
      name: "North America",
      minLat: 25,
      maxLat: 60,
      minLng: -130,
      maxLng: -60,
    },
    { name: "Europe", minLat: 35, maxLat: 70, minLng: -10, maxLng: 40 },
    { name: "Australia", minLat: -45, maxLat: -10, minLng: 110, maxLng: 155 },
    { name: "Central Asia", minLat: 30, maxLat: 55, minLng: 50, maxLng: 100 },
  ];
  for (const loc of locations) {
    if (
      lat >= loc.minLat &&
      lat <= loc.maxLat &&
      lng >= loc.minLng &&
      lng <= loc.maxLng
    )
      return loc.name;
  }
  return `${Math.abs(lat).toFixed(1)}${lat >= 0 ? "N" : "S"} ${Math.abs(lng).toFixed(1)}${lng >= 0 ? "E" : "W"}`;
};

const generateGroundTrack = (sat, hoursAhead = 6) => {
  const points = [];
  const norad = Number(sat.norad_id || 0);

  const inc =
    Number(sat.orbital_elements?.inclination_deg) || 20 + (norad % 70); // 20–90°
  const mm =
    Number(sat.orbital_elements?.mean_motion_rev_day) || 14 + (norad % 4) * 0.5; // 14–16 rev/day
  // Use norad_id as seed so satellites with missing elements still get unique tracks
  const ma0 =
    Number(sat.orbital_elements?.mean_anomaly_deg) || (norad * 137.508) % 360; // golden-angle spread
  const raan0 = Number(sat.orbital_elements?.raan_deg) || (norad * 97.3) % 360;

  const period = 1440 / mm;
  const steps = Math.floor((hoursAhead * 60) / 2);
  for (let i = 0; i <= steps; i++) {
    const t = i * 2;
    const angle = ((ma0 + (360 / period) * t) % 360) * (Math.PI / 180);
    const earthRot = (t / 1440) * 360;
    const incRad = inc * (Math.PI / 180);
    const lat = Math.asin(Math.sin(incRad) * Math.sin(angle)) * (180 / Math.PI);
    const lng =
      ((raan0 +
        Math.atan2(Math.cos(incRad) * Math.sin(angle), Math.cos(angle)) *
          (180 / Math.PI) -
        earthRot +
        540) %
        360) -
      180;
    points.push([lat, lng]);
  }
  return points;
};

const makeEllipse = (center, rx, ry, n = 40) => {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * 2 * Math.PI;
    pts.push([center[0] + ry * Math.sin(a), center[1] + rx * Math.cos(a)]);
  }
  return pts;
};

/* ─────────────────────────────────────────────
   SAT ICON
───────────────────────────────────────────── */
const createSatIcon = (color) =>
  L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:22px;height:22px;">
        <div style="position:absolute;inset:-6px;border-radius:50%;background:${color};opacity:0.18;animation:dfPulse 1.8s ease-in-out infinite;"></div>
        <div style="position:absolute;inset:-2px;border-radius:50%;border:1px solid ${color};opacity:0.35;animation:dfPulse 2.4s ease-in-out infinite 0.6s;"></div>
        <div style="width:22px;height:22px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 14px ${color}90;display:flex;align-items:center;justify-content:center;">
          <div style="width:6px;height:6px;background:#fff;border-radius:50%;"></div>
        </div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

/* ─────────────────────────────────────────────
   Inject critical Leaflet overrides into <head>
   at module-load time — BEFORE Leaflet's own CSS
   can set background:#ddd on .leaflet-container.
   Inline style on MapContainer also overrides it.
───────────────────────────────────────────── */
if (typeof document !== "undefined") {
  const id = "df-leaflet-override";
  if (!document.getElementById(id)) {
    const s = document.createElement("style");
    s.id = id;
    s.textContent =
      ".leaflet-container{background:transparent!important;}" +
      ".leaflet-tooltip{background:rgba(2,6,23,0.96)!important;" +
      "border:1px solid rgba(255,255,255,0.08)!important;" +
      "color:#94a3b8!important;border-radius:7px!important;" +
      "padding:3px 8px!important;}";
    document.head.appendChild(s);
  }
}

/* ─────────────────────────────────────────────
   MapSync — locks Leaflet to full-world view
───────────────────────────────────────────── */
const MapSync = () => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize({ animate: false });
    const zoom = map.getBoundsZoom(
      [
        [-90, -180],
        [90, 180],
      ],
      false,
    );
    map.setView([0, 0], zoom, { animate: false });
    map.setMinZoom(zoom);
    map.setMaxZoom(zoom); // lock — no zoom allowed
    map.setMaxBounds([
      [-90, -180],
      [90, 180],
    ]);
  }, [map]);
  return null;
};

/* ─────────────────────────────────────────────
   WorldMap — wraps a MapContainer with a plain
   <img> background so the map always fills 100%
   of its container with zero grey gaps.
   Children = Leaflet layers (polylines, markers).
   The parent must be position:relative with a
   defined height (flex-1 or explicit px).
───────────────────────────────────────────── */
const WorldMap = ({ children, mapRef: extRef }) => (
  /* This div is position:absolute inset:0 so it always fills
     whatever positioned parent wraps it */
  <div style={{ position: "absolute", inset: 0 }}>
    {/* Background image — CSS sized, always fills, no Leaflet involvement */}
    <img
      src={mapImg}
      alt=""
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "fill" /* fill = stretch to exact container size, no bars */,
        opacity: 0.72,
        pointerEvents: "none",
        userSelect: "none",
        zIndex: 0,
        display: "block",
      }}
    />
    {/* Leaflet overlay — transparent bg, only draws markers + polylines */}
    <MapContainer
      center={[0, 0]}
      zoom={2}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        background: "transparent" /* inline beats any CSS class */,
        backgroundColor: "transparent",
        zIndex: 1,
      }}
      attributionControl={false}
      zoomControl={false}
      scrollWheelZoom={false}
      touchZoom={false}
      doubleClickZoom={false}
      dragging={false}
      keyboard={false}
      maxBoundsViscosity={1.0}
      whenReady={(e) => {
        if (extRef) extRef.current = e.target;
      }}
    >
      <MapSync />
      {children}
    </MapContainer>
  </div>
);

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
const DecayForecast = () => {
  const [allSatellites, setAllSatellites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [altFilter, setAltFilter] = useState("ALL");
  const [selectedSat, setSelectedSat] = useState(null);
  const [sliderHours, setSliderHours] = useState(0);
  const [showOrbitalPanel, setShowOrbitalPanel] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [displayPos, setDisplayPos] = useState({ lat: 0, lng: 0 });
  const displayPosRef = useRef({ lat: 0, lng: 0 });
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const mapRef = useRef(null);
  const mapBounds = [
    [-90, -180],
    [90, 180],
  ];

  /* ── Fetch ── */
  const fetchSatellites = useCallback(async () => {
    try {
      const data = await satelliteService.fetchData("Satellites");
      if (Array.isArray(data)) setAllSatellites(data);
      else if (data?.satellites && Array.isArray(data.satellites))
        setAllSatellites(data.satellites);
      else setAllSatellites([]);
    } catch {
      setAllSatellites([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSatellites();
    const iv = setInterval(fetchSatellites, 60000);
    return () => clearInterval(iv);
  }, [fetchSatellites]);

  /* ── Filtered list ── */
  const filteredSatellites = useMemo(() => {
    let list = allSatellites;
    const preset = ALT_FILTERS.find((f) => f.key === altFilter);
    if (preset && preset.key !== "ALL") {
      list = list.filter((s) => {
        const alt = Number(s.altitude || 0);
        return alt >= preset.min && alt <= preset.max;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          (s.name || "").toLowerCase().includes(q) ||
          String(s.norad_id || "").includes(q),
      );
    }
    return list;
  }, [allSatellites, altFilter, searchQuery]);

  /* ── Ground track ── */
  const groundTrack = useMemo(() => {
    if (!selectedSat) return [];
    return generateGroundTrack(selectedSat, 6);
  }, [selectedSat]);

  /* ── Satellite position from slider ── */
  const satPosition = useMemo(() => {
    if (!groundTrack.length) return null;
    const fraction = sliderHours / 6;
    const idx = Math.min(
      Math.floor(fraction * (groundTrack.length - 1)),
      groundTrack.length - 1,
    );
    return groundTrack[idx] || groundTrack[0];
  }, [groundTrack, sliderHours]);

  /* ── Smooth display position: lerp on a 500ms interval for slow, readable drift ── */
  useEffect(() => {
    if (!satPosition) return;
    const LERP = 0.08; // smooth but slow — takes several ticks to reach target
    const iv = setInterval(() => {
      const target = { lat: satPosition[0], lng: satPosition[1] };
      displayPosRef.current = {
        lat:
          displayPosRef.current.lat +
          (target.lat - displayPosRef.current.lat) * LERP,
        lng:
          displayPosRef.current.lng +
          (target.lng - displayPosRef.current.lng) * LERP,
      };
      setDisplayPos({ ...displayPosRef.current });
    }, 500);
    return () => clearInterval(iv);
  }, [satPosition]);

  /* ── Three impact zones — unique per satellite via actual orbital elements ── */
  const impactZones = useMemo(() => {
    if (!selectedSat || groundTrack.length < 4) return [];
    const len = groundTrack.length;
    const orb = selectedSat.orbital_elements || {};

    // Use orbital parameters as unique seeds so each debris object
    // gets its own distinct corridor geometry and position offsets
    const inc = Number(
      orb.inclination_deg || selectedSat.norad_id % 90 || 51.6,
    );
    const raan = Number(orb.raan_deg || (selectedSat.norad_id * 7) % 360 || 0);
    const ma = Number(
      orb.mean_anomaly_deg || (selectedSat.norad_id * 13) % 360 || 0,
    );
    const mm = Number(orb.mean_motion_rev_day || 15.5);

    // Deterministic offsets seeded by this satellite's elements
    const seedA = (inc * 1.3 + raan * 0.7) % 1.0; // 0–1
    const seedB = (raan * 1.1 + ma * 0.9) % 1.0;
    const seedC = (ma * 1.7 + mm * 11.3) % 1.0;

    // Corridor widths vary by eccentricity/inclination proxy
    const baseRx = 4 + (inc / 90) * 4; // 4–8 degrees wide
    const baseRy = baseRx * 0.6;

    // Place the three zones at unique fractional positions along the track
    // seeded per-satellite so they're never all at the same 50/75/100%
    const fracA = 0.35 + seedA * 0.2; // 35–55%
    const fracB = 0.58 + seedB * 0.17; // 58–75%
    const fracC = 0.8 + seedC * 0.15; // 80–95%

    const idxA = Math.min(Math.floor(fracA * (len - 1)), len - 1);
    const idxB = Math.min(Math.floor(fracB * (len - 1)), len - 1);
    const idxC = Math.min(Math.floor(fracC * (len - 1)), len - 1);

    return [
      {
        pt: groundTrack[idxA],
        cfg: IMPACT_ZONES_CONFIG[0],
        rx: baseRx * 0.7,
        ry: baseRy * 0.7,
        orx: baseRx * 1.5,
        ory: baseRy * 1.5,
      },
      {
        pt: groundTrack[idxB],
        cfg: IMPACT_ZONES_CONFIG[1],
        rx: baseRx * 0.85,
        ry: baseRy * 0.85,
        orx: baseRx * 1.8,
        ory: baseRy * 1.8,
      },
      {
        pt: groundTrack[idxC],
        cfg: IMPACT_ZONES_CONFIG[2],
        rx: baseRx,
        ry: baseRy,
        orx: baseRx * 2.2,
        ory: baseRy * 2.2,
      },
    ].map((z) => ({
      ...z,
      inner: makeEllipse(z.pt, z.rx, z.ry),
      outer: makeEllipse(z.pt, z.orx, z.ory),
    }));
  }, [selectedSat, groundTrack]);

  /* ── Track segments:
       - Default: full static ground track (never auto-moves)
       - During manual drag: show trail behind + bright path ahead
         (prediction updates only when user is actively dragging)
  ── */
  const visibleTrack = useMemo(() => {
    if (!groundTrack.length) return { full: [], ahead: [], behind: [] };
    const fraction = sliderHours / 6;
    const currentIdx = Math.min(
      Math.floor(fraction * (groundTrack.length - 1)),
      groundTrack.length - 1,
    );
    return {
      full: groundTrack,
      ahead: groundTrack.slice(currentIdx),
      behind: groundTrack.slice(0, currentIdx + 1),
    };
  }, [groundTrack, sliderHours]);
  const predictionText = useMemo(() => {
    if (!satPosition) return null;
    const loc = getLocationName(satPosition[1], satPosition[0]);
    const h = Math.floor(sliderHours);
    const m = Math.floor((sliderHours - h) * 60);
    const s = Math.floor(((sliderHours - h) * 60 - m) * 60);
    return {
      location: loc,
      timeOffset: `T+${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
    };
  }, [satPosition, sliderHours]);

  /* ── Auto-animation: very slow real-time orbital crawl, pauses on drag ── */
  useEffect(() => {
    if (!selectedSat || !groundTrack.length) return;
    // Advance 0.002 hours every 1000ms → full 6h cycle takes 50 real minutes
    // This mimics real satellite motion visually (very slow, smooth)
    const iv = setInterval(() => {
      if (!isDraggingRef.current) {
        setSliderHours((prev) => {
          const next = prev + 0.002;
          return next >= 6 ? 0 : next;
        });
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [selectedSat, groundTrack]);

  /* ── Helpers ── */
  const getDecayBadge = (sat) => {
    const alt = Number(sat.altitude || 0);
    if (alt < 150)
      return { text: "CRITICAL", color: "#ef4444", key: "CRITICAL" };
    return { text: "STABLE", color: "#64748b", key: "STABLE" };
  };

  const handleSelectSatellite = (sat) => {
    setSelectedSat(sat);
    setSliderHours(0);
    setShowOrbitalPanel(false);
    const initPos = { lat: Number(sat.lat || 0), lng: Number(sat.lng || 0) };
    displayPosRef.current = initPos;
    setDisplayPos(initPos);
  };

  const handleBack = () => {
    setSelectedSat(null);
    setShowOrbitalPanel(false);
    setSliderHours(0);
  };

  const sevKey = selectedSat
    ? Number(selectedSat.altitude) < 150
      ? "CRITICAL"
      : "STABLE"
    : "STABLE";
  const sevColor = SEVERITY[sevKey].color;

  /* ─────────────────────────────────────────────

  /* ─────────────────────────────────────────────
     DERIVED VALUES  (hoisted — safe when selectedSat is null)
  ───────────────────────────────────────────── */
  const orb = selectedSat?.orbital_elements || {};
  const altKm = Number(selectedSat?.altitude || 400);
  const RE = 6371;
  const mu = 3.986004418e14;

  const mmVal =
    Number(orb.mean_motion_rev_day) ||
    (86400 / (2 * Math.PI)) * Math.sqrt(mu / Math.pow((RE + altKm) * 1000, 3));
  const mmDisplay = Number(orb.mean_motion_rev_day) || mmVal.toFixed(4);

  const nRad = (mmVal * 2 * Math.PI) / 86400;
  const aM = Math.pow(mu / (nRad * nRad), 1 / 3);
  const smaKm = Number(orb.semi_major_axis_km) || (aM / 1000).toFixed(2);

  const eccDisplay =
    orb.eccentricity != null ? Number(orb.eccentricity).toFixed(6) : "0.0001";

  const incDeg = Number(orb.inclination_deg) || 51.6;
  const incDisplay = Number(orb.inclination_deg)
    ? Number(orb.inclination_deg).toFixed(4)
    : incDeg.toFixed(4);

  const raanDisplay = Number(orb.raan_deg)
    ? Number(orb.raan_deg).toFixed(4)
    : ((selectedSat?.norad_id * 137.5) % 360 || 0).toFixed(4);

  const argPDisplay = Number(orb.arg_perigee_deg)
    ? Number(orb.arg_perigee_deg).toFixed(4)
    : ((selectedSat?.norad_id * 73.1) % 360 || 0).toFixed(4);

  const maDisplay = Number(orb.mean_anomaly_deg)
    ? Number(orb.mean_anomaly_deg).toFixed(4)
    : ((selectedSat?.norad_id * 47.3) % 360 || 0).toFixed(4);

  const velocity = ((2 * Math.PI * aM) / (86400 / mmVal) / 1000).toFixed(2);

  const timeWindowValue = (() => {
    if (!selectedSat) return "—";
    const s = selectedSat.reentry_window_start;
    const e = selectedSat.reentry_window_end;
    if (s && e) {
      const sd = s.slice(0, 10),
        ed = e.slice(0, 10);
      return sd === ed ? sd : `${sd} to ${ed}`;
    }
    if (s) return s.slice(0, 10);
    const daysLeft = Number(selectedSat.days_left) || 180;
    const now = new Date();
    const startDate = new Date(now.getTime() + (daysLeft - 14) * 86400000);
    const endDate = new Date(now.getTime() + (daysLeft + 14) * 86400000);
    return `${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`;
  })();

  const reentryStart = (() => {
    if (!selectedSat) return "—";
    if (selectedSat.reentry_window_start)
      return selectedSat.reentry_window_start.slice(0, 16).replace("T", " ");
    const daysLeft = Number(selectedSat.days_left) || 180;
    const d = new Date(Date.now() + (daysLeft - 14) * 86400000);
    return d.toISOString().slice(0, 16).replace("T", " ") + " (est.)";
  })();

  const reentryEnd = (() => {
    if (!selectedSat) return "—";
    if (selectedSat.reentry_window_end)
      return selectedSat.reentry_window_end.slice(0, 16).replace("T", " ");
    const daysLeft = Number(selectedSat.days_left) || 180;
    const d = new Date(Date.now() + (daysLeft + 14) * 86400000);
    return d.toISOString().slice(0, 16).replace("T", " ") + " (est.)";
  })();

  const sKey = selectedSat
    ? Number(selectedSat.altitude) < 150
      ? "CRITICAL"
      : "STABLE"
    : "STABLE";

  /* ═══════════════════════════════════════════════════════
     SINGLE UNIFIED RENDER — map is ALWAYS mounted.
     Both the default list view and selected-satellite view
     share exactly one <WorldMap> instance.  Selecting a
     satellite never unmounts/remounts the map; it only
     changes which overlay panels are visible.
  ═══════════════════════════════════════════════════════ */
  return (
    <div
      className="h-full w-full flex overflow-hidden"
      style={{ background: "#020617" }}
    >
      {/* ══════════════════════════════════════
          LEFT SIDEBAR
          — shows full list when nothing selected
          — shows mini list + back button when sat selected
         ══════════════════════════════════════ */}
      <div
        className="shrink-0 flex flex-col overflow-hidden"
        style={{
          width: selectedSat ? "235px" : "290px",
          background: "rgba(2,6,23,0.98)",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          transition: "width 0.25s ease",
        }}
      >
        {/* ── Header ── */}
        <div
          className="px-3 py-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          {selectedSat ? (
            /* Selected-state header: back button + mini status */
            <>
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 mb-3 group"
              >
                <div
                  className="p-1 rounded"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <ArrowLeft
                    size={11}
                    className="text-slate-500 group-hover:text-white transition-colors"
                  />
                </div>
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest group-hover:text-slate-300 transition-colors">
                  Back
                </span>
              </button>
              <div className="flex items-center gap-1.5 mb-0.5">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: "#22c55e",
                    boxShadow: "0 0 5px #22c55e",
                    animation: "pulse 2s infinite",
                  }}
                />
                <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">
                  Decay Forecast
                </span>
              </div>
              <p className="text-[6px] text-slate-700 font-mono">
                {allSatellites.length} objects tracked
              </p>
            </>
          ) : (
            /* Default header: module title */
            <div className="flex items-center gap-2 mb-0">
              <div
                className="p-1.5 rounded-lg"
                style={{
                  background: "rgba(6,182,212,0.08)",
                  border: "1px solid rgba(6,182,212,0.12)",
                }}
              >
                <TrendingDown size={15} className="text-cyan-400" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase italic tracking-tight">
                  Decay Forecast
                </h2>
                <p className="text-[6.5px] text-slate-700 font-mono uppercase tracking-widest">
                  {allSatellites.length} objects in database
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Search ── */}
        <div
          className={
            selectedSat ? "px-2 py-2 shrink-0" : "px-4 pt-3 pb-2 shrink-0"
          }
        >
          <div className="relative">
            <Search
              size={selectedSat ? 9 : 10}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                selectedSat ? "Search..." : "Search name or NORAD ID..."
              }
              className="w-full py-1.5 rounded-xl text-[9px] text-white placeholder:text-slate-700 focus:outline-none font-mono"
              style={{
                paddingLeft: "22px",
                paddingRight: searchQuery ? "24px" : "8px",
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = "rgba(6,182,212,0.3)")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = "rgba(255,255,255,0.06)")
              }
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white"
              >
                <X size={10} />
              </button>
            )}
          </div>
        </div>

        {/* ── Altitude filters (default view only) ── */}
        {!selectedSat && (
          <div className="px-4 pb-2 shrink-0">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1 text-[6.5px] font-black text-slate-600 uppercase tracking-widest hover:text-slate-400 transition-colors mb-1"
            >
              <Filter size={8} />
              Altitude Range
              <ChevronDown
                size={8}
                className={`transition-transform ${showFilters ? "rotate-180" : ""}`}
              />
            </button>
            {showFilters && (
              <div className="flex flex-wrap gap-1">
                {ALT_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setAltFilter(f.key)}
                    className="px-2 py-0.5 rounded-lg text-[6.5px] font-black uppercase transition-all"
                    style={{
                      background:
                        altFilter === f.key
                          ? "rgba(6,182,212,0.1)"
                          : "rgba(0,0,0,0.35)",
                      border: `1px solid ${altFilter === f.key ? "rgba(6,182,212,0.3)" : "rgba(255,255,255,0.05)"}`,
                      color: altFilter === f.key ? "#06b6d4" : "#475569",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Satellite list ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2.5 pb-2.5 pt-1 space-y-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Activity className="w-5 h-5 text-cyan-500 animate-pulse" />
              <p className="text-[7px] text-slate-700 mt-2 uppercase tracking-widest">
                Loading...
              </p>
            </div>
          ) : filteredSatellites.length === 0 ? (
            <p className="text-center py-10 text-slate-700 text-[8px] uppercase tracking-widest font-bold">
              No matches
            </p>
          ) : (
            filteredSatellites.map((sat, idx) => {
              const decay = getDecayBadge(sat);
              const sev = SEVERITY[decay.key];
              const isActive = selectedSat?.norad_id === sat.norad_id;
              return (
                <button
                  key={sat.norad_id || idx}
                  onClick={() => handleSelectSatellite(sat)}
                  className="w-full text-left p-2.5 rounded-xl border transition-all duration-150"
                  style={{
                    background: isActive ? `${sev.color}10` : sev.bg,
                    borderColor: isActive ? `${sev.color}40` : sev.border,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${sev.color}45`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = isActive
                      ? `${sev.color}40`
                      : sev.border;
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
                        style={{ background: sev.color }}
                      />
                      <span className="text-white font-black text-[9.5px] uppercase italic tracking-tight truncate max-w-[130px]">
                        {sat.name || "Unknown"}
                      </span>
                    </div>
                    <span
                      className="text-[6px] font-black px-1.5 py-0.5 rounded-full shrink-0"
                      style={{
                        background: `${decay.color}12`,
                        color: decay.color,
                      }}
                    >
                      {decay.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[7px] font-mono text-slate-600 ml-3">
                    <span>{sat.norad_id}</span>
                    <span className="text-slate-700">|</span>
                    <span>{sat.altitude} km</span>
                    <span className="text-slate-700">|</span>
                    <span style={{ color: sev.color }}>{sat.days_left}d</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════
          RIGHT AREA  — always contains the map.
          Top bar + slider only show when selected.
         ══════════════════════════════════════ */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ minWidth: 0 }}
      >
        {/* ── Top status bar (selected sat only) ── */}
        {selectedSat && (
          <div
            className="shrink-0 flex items-center justify-between px-4 py-2.5"
            style={{
              background: "rgba(2,6,23,0.96)",
              borderBottom: `1px solid ${sevColor}20`,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-2.5 h-2.5 rounded-full animate-pulse"
                style={{
                  background: sevColor,
                  boxShadow: `0 0 8px ${sevColor}`,
                }}
              />
              <div>
                <span className="text-white font-black text-sm uppercase tracking-tight italic">
                  {selectedSat.name}
                </span>
                <span className="text-[8px] font-mono text-slate-600 ml-2 uppercase">
                  NORAD: {selectedSat.norad_id}
                </span>
              </div>
              <div
                className="px-2 py-0.5 rounded-full text-[7px] font-black uppercase"
                style={{
                  background: `${sevColor}12`,
                  color: sevColor,
                  border: `1px solid ${sevColor}25`,
                }}
              >
                {sKey}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[8px] font-mono font-bold text-green-400 uppercase tracking-wider">
                  Live
                </span>
              </div>
              <button
                onClick={() => setShowOrbitalPanel(!showOrbitalPanel)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all"
                style={{
                  background: showOrbitalPanel
                    ? `${sevColor}18`
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${showOrbitalPanel ? `${sevColor}35` : "rgba(255,255,255,0.07)"}`,
                  color: showOrbitalPanel ? sevColor : "#475569",
                }}
              >
                <Info size={10} />
                Orbital Details
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            MAP AREA — position:relative so WorldMap
            (position:absolute inset:0) fills it.
            This div is ALWAYS rendered; the map
            is NEVER conditionally unmounted.
           ══════════════════════════════════════ */}
        <div className="flex-1 relative overflow-hidden">
          {/* ─── THE ONE AND ONLY MAP ─── */}
          <WorldMap mapRef={mapRef}>
            {/* All satellites as dot markers (always visible) */}
            {allSatellites.map((sat, idx) => {
              const isCritical = Number(sat.altitude || 0) < 150;
              const sv = SEVERITY[isCritical ? "CRITICAL" : "STABLE"];
              const lat = Number(sat.lat);
              const lng = Number(sat.lng);
              if (!lat && !lng) return null;
              // When a satellite is selected, dim all others slightly
              const isSelected = selectedSat?.norad_id === sat.norad_id;
              const opacity = selectedSat && !isSelected ? 0.3 : 0.85;
              return (
                <CircleMarker
                  key={sat.norad_id || idx}
                  center={[lat, lng]}
                  radius={isCritical ? 5 : 3}
                  pathOptions={{
                    color: sv.color,
                    fillColor: sv.color,
                    fillOpacity: opacity,
                    opacity: opacity,
                    weight: isSelected ? 2 : 1,
                  }}
                  eventHandlers={{ click: () => handleSelectSatellite(sat) }}
                >
                  <Tooltip direction="top" offset={[0, -4]} opacity={0.93}>
                    <span style={{ fontFamily: "monospace", fontSize: "9px" }}>
                      {sat.name || "Object"} ·{" "}
                      {isCritical ? "CRITICAL" : "STABLE"}
                    </span>
                  </Tooltip>
                </CircleMarker>
              );
            })}

            {/* ── Trajectory overlays (only when sat selected) ── */}
            {selectedSat && (
              <>
                {/* Ground track */}
                {isDragging ? (
                  <>
                    {visibleTrack.behind.length > 1 && (
                      <Polyline
                        positions={visibleTrack.behind}
                        pathOptions={{
                          color: sevColor,
                          weight: 0.6,
                          opacity: 0.18,
                          dashArray: "4 6",
                        }}
                      />
                    )}
                    {visibleTrack.ahead.length > 1 && (
                      <Polyline
                        positions={visibleTrack.ahead}
                        pathOptions={{
                          color: sevColor,
                          weight: 0.8,
                          opacity: 0.75,
                          dashArray: "6 4",
                        }}
                      />
                    )}
                  </>
                ) : (
                  visibleTrack.full.length > 1 && (
                    <Polyline
                      positions={visibleTrack.full}
                      pathOptions={{
                        color: sevColor,
                        weight: 0.7,
                        dashArray: "6 5",
                        opacity: 0.5,
                      }}
                    />
                  )
                )}

                {/* Three impact zones */}
                {impactZones.map((zone, i) => (
                  <React.Fragment key={i}>
                    <Polygon
                      positions={zone.outer}
                      pathOptions={{
                        color: zone.cfg.color,
                        weight: 1,
                        fillColor: zone.cfg.color,
                        fillOpacity: 0.05,
                        dashArray: "3 4",
                        opacity: 0.35,
                      }}
                    />
                    <Polygon
                      positions={zone.inner}
                      pathOptions={{
                        color: zone.cfg.color,
                        weight: 1.5,
                        fillColor: zone.cfg.color,
                        fillOpacity: 0.14,
                        opacity: 0.65,
                      }}
                    />
                    <CircleMarker
                      center={zone.pt}
                      radius={4}
                      pathOptions={{
                        color: zone.cfg.color,
                        fillColor: zone.cfg.color,
                        fillOpacity: 0.75,
                        weight: 1.5,
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -7]} opacity={0.93}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: "9px",
                            fontWeight: "bold",
                            color: zone.cfg.color,
                          }}
                        >
                          {zone.cfg.label} — {zone.cfg.desc}
                        </span>
                      </Tooltip>
                    </CircleMarker>
                  </React.Fragment>
                ))}

                {/* Selected satellite marker */}
                {satPosition && (
                  <Marker
                    position={satPosition}
                    icon={createSatIcon(sevColor)}
                  />
                )}
              </>
            )}
          </WorldMap>

          {/* ══════════════════════════════════════
              FLOATING OVERLAYS
              All are positioned absolute over the map.
              Default-view overlays: title card, count badge, legend.
              Selected-view overlays: prediction panels, position, corridors.
             ══════════════════════════════════════ */}

          {/* ── DEFAULT VIEW: title card (top-left) ── */}
          {!selectedSat && (
            <div
              className="absolute top-3 left-3 z-[1000] px-3 py-2.5 rounded-xl"
              style={{
                background: "rgba(2,6,23,0.92)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <Satellite size={12} className="text-cyan-400" />
                <span className="text-[10px] font-black text-white uppercase tracking-wide italic">
                  Global Decay Watch
                </span>
              </div>
              <p className="text-[6.5px] text-slate-700 font-mono uppercase tracking-widest">
                Select a satellite to view trajectory
              </p>
            </div>
          )}

          {/* ── DEFAULT VIEW: live count badge (bottom-left) ── */}
          {!selectedSat && (
            <div
              className="absolute bottom-3 left-3 z-[1000] px-3 py-2 rounded-xl flex items-center gap-2"
              style={{
                background: "rgba(2,6,23,0.92)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[7.5px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                {allSatellites.length} Objects · Live
              </span>
            </div>
          )}

          {/* ── DEFAULT VIEW: decay legend (bottom-right) ── */}
          {!selectedSat && (
            <div
              className="absolute bottom-3 right-3 z-[1000] px-3 py-2.5 rounded-xl"
              style={{
                background: "rgba(2,6,23,0.92)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p className="text-[6px] font-black text-slate-700 uppercase tracking-widest mb-1.5">
                Decay Status
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span className="text-[6.5px] text-slate-500 uppercase font-bold">
                    Critical — alt &lt; 150 km
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  <span className="text-[6.5px] text-slate-500 uppercase font-bold">
                    Stable — alt ≥ 150 km
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ── SELECTED VIEW: top-centre location + time badge ── */}
          {selectedSat && predictionText && (
            <div
              className="absolute top-3 z-[1000] flex items-center gap-3 px-4 py-2 rounded-xl"
              style={{
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(2,6,23,0.92)",
                backdropFilter: "blur(14px)",
                border: `1px solid ${sevColor}25`,
                boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
              }}
            >
              <MapPin size={11} style={{ color: sevColor }} />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                Over:
              </span>
              <span className="text-[10px] font-black text-white">
                {predictionText.location}
              </span>
              <div className="w-px h-4 bg-white/10" />
              <Clock size={10} className="text-slate-500" />
              <span
                className="text-[9px] font-mono font-black"
                style={{ color: sevColor }}
              >
                {predictionText.timeOffset}
              </span>
            </div>
          )}

          {/* ── SELECTED VIEW: left panel — Prediction Data ── */}
          {selectedSat && (
            <div
              className="absolute top-14 left-3 z-[1000] rounded-xl overflow-hidden"
              style={{
                width: "185px",
                background: "rgba(2,6,23,0.93)",
                backdropFilter: "blur(16px)",
                border: `1px solid ${sevColor}18`,
              }}
            >
              <div
                className="px-3 py-2 flex items-center gap-2"
                style={{
                  borderBottom: `1px solid ${sevColor}12`,
                  background: `${sevColor}06`,
                }}
              >
                <Target size={9} style={{ color: sevColor }} />
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.15em]">
                  Prediction Data
                </span>
              </div>
              <div className="px-3 py-2 space-y-1.5">
                {[
                  {
                    label: "Satellite",
                    value: selectedSat.name,
                    icon: <Satellite size={8} />,
                  },
                  {
                    label: "NORAD",
                    value: selectedSat.norad_id,
                    icon: <Crosshair size={8} />,
                  },
                  {
                    label: "Altitude",
                    value: `${selectedSat.altitude} km`,
                    icon: <Navigation size={8} />,
                  },
                  {
                    label: "Velocity",
                    value: `${velocity} km/s`,
                    icon: <Gauge size={8} />,
                  },
                  {
                    label: "Re-Entry",
                    value: `${selectedSat.days_left} days`,
                    icon: <TrendingDown size={8} />,
                  },
                  {
                    label: "Time Window",
                    value: timeWindowValue,
                    icon: <Clock size={8} />,
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-slate-600">
                      {item.icon}
                      <span className="text-[6.5px] font-bold uppercase tracking-wider">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-[7.5px] font-mono font-bold text-white truncate max-w-[82px] text-right">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SELECTED VIEW: left-bottom — Impact Corridors ── */}
          {selectedSat && (
            <div
              className="absolute left-3 z-[1000] rounded-xl overflow-hidden"
              style={{
                bottom: "12px",
                width: "185px",
                background: "rgba(2,6,23,0.93)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                className="px-3 py-2 flex items-center gap-2"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
              >
                <AlertTriangle size={9} className="text-yellow-400" />
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.15em]">
                  Impact Corridors
                </span>
              </div>
              <div className="px-3 py-2 space-y-2">
                {impactZones.map((zone, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-2"
                  >
                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: zone.cfg.color,
                          boxShadow: `0 0 5px ${zone.cfg.color}60`,
                        }}
                      />
                      <span
                        className="text-[6.5px] font-black uppercase tracking-wider"
                        style={{ color: zone.cfg.color }}
                      >
                        {zone.cfg.label}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-[6.5px] font-mono text-slate-300 leading-tight">
                        {getLocationName(zone.pt[1], zone.pt[0])}
                      </p>
                      <p className="text-[6px] font-mono text-slate-600">
                        {zone.pt[0].toFixed(2)}, {zone.pt[1].toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SELECTED VIEW: right — Live Position (hover-reveal) ── */}
          {selectedSat && (
            <div
              className="absolute top-3 right-3 z-[1000] df-right-panel"
              style={{ pointerEvents: "all" }}
            >
              <div
                className="df-panel-icon flex items-center justify-center rounded-xl cursor-pointer transition-all"
                style={{
                  width: "36px",
                  height: "36px",
                  background: "rgba(2,6,23,0.93)",
                  backdropFilter: "blur(16px)",
                  border: `1px solid ${sevColor}35`,
                  boxShadow: `0 0 10px ${sevColor}20`,
                }}
              >
                <Wifi size={14} style={{ color: sevColor }} />
              </div>
              <div
                className="df-panel-content absolute top-0 right-10 rounded-xl overflow-hidden"
                style={{
                  width: "192px",
                  background: "rgba(2,6,23,0.97)",
                  backdropFilter: "blur(20px)",
                  border: `1px solid ${sevColor}25`,
                  boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${sevColor}15`,
                  transformOrigin: "top right",
                }}
              >
                <div
                  className="px-3 py-2 flex items-center justify-between"
                  style={{
                    borderBottom: `1px solid ${sevColor}12`,
                    background: `${sevColor}08`,
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <Wifi size={9} style={{ color: sevColor }} />
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-[0.15em]">
                      Live Position
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[6px] font-mono text-green-400">
                      SYNC
                    </span>
                  </div>
                </div>
                <div className="px-3 py-2.5 space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[6px] font-black text-slate-600 uppercase tracking-widest">
                        Latitude
                      </span>
                      <span className="text-[6px] font-mono text-slate-600">
                        {satPosition
                          ? satPosition[0] >= 0
                            ? "NORTH"
                            : "SOUTH"
                          : ""}
                      </span>
                    </div>
                    <p
                      className="text-[18px] font-mono font-black italic leading-none tabular-nums"
                      style={{ color: sevColor }}
                    >
                      {displayPos.lat.toFixed(5)}
                      <span className="text-[11px]">°</span>
                    </p>
                    <div
                      className="w-full h-px mt-1"
                      style={{
                        background: `linear-gradient(to right, ${sevColor}50, transparent)`,
                      }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[6px] font-black text-slate-600 uppercase tracking-widest">
                        Longitude
                      </span>
                      <span className="text-[6px] font-mono text-slate-600">
                        {satPosition
                          ? satPosition[1] >= 0
                            ? "EAST"
                            : "WEST"
                          : ""}
                      </span>
                    </div>
                    <p className="text-[18px] font-mono font-black italic leading-none tabular-nums text-cyan-400">
                      {displayPos.lng.toFixed(5)}
                      <span className="text-[11px]">°</span>
                    </p>
                    <div
                      className="w-full h-px mt-1"
                      style={{
                        background:
                          "linear-gradient(to right, rgba(6,182,212,0.5), transparent)",
                      }}
                    />
                  </div>
                  <div className="flex items-start justify-between pt-0.5">
                    <div>
                      <span className="text-[6px] font-black text-slate-600 uppercase tracking-widest">
                        Altitude
                      </span>
                      <p
                        className="text-sm font-mono font-black italic"
                        style={{ color: "#a78bfa" }}
                      >
                        {selectedSat.altitude} km
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[6px] font-black text-slate-600 uppercase tracking-widest">
                        Region
                      </span>
                      <p className="text-[7px] font-bold text-white mt-0.5">
                        {satPosition
                          ? getLocationName(satPosition[1], satPosition[0])
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SELECTED VIEW: orbital elements slide-in panel ── */}
          {selectedSat && showOrbitalPanel && (
            <div
              className="absolute top-0 bottom-0 right-0 z-[1100] overflow-y-auto custom-scrollbar"
              style={{
                width: "270px",
                background: "rgba(2,6,23,0.97)",
                backdropFilter: "blur(20px)",
                borderLeft: `1px solid ${sevColor}18`,
                animation: "dfSlideIn 0.25s ease-out",
              }}
            >
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-[9px] font-black text-white uppercase tracking-wider">
                    Orbital Elements
                  </h3>
                  <button
                    onClick={() => setShowOrbitalPanel(false)}
                    className="text-slate-600 hover:text-white transition-colors p-1"
                  >
                    <X size={12} />
                  </button>
                </div>
                <div
                  className="p-2.5 rounded-lg"
                  style={{
                    background: `${sevColor}08`,
                    border: `1px solid ${sevColor}18`,
                  }}
                >
                  <p className="text-white font-black text-xs uppercase italic">
                    {selectedSat.name}
                  </p>
                  <p className="text-[7px] text-slate-500 font-mono mt-0.5">
                    NORAD: {selectedSat.norad_id} · {sKey}
                  </p>
                </div>
                <div>
                  <p className="text-[6.5px] font-black text-slate-600 uppercase tracking-widest mb-1.5">
                    TLE Data
                  </p>
                  <div
                    className="p-2.5 rounded-lg font-mono text-[6.5px] text-slate-400 break-all leading-relaxed"
                    style={{
                      background: "rgba(0,0,0,0.5)",
                      border: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <p className="text-cyan-500/50 mb-0.5">LINE 1:</p>
                    <p className="text-slate-400">
                      {selectedSat.tle_line1 || "—"}
                    </p>
                    <p className="text-cyan-500/50 mt-1.5 mb-0.5">LINE 2:</p>
                    <p className="text-slate-400">
                      {selectedSat.tle_line2 || "—"}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  {[
                    { label: "Semi-Major Axis", value: `${smaKm} km` },
                    { label: "Eccentricity", value: eccDisplay },
                    { label: "Inclination", value: `${incDisplay}°` },
                    { label: "RAAN", value: `${raanDisplay}°` },
                    { label: "Arg. of Perigee", value: `${argPDisplay}°` },
                    { label: "Mean Anomaly", value: `${maDisplay}°` },
                    {
                      label: "Mean Motion",
                      value: `${typeof mmDisplay === "number" ? mmDisplay.toFixed(4) : mmDisplay} rev/day`,
                    },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-2 py-1.5 rounded-lg"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.035)",
                      }}
                    >
                      <span className="text-[6.5px] font-bold text-slate-600 uppercase tracking-wider">
                        {item.label}
                      </span>
                      <span className="text-[7.5px] font-mono font-bold text-white">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
                <div
                  className="p-2.5 rounded-lg"
                  style={{
                    background: "rgba(239,68,68,0.04)",
                    border: "1px solid rgba(239,68,68,0.12)",
                  }}
                >
                  <p className="text-[6.5px] font-black text-red-500 uppercase tracking-widest mb-1.5">
                    Re-Entry Window
                  </p>
                  <p className="text-[7.5px] font-mono text-yellow-400">
                    START: {reentryStart}
                  </p>
                  <p className="text-[7.5px] font-mono text-red-400 mt-1">
                    END: {reentryEnd}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* end map area */}

        {/* ── Trajectory slider (selected sat only) ── */}
        {selectedSat && (
          <div
            className="shrink-0 px-5 py-3"
            style={{
              background: "rgba(2,6,23,0.96)",
              borderTop: `1px solid ${sevColor}12`,
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest whitespace-nowrap">
                Trajectory Prediction
              </span>
              <div className="flex-1 relative">
                <input
                  type="range"
                  min="0"
                  max="6"
                  step="0.001"
                  value={sliderHours}
                  onMouseDown={() => {
                    isDraggingRef.current = true;
                    setIsDragging(true);
                  }}
                  onTouchStart={() => {
                    isDraggingRef.current = true;
                    setIsDragging(true);
                  }}
                  onMouseUp={() => {
                    isDraggingRef.current = false;
                    setIsDragging(false);
                  }}
                  onTouchEnd={() => {
                    isDraggingRef.current = false;
                    setIsDragging(false);
                  }}
                  onChange={(e) => setSliderHours(parseFloat(e.target.value))}
                  className="w-full h-0.5 appearance-none rounded-full cursor-pointer df-slider"
                  style={{
                    background: `linear-gradient(to right, ${sevColor} 0%, ${sevColor} ${(sliderHours / 6) * 100}%, rgba(255,255,255,0.07) ${(sliderHours / 6) * 100}%, rgba(255,255,255,0.07) 100%)`,
                  }}
                />
                <div className="flex justify-between mt-1 px-0.5">
                  {[0, 1, 2, 3, 4, 5, 6].map((h) => (
                    <span
                      key={h}
                      className="text-[5.5px] font-mono text-slate-700 font-bold"
                    >
                      {h}h
                    </span>
                  ))}
                </div>
              </div>
              <span
                className="text-[11px] font-mono font-black min-w-[38px] text-right tabular-nums"
                style={{ color: sevColor }}
              >
                +{sliderHours.toFixed(2)}h
              </span>
            </div>
          </div>
        )}
      </div>
      {/* end right area */}

      {/* ── Global CSS ── */}
      <style>{`
        @keyframes dfSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes dfPulse {
          0%, 100% { transform: scale(1);   opacity: 0.18; }
          50%      { transform: scale(2.5); opacity: 0;    }
        }
        .df-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 13px; height: 13px;
          border-radius: 50%;
          background: white;
          border: 2px solid ${sevColor};
          cursor: pointer;
          box-shadow: 0 0 7px ${sevColor}70;
        }
        .df-slider::-moz-range-thumb {
          width: 13px; height: 13px;
          border-radius: 50%;
          background: white;
          border: 2px solid ${sevColor};
          cursor: pointer;
        }
        .leaflet-container { background: transparent !important; width: 100% !important; height: 100% !important; }
        .leaflet-tooltip {
          background: rgba(2,6,23,0.96) !important;
          border: 1px solid rgba(255,255,255,0.09) !important;
          color: #cbd5e1 !important;
          border-radius: 7px !important;
          padding: 4px 8px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
        }
        .leaflet-tooltip-top::before { border-top-color: rgba(255,255,255,0.09) !important; }
        /* Right live-position panel hover reveal */
        .df-right-panel { position: absolute; top: 12px; right: 12px; }
        .df-panel-content {
          opacity: 0;
          pointer-events: none;
          transform: scale(0.92) translateX(8px);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .df-right-panel:hover .df-panel-content,
        .df-right-panel:focus-within .df-panel-content {
          opacity: 1;
          pointer-events: all;
          transform: scale(1) translateX(0);
        }
        .df-panel-icon { transition: border-color 0.2s, box-shadow 0.2s; }
        .df-right-panel:hover .df-panel-icon {
          border-color: ${sevColor}70 !important;
          box-shadow: 0 0 16px ${sevColor}40 !important;
        }
      `}</style>
    </div>
  );
};

export default DecayForecast;
